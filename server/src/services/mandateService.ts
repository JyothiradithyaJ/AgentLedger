import crypto from "node:crypto";
import type { Repos } from "../repos/index.js";
import type { PayPalPort } from "../ports/paypal.port.js";
import type { LLMPort } from "../ports/llm.port.js";
import type { LedgerService } from "./ledgerService.js";
import type {
  Mandate,
  MandateConstraints,
  ParseMandateResponse
} from "@agentledger/shared";
import { parseMandateRequest } from "../agents/mandateParser.js";
import { transitionMandate } from "../domain/stateMachine.js";

export class MandateService {
  constructor(
    private readonly repos: Repos,
    private readonly paypal: PayPalPort,
    private readonly llm: LLMPort,
    private readonly ledger: LedgerService
  ) {}

  async parsePrompt(userPrompt: string): Promise<ParseMandateResponse> {
    return parseMandateRequest(this.llm, userPrompt);
  }

  async createMandate(
    rawRequest: string,
    readback: string,
    constraints: MandateConstraints
  ): Promise<{ mandate: Mandate; paypalOrderId: string; approveUrl: string }> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const expiresAt = constraints.expiresAt ?? new Date(Date.now() + 3 * 86400000).toISOString();

    const order = await this.paypal.createOrder(
      constraints.budgetAmountCents,
      constraints.currency,
      id
    );

    const mandate: Mandate = {
      id,
      description: `Shopping mandate for ${constraints.itemCategory}`,
      rawRequest,
      readback,
      constraints,
      status: "DRAFT",
      budgetCents: constraints.budgetAmountCents,
      heldCents: 0,
      capturedCents: 0,
      remainingCents: constraints.budgetAmountCents,
      paypalOrderId: order.orderId,
      paypalAuthorizationId: null,
      createdAt: now,
      updatedAt: now,
      expiresAt
    };

    this.repos.mandates.create(mandate);

    this.ledger.recordEvent("MANDATE_CREATED", mandate.id, {
      description: mandate.description,
      rawRequest: mandate.rawRequest,
      readback: mandate.readback,
      budgetCents: mandate.budgetCents,
      constraints: mandate.constraints,
      paypalOrderId: order.orderId
    });

    return {
      mandate,
      paypalOrderId: order.orderId,
      approveUrl: order.approveUrl
    };
  }

  async authorizeMandate(mandateId: string): Promise<Mandate> {
    const mandate = this.repos.mandates.getById(mandateId);
    if (!mandate) throw new Error(`Mandate ${mandateId} not found`);
    if (!mandate.paypalOrderId) throw new Error(`Mandate ${mandateId} missing PayPal order ID`);

    const authResult = await this.paypal.authorizeOrder(mandate.paypalOrderId);

    let updated = transitionMandate(mandate, "AUTHORIZED");
    updated = {
      ...updated,
      paypalAuthorizationId: authResult.authorizationId,
      heldCents: mandate.budgetCents,
      remainingCents: mandate.budgetCents
    };
    updated = transitionMandate(updated, "ACTIVE");

    this.repos.mandates.update(updated);

    this.ledger.recordEvent("MANDATE_AUTHORIZED", updated.id, {
      authorizationId: authResult.authorizationId,
      status: authResult.status,
      heldCents: updated.heldCents
    });

    return updated;
  }

  async revokeMandate(mandateId: string): Promise<Mandate> {
    const mandate = this.repos.mandates.getById(mandateId);
    if (!mandate) throw new Error(`Mandate ${mandateId} not found`);

    if (mandate.paypalAuthorizationId && mandate.heldCents > mandate.capturedCents) {
      await this.paypal.voidAuthorization(
        mandate.paypalAuthorizationId,
        `revoke_${mandate.id}`
      );
    }

    const updated = transitionMandate(mandate, "REVOKED");
    const finalized = {
      ...updated,
      heldCents: 0,
      remainingCents: 0
    };
    this.repos.mandates.update(finalized);

    this.ledger.recordEvent("MANDATE_REVOKED", finalized.id, {
      releasedHoldCents: mandate.remainingCents,
      reason: "User requested immediate revocation"
    });

    return finalized;
  }

  getMandate(id: string): Mandate | null {
    return this.repos.mandates.getById(id);
  }

  listMandates(): Mandate[] {
    return this.repos.mandates.listAll();
  }
}
