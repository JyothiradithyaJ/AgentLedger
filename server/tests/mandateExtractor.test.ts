import { describe, expect, it } from "vitest";
import { ParseMandateRequestSchema } from "@agentledger/shared";
import { extractMandateRules } from "../src/agents/index.js";

describe("extractMandateRules", () => {
  it("extracts a red shirt mandate", () => {
    const result = extractMandateRules("buy red shirt under $5 and size should be 30");
    expect(result).toMatchObject({
      budgetCents: 500,
      size: "30",
      attributes: ["red"],
      category: "shirt"
    });
  });

  it("extracts shoes with budget and size", () => {
    const result = extractMandateRules("shoes under $500 with size 6");
    expect(result).toMatchObject({ budgetCents: 50000, size: "6", category: "shoes" });
  });

  it("maps resale exclusions to the known merchant", () => {
    const result = extractMandateRules("running shoes, size 10, under $120, no resale sites");
    expect(result).toMatchObject({ budgetCents: 12000, size: "10", category: "running shoes" });
    expect(result.merchantDeny).toContain("ReSole Outlet");
  });

  it("extracts a blue t-shirt mandate", () => {
    const result = extractMandateRules("blue t-shirt up to $40, size M");
    expect(result).toMatchObject({
      budgetCents: 4000,
      size: "M",
      attributes: ["blue"],
      category: "t-shirt"
    });
  });

  it("extracts a laptop bag without a size", () => {
    const result = extractMandateRules("need a laptop bag max 60 dollars");
    expect(result).toMatchObject({ budgetCents: 6000, category: "laptop bag" });
    expect(result.size).toBeUndefined();
  });

  it("extracts a prefixed numeric size", () => {
    const result = extractMandateRules("get me black sneakers in UK 9 below 75 bucks");
    expect(result).toMatchObject({
      budgetCents: 7500,
      size: "UK 9",
      attributes: ["black"],
      category: "sneakers"
    });
  });

  it("rejects prompt with 501 characters and accepts 500 characters", () => {
    const valid500 = "a".repeat(500);
    expect(ParseMandateRequestSchema.safeParse({ prompt: valid500 }).success).toBe(true);

    const invalid501 = "a".repeat(501);
    const result = ParseMandateRequestSchema.safeParse({ prompt: invalid501 });
    expect(result.success).toBe(false);
  });
});
