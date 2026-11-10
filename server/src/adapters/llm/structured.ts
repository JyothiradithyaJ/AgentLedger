import type { z } from "zod";
import type { LLMPort } from "../../ports/llm.port.js";
import { logger } from "../../observability/logger.js";
import type { CircuitBreaker } from "./rateLimiter.js";

export const generateStructuredJson = async <T>(
  primary: LLMPort,
  fallback: LLMPort,
  circuitBreaker: CircuitBreaker,
  prompt: string,
  schema: z.ZodType<T>,
  systemInstruction?: string
): Promise<T> => {
  // Check circuit breaker first
  if (circuitBreaker.isOpen()) {
    logger.warn("Circuit breaker is OPEN. Falling back to deterministic mock LLM provider.");
    return fallback.generateStructured(prompt, schema, systemInstruction);
  }

  try {
    const result = await primary.generateStructured(prompt, schema, systemInstruction);
    circuitBreaker.recordSuccess();
    return result;
  } catch (err) {
    logger.warn({ err }, "Initial structured LLM generation failed. Attempting one repair retry...");

    // One repair retry with explicit correction hint
    const repairPrompt = `${prompt}\n\nIMPORTANT: The previous output failed schema validation. Output ONLY valid JSON adhering strictly to the requested schema.`;
    try {
      const repaired = await primary.generateStructured(repairPrompt, schema, systemInstruction);
      circuitBreaker.recordSuccess();
      return repaired;
    } catch (retryErr) {
      circuitBreaker.recordFailure();
      logger.error({ retryErr }, "LLM repair retry failed. Falling back to deterministic mock provider.");
      return fallback.generateStructured(prompt, schema, systemInstruction);
    }
  }
};
