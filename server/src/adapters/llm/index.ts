import type { z } from "zod";
import type { LLMPort } from "../../ports/llm.port.js";
import { MockLLMAdapter } from "./mock.js";
import { GeminiLLMAdapter } from "./gemini.js";
import { OllamaLLMAdapter } from "./ollama.js";
import { RateLimiter, CircuitBreaker } from "./rateLimiter.js";
import { generateStructuredJson } from "./structured.js";
import { env } from "../../config/env.js";
import { logger } from "../../observability/logger.js";

export class ResilientLLMAdapter implements LLMPort {
  private readonly primary: LLMPort;
  private readonly fallback: LLMPort;
  private readonly circuitBreaker: CircuitBreaker;
  private lastUsedFallback: boolean = false;

  constructor(primary: LLMPort, fallback: LLMPort = new MockLLMAdapter()) {
    this.primary = primary;
    this.fallback = fallback;
    this.circuitBreaker = new CircuitBreaker(3, 30000);
  }

  isFallbackActive(): boolean {
    return this.circuitBreaker.isOpen() || this.lastUsedFallback;
  }

  async generateStructured<T>(
    prompt: string,
    schema: z.ZodType<T>,
    systemInstruction?: string
  ): Promise<T> {
    this.lastUsedFallback = false;
    return generateStructuredJson(
      this.primary,
      this.fallback,
      this.circuitBreaker,
      prompt,
      schema,
      systemInstruction,
      () => {
        this.lastUsedFallback = true;
      }
    );
  }
}

export const createLLMAdapter = (): LLMPort => {
  const fallback = new MockLLMAdapter();
  const rateLimiter = new RateLimiter(10, 60000);

  if (env.LLM_PROVIDER === "gemini" && env.GEMINI_API_KEY) {
    logger.info({ model: env.GEMINI_MODEL }, "Initializing Gemini LLM Adapter with fallback");
    const gemini = new GeminiLLMAdapter(rateLimiter, env.GEMINI_API_KEY, env.GEMINI_MODEL);
    return new ResilientLLMAdapter(gemini, fallback);
  }

  if (env.LLM_PROVIDER === "ollama") {
    logger.info({ baseUrl: env.OLLAMA_BASE_URL, model: env.OLLAMA_MODEL }, "Initializing Ollama LLM Adapter with fallback");
    const ollama = new OllamaLLMAdapter(env.OLLAMA_BASE_URL, env.OLLAMA_MODEL);
    return new ResilientLLMAdapter(ollama, fallback);
  }

  logger.info("Using deterministic Mock LLM Adapter");
  return fallback;
};

export {
  MockLLMAdapter,
  GeminiLLMAdapter,
  OllamaLLMAdapter,
  RateLimiter,
  CircuitBreaker,
  generateStructuredJson
};
