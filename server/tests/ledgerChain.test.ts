import { describe, it, expect } from "vitest";
import {
  canonicalJson,
  computeEntryHash,
  generateKeyPair,
  signPayload,
  verifySignature,
  verifyChain
} from "../src/domain/ledgerChain.js";
import type { LedgerEntry } from "@agentledger/shared";

describe("Ledger Chain and Cryptography Tests", () => {
  it("serializes canonical JSON deterministically with sorted keys", () => {
    const objA = { z: 1, a: 2, m: { y: "test", b: 123 } };
    const objB = { m: { b: 123, y: "test" }, a: 2, z: 1 };
    expect(canonicalJson(objA)).toBe(canonicalJson(objB));
    expect(canonicalJson(objA)).toBe('{"a":2,"m":{"b":123,"y":"test"},"z":1}');
  });

  it("generates Ed25519 keypair and verifies valid signatures", () => {
    const keys = generateKeyPair("data/test_keys");
    const testData = "sha256_hash_of_mandate_event";
    const signature = signPayload(testData, keys.privateKey);

    const isValid = verifySignature(testData, signature, keys.publicKey);
    expect(isValid).toBe(true);

    const isCorruptedValid = verifySignature("tampered_data", signature, keys.publicKey);
    expect(isCorruptedValid).toBe(false);
  });

  it("verifies a valid hash-chained ledger sequence", () => {
    const keys = generateKeyPair("data/test_keys");
    const mandateId = "11111111-1111-1111-1111-111111111111";
    const entries: LedgerEntry[] = [];

    let prevHash = "0".repeat(64);

    for (let seq = 0; seq < 3; seq++) {
      const timestamp = new Date(Date.now() + seq * 1000).toISOString();
      const payload = { seq, event: `EVENT_${seq}` };
      const currentHash = computeEntryHash(prevHash, seq, timestamp, "MANDATE_CREATED", mandateId, payload);
      const signature = signPayload(currentHash, keys.privateKey);

      entries.push({
        sequence: seq,
        previousHash: prevHash,
        currentHash,
        timestamp,
        eventType: "MANDATE_CREATED",
        mandateId,
        payload,
        signature,
        publicKey: keys.publicKey
      });

      prevHash = currentHash;
    }

    const verification = verifyChain(entries);
    expect(verification.valid).toBe(true);
    expect(verification.totalEntries).toBe(3);
    expect(verification.brokenSequence).toBeNull();
  });

  it("detects tampering when payload is modified", () => {
    const keys = generateKeyPair("data/test_keys");
    const mandateId = "11111111-1111-1111-1111-111111111111";
    const entries: LedgerEntry[] = [];

    let prevHash = "0".repeat(64);
    for (let seq = 0; seq < 3; seq++) {
      const timestamp = new Date(Date.now() + seq * 1000).toISOString();
      const payload = { seq, amount: 1000 };
      const currentHash = computeEntryHash(prevHash, seq, timestamp, "PAYMENT_CAPTURED", mandateId, payload);
      const signature = signPayload(currentHash, keys.privateKey);

      entries.push({
        sequence: seq,
        previousHash: prevHash,
        currentHash,
        timestamp,
        eventType: "PAYMENT_CAPTURED",
        mandateId,
        payload,
        signature,
        publicKey: keys.publicKey
      });
      prevHash = currentHash;
    }

    // Tamper with sequence 1 payload
    entries[1]!.payload = { seq: 1, amount: 999999, tampered: 1 };

    const verification = verifyChain(entries);
    expect(verification.valid).toBe(false);
    expect(verification.brokenSequence).toBe(1);
    expect(verification.reason).toContain("Payload tamper detected");
  });
});
