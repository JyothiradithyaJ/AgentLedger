import type { DatabaseSync } from "./db.js";
import type { LedgerEntry, LedgerEventType } from "@agentledger/shared";
import { LedgerEntrySchema } from "@agentledger/shared";

interface LedgerRow {
  sequence: number;
  previous_hash: string;
  current_hash: string;
  timestamp: string;
  event_type: string;
  mandate_id: string;
  payload_json: string;
  signature: string;
  public_key: string;
}

export class LedgerRepo {
  constructor(private readonly db: DatabaseSync) {}

  private mapRow(row: LedgerRow): LedgerEntry {
    return LedgerEntrySchema.parse({
      sequence: row.sequence,
      previousHash: row.previous_hash,
      currentHash: row.current_hash,
      timestamp: row.timestamp,
      eventType: row.event_type as LedgerEventType,
      mandateId: row.mandate_id,
      payload: JSON.parse(row.payload_json),
      signature: row.signature,
      publicKey: row.public_key
    });
  }

  append(entry: LedgerEntry): void {
    const stmt = this.db.prepare(`
      INSERT INTO ledger_entries (
        sequence, previous_hash, current_hash, timestamp,
        event_type, mandate_id, payload_json, signature, public_key
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      entry.sequence,
      entry.previousHash,
      entry.currentHash,
      entry.timestamp,
      entry.eventType,
      entry.mandateId,
      JSON.stringify(entry.payload),
      entry.signature,
      entry.publicKey
    );
  }

  getLatest(): LedgerEntry | null {
    const stmt = this.db.prepare("SELECT * FROM ledger_entries ORDER BY sequence DESC LIMIT 1");
    const row = stmt.get() as unknown as LedgerRow | undefined;
    return row ? this.mapRow(row) : null;
  }

  getAll(): LedgerEntry[] {
    const stmt = this.db.prepare("SELECT * FROM ledger_entries ORDER BY sequence ASC");
    const rows = stmt.all() as unknown as LedgerRow[];
    return rows.map((r) => this.mapRow(r));
  }

  getByMandate(mandateId: string): LedgerEntry[] {
    const stmt = this.db.prepare("SELECT * FROM ledger_entries WHERE mandate_id = ? ORDER BY sequence ASC");
    const rows = stmt.all(mandateId) as unknown as LedgerRow[];
    return rows.map((r) => this.mapRow(r));
  }

  tamper(sequence: number): void {
    const entry = this.getAll().find((e) => e.sequence === sequence);
    if (!entry) return;

    const corruptedPayload = { ...entry.payload, tampered: 1 };
    const stmt = this.db.prepare(`
      UPDATE ledger_entries
      SET payload_json = ?
      WHERE sequence = ?
    `);
    stmt.run(JSON.stringify(corruptedPayload), sequence);
  }
}
