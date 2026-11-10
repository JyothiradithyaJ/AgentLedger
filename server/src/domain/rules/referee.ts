import type {
  Mandate,
  ProposedCart,
  RefereeCheck
} from "@agentledger/shared";

export interface DeterministicRulesResult {
  passed: boolean;
  checks: RefereeCheck[];
  reasons: string[];
}

export const evaluateDeterministicRules = (
  mandate: Mandate,
  cart: ProposedCart
): DeterministicRulesResult => {
  const checks: RefereeCheck[] = [];
  const reasons: string[] = [];

  // 1. Expiry Check
  const now = new Date();
  const mandateExpiresAt = new Date(mandate.expiresAt);
  const isExpired = now.getTime() > mandateExpiresAt.getTime();
  if (isExpired) {
    checks.push({
      name: "budget",
      passed: false,
      reason: `Mandate expired on ${mandate.expiresAt}`,
      confidence: 1.0
    });
    reasons.push("Mandate has expired.");
  }

  // 2. Budget Check (both total mandate budget cap & remaining budget)
  const availableCents = mandate.remainingCents;
  const budgetCapCents = mandate.constraints.budgetAmountCents;
  const isWithinBudget = cart.totalCents <= budgetCapCents && cart.totalCents <= availableCents;

  if (isWithinBudget) {
    checks.push({
      name: "budget",
      passed: true,
      reason: `Cart total $${(cart.totalCents / 100).toFixed(2)} is within authorized budget cap of $${(budgetCapCents / 100).toFixed(2)} and available $${(availableCents / 100).toFixed(2)}`,
      confidence: 1.0
    });
  } else {
    const reason = `Cart total $${(cart.totalCents / 100).toFixed(2)} exceeds available budget of $${(availableCents / 100).toFixed(2)} (cap: $${(budgetCapCents / 100).toFixed(2)})`;
    checks.push({
      name: "budget",
      passed: false,
      reason,
      confidence: 1.0
    });
    reasons.push(reason);
  }

  // 3. Merchant Allowlist Check
  const allowedMerchants = mandate.constraints.merchantAllow;
  if (allowedMerchants.length > 0) {
    const isAllowed = allowedMerchants.some(
      (m) => m.toLowerCase() === cart.merchant.toLowerCase()
    );
    if (isAllowed) {
      checks.push({
        name: "merchant",
        passed: true,
        reason: `Merchant "${cart.merchant}" is on the allowed list`,
        confidence: 1.0
      });
    } else {
      const reason = `Merchant "${cart.merchant}" is not in the allowed list [${allowedMerchants.join(", ")}]`;
      checks.push({
        name: "merchant",
        passed: false,
        reason,
        confidence: 1.0
      });
      reasons.push(reason);
    }
  }

  // 4. Merchant Denylist Check
  const deniedMerchants = mandate.constraints.merchantDeny;
  if (deniedMerchants.length > 0) {
    const isDenied = deniedMerchants.some(
      (m) => m.toLowerCase() === cart.merchant.toLowerCase()
    );
    if (isDenied) {
      const reason = `Merchant "${cart.merchant}" is on the prohibited list [${deniedMerchants.join(", ")}]`;
      checks.push({
        name: "merchant",
        passed: false,
        reason,
        confidence: 1.0
      });
      reasons.push(reason);
    } else {
      checks.push({
        name: "merchant",
        passed: true,
        reason: `Merchant "${cart.merchant}" is not on the prohibited list`,
        confidence: 1.0
      });
    }
  } else if (allowedMerchants.length === 0) {
    checks.push({
      name: "merchant",
      passed: true,
      reason: `No merchant restrictions specified; "${cart.merchant}" accepted`,
      confidence: 1.0
    });
  }

  // 5. Size Check
  const requiredSize = mandate.constraints.size;
  if (requiredSize) {
    const sizeMatches = cart.items.every((item) => {
      if (!item.size) return false;
      return item.size.toLowerCase() === requiredSize.toLowerCase();
    });

    if (sizeMatches) {
      checks.push({
        name: "size",
        passed: true,
        reason: `All items match required size "${requiredSize}"`,
        confidence: 1.0
      });
    } else {
      const reason = `Cart item sizes do not match requested size "${requiredSize}"`;
      checks.push({
        name: "size",
        passed: false,
        reason,
        confidence: 1.0
      });
      reasons.push(reason);
    }
  } else {
    checks.push({
      name: "size",
      passed: true,
      reason: "No specific size constraint required",
      confidence: 1.0
    });
  }

  // 6. Quantity Check
  const totalQuantity = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  if (totalQuantity > 0 && totalQuantity <= 5) {
    checks.push({
      name: "quantity",
      passed: true,
      reason: `Cart quantity (${totalQuantity}) is within expected limits`,
      confidence: 1.0
    });
  } else {
    const reason = `Cart quantity (${totalQuantity}) is outside expected limits (1-5)`;
    checks.push({
      name: "quantity",
      passed: false,
      reason,
      confidence: 1.0
    });
    reasons.push(reason);
  }

  // 7. Item / Category Match (Deterministic lexical check across title & attributes)
  const requiredCategory = mandate.constraints.itemCategory.toLowerCase();
  const categoryMatched = cart.items.some((item) => {
    const title = item.title.toLowerCase();
    const attrs = item.attributes.map((a) => a.toLowerCase()).join(" ");
    const text = `${title} ${attrs}`;
    const words = requiredCategory.split(/\s+/);
    return words.some((word) => word.length > 2 && text.includes(word));
  });

  if (categoryMatched) {
    checks.push({
      name: "item_match",
      passed: true,
      reason: `Item title matches required category "${mandate.constraints.itemCategory}"`,
      confidence: 0.9
    });
  } else {
    const reason = `Cart item description does not clearly match category "${mandate.constraints.itemCategory}"`;
    checks.push({
      name: "item_match",
      passed: false,
      reason,
      confidence: 0.8
    });
    reasons.push(reason);
  }

  const passed = checks.every((c) => c.passed);
  return {
    passed,
    checks,
    reasons
  };
};
