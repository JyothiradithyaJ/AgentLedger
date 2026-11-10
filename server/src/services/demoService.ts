import type { Repos } from "../repos/index.js";
import type { MandateService } from "./mandateService.js";
import type { PurchaseService } from "./purchaseService.js";
import type { DisputeService } from "./disputeService.js";
import type { LedgerService } from "./ledgerService.js";
import type { DemoScenarioName } from "@agentledger/shared";

export class DemoService {
  constructor(
    private readonly repos: Repos,
    private readonly mandateService: MandateService,
    private readonly purchaseService: PurchaseService,
    private readonly disputeService: DisputeService,
    private readonly ledgerService: LedgerService
  ) {}

  async runScenario(scenario: DemoScenarioName): Promise<Record<string, unknown>> {
    // 1. Create standard demo mandate ($120 cap for running shoes, no resale sites)
    const { mandate } = await this.mandateService.createMandate(
      "Buy white running shoes, size 10, under $120, no resale sites",
      "The agent may spend up to $120 on running shoes, size 10, never from resale sites.",
      {
        budgetAmountCents: 12000,
        currency: "USD",
        itemCategory: "running shoes",
        size: "10",
        attributes: ["white"],
        merchantAllow: [],
        merchantDeny: ["ReSole Outlet"]
      }
    );

    // 2. Authorize the mandate hold
    const authorizedMandate = await this.mandateService.authorizeMandate(mandate.id);

    // Scenario A: Inside Mandate ($98.50 captured, $21.50 released)
    if (scenario === "A") {
      const { runId, purchase } = await this.purchaseService.executeAgentRun(
        authorizedMandate.id,
        "A"
      );
      return { scenario: "A", mandate: authorizedMandate, runId, purchase };
    }

    // Scenario B: Over budget attempt ($139 item, blocked)
    if (scenario === "B") {
      const { runId, purchase } = await this.purchaseService.executeAgentRun(
        authorizedMandate.id,
        "B"
      );
      return { scenario: "B", mandate: authorizedMandate, runId, purchase };
    }

    // Scenario C: Resale marketplace attempt (ReSole Outlet, blocked by semantic check)
    if (scenario === "C") {
      const { runId, purchase } = await this.purchaseService.executeAgentRun(
        authorizedMandate.id,
        "C"
      );
      return { scenario: "C", mandate: authorizedMandate, runId, purchase };
    }

    // Scenario D: Merchant fault dispute
    if (scenario === "D") {
      const { runId, purchase } = await this.purchaseService.executeAgentRun(
        authorizedMandate.id,
        "A"
      );
      const dispute = await this.disputeService.createSimulatedDispute(
        purchase.id,
        "Item arrived counterfeit with severe structural damage from seller."
      );
      const verdict = await this.disputeService.runDisputeAnalysis(dispute.id);
      return { scenario: "D", mandate: authorizedMandate, runId, purchase, dispute, verdict };
    }

    // Scenario E: Counterfactual (Referee OFF -> drift -> dispute, Referee ON -> blocked)
    if (scenario === "E") {
      // Step 1: Run with Referee OFF -> Captures bad purchase
      const badRun = await this.purchaseService.executeAgentRun(
        authorizedMandate.id,
        "C",
        true // bypass Referee
      );
      const dispute = await this.disputeService.createSimulatedDispute(
        badRun.purchase.id,
        "Agent bought from prohibited resale store without authorization."
      );
      const verdict = await this.disputeService.runDisputeAnalysis(dispute.id);

      // Step 2: Run same intent with Referee ON -> Blocked cleanly
      const blockedRun = await this.purchaseService.executeAgentRun(
        authorizedMandate.id,
        "C",
        false // Referee ON
      );

      return {
        scenario: "E",
        counterfactual: {
          refereeOff: { run: badRun, dispute, verdict },
          refereeOn: { run: blockedRun }
        }
      };
    }

    throw new Error(`Unknown scenario: ${scenario}`);
  }

  async resetDemo(): Promise<void> {
    const db = this.repos.mandates["db"];
    db.exec("DELETE FROM disputes;");
    db.exec("DELETE FROM purchases;");
    db.exec("DELETE FROM ledger_entries;");
    db.exec("DELETE FROM mandates;");
    this.ledgerService.getAllEntries();
  }
}
