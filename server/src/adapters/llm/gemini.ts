import type { z } from "zod";
import type { LLMPort } from "../../ports/llm.port.js";
import { env } from "../../config/env.js";
import { logger } from "../../observability/logger.js";
import type { RateLimiter } from "./rateLimiter.js";

export class GeminiLLMAdapter implements LLMPort {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly rateLimiter: RateLimiter;
  private readonly timeoutMs: number = 20000;

  constructor(
    rateLimiter: RateLimiter,
    apiKey: string = env.GEMINI_API_KEY ?? "",
    model: string = env.GEMINI_MODEL
  ) {
    this.rateLimiter = rateLimiter;
    this.apiKey = apiKey;
    this.model = model;
  }

  async generateStructured<T>(
    prompt: string,
    schema: z.ZodType<T>,
    systemInstruction?: string
  ): Promise<T> {
    if (!this.apiKey) {
      throw new Error("GEMINI_API_KEY is not configured.");
    }

    await this.rateLimiter.acquire();

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    const body: Record<string, unknown> = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1
      }
    };

    if (systemInstruction) {
      body["systemInstruction"] = {
        parts: [{ text: systemInstruction }]
      };
    }

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error({ status: response.status, errorText }, "Gemini API request failed");
        throw new Error(`Gemini API error (${response.status}): ${errorText}`);
      }

      const json = (await response.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };

      const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        throw new Error("Empty candidate response from Gemini API");
      }

      const parsed = JSON.parse(rawText);
      return schema.parse(parsed);
    } finally {
      clearTimeout(timeout);
    }
  }
}
