export type CheckStatus = "pass" | "warn" | "fail";

export interface CheckLike {
  passed: boolean;
  reason: string;
}

export const classifyCheck = (check: CheckLike): CheckStatus => {
  if (!check.passed) {
    return "fail";
  }
  if (check.reason.startsWith("Not verifiable") || check.reason.includes("[AI fallback")) {
    return "warn";
  }
  return "pass";
};
