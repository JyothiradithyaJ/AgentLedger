import { describe, it, expect } from "vitest";
import { evaluateDeterministicRules } from "../src/domain/rules/referee.js";
import type { Mandate, ProposedCart } from "@agentledger/shared";

describe("Referee Deterministic Rules Tests", () => {
  const baseMandate: Mandate = {
    id: "11111111-1111-1111-1111-111111111111",
    description: "Running shoes mandate",
    rawRequest: "Buy white running shoes, size 10, under $120, no resale sites",
    readback: "The agent may spend up to $120 on running shoes, size 10, never from resale sites.",
    constraints: {
      budgetAmountCents: 12000, // $120.00
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
    capturedCents: 0,
    remainingCents: 12000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 86400000).toISOString()
  };

  const validCart: ProposedCart = {
    id: "22222222-2222-2222-2222-222222222222",
    mandateId: baseMandate.id,
    merchant: "StrideCo",
    items: [
      {
        id: "item_1",
        title: "StrideCo Running Shoes White",
        merchant: "StrideCo",
        priceCents: 9850, // $98.50
        quantity: 1,
        size: "10",
        attributes: ["white"]
      }
    ],
    totalCents: 9850,
    currency: "USD",
    proposedAt: new Date().toISOString()
  };

  it("passes valid cart inside budget, correct merchant, and matching size", () => {
    const result = evaluateDeterministicRules(baseMandate, validCart);
    expect(result.passed).toBe(true);
    expect(result.reasons).toHaveLength(0);
    expect(result.checks.every((c) => c.passed)).toBe(true);
  });

  it("blocks cart exceeding budget cap", () => {
    const overBudgetCart: ProposedCart = {
      ...validCart,
      totalCents: 13900, // $139.00
      items: [{ ...validCart.items[0]!, priceCents: 13900 }]
    };

    const result = evaluateDeterministicRules(baseMandate, overBudgetCart);
    expect(result.passed).toBe(false);
    expect(result.checks.find((c) => c.name === "budget")?.passed).toBe(false);
    expect(result.reasons[0]).toContain("exceeds available budget");
  });

  it("blocks cart from prohibited resale merchant", () => {
    const resaleCart: ProposedCart = {
      ...validCart,
      merchant: "ReSole Outlet",
      items: [{ ...validCart.items[0]!, merchant: "ReSole Outlet" }]
    };

    const result = evaluateDeterministicRules(baseMandate, resaleCart);
    expect(result.passed).toBe(false);
    expect(result.checks.find((c) => c.name === "merchant")?.passed).toBe(false);
    expect(result.reasons.some((r) => r.includes("prohibited list"))).toBe(true);
  });

  it("blocks cart when item size does not match mandate", () => {
    const wrongSizeCart: ProposedCart = {
      ...validCart,
      items: [{ ...validCart.items[0]!, size: "11.5" }]
    };

    const result = evaluateDeterministicRules(baseMandate, wrongSizeCart);
    expect(result.passed).toBe(false);
    expect(result.checks.find((c) => c.name === "size")?.passed).toBe(false);
  });

  it("blocks cart if mandate has expired", () => {
    const expiredMandate: Mandate = {
      ...baseMandate,
      expiresAt: new Date(Date.now() - 3600000).toISOString()
    };

    const result = evaluateDeterministicRules(expiredMandate, validCart);
    expect(result.passed).toBe(false);
    expect(result.reasons.some((r) => r.includes("expired"))).toBe(true);
  });
});
