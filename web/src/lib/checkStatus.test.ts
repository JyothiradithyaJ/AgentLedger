import { describe, it, expect } from "vitest";
import { classifyCheck } from "./checkStatus.js";

describe("classifyCheck", () => {
  it("returns fail when passed is false", () => {
    const status = classifyCheck({
      passed: false,
      reason: "Cart total $139.00 USD exceeds available budget of $120.00 USD"
    });
    expect(status).toBe("fail");
  });

  it("returns warn when passed is true and reason starts with Not verifiable", () => {
    const status = classifyCheck({
      passed: true,
      reason: "Not verifiable: size not available on this catalogue"
    });
    expect(status).toBe("warn");
  });

  it("returns warn when passed is true and reason contains [AI fallback", () => {
    const status = classifyCheck({
      passed: true,
      reason: "Semantic check passed [AI fallback: circuit breaker active]"
    });
    expect(status).toBe("warn");
  });

  it("returns pass when passed is true and clean reason", () => {
    const status = classifyCheck({
      passed: true,
      reason: "All items match required size 10"
    });
    expect(status).toBe("pass");
  });
});
