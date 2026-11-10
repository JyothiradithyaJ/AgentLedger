import crypto from "node:crypto";
import type { Repos } from "../repos/index.js";
import type { PayPalPort } from "../ports/paypal.port.js";
import type { LLMPort } from "../ports/llm.port.js";
import type { LedgerService } from "./ledgerService.js";
import type { DisputeRecord, DisputeVerdict } from "@agentledger/shared";
import { analyzeDispute } from "../agents/disputeAnalyst.js";

export class DisputeService {
  constructor(
    private readonly repos: Repos,
    private readonly paypal: PayPalPort,
    private readonly llm: LLMPort,
    private readonly ledger: LedgerService
  ) {}

  async createSimulatedDispute(
    purchaseId: string,
    reason: string
  ): Promise<DisputeRecord> {
    const purchase = this.repos.purchases.getById(purchaseId);
    if (!purchase) throw new Error(`Purchase ${purchaseId} not found`);

    const id = crypto.randomUUID();
    const paypalDisputeId = `SIM_DISPUTE_${Date.now()}`;
    const now = new Date().toISOString();

    const dispute: DisputeRecord = {
      id,
      paypalDisputeId,
      mandateId: purchase.mandateId,
      purchaseId: purchase.id,
      reason,
      amountCents: purchase.capturedAmountCents,
      status: "WAITING_FOR_SELLER_RESPONSE",
      isSimulated: true,
      allowedEvidenceTypes: ["PROOF_OF_FULFILLMENT", "ADDITIONAL_INFORMATION_EVIDENCE"],
      verdict: null,
      evidenceSubmittedAt: null,
      createdAt: now,
      updatedAt: now
    };

    this.repos.disputes.create(dispute);

    this.ledger.recordEvent("DISPUTE_OPENED", purchase.mandateId, {
      disputeId: id,
      paypalDisputeId,
      purchaseId,
      reason,
      amountCents: dispute.amountCents,
      isSimulated: true
    });

    return dispute;
  }

  async runDisputeAnalysis(disputeId: string): Promise<DisputeVerdict> {
    const dispute = this.repos.disputes.getById(disputeId);
    if (!dispute) throw new Error(`Dispute ${disputeId} not found`);

    const mandate = this.repos.mandates.getById(dispute.mandateId);
    if (!mandate) throw new Error(`Mandate ${dispute.mandateId} not found`);

    const purchase = this.repos.purchases.getById(dispute.purchaseId);
    if (!purchase) throw new Error(`Purchase ${dispute.purchaseId} not found`);

    const ledgerEntries = this.ledger.getMandateEntries(mandate.id);

    const verdict = await analyzeDispute(
      this.llm,
      this.paypal,
      mandate,
      purchase,
      ledgerEntries,
      dispute.paypalDisputeId,
      dispute.reason
    );

    const header = `FAULT ATTRIBUTION: ${verdict.fault}`;
    verdict.evidencePacket = verdict.evidencePacket.startsWith(header)
      ? verdict.evidencePacket
      : `${header}\n\n${verdict.evidencePacket}`;

    dispute.verdict = verdict;
    this.repos.disputes.update(dispute);
    return verdict;
  }

  async submitEvidenceToPayPal(disputeId: string): Promise<DisputeRecord> {
    const dispute = this.repos.disputes.getById(disputeId);
    if (!dispute) throw new Error(`Dispute ${disputeId} not found`);
    if (!dispute.verdict) throw new Error(`Dispute ${disputeId} has no analyzed verdict to submit`);

    const evidenceType = dispute.allowedEvidenceTypes[0] ?? "ADDITIONAL_INFORMATION_EVIDENCE";
    await this.paypal.provideDisputeEvidence(
      dispute.paypalDisputeId,
      evidenceType,
      dispute.verdict.evidencePacket
    );

    dispute.status = "UNDER_REVIEW";
    dispute.evidenceSubmittedAt = new Date().toISOString();
    this.repos.disputes.update(dispute);

    this.ledger.recordEvent("EVIDENCE_SUBMITTED", dispute.mandateId, {
      disputeId: dispute.id,
      paypalDisputeId: dispute.paypalDisputeId,
      fault: dispute.verdict.fault,
      evidenceType,
      submittedAt: dispute.evidenceSubmittedAt
    });

    return dispute;
  }

  getDispute(id: string): DisputeRecord | null {
    return this.repos.disputes.getById(id);
  }

  listDisputes(): DisputeRecord[] {
    return this.repos.disputes.listAll();
  }
}
