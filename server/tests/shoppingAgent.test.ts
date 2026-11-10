import { describe, expect, it } from "vitest";
import type { z } from "zod";
import type { LLMPort } from "../src/ports/llm.port.js";
import type { MerchantPort } from "../src/ports/merchant.port.js";
import type { Mandate } from "@agentledger/shared";
import { proposeCart } from "../src/agents/shopper.js";
import { evaluateDeterministicRules } from "../src/domain/rules/referee.js";

const llm: LLMPort = {
  async generateStructured<T>(_prompt: string, schema: z.ZodType<T>): Promise<T> {
    return schema.parse({});
  }
};

const merchant: MerchantPort = {
  async searchCatalog() {
    return [];
  },
  async getItem() {
    return null;
  },
  async listMerchants() {
    return [];
  }
};

const redShirtMandate = (): Mandate => {
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 86400000).toISOString();
  return {
    id: "33333333-3333-3333-3333-333333333333",
    description: "Red shirt mandate",
    rawRequest: "buy red shirt under $5 and size should be 30",
    readback: "The agent may spend up to $5.00 on a red shirt, size 30.",
    constraints: {
      budgetAmountCents: 500,
      currency: "USD",
      itemCategory: "shirt",
      size: "30",
      attributes: ["red"],
      merchantAllow: [],
      merchantDeny: [],
      expiresAt
    },
    status: "ACTIVE",
    budgetCents: 500,
    heldCents: 500,
    capturedCents: 0,
    remainingCents: 500,
    paypalOrderId: null,
    paypalAuthorizationId: null,
    createdAt: now,
    updatedAt: now,
    expiresAt
  };
};

describe("deterministic shopping agent", () => {
  it("creates a compliant cart inside a red-shirt mandate", async () => {
    const mandate = redShirtMandate();
    const cart = await proposeCart(llm, merchant, mandate, "A");

    expect(cart.totalCents).toBeLessThanOrEqual(mandate.constraints.budgetAmountCents);
    expect(cart.items[0]?.title).toContain("Red Shirt");
    expect(evaluateDeterministicRules(mandate, cart).passed).toBe(true);
  });

  it("creates an over-budget cart that the referee blocks", async () => {
    const mandate = redShirtMandate();
    const cart = await proposeCart(llm, merchant, mandate, "B");

    expect(cart.totalCents).toBeGreaterThan(mandate.constraints.budgetAmountCents);
    expect(evaluateDeterministicRules(mandate, cart).passed).toBe(false);
  });
});
