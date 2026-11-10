import type { PayPalClient } from "./client.js";
import type { DisputeDetails } from "../../ports/paypal.port.js";

interface PayPalDisputeResponse {
  dispute_id: string;
  status: string;
  dispute_amount: {
    currency_code: string;
    value: string;
  };
  reason?: string;
  dispute_life_cycle_stage?: string;
  allowed_response_options?: Array<{
    evidence_type?: string[];
  }>;
}

export const getDispute = async (
  client: PayPalClient,
  disputeId: string
): Promise<DisputeDetails> => {
  const response = await client.request<PayPalDisputeResponse>(
    `/v1/customer/disputes/${disputeId}`
  );

  const amountCents = Math.round(parseFloat(response.dispute_amount.value) * 100);
  const evidenceTypes = response.allowed_response_options?.flatMap(
    (opt) => opt.evidence_type ?? []
  ) ?? ["PROOF_OF_FULFILLMENT", "ADDITIONAL_INFORMATION_EVIDENCE"];

  return {
    disputeId: response.dispute_id,
    status: response.status,
    amountCents,
    reason: response.reason,
    allowedEvidenceTypes: Array.from(new Set(evidenceTypes))
  };
};

export const provideDisputeEvidence = async (
  client: PayPalClient,
  disputeId: string,
  evidenceType: string,
  notes: string
): Promise<{ status: string }> => {
  const body = {
    evidences: [
      {
        evidence_type: evidenceType,
        evidence_info: {
          tracking_info: [],
          notes
        }
      }
    ]
  };

  await client.request<Record<string, unknown>>(
    `/v1/customer/disputes/${disputeId}/provide-evidence`,
    {
      method: "POST",
      body,
      requestId: `evidence_${disputeId}`
    }
  );

  return { status: "EVIDENCE_SUBMITTED" };
};
