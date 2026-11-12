import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { AddressInfo } from "node:net";
import type { Mandate, ProposedCart } from "@agentledger/shared";
import { createContainer, type Container } from "../src/container.js";
import { createApp } from "../src/http/app.js";
import { env } from "../src/config/env.js";
import { evaluateSemanticIntent } from "../src/agents/refereeAI.js";
import type { LLMPort } from "../src/ports/llm.port.js";

describe("Hardening Fixes Verification Tests", () => {
  let container: Container;
  const originalDemoMode = env.DEMO_MODE;
  const originalPaypalMode = env.PAYPAL_MODE;

  beforeEach(async () => {
    container = createContainer();
    (env as { DEMO_MODE: boolean }).DEMO_MODE = true;
    await container.services.demo.resetDemo();
    (env as { DEMO_MODE: boolean }).DEMO_MODE = false;
  });

  afterEach(() => {
    (env as { DEMO_MODE: boolean }).DEMO_MODE = originalDemoMode;
    (env as { PAYPAL_MODE: "sandbox" | "mock" }).PAYPAL_MODE = originalPaypalMode;
    vi.restoreAllMocks();
  });

  // Fix 4a: Non-already-captured error is rethrown and nothing written to ledger
  it("Fix 4a: rethrows non-already-captured error on capture failure and does not record capture in ledger", async () => {
    const { mandates, purchases, ledger } = container.services;

    const parsed = await mandates.parsePrompt("Buy white running shoes under $100");
    const { mandate } = await mandates.createMandate("Buy white running shoes", parsed.readback, parsed.constraints);
    const authorized = await mandates.authorizeMandate(mandate.id);

    // Mock capture to throw an unhandled card decline error (not AUTHORIZATION_ALREADY_CAPTURED)
    vi.spyOn(container.ports.paypal, "captureAuthorization").mockRejectedValue(
      new Error("PAYMENT_CARD_DECLINED: Insufficient funds")
    );

    const ledgerCountBefore = ledger.getAllEntries().length;

    await expect(
      purchases.executeAgentRun(authorized.id, "A")
    ).rejects.toThrow("PAYMENT_CARD_DECLINED");

    const entriesAfter = ledger.getAllEntries();
    expect(entriesAfter.length).toBe(ledgerCountBefore + 2);
    expect(entriesAfter.some((e) => e.eventType === "PAYMENT_CAPTURED")).toBe(false);

    const storedPurchase = purchases.listPurchasesByMandate(mandate.id)[0];
    expect(storedPurchase?.status).toBe("FAILED");
  });

  // Fix 5: Missing authorization throws UNAUTHORIZED_MANDATE in non-mock mode
  it("Fix 5: throws UNAUTHORIZED_MANDATE 409 when mandate lacks authorization in non-mock mode", async () => {
    (env as { PAYPAL_MODE: "sandbox" | "mock" }).PAYPAL_MODE = "sandbox";

    const { mandates, purchases } = container.services;
    const parsed = await mandates.parsePrompt("Buy white running shoes under $100");
    const { mandate } = await mandates.createMandate("Buy white running shoes", parsed.readback, parsed.constraints);

    // Mandate is in DRAFT status with no paypalAuthorizationId
    expect(mandate.paypalAuthorizationId).toBeNull();

    await expect(
      purchases.executeAgentRun(mandate.id, "A")
    ).rejects.toMatchObject({
      code: "UNAUTHORIZED_MANDATE",
      httpStatus: 409
    });
  });

  // Fix 6: Route enforces referee execution even if body passes bypassReferee: true when DEMO_MODE is false
  it("Fix 6: runs referee on POST /api/mandates/:id/runs even with bypassReferee=true when DEMO_MODE=false", async () => {
    (env as { DEMO_MODE: boolean }).DEMO_MODE = false;

    const { mandates } = container.services;
    const parsed = await mandates.parsePrompt("Buy shoes under $120");
    const { mandate } = await mandates.createMandate("Buy shoes", parsed.readback, parsed.constraints);
    const authorized = await mandates.authorizeMandate(mandate.id);

    const app = createApp(container);
    const server = app.listen(0);
    const port = (server.address() as AddressInfo).port;

    try {
      // Scenario B tries an over-budget cart ($139 on a $120 mandate).
      // With bypassReferee forced false, the referee runs and marks the purchase BLOCKED.
      const response = await fetch(`http://localhost:${port}/api/mandates/${authorized.id}/runs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario: "B", bypassReferee: true })
      });

      expect(response.status).toBe(202);
      const data = (await response.json()) as { status: string };
      expect(data.status).toBe("BLOCKED");
    } finally {
      server.close();
    }
  });

  // Fix 7: AI referee fails closed when semantic LLM throws
  it("Fix 7: evaluateSemanticIntent fails closed with passed: false and confidence: 0 on LLM error", async () => {
    const throwingLLM: LLMPort = {
      async generateStructured() {
        throw new Error("Gemini API rate limit 429: quota exhausted");
      }
    };

    const dummyMandate: Mandate = {
      id: "44444444-4444-4444-4444-444444444444",
      description: "Test mandate",
      rawRequest: "Buy shoes",
      readback: "Buy shoes up to $100",
      constraints: {
        budgetAmountCents: 10000,
        currency: "USD",
        itemCategory: "shoes",
        attributes: [],
        merchantAllow: [],
        merchantDeny: []
      },
      status: "ACTIVE",
      budgetCents: 10000,
      heldCents: 10000,
      capturedCents: 0,
      remainingCents: 10000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 86400000).toISOString()
    };

    const dummyCart: ProposedCart = {
      id: "cart_test",
      mandateId: dummyMandate.id,
      merchant: "TestMart",
      items: [{ id: "1", title: "Test Shoe", merchant: "TestMart", priceCents: 8000, quantity: 1, attributes: [] }],
      totalCents: 8000,
      currency: "USD",
      proposedAt: new Date().toISOString()
    };

    const check = await evaluateSemanticIntent(throwingLLM, dummyMandate, dummyCart);
    expect(check.passed).toBe(false);
    expect(check.confidence).toBe(0);
    expect(check.reason).toBe("Semantic check unavailable; blocked pending review.");
  });

  // Fix 8: POST /reset and POST /:seq/tamper return 404 when DEMO_MODE is false
  it("Fix 8: returns 404 for /api/demo/reset and /api/ledger/1/tamper when DEMO_MODE is false", async () => {
    (env as { DEMO_MODE: boolean }).DEMO_MODE = false;

    const app = createApp(container);
    const server = app.listen(0);
    const port = (server.address() as AddressInfo).port;

    try {
      const resetRes = await fetch(`http://localhost:${port}/api/demo/reset`, { method: "POST" });
      expect(resetRes.status).toBe(404);

      const tamperRes = await fetch(`http://localhost:${port}/api/ledger/1/tamper`, { method: "POST" });
      expect(tamperRes.status).toBe(404);
    } finally {
      server.close();
    }
  });

  it("Fix 8: allows /api/demo/reset and /api/ledger/:seq/tamper when DEMO_MODE is true", async () => {
    (env as { DEMO_MODE: boolean }).DEMO_MODE = true;

    const app = createApp(container);
    const server = app.listen(0);
    const port = (server.address() as AddressInfo).port;

    try {
      const resetRes = await fetch(`http://localhost:${port}/api/demo/reset`, { method: "POST" });
      expect(resetRes.status).toBe(200);
    } finally {
      server.close();
    }
  });
});
