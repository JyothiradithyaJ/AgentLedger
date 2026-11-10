import { z } from "zod";
import { ProposedCartSchema } from "./cart.js";

export const RefereeCheckTypeSchema = z.enum([
  "budget",
  "merchant",
  "item_match",
  "size",
  "quantity",
  "semantic_intent"
]);
export type RefereeCheckType = z.infer<typeof RefereeCheckTypeSchema>;

export const RefereeCheckSchema = z.object({
  name: RefereeCheckTypeSchema,
  passed: z.boolean(),
  reason: z.string().min(1),
  confidence: z.number().min(0).max(1)
});
export type RefereeCheck = z.infer<typeof RefereeCheckSchema>;

export const RefereeDecisionSchema = z.object({
  allowed: z.boolean(),
  requiresHuman: z.boolean(),
  reasons: z.array(z.string()),
  checks: z.array(RefereeCheckSchema),
  evaluatedAt: z.string().datetime()
});
export type RefereeDecision = z.infer<typeof RefereeDecisionSchema>;

export const PurchaseStatusSchema = z.enum([
  "PROPOSED",
  "CHECKING",
  "ALLOWED",
  "BLOCKED",
  "WAITING_HUMAN",
  "CAPTURED",
  "FAILED"
]);
export type PurchaseStatus = z.infer<typeof PurchaseStatusSchema>;

export const PurchaseDecisionSchema = z.enum(["APPROVED", "DENIED"]);
export type PurchaseDecision = z.infer<typeof PurchaseDecisionSchema>;

export const PurchaseRecordSchema = z.object({
  id: z.string().uuid(),
  mandateId: z.string().uuid(),
  runId: z.string().uuid(),
  cart: ProposedCartSchema,
  refereeDecision: RefereeDecisionSchema.nullable().optional(),
  humanDecision: PurchaseDecisionSchema.nullable().optional(),
  status: PurchaseStatusSchema,
  paypalCaptureId: z.string().nullable().optional(),
  capturedAmountCents: z.number().int().nonnegative().default(0),
  releasedAmountCents: z.number().int().nonnegative().default(0),
  failureReason: z.string().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});
export type PurchaseRecord = z.infer<typeof PurchaseRecordSchema>;
