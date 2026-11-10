import { describe, it, expect, beforeEach } from "vitest";
import { createContainer, type Container } from "../src/container.js";

describe("AgentLedger End-to-End Integration Tests", () => {
  let container: Container;

  beforeEach(async () => {
    container = createContainer();
    await container.services.demo.resetDemo();
  });

  it("completes Scenario A: inside mandate, authorized hold, partial capture, release remainder", async () => {
    const { mandates, purchases, ledger } = container.services;

    // 1. Parse prompt
    const parsed = await mandates.parsePrompt("Buy white running shoes, size 10, under $120, no resale sites");
    expect(parsed.constraints.budgetAmountCents).toBe(12000);

    // 2. Create mandate
    const { mandate } = await mandates.createMandate("Buy white running shoes", parsed.readback, parsed.constraints);
    expect(mandate.status).toBe("DRAFT");
    expect(mandate.budgetCents).toBe(12000);

    // 3. Authorize hold
    const authorized = await mandates.authorizeMandate(mandate.id);
    expect(authorized.status).toBe("ACTIVE");
    expect(authorized.heldCents).toBe(12000);

    // 4. Execute purchase run inside mandate
    const { purchase } = await purchases.executeAgentRun(authorized.id, "A");
    expect(purchase.status).toBe("CAPTURED");
    expect(purchase.capturedAmountCents).toBe(purchase.cart.totalCents);
    expect(purchase.capturedAmountCents).toBeLessThanOrEqual(authorized.budgetCents);
    expect(purchase.releasedAmountCents).toBe(authorized.budgetCents - purchase.capturedAmountCents);

    // 5. Verify ledger integrity
    const chainVerification = ledger.verify();
    expect(chainVerification.valid).toBe(true);
    expect(chainVerification.totalEntries).toBeGreaterThanOrEqual(4);
  });

  it("completes Scenario B: blocks over-budget attempt with zero dollars captured", async () => {
    const { mandates, purchases } = container.services;

    const { mandate } = await mandates.createMandate("Buy shoes", "Readback", {
      budgetAmountCents: 12000,
      currency: "USD",
      itemCategory: "running shoes",
      size: "10",
      attributes: [],
      merchantAllow: [],
      merchantDeny: []
    });

    const authorized = await mandates.authorizeMandate(mandate.id);
    const { purchase } = await purchases.executeAgentRun(authorized.id, "B");

    expect(purchase.status).toBe("BLOCKED");
    expect(purchase.capturedAmountCents).toBe(0);
    expect(purchase.refereeDecision?.allowed).toBe(false);
  });

  it("completes Scenario D: creates simulated dispute and attributes fault", async () => {
    const { mandates, purchases, disputes } = container.services;

    const { mandate } = await mandates.createMandate("Buy shoes", "Readback", {
      budgetAmountCents: 12000,
      currency: "USD",
      itemCategory: "running shoes",
      size: "10",
      attributes: [],
      merchantAllow: [],
      merchantDeny: []
    });

    const authorized = await mandates.authorizeMandate(mandate.id);
    const { purchase } = await purchases.executeAgentRun(authorized.id, "A");

    // Open dispute
    const dispute = await disputes.createSimulatedDispute(
      purchase.id,
      "Counterfeit item received from merchant."
    );
    expect(dispute.isSimulated).toBe(true);

    // Analyze dispute
    const verdict = await disputes.runDisputeAnalysis(dispute.id);
    expect(verdict.fault).toBe("MERCHANT");
    expect(verdict.evidencePacket).toContain("MERCHANT");

    // Submit evidence
    const submitted = await disputes.submitEvidenceToPayPal(dispute.id);
    expect(submitted.status).toBe("UNDER_REVIEW");
    expect(submitted.evidenceSubmittedAt).not.toBeNull();
  });
});
