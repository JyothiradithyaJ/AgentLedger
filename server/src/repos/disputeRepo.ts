import type { DatabaseSync } from "./db.js";
import type { DisputeRecord, DisputeStatus } from "@agentledger/shared";
import { DisputeRecordSchema } from "@agentledger/shared";

interface DisputeRow {
  id: string;
  paypal_dispute_id: string;
  mandate_id: string;
  purchase_id: string;
  reason: string;
  amount_cents: number;
  status: string;
  is_simulated: number;
  allowed_evidence_types_json: string;
  verdict_json: string | null;
  evidence_submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

export class DisputeRepo {
  constructor(private readonly db: DatabaseSync) {}

  private mapRow(row: DisputeRow): DisputeRecord {
    return DisputeRecordSchema.parse({
      id: row.id,
      paypalDisputeId: row.paypal_dispute_id,
      mandateId: row.mandate_id,
      purchaseId: row.purchase_id,
      reason: row.reason,
      amountCents: row.amount_cents,
      status: row.status as DisputeStatus,
      isSimulated: Boolean(row.is_simulated),
      allowedEvidenceTypes: JSON.parse(row.allowed_evidence_types_json),
      verdict: row.verdict_json ? JSON.parse(row.verdict_json) : null,
      evidenceSubmittedAt: row.evidence_submitted_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  }

  create(dispute: DisputeRecord): void {
    const stmt = this.db.prepare(`
      INSERT INTO disputes (
        id, paypal_dispute_id, mandate_id, purchase_id,
        reason, amount_cents, status, is_simulated,
        allowed_evidence_types_json, verdict_json,
        evidence_submitted_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      dispute.id,
      dispute.paypalDisputeId,
      dispute.mandateId,
      dispute.purchaseId,
      dispute.reason,
      dispute.amountCents,
      dispute.status,
      dispute.isSimulated ? 1 : 0,
      JSON.stringify(dispute.allowedEvidenceTypes),
      dispute.verdict ? JSON.stringify(dispute.verdict) : null,
      dispute.evidenceSubmittedAt ?? null,
      dispute.createdAt,
      dispute.updatedAt
    );
  }

  getById(id: string): DisputeRecord | null {
    const stmt = this.db.prepare("SELECT * FROM disputes WHERE id = ?");
    const row = stmt.get(id) as unknown as DisputeRow | undefined;
    return row ? this.mapRow(row) : null;
  }

  listAll(): DisputeRecord[] {
    const stmt = this.db.prepare("SELECT * FROM disputes ORDER BY created_at DESC");
    const rows = stmt.all() as unknown as DisputeRow[];
    return rows.map((r) => this.mapRow(r));
  }

  update(dispute: DisputeRecord): void {
    const stmt = this.db.prepare(`
      UPDATE disputes SET
        status = ?,
        allowed_evidence_types_json = ?,
        verdict_json = ?,
        evidence_submitted_at = ?,
        updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      dispute.status,
      JSON.stringify(dispute.allowedEvidenceTypes),
      dispute.verdict ? JSON.stringify(dispute.verdict) : null,
      dispute.evidenceSubmittedAt ?? null,
      new Date().toISOString(),
      dispute.id
    );
  }
}
