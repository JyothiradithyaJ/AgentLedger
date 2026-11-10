import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import type { LLMPort } from "../src/ports/llm.port.js";
import { generateStructuredJson } from "../src/adapters/llm/structured.js";
import { CircuitBreaker } from "../src/adapters/llm/rateLimiter.js";
import { ResilientLLMAdapter } from "../src/adapters/llm/index.js";

const SampleSchema = z.object({
  status: z.string(),
  count: z.number()
});
type SampleType = z.infer<typeof SampleSchema>;

describe("Structured LLM and Circuit Breaker Unit Tests", () => {
  it("does not attempt repair retry on HTTP 429 and routes directly to fallback", async () => {
    const primaryMock: LLMPort = {
      generateStructured: vi.fn().mockRejectedValue(new Error("Gemini API error (429): Resource has been exhausted"))
    };

    const fallbackMock: LLMPort = {
      generateStructured: vi.fn().mockResolvedValue({ status: "mocked", count: 42 })
    };

    const circuitBreaker = new CircuitBreaker(2, 60000);
    const onFallback = vi.fn();

    const result = await generateStructuredJson(
      primaryMock,
      fallbackMock,
      circuitBreaker,
      "test prompt",
      SampleSchema,
      undefined,
      onFallback
    );

    // Primary should have been called exactly once (NO repair retry)
    expect(primaryMock.generateStructured).toHaveBeenCalledTimes(1);
    // Fallback was invoked
    expect(fallbackMock.generateStructured).toHaveBeenCalledTimes(1);
    expect(onFallback).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ status: "mocked", count: 42 });
  });

  it("does not attempt repair retry on HTTP 503 and routes directly to fallback", async () => {
    const primaryMock: LLMPort = {
      generateStructured: vi.fn().mockRejectedValue(new Error("Gemini API error (503): Service Unavailable"))
    };

    const fallbackMock: LLMPort = {
      generateStructured: vi.fn().mockResolvedValue({ status: "fallback_ok", count: 100 })
    };

    const circuitBreaker = new CircuitBreaker(2, 60000);
    const onFallback = vi.fn();

    const result = await generateStructuredJson(
      primaryMock,
      fallbackMock,
      circuitBreaker,
      "test prompt 503",
      SampleSchema,
      undefined,
      onFallback
    );

    expect(primaryMock.generateStructured).toHaveBeenCalledTimes(1);
    expect(fallbackMock.generateStructured).toHaveBeenCalledTimes(1);
    expect(onFallback).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ status: "fallback_ok", count: 100 });
  });

  it("attempts one repair retry on JSON validation/schema error", async () => {
    const primaryMock: LLMPort = {
      generateStructured: vi
        .fn()
        .mockRejectedValueOnce(new Error("ZodError: Expected number, received string"))
        .mockResolvedValueOnce({ status: "repaired", count: 7 })
    };

    const fallbackMock: LLMPort = {
      generateStructured: vi.fn()
    };

    const circuitBreaker = new CircuitBreaker(2, 60000);
    const onFallback = vi.fn();

    const result = await generateStructuredJson(
      primaryMock,
      fallbackMock,
      circuitBreaker,
      "test prompt invalid json",
      SampleSchema,
      undefined,
      onFallback
    );

    // Primary should have been called twice (1 initial + 1 repair)
    expect(primaryMock.generateStructured).toHaveBeenCalledTimes(2);
    // Fallback should not have been called because repair succeeded
    expect(fallbackMock.generateStructured).not.toHaveBeenCalled();
    expect(onFallback).not.toHaveBeenCalled();
    expect(result).toEqual({ status: "repaired", count: 7 });
  });

  it("ResilientLLMAdapter tracks isFallbackActive correctly", async () => {
    const primaryMock: LLMPort = {
      generateStructured: vi.fn().mockRejectedValue(new Error("Gemini API error (429)"))
    };

    const fallbackMock: LLMPort = {
      generateStructured: vi.fn().mockResolvedValue({ status: "from_fallback", count: 1 }),
      isFallbackActive: () => true
    };

    const adapter = new ResilientLLMAdapter(primaryMock, fallbackMock);
    expect(adapter.isFallbackActive()).toBe(false);

    const result = await adapter.generateStructured("hello", SampleSchema);
    expect(result).toEqual({ status: "from_fallback", count: 1 });
    expect(adapter.isFallbackActive()).toBe(true);
  });
});
