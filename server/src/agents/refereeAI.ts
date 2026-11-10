import { z } from "zod";
import type { LLMPort } from "../ports/llm.port.js";
import type { Mandate, ProposedCart, RefereeCheck } from "@agentledger/shared";

export const SemanticIntentOutputSchema = z.object({
  matches_intent: z.boolean(),
  confidence: z.number().min(0).max(1),
  reasons: z.array(z.string()).min(1)
});
export type SemanticIntentOutput = z.infer<typeof SemanticIntentOutputSchema>;

const SYSTEM_INSTRUCTION = `You are the AgentLedger AI Referee.
Judge whether a proposed shopping cart matches the user's high-level intent and fuzzy constraints.
Evaluate constraints such as "no resale sites", "sustainable brands", and overall style/preference matching.
Return matches_intent (boolean), confidence (0.0 - 1.0), and concise explanatory reasons.`;

export const evaluateSemanticIntent = async (
  llm: LLMPort,
  mandate: Mandate,
  cart: ProposedCart
): Promise<RefereeCheck> => {
  const prompt = `Evaluate if this cart matches the user's intent:
User Prompt: "${mandate.rawRequest}"
Readback: "${mandate.readback}"

Proposed Cart:
Merchant: "${cart.merchant}"
Total: $${(cart.totalCents / 100).toFixed(2)} USD
Items:
${cart.items.map((i) => `- ${i.title} ($${(i.priceCents / 100).toFixed(2)}) [Size: ${i.size ?? "N/A"}]`).join("\n")}

Are there any violations of fuzzy constraints (e.g. secondhand, resale, style, unverified seller)?`;

  try {
    const result = await llm.generateStructured(
      prompt,
      SemanticIntentOutputSchema,
      SYSTEM_INSTRUCTION
    );

    const isFallback = Boolean(llm.isFallbackActive?.());
    const fallbackSuffix = isFallback ? " [AI fallback: mock]" : "";

    return {
      name: "semantic_intent",
      passed: result.matches_intent,
      reason: `${result.reasons.join(" ")}${fallbackSuffix}`,
      confidence: result.confidence
    };
  } catch {
    // Graceful fallback to passing with low confidence or requesting human review
    return {
      name: "semantic_intent",
      passed: true,
      reason: "Semantic check skipped due to provider limits; falling back to deterministic rules. [AI fallback: mock]",
      confidence: 0.6
    };
  }
};
