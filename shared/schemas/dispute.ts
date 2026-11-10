import { z } from "zod";

export const DisputeStatusSchema = z.enum([
  "OPEN",
  "WAITING_FOR_SELLER_RESPONSE",
  "UNDER_REVIEW",
  "RESOLVED",
  "SIMULATED"
]);
export type DisputeStatus = z.infer<typeof DisputeStatusSchema>;

export const FaultAttributionSchema = z.enum([
  "AGENT",
  "MERCHANT",
  "BUYER",
  "INSUFFICIENT_EVIDENCE"
]);
export type FaultAttribution = z.infer<typeof FaultAttributionSchema>;

export const ThreePartyResponsibilitySchema = z.object({
  buyer: z.string().min(1),
  agentProvider: z.string().min(1),
  merchant: z.string().min(1)
});
export type ThreePartyResponsibility = z.infer<typeof ThreePartyResponsibilitySchema>;

export const DisputeVerdictSchema = z.object({
  fault: FaultAttributionSchema,
  confidence: z.number().min(0).max(1),
  reasons: z.array(z.string()).min(1),
  recommendedAction: z.string().min(1),
  responsibility: ThreePartyResponsibilitySchema,
  evidencePacket: z.string().min(1)
});
export type DisputeVerdict = z.infer<typeof DisputeVerdictSchema>;

export const DisputeRecordSchema = z.object({
  id: z.string().uuid(),
  paypalDisputeId: z.string().min(1),
  mandateId: z.string().uuid(),
  purchaseId: z.string().uuid(),
  reason: z.string().min(1),
  amountCents: z.number().int().positive(),
  status: DisputeStatusSchema,
  isSimulated: z.boolean().default(false),
  allowedEvidenceTypes: z.array(z.string()).default([]),
  verdict: DisputeVerdictSchema.nullable().optional(),
  evidenceSubmittedAt: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});
export type DisputeRecord = z.infer<typeof DisputeRecordSchema>;
