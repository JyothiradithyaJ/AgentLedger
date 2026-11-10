import type { DatabaseSync } from "./db.js";
import type { Mandate, MandateStatus } from "@agentledger/shared";
import { MandateSchema } from "@agentledger/shared";

interface MandateRow {
  id: string;
  description: string;
  raw_request: string;
  readback: string;
  constraints_json: string;
  status: string;
  budget_cents: number;
  held_cents: number;
  captured_cents: number;
  remaining_cents: number;
  paypal_order_id: string | null;
  paypal_authorization_id: string | null;
  created_at: string;
  updated_at: string;
  expires_at: string;
}

export class MandateRepo {
  constructor(private readonly db: DatabaseSync) {}

  private mapRow(row: MandateRow): Mandate {
    return MandateSchema.parse({
      id: row.id,
      description: row.description,
      rawRequest: row.raw_request,
      readback: row.readback,
      constraints: JSON.parse(row.constraints_json),
      status: row.status as MandateStatus,
      budgetCents: row.budget_cents,
      heldCents: row.held_cents,
      capturedCents: row.captured_cents,
      remainingCents: row.remaining_cents,
      paypalOrderId: row.paypal_order_id,
      paypalAuthorizationId: row.paypal_authorization_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      expiresAt: row.expires_at
    });
  }

  create(mandate: Mandate): void {
    const stmt = this.db.prepare(`
      INSERT INTO mandates (
        id, description, raw_request, readback, constraints_json, status,
        budget_cents, held_cents, captured_cents, remaining_cents,
        paypal_order_id, paypal_authorization_id, created_at, updated_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      mandate.id,
      mandate.description,
      mandate.rawRequest,
      mandate.readback,
      JSON.stringify(mandate.constraints),
      mandate.status,
      mandate.budgetCents,
      mandate.heldCents,
      mandate.capturedCents,
      mandate.remainingCents,
      mandate.paypalOrderId ?? null,
      mandate.paypalAuthorizationId ?? null,
      mandate.createdAt,
      mandate.updatedAt,
      mandate.expiresAt
    );
  }

  getById(id: string): Mandate | null {
    const stmt = this.db.prepare("SELECT * FROM mandates WHERE id = ?");
    const row = stmt.get(id) as unknown as MandateRow | undefined;
    return row ? this.mapRow(row) : null;
  }

  listAll(): Mandate[] {
    const stmt = this.db.prepare("SELECT * FROM mandates ORDER BY created_at DESC");
    const rows = stmt.all() as unknown as MandateRow[];
    return rows.map((r) => this.mapRow(r));
  }

  update(mandate: Mandate): void {
    const stmt = this.db.prepare(`
      UPDATE mandates SET
        status = ?,
        held_cents = ?,
        captured_cents = ?,
        remaining_cents = ?,
        paypal_order_id = ?,
        paypal_authorization_id = ?,
        updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      mandate.status,
      mandate.heldCents,
      mandate.capturedCents,
      mandate.remainingCents,
      mandate.paypalOrderId ?? null,
      mandate.paypalAuthorizationId ?? null,
      new Date().toISOString(),
      mandate.id
    );
  }
}
