import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { LedgerEntry, VerifyLedgerResponse } from "@agentledger/shared";
import { env } from "../config/env.js";

export const canonicalJson = (obj: unknown): string => {
  if (obj === null || typeof obj !== "object") {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return `[${obj.map(canonicalJson).join(",")}]`;
  }
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  const pairs = keys.map((k) => `${JSON.stringify(k)}:${canonicalJson((obj as Record<string, unknown>)[k])}`);
  return `{${pairs.join(",")}}`;
};

export const computeEntryHash = (
  previousHash: string,
  sequence: number,
  timestamp: string,
  eventType: string,
  mandateId: string,
  payload: Record<string, unknown>
): string => {
  const serialized = `${previousHash}|${sequence}|${timestamp}|${eventType}|${mandateId}|${canonicalJson(payload)}`;
  return crypto.createHash("sha256").update(serialized).digest("hex");
};

export interface KeyPair {
  publicKey: string;
  privateKey: string;
}

export const generateKeyPair = (keysDir: string = env.KEYS_DIR): KeyPair => {
  if (!fs.existsSync(keysDir)) {
    fs.mkdirSync(keysDir, { recursive: true });
  }

  const privPath = path.join(keysDir, "ed25519_private.pem");
  const pubPath = path.join(keysDir, "ed25519_public.pem");

  if (fs.existsSync(privPath) && fs.existsSync(pubPath)) {
    return {
      privateKey: fs.readFileSync(privPath, "utf-8"),
      publicKey: fs.readFileSync(pubPath, "utf-8")
    };
  }

  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519", {
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" }
  });

  fs.writeFileSync(privPath, privateKey);
  fs.writeFileSync(pubPath, publicKey);

  return { publicKey, privateKey };
};

export const signPayload = (data: string, privateKeyPem: string): string => {
  const privateKey = crypto.createPrivateKey(privateKeyPem);
  const signature = crypto.sign(null, Buffer.from(data), privateKey);
  return signature.toString("hex");
};

export const verifySignature = (data: string, signatureHex: string, publicKeyPem: string): boolean => {
  try {
    const publicKey = crypto.createPublicKey(publicKeyPem);
    return crypto.verify(null, Buffer.from(data), publicKey, Buffer.from(signatureHex, "hex"));
  } catch {
    return false;
  }
};

export const verifyChain = (entries: LedgerEntry[]): VerifyLedgerResponse => {
  if (entries.length === 0) {
    return {
      valid: true,
      totalEntries: 0,
      brokenSequence: null,
      reason: null
    };
  }

  let expectedPrevHash = "0".repeat(64); // Genesis entry previous hash

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (!entry) continue;

    // Check sequence continuity
    if (entry.sequence !== i) {
      return {
        valid: false,
        totalEntries: entries.length,
        brokenSequence: entry.sequence,
        reason: `Sequence gap detected: expected ${i}, found ${entry.sequence}`
      };
    }

    // Check previous hash chaining
    if (entry.previousHash !== expectedPrevHash) {
      return {
        valid: false,
        totalEntries: entries.length,
        brokenSequence: entry.sequence,
        reason: `Hash chain break at sequence ${entry.sequence}: previousHash does not match prior currentHash`
      };
    }

    // Check current hash integrity
    const expectedCurrentHash = computeEntryHash(
      entry.previousHash,
      entry.sequence,
      entry.timestamp,
      entry.eventType,
      entry.mandateId,
      entry.payload
    );

    if (entry.currentHash !== expectedCurrentHash) {
      return {
        valid: false,
        totalEntries: entries.length,
        brokenSequence: entry.sequence,
        reason: `Payload tamper detected at sequence ${entry.sequence}: hash mismatch`
      };
    }

    // Check Ed25519 signature
    const isSigValid = verifySignature(entry.currentHash, entry.signature, entry.publicKey);
    if (!isSigValid) {
      return {
        valid: false,
        totalEntries: entries.length,
        brokenSequence: entry.sequence,
        reason: `Cryptographic signature invalid at sequence ${entry.sequence}`
      };
    }

    expectedPrevHash = entry.currentHash;
  }

  return {
    valid: true,
    totalEntries: entries.length,
    brokenSequence: null,
    reason: null
  };
};
