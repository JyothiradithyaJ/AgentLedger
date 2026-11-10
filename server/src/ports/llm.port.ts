import type { z } from "zod";

export interface LLMPort {
  generateStructured<T>(
    prompt: string,
    schema: z.ZodType<T>,
    systemInstruction?: string
  ): Promise<T>;
}
