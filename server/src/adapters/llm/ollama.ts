import type { z } from "zod";
import type { LLMPort } from "../../ports/llm.port.js";
import { env } from "../../config/env.js";
import { logger } from "../../observability/logger.js";

export class OllamaLLMAdapter implements LLMPort {
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly timeoutMs: number = 20000;

  constructor(
    baseUrl: string = env.OLLAMA_BASE_URL,
    model: string = env.OLLAMA_MODEL
  ) {
    this.baseUrl = baseUrl;
    this.model = model;
  }

  isFallbackActive(): boolean {
    return false;
  }

  async generateStructured<T>(
    prompt: string,
    schema: z.ZodType<T>,
    systemInstruction?: string
  ): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    const body = {
      model: this.model,
      prompt,
      system: systemInstruction,
      format: "json",
      stream: false
    };

    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error({ status: response.status, errorText }, "Ollama API request failed");
        throw new Error(`Ollama API error (${response.status}): ${errorText}`);
      }

      const json = (await response.json()) as { response: string };
      const parsed = JSON.parse(json.response);
      return schema.parse(parsed);
    } finally {
      clearTimeout(timeout);
    }
  }
}
