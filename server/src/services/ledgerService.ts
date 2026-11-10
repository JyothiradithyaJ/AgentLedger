import type { Repos } from "../repos/index.js";
import type {
  LedgerEntry,
  LedgerEventType,
  VerifyLedgerResponse
} from "@agentledger/shared";
import {
  computeEntryHash,
  generateKeyPair,
  signPayload,
  verifyChain
} from "../domain/ledgerChain.js";

export class LedgerService {
  private readonly repos: Repos;
  private readonly keyPair;

  constructor(repos: Repos) {
    this.repos = repos;
    this.keyPair = generateKeyPair();
  }

  recordEvent(
    eventType: LedgerEventType,
    mandateId: string,
    payload: Record<string, unknown>
  ): LedgerEntry {
    const latest = this.repos.ledger.getLatest();
    const sequence = latest ? latest.sequence + 1 : 0;
    const previousHash = latest ? latest.currentHash : "0".repeat(64);
    const timestamp = new Date().toISOString();

    const currentHash = computeEntryHash(
      previousHash,
      sequence,
      timestamp,
      eventType,
      mandateId,
      payload
    );

    const signature = signPayload(currentHash, this.keyPair.privateKey);

    const entry: LedgerEntry = {
      sequence,
      previousHash,
      currentHash,
      timestamp,
      eventType,
      mandateId,
      payload,
      signature,
      publicKey: this.keyPair.publicKey
    };

    this.repos.ledger.append(entry);
    return entry;
  }

  getAllEntries(): LedgerEntry[] {
    return this.repos.ledger.getAll();
  }

  getMandateEntries(mandateId: string): LedgerEntry[] {
    return this.repos.ledger.getByMandate(mandateId);
  }

  verify(): VerifyLedgerResponse {
    const entries = this.repos.ledger.getAll();
    return verifyChain(entries);
  }

  tamper(sequence: number): void {
    this.repos.ledger.tamper(sequence);
  }
}
