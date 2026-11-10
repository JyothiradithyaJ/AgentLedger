import type { LLMPort } from "../ports/llm.port.js";
import type { PayPalPort } from "../ports/paypal.port.js";
import type {
  DisputeVerdict,
  LedgerEntry,
  Mandate,
  PurchaseRecord
} from "@agentledger/shared";
import { DisputeVerdictSchema } from "@agentledger/shared";
import { attributeFault } from "../domain/verdict.js";
import { logger } from "../observability/logger.js";

const SYSTEM_INSTRUCTION = `You are the AgentLedger Dispute Analyst Agent.
Your duty is to read cryptographic ledger evidence and PayPal transaction history to determine liability
for agent-delegated shopping transactions.
Categorize fault as: AGENT, MERCHANT, BUYER, or INSUFFICIENT_EVIDENCE.
Always provide structured 3-party responsibility notes and an evidence packet formatted for the PayPal Disputes API.`;

export const analyzeDispute = async (
  llm: LLMPort,
  paypal: PayPalPort,
  mandate: Mandate,
  purchase: PurchaseRecord,
  ledgerEntries: LedgerEntry[],
  disputeId: string,
  disputeReason: string
): Promise<DisputeVerdict> => {
  let allowedEvidenceTypes = ["PROOF_OF_FULFILLMENT", "ADDITIONAL_INFORMATION_EVIDENCE"];
  try {
    const disputeDetails = await paypal.getDispute(disputeId);
    allowedEvidenceTypes = disputeDetails.allowedEvidenceTypes;
  } catch (err) {
    logger.warn({ err, disputeId }, "Could not fetch dispute details from PayPal port; using defaults");
  }

  const prompt = `Analyze this transaction dispute and determine fault:
Dispute ID: ${disputeId}
Dispute Reason: "${disputeReason}"
Allowed Evidence Types by PayPal: [${allowedEvidenceTypes.join(", ")}]

Mandate Details:
- User Intent: "${mandate.rawRequest}"
- Budget Cap: $${(mandate.constraints.budgetAmountCents / 100).toFixed(2)}
- Constraints: Category="${mandate.constraints.itemCategory}", Size="${mandate.constraints.size ?? "N/A"}"
- Denied Merchants: [${mandate.constraints.merchantDeny.join(", ")}]

Purchase Details:
- Merchant: "${purchase.cart.merchant}"
- Total: $${(purchase.cart.totalCents / 100).toFixed(2)}
- Items: ${purchase.cart.items.map((i) => i.title).join(", ")}
- Captured Amount: $${(purchase.capturedAmountCents / 100).toFixed(2)}
- Referee Decision: Allowed=${purchase.refereeDecision?.allowed ?? "None"}

Cryptographic Evidence Chain:
- Verified Entries Count: ${ledgerEntries.length}
- Events in Sequence: ${ledgerEntries.map((e) => e.eventType).join(" -> ")}

Attribute fault and output complete JSON adhering to the DisputeVerdict schema.`;

  try {
    const verdict = await llm.generateStructured(prompt, DisputeVerdictSchema, SYSTEM_INSTRUCTION);
    if (llm.isFallbackActive?.()) {
      const firstReason = verdict.reasons[0] ?? "";
      verdict.reasons[0] = `${firstReason} [AI fallback: mock]`;
    }
    return verdict;
  } catch (err) {
    logger.warn({ err }, "LLM dispute analysis failed; falling back to deterministic domain rule attribution");
    const verdict = attributeFault(mandate, purchase, ledgerEntries, disputeReason);
    const firstReason = verdict.reasons[0] ?? "";
    verdict.reasons[0] = `${firstReason} [AI fallback: mock]`;
    return verdict;
  }
};
