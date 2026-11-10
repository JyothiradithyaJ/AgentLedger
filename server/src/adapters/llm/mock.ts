import type { z } from "zod";
import type { LLMPort } from "../../ports/llm.port.js";
import { logger } from "../../observability/logger.js";

export class MockLLMAdapter implements LLMPort {
  isFallbackActive(): boolean {
    return true;
  }

  async generateStructured<T>(
    prompt: string,
    schema: z.ZodType<T>,
    _systemInstruction?: string
  ): Promise<T> {
    logger.info({ promptLength: prompt.length }, "MockLLMAdapter invoked (deterministic output)");

    const p = prompt.toLowerCase();

    // 1. Dispute Analysis Mock
    if (p.includes("transaction dispute") || p.includes("dispute id:") || p.includes("determine fault")) {
      if (p.includes("prohibited") || p.includes("drift") || p.includes("resole") || p.includes("without authorization")) {
        const mockResult = {
          fault: "AGENT",
          confidence: 0.95,
          reasons: ["The shopping agent selected a prohibited resale merchant or deviated from constraints."],
          recommendedAction: "Reimburse buyer via agent provider guarantee.",
          responsibility: {
            buyer: "Exonerated: Followed all setup rules.",
            agentProvider: "100% Liable: Agent breached signed mandate rules.",
            merchant: "Exonerated: Fulfilled order as received."
          },
          evidencePacket: "EVIDENCE: Agent drifted into prohibited resale merchant without user authorization."
        };
        return schema.parse(mockResult);
      }

      const mockResult = {
        fault: "MERCHANT",
        confidence: 0.88,
        reasons: ["Item arrived damaged or merchant shipped defective unit contrary to invoice."],
        recommendedAction: "Process standard merchant refund under PayPal Seller Protection / Buyer Protection guidelines.",
        responsibility: {
          buyer: "Exonerated: Valid mandate and authorization provided.",
          agentProvider: "Exonerated: Agent operated strictly within approved constraints.",
          merchant: "100% Liable: Shipped damaged or defective product."
        },
        evidencePacket: "EVIDENCE: Signed purchase entry confirms valid execution; merchant delivery confirmed damaged."
      };
      return schema.parse(mockResult);
    }

    // 2. Referee Semantic Intent Check Mock
    if (p.includes("proposed cart:") || p.includes("user's intent")) {
      if (p.includes("merchant: \"resole outlet\"") || p.includes("merchant: \"resole")) {
        const mockResult = {
          matches_intent: false,
          confidence: 0.95,
          reasons: ["Merchant 'ReSole Outlet' is an unapproved resale marketplace violating user constraints."]
        };
        return schema.parse(mockResult);
      }

      const mockResult = {
        matches_intent: true,
        confidence: 0.98,
        reasons: ["Item strictly aligns with requested specifications and authorized merchant policy."]
      };
      return schema.parse(mockResult);
    }

    // 3. Mandate Parsing Mock
    if (p.includes("spending mandate") || p.includes("shopping request") || p.includes("parse")) {
      const colors = [
        "red", "blue", "black", "white", "green", "grey", "gray", "yellow",
        "pink", "purple", "orange", "brown", "navy", "beige"
      ].filter((c) => new RegExp(`\\b${c}\\b`, "i").test(prompt));
      const hasShoes = /\b(?:running shoes?|shoes?|sneakers?)\b/i.test(prompt);
      const category = hasShoes
        ? (prompt.includes("running shoes") ? "running shoes" : "shoes")
        : (/\bshirt\b/i.test(prompt) ? "shirt" : "item");
      const budgetMatch = prompt.match(/\$(\d+(?:\.\d{1,2})?)/);
      const budgetText = budgetMatch?.[1];
      const budgetCents = budgetText !== undefined ? Math.round(Number.parseFloat(budgetText) * 100) : 10000;
      const sizeMatch = prompt.match(/\b(?:size|sz)\s*:?\s*([A-Za-z0-9]+)\b/i);
      const size = sizeMatch?.[1];
      const merchantDeny = /\bresale\b/i.test(prompt) ? ["ReSole Outlet"] : [];

      const mockResult = {
        readback: `The agent may spend up to $${(budgetCents / 100).toFixed(2)} on ${category}${size ? `, size ${size}` : ""}.`,
        constraints: {
          budgetAmountCents: budgetCents,
          currency: "USD",
          itemCategory: category,
          ...(size ? { size } : {}),
          attributes: colors,
          merchantAllow: [],
          merchantDeny,
          expiresAt: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString()
        }
      };
      return schema.parse(mockResult);
    }

    // Generic fallback: parse empty object or throw informative error
    return schema.parse({});
  }
}
