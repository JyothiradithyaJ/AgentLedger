import { describe, it, expect } from "vitest";
import { attributeFault } from "../src/domain/verdict.js";
import type { Mandate, PurchaseRecord, LedgerEntry } from "@agentledger/shared";

describe("Dispute Verdict & Fault Attribution Tests", () => {
  const baseMandate: Mandate = {
    id: "11111111-1111-1111-1111-111111111111",
    description: "Running shoes",
    rawRequest: "Buy white running shoes, size 10, under $120, no resale sites",
    readback: "The agent may spend up to $120 on running shoes, size 10, never from resale sites.",
    constraints: {
      budgetAmountCents: 12000,
      currency: "USD",
      itemCategory: "running shoes",
      size: "10",
      attributes: ["white"],
      merchantAllow: [],
      merchantDeny: ["ReSole Outlet"],
      expiresAt: new Date(Date.now() + 86400000).toISOString()
    },
    status: "ACTIVE",
    budgetCents: 12000,
    heldCents: 12000,
    capturedCents: 9850,
    remainingCents: 2150,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 86400000).toISOString()
  };

  const validPurchase: PurchaseRecord = {
    id: "33333333-3333-3333-3333-333333333333",
    mandateId: baseMandate.id,
    runId: "44444444-4444-4444-4444-444444444444",
    cart: {
      id: "cart_1",
      mandateId: baseMandate.id,
      merchant: "StrideCo",
      items: [
        {
          id: "item_1",
          title: "StrideCo Running Shoes",
          merchant: "StrideCo",
          priceCents: 9850,
          quantity: 1,
          size: "10",
          attributes: ["white"]
        }
      ],
      totalCents: 9850,
      currency: "USD",
      proposedAt: new Date().toISOString()
    },
    refereeDecision: {
      allowed: true,
      requiresHuman: false,
      reasons: [],
      checks: [],
      evaluatedAt: new Date().toISOString()
    },
    status: "CAPTURED",
    paypalCaptureId: "CAP_123",
    capturedAmountCents: 9850,
    releasedAmountCents: 2150,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const mockLedger: LedgerEntry[] = [
    {
      sequence: 0,
      previousHash: "0".repeat(64),
      currentHash: "1".repeat(64),
      timestamp: new Date().toISOString(),
      eventType: "MANDATE_CREATED",
      mandateId: baseMandate.id,
      payload: {},
      signature: "sig",
      publicKey: "pub"
    }
  ];

  it("attributes fault to BUYER when transaction strictly adhered to signed mandate", () => {
    const verdict = attributeFault(baseMandate, validPurchase, mockLedger, "I never asked for this order");
    expect(verdict.fault).toBe("BUYER");
    expect(verdict.confidence).toBeGreaterThan(0.9);
    expect(verdict.recommendedAction).toContain("Deny dispute");
    expect(verdict.evidencePacket).toContain("BUYER_AUTHORIZATION_VERIFIED");
  });

  it("attributes fault to AGENT when agent drifted into prohibited resale store", () => {
    const driftedPurchase: PurchaseRecord = {
      ...validPurchase,
      cart: {
        ...validPurchase.cart,
        merchant: "ReSole Outlet"
      }
    };

    const verdict = attributeFault(baseMandate, driftedPurchase, mockLedger, "Agent bought from resale site");
    expect(verdict.fault).toBe("AGENT");
    expect(verdict.confidence).toBeGreaterThan(0.9);
    expect(verdict.responsibility.agentProvider).toContain("100% Liable");
  });

  it("attributes fault to MERCHANT when goods are damaged or counterfeit", () => {
    const verdict = attributeFault(baseMandate, validPurchase, mockLedger, "Item arrived damaged and defective");
    expect(verdict.fault).toBe("MERCHANT");
    expect(verdict.responsibility.merchant).toContain("100% Responsible");
  });
});
