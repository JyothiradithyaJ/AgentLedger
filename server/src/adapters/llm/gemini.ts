import type { z } from "zod";
import type { LLMPort } from "../../ports/llm.port.js";
import { env } from "../../config/env.js";
import type { RateLimiter } from "./rateLimiter.js";

class GeminiResponseError extends Error {
  constructor(
    message: string,
    readonly rawModelResponse: string = "",
    readonly status?: number
  ) {
    super(message);
    this.name = "GeminiResponseError";
  }
}

const stripJsonFences = (value: string): string => value
  .trim()
  .replace(/^```(?:json)?\s*/i, "")
  .replace(/\s*```$/, "")
  .trim();

const waitOneSecond = (): Promise<void> => new Promise((resolve) => {
  setTimeout(resolve, 1000);
});

export class GeminiLLMAdapter implements LLMPort {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly rateLimiter: RateLimiter;
  private readonly timeoutMs: number = 15000;

  constructor(
    rateLimiter: RateLimiter,
    apiKey: string = env.GEMINI_API_KEY ?? "",
    model: string = env.GEMINI_MODEL
  ) {
    this.rateLimiter = rateLimiter;
    this.apiKey = apiKey;
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
    if (!this.apiKey) {
      throw new GeminiResponseError("GEMINI_API_KEY is not configured.");
    }

    await this.rateLimiter.acquire();

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
    const body: Record<string, unknown> = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: { type: "OBJECT" },
        temperature: 0.1
      }
    };

    if (systemInstruction) {
      body["systemInstruction"] = {
        parts: [{ text: systemInstruction }]
      };
    }

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal
        });

        if (!response.ok) {
          const errorText = await response.text();
          if (attempt === 0 && response.status === 503) {
            await waitOneSecond();
            continue;
          }
          throw new GeminiResponseError(
            `Gemini API error (${response.status})`,
            errorText.slice(0, 300),
            response.status
          );
        }

        const json = (await response.json()) as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        };
        const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!rawText) {
          throw new GeminiResponseError("Empty candidate response from Gemini API");
        }

        try {
          return schema.parse(JSON.parse(stripJsonFences(rawText)));
        } catch (err) {
          const reason = err instanceof Error ? err.message : "Invalid Gemini JSON response";
          throw new GeminiResponseError(reason, rawText.slice(0, 300));
        }
      } catch (err) {
        if (err instanceof GeminiResponseError) {
          throw err;
        }
        if (controller.signal.aborted) {
          throw new GeminiResponseError("Gemini request timed out after 15 seconds");
        }
        const reason = err instanceof Error ? err.message : "Gemini request failed";
        throw new GeminiResponseError(reason);
      } finally {
        clearTimeout(timeout);
      }
    }

    throw new GeminiResponseError("Gemini request failed after retry");
  }
}
