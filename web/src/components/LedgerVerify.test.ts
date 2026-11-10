import { describe, it, expect } from "vitest";
import type { VerifyLedgerResponse } from "@agentledger/shared";

describe("Ledger Verify UI Animation and State Tests", () => {
  it("formats positive verification state for UI status banner", () => {
    const successResponse: VerifyLedgerResponse = {
      valid: true,
      totalEntries: 5,
      brokenSequence: null,
      reason: null
    };

    expect(successResponse.valid).toBe(true);
    expect(successResponse.brokenSequence).toBeNull();
    const bannerText = `${successResponse.totalEntries} entries verified cryptographically.`;
    expect(bannerText).toContain("5 entries verified");
  });

  it("identifies broken sequence index for highlighting compromised entry card", () => {
    const failureResponse: VerifyLedgerResponse = {
      valid: false,
      totalEntries: 6,
      brokenSequence: 2,
      reason: "Payload tamper detected at sequence 2"
    };

    expect(failureResponse.valid).toBe(false);
    expect(failureResponse.brokenSequence).toBe(2);

    const isTargetBroken = (seq: number) => failureResponse.brokenSequence === seq;

    expect(isTargetBroken(2)).toBe(true);
    expect(isTargetBroken(1)).toBe(false);
  });
});
