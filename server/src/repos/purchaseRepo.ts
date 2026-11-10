import type { DatabaseSync } from "./db.js";
import type { PurchaseRecord, PurchaseStatus, PurchaseDecision } from "@agentledger/shared";
import { PurchaseRecordSchema } from "@agentledger/shared";

interface PurchaseRow {
  id: string;
  mandate_id: string;
  run_id: string;
  cart_json: string;
  referee_decision_json: string | null;
  human_decision: string | null;
  status: string;
  paypal_capture_id: string | null;
  captured_amount_cents: number;
  released_amount_cents: number;
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
}

export class PurchaseRepo {
  constructor(private readonly db: DatabaseSync) {}

  private mapRow(row: PurchaseRow): PurchaseRecord {
    return PurchaseRecordSchema.parse({
      id: row.id,
      mandateId: row.mandate_id,
      runId: row.run_id,
      cart: JSON.parse(row.cart_json),
      refereeDecision: row.referee_decision_json ? JSON.parse(row.referee_decision_json) : null,
      humanDecision: row.human_decision as PurchaseDecision | null,
      status: row.status as PurchaseStatus,
      paypalCaptureId: row.paypal_capture_id,
      capturedAmountCents: row.captured_amount_cents,
      releasedAmountCents: row.released_amount_cents,
      failureReason: row.failure_reason,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  }

  create(purchase: PurchaseRecord): void {
    const stmt = this.db.prepare(`
      INSERT INTO purchases (
        id, mandate_id, run_id, cart_json, referee_decision_json,
        human_decision, status, paypal_capture_id,
        captured_amount_cents, released_amount_cents, failure_reason,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      purchase.id,
      purchase.mandateId,
      purchase.runId,
      JSON.stringify(purchase.cart),
      purchase.refereeDecision ? JSON.stringify(purchase.refereeDecision) : null,
      purchase.humanDecision ?? null,
      purchase.status,
      purchase.paypalCaptureId ?? null,
      purchase.capturedAmountCents,
      purchase.releasedAmountCents,
      purchase.failureReason ?? null,
      purchase.createdAt,
      purchase.updatedAt
    );
  }

  getById(id: string): PurchaseRecord | null {
    const stmt = this.db.prepare("SELECT * FROM purchases WHERE id = ?");
    const row = stmt.get(id) as unknown as PurchaseRow | undefined;
    return row ? this.mapRow(row) : null;
  }

  listByMandate(mandateId: string): PurchaseRecord[] {
    const stmt = this.db.prepare("SELECT * FROM purchases WHERE mandate_id = ? ORDER BY created_at DESC");
    const rows = stmt.all(mandateId) as unknown as PurchaseRow[];
    return rows.map((r) => this.mapRow(r));
  }

  update(purchase: PurchaseRecord): void {
    const stmt = this.db.prepare(`
      UPDATE purchases SET
        referee_decision_json = ?,
        human_decision = ?,
        status = ?,
        paypal_capture_id = ?,
        captured_amount_cents = ?,
        released_amount_cents = ?,
        failure_reason = ?,
        updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      purchase.refereeDecision ? JSON.stringify(purchase.refereeDecision) : null,
      purchase.humanDecision ?? null,
      purchase.status,
      purchase.paypalCaptureId ?? null,
      purchase.capturedAmountCents,
      purchase.releasedAmountCents,
      purchase.failureReason ?? null,
      new Date().toISOString(),
      purchase.id
    );
  }
}
