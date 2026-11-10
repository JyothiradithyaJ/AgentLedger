import { describe, it, expect } from "vitest";
import type { RefereeCheck } from "@agentledger/shared";

describe("Referee Checklist UI Logic Tests", () => {
  const sampleChecks: RefereeCheck[] = [
    {
      name: "budget",
      passed: true,
      reason: "Cart total $98.50 is within authorized budget cap of $120.00",
      confidence: 1.0
    },
    {
      name: "merchant",
      passed: true,
      reason: "Merchant 'StrideCo' is on the allowed list",
      confidence: 1.0
    },
    {
      name: "semantic_intent",
      passed: false,
      reason: "Merchant 'ReSole Outlet' is an unapproved resale marketplace",
      confidence: 0.95
    }
  ];

  it("determines overall pass when all checks pass", () => {
    const passedSubset = sampleChecks.slice(0, 2);
    const allPassed = passedSubset.every((c) => c.passed);
    expect(allPassed).toBe(true);
  });

  it("identifies failing checks and formats descriptive reason", () => {
    const failedCheck = sampleChecks.find((c) => !c.passed);
    expect(failedCheck).toBeDefined();
    expect(failedCheck?.name).toBe("semantic_intent");
    expect(failedCheck?.reason).toContain("resale marketplace");
  });

  it("computes confidence percentage for UI display badge", () => {
    const check = sampleChecks[2]!;
    const confidencePct = Math.round(check.confidence * 100);
    expect(confidencePct).toBe(95);
  });
});
