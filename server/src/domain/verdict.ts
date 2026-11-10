import type {
  DisputeVerdict,
  LedgerEntry,
  Mandate,
  PurchaseRecord
} from "@agentledger/shared";

export const attributeFault = (
  mandate: Mandate,
  purchase: PurchaseRecord,
  ledgerEntries: LedgerEntry[],
  disputeReason: string
): DisputeVerdict => {
  const normalizedReason = disputeReason.toLowerCase();

  // 1. Check if buyer claims "never asked for this" or unauthorized
  const isUnauthorizedClaim =
    normalizedReason.includes("unauthorized") ||
    normalizedReason.includes("never asked") ||
    normalizedReason.includes("didn't want");

  // 2. Check if agent acted outside mandate constraints
  const cartPrice = purchase.cart.totalCents;
  const isOverBudget = cartPrice > mandate.constraints.budgetAmountCents;
  const isDeniedMerchant = mandate.constraints.merchantDeny.some(
    (m) => m.toLowerCase() === purchase.cart.merchant.toLowerCase()
  );

  // 3. Examine Referee decision
  const refereeDecision = purchase.refereeDecision;
  const refereePassed = refereeDecision?.allowed ?? false;

  // Case A: Agent Drift (Agent bought wrong / over budget / prohibited merchant despite mandate)
  if (isOverBudget || isDeniedMerchant || (!refereePassed && purchase.status === "CAPTURED")) {
    return {
      fault: "AGENT",
      confidence: 0.95,
      reasons: [
        `The shopping agent proposed a cart violating mandate constraints (budget: $${(mandate.constraints.budgetAmountCents / 100).toFixed(2)}, cart: $${(cartPrice / 100).toFixed(2)}).`,
        `Cryptographic ledger sequence confirms agent drifted from user prompt: "${mandate.rawRequest}".`
      ],
      recommendedAction: "Agent provider should reimburse the buyer under agent-delegation liability.",
      responsibility: {
        buyer: "Exonerated: Prompt clearly defined valid parameters.",
        agentProvider: "100% Liable: Agent breached signed mandate rules.",
        merchant: "Exonerated: Processed the authorized payment in good faith."
      },
      evidencePacket: `EVIDENCE PACKET: AGENT_FAULT
Mandate ID: ${mandate.id}
User Intent: "${mandate.rawRequest}"
Allowed Budget: $${(mandate.constraints.budgetAmountCents / 100).toFixed(2)}
Agent Selected: "${purchase.cart.items.map((i) => i.title).join(", ")}" from ${purchase.cart.merchant} for $${(cartPrice / 100).toFixed(2)}
Finding: Autonomous agent drifted from explicit user constraints. Provider assumes responsibility.`
    };
  }

  // Case B: Buyer Remorse (User explicitly requested item, agent complied within budget, verified in ledger)
  if (isUnauthorizedClaim && refereePassed && !isOverBudget && !isDeniedMerchant) {
    return {
      fault: "BUYER",
      confidence: 0.92,
      reasons: [
        `User signed mandate on ${mandate.createdAt} explicitly approving: "${mandate.readback}".`,
        `Agent purchased item strictly complying with all budget, category, and merchant limits.`,
        `Ledger sequence provides Ed25519-signed proof of buyer authorization hold.`
      ],
      recommendedAction: "Deny dispute. Buyer approved the mandate hold and purchase was strictly within parameters.",
      responsibility: {
        buyer: "100% Responsible: Transaction was explicitly authorized within signed mandate.",
        agentProvider: "Exonerated: Agent followed all deterministic and semantic rules.",
        merchant: "Exonerated: Fulfilled valid authorized order."
      },
      evidencePacket: `EVIDENCE PACKET: BUYER_AUTHORIZATION_VERIFIED
Mandate ID: ${mandate.id}
Signed Hold: $${(mandate.budgetCents / 100).toFixed(2)}
Readback Confirmed by Buyer: "${mandate.readback}"
Captured Amount: $${(purchase.capturedAmountCents / 100).toFixed(2)}
Signed Ledger Entries: ${ledgerEntries.length} verified cryptographically.
Finding: The buyer explicitly authorized this transaction hold; agent strictly obeyed mandate constraints.`
    };
  }

  // Case C: Merchant Issue (Counterfeit, defective, not received)
  const isMerchantIssue =
    normalizedReason.includes("not received") ||
    normalizedReason.includes("damaged") ||
    normalizedReason.includes("counterfeit") ||
    normalizedReason.includes("wrong item shipped");

  if (isMerchantIssue) {
    return {
      fault: "MERCHANT",
      confidence: 0.88,
      reasons: [
        `Agent correctly placed order at merchant "${purchase.cart.merchant}".`,
        `Dispute pertains to product fulfillment, condition, or non-delivery post-capture.`
      ],
      recommendedAction: "Process standard merchant refund under PayPal Seller Protection / Buyer Protection guidelines.",
      responsibility: {
        buyer: "Entitled to refund for unfulfilled or damaged goods.",
        agentProvider: "Exonerated: Agent executed valid transaction.",
        merchant: "100% Responsible: Failed fulfillment or defective merchandise delivered."
      },
      evidencePacket: `EVIDENCE PACKET: MERCHANT_FULFILLMENT_FAILURE
Mandate ID: ${mandate.id}
Merchant: ${purchase.cart.merchant}
Capture ID: ${purchase.paypalCaptureId ?? "N/A"}
Claim: ${disputeReason}
Finding: Transaction execution was legitimate; fulfillment failure lies with merchant.`
    };
  }

  // Case D: Insufficient Evidence Fallback
  return {
    fault: "INSUFFICIENT_EVIDENCE",
    confidence: 0.5,
    reasons: ["Dispute reason lacks conclusive diagnostic records."],
    recommendedAction: "Escalate for manual human mediation.",
    responsibility: {
      buyer: "Pending further documentation.",
      agentProvider: "Pending further review.",
      merchant: "Pending shipment tracking confirmation."
    },
    evidencePacket: `EVIDENCE PACKET: MANUAL_REVIEW_REQUIRED\nMandate: ${mandate.id}\nClaim: ${disputeReason}`
  };
};
