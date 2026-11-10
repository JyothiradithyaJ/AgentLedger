import crypto from "node:crypto";
import type { Repos } from "../repos/index.js";
import type { PayPalPort, CaptureResult } from "../ports/paypal.port.js";
import type { MerchantPort } from "../ports/merchant.port.js";
import type { LLMPort } from "../ports/llm.port.js";
import type { LedgerService } from "./ledgerService.js";
import type {
  PurchaseRecord,
  ProposedCart,
  RefereeDecision,
  PurchaseDecision,
  RunTimelineEvent
} from "@agentledger/shared";
import { proposeCart } from "../agents/shopper.js";
import { evaluateDeterministicRules } from "../domain/rules/referee.js";
import { evaluateSemanticIntent } from "../agents/refereeAI.js";
import { transitionPurchase, transitionMandate } from "../domain/stateMachine.js";

export class PurchaseService {
  constructor(
    private readonly repos: Repos,
    private readonly paypal: PayPalPort,
    private readonly merchant: MerchantPort,
    private readonly llm: LLMPort,
    private readonly ledger: LedgerService
  ) {}

  async executeAgentRun(
    mandateId: string,
    scenarioName?: "A" | "B" | "C" | "D" | "E",
    bypassReferee: boolean = false,
    onTimelineEvent?: (event: RunTimelineEvent) => void
  ): Promise<{ runId: string; purchase: PurchaseRecord }> {
    const mandate = this.repos.mandates.getById(mandateId);
    if (!mandate) throw new Error(`Mandate ${mandateId} not found`);

    if (mandate.status === "COMPLETED" || (mandate.capturedCents > 0 && mandate.heldCents === 0)) {
      throw new Error("MANDATE_ALREADY_CAPTURED: This mandate's hold has already been captured. Create a new mandate.");
    }

    const runId = crypto.randomUUID();
    const purchaseId = crypto.randomUUID();
    const now = new Date().toISOString();

    const emit = (step: RunTimelineEvent["step"], message: string, cart?: ProposedCart, p?: PurchaseRecord) => {
      onTimelineEvent?.({
        runId,
        timestamp: new Date().toISOString(),
        step,
        message,
        cart,
        purchase: p
      });
    };

    emit("STARTED", `Shopping agent initialized inside mandate (${mandate.description})`);

    // 1. Propose Cart
    emit("SEARCHING_CATALOG", `Searching catalog for "${mandate.constraints.itemCategory}"...`);
    const cart = await proposeCart(this.llm, this.merchant, mandate, scenarioName);
    emit("CART_PROPOSED", `Proposed cart from "${cart.merchant}" ($${(cart.totalCents / 100).toFixed(2)})`, cart);

    this.ledger.recordEvent("CART_PROPOSED", mandate.id, {
      runId,
      cartId: cart.id,
      merchant: cart.merchant,
      totalCents: cart.totalCents,
      items: cart.items
    });

    let purchase: PurchaseRecord = {
      id: purchaseId,
      mandateId: mandate.id,
      runId,
      cart,
      refereeDecision: null,
      humanDecision: null,
      status: "PROPOSED",
      paypalCaptureId: null,
      capturedAmountCents: 0,
      releasedAmountCents: 0,
      failureReason: null,
      createdAt: now,
      updatedAt: now
    };
    this.repos.purchases.create(purchase);

    // 2. Referee Evaluation (unless bypassed for counterfactual scenario E)
    let decision: RefereeDecision;
    if (bypassReferee) {
      decision = {
        allowed: true,
        requiresHuman: false,
        reasons: ["Referee bypassed via demo toggle."],
        checks: [],
        evaluatedAt: new Date().toISOString()
      };
    } else {
      purchase = transitionPurchase(purchase, "CHECKING");
      emit("REFEREE_EVALUATING", "Referee running deterministic checks (budget, merchant, size, quantity)...");
      const rules = evaluateDeterministicRules(mandate, cart);

      let semanticCheckPassed = true;
      if (rules.passed) {
        emit("REFEREE_EVALUATING", "Deterministic checks passed. Running semantic AI check on merchant & intent...");
        const semantic = await evaluateSemanticIntent(this.llm, mandate, cart);
        rules.checks.push(semantic);
        if (!semantic.passed) {
          semanticCheckPassed = false;
          rules.reasons.push(semantic.reason);
        }
      }

      const allPassed = rules.passed && semanticCheckPassed;
      decision = {
        allowed: allPassed,
        requiresHuman: false,
        reasons: rules.reasons,
        checks: rules.checks,
        evaluatedAt: new Date().toISOString()
      };
    }

    purchase = { ...purchase, refereeDecision: decision };
    this.ledger.recordEvent("REFEREE_EVALUATED", mandate.id, {
      runId,
      purchaseId,
      allowed: decision.allowed,
      reasons: decision.reasons,
      checks: decision.checks
    });

    // 3. Execution or Block
    if (!decision.allowed) {
      purchase = transitionPurchase(purchase, "BLOCKED");
      purchase = { ...purchase, failureReason: decision.reasons.join(" ") };
      this.repos.purchases.update(purchase);
      emit("REFEREE_BLOCKED", `Referee BLOCKED purchase: ${purchase.failureReason}`, cart, purchase);
      emit("PAYPAL_BLOCKED", "Zero dollars captured from PayPal hold. Financial rail protected.", cart, purchase);

      this.ledger.recordEvent("PAYMENT_BLOCKED", mandate.id, {
        purchaseId,
        reasons: decision.reasons
      });

      return { runId, purchase };
    }

    emit("REFEREE_PASSED", "Referee PASSED cart. Initiating PayPal partial capture...", cart, purchase);

    // 4. Capture on PayPal Rail with Reconciliation
    emit("PAYPAL_CAPTURING", `Executing partial capture for $${(cart.totalCents / 100).toFixed(2)} on hold...`);

    const authId = mandate.paypalAuthorizationId ?? "MOCK_AUTH_DEFAULT";
    const requestId = purchase.id;

    let captureResult: CaptureResult;
    try {
      captureResult = await this.paypal.captureAuthorization(
        authId,
        cart.totalCents,
        cart.currency,
        requestId,
        true // Final capture releases remainder
      );
    } catch (captureErr) {
      const errMsg = captureErr instanceof Error ? captureErr.message : String(captureErr);
      const isAlreadyCaptured = errMsg.includes("AUTHORIZATION_ALREADY_CAPTURED") || errMsg.includes("422");

      let reconciled = false;
      if (isAlreadyCaptured || authId) {
        try {
          const authDetails = await this.paypal.getAuthorization(authId);
          if (authDetails.status === "CAPTURED" || authDetails.status === "PARTIALLY_CAPTURED") {
            const capturedAmount = authDetails.amountCents > 0 ? authDetails.amountCents : cart.totalCents;
            captureResult = {
              captureId: `reconciled_${requestId}`,
              status: authDetails.status,
              capturedCents: capturedAmount
            };
            reconciled = true;
          }
        } catch {
          // Re-throw original capture error if reconciliation lookup fails
        }
      }

      if (!reconciled) {
        purchase = transitionPurchase(purchase, "FAILED");
        purchase = { ...purchase, failureReason: errMsg };
        this.repos.purchases.update(purchase);
        throw captureErr;
      }
    }

    const releasedCents = mandate.heldCents - captureResult.capturedCents;

    purchase = transitionPurchase(purchase, "ALLOWED");
    purchase = transitionPurchase(purchase, "CAPTURED");
    purchase = {
      ...purchase,
      paypalCaptureId: captureResult.captureId,
      capturedAmountCents: captureResult.capturedCents,
      releasedAmountCents: Math.max(0, releasedCents)
    };
    this.repos.purchases.update(purchase);

    // Update mandate balances and transition to COMPLETED
    let updatedMandate = {
      ...mandate,
      capturedCents: mandate.capturedCents + captureResult.capturedCents,
      heldCents: 0,
      remainingCents: Math.max(0, mandate.budgetCents - (mandate.capturedCents + captureResult.capturedCents))
    };
    if (updatedMandate.status === "ACTIVE") {
      updatedMandate = transitionMandate(updatedMandate, "COMPLETED");
    }
    this.repos.mandates.update(updatedMandate);

    this.ledger.recordEvent("PAYMENT_CAPTURED", mandate.id, {
      purchaseId,
      captureId: captureResult.captureId,
      capturedCents: captureResult.capturedCents,
      releasedCents: purchase.releasedAmountCents
    });

    emit(
      "PAYPAL_CAPTURED",
      `Captured $${(captureResult.capturedCents / 100).toFixed(2)} USD via PayPal. Released remainder of $${(purchase.releasedAmountCents / 100).toFixed(2)}.`,
      cart,
      purchase
    );
    emit("COMPLETED", "Agent run successfully completed inside mandate.", cart, purchase);

    return { runId, purchase };
  }

  async handleHumanDecision(
    purchaseId: string,
    decision: PurchaseDecision,
    reason?: string
  ): Promise<PurchaseRecord> {
    const purchase = this.repos.purchases.getById(purchaseId);
    if (!purchase) throw new Error(`Purchase ${purchaseId} not found`);

    purchase.humanDecision = decision;
    if (decision === "APPROVED") {
      purchase.status = "ALLOWED";
    } else {
      purchase.status = "BLOCKED";
      purchase.failureReason = reason ?? "Human supervisor denied purchase";
    }
    this.repos.purchases.update(purchase);

    this.ledger.recordEvent("HUMAN_DECISION", purchase.mandateId, {
      purchaseId,
      decision,
      reason
    });

    return purchase;
  }

  getPurchase(id: string): PurchaseRecord | null {
    return this.repos.purchases.getById(id);
  }

  listPurchasesByMandate(mandateId: string): PurchaseRecord[] {
    return this.repos.purchases.listByMandate(mandateId);
  }
}
