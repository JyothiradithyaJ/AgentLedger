import { z } from "zod";

export const LedgerEventTypeSchema = z.enum([
  "MANDATE_CREATED",
  "MANDATE_AUTHORIZED",
  "MANDATE_REVOKED",
  "CART_PROPOSED",
  "REFEREE_EVALUATED",
  "HUMAN_DECISION",
  "PAYMENT_CAPTURED",
  "PAYMENT_BLOCKED",
  "DISPUTE_OPENED",
  "EVIDENCE_SUBMITTED"
]);
export type LedgerEventType = z.infer<typeof LedgerEventTypeSchema>;

export const LedgerEntrySchema = z.object({
  sequence: z.number().int().nonnegative(),
  previousHash: z.string().min(1),
  currentHash: z.string().min(1),
  timestamp: z.string().datetime(),
  eventType: LedgerEventTypeSchema,
  mandateId: z.string().uuid(),
  payload: z.record(z.unknown()),
  signature: z.string().min(1),
  publicKey: z.string().min(1)
});
export type LedgerEntry = z.infer<typeof LedgerEntrySchema>;

export const VerifyLedgerResponseSchema = z.object({
  valid: z.boolean(),
  totalEntries: z.number().int().nonnegative(),
  brokenSequence: z.number().int().nullable(),
  reason: z.string().nullable()
});
export type VerifyLedgerResponse = z.infer<typeof VerifyLedgerResponseSchema>;
