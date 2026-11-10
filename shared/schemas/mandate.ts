import { z } from "zod";

export const MandateStatusSchema = z.enum([
  "DRAFT",
  "AUTHORIZED",
  "ACTIVE",
  "COMPLETED",
  "REVOKED",
  "EXPIRED"
]);
export type MandateStatus = z.infer<typeof MandateStatusSchema>;

export const MandateConstraintsSchema = z.object({
  budgetAmountCents: z.number().int().positive(),
  currency: z.literal("USD").default("USD"),
  itemCategory: z.string().min(1),
  size: z.string().optional(),
  attributes: z.array(z.string()).default([]),
  merchantAllow: z.array(z.string()).default([]),
  merchantDeny: z.array(z.string()).default([]),
  expiresAt: z.string().datetime().optional()
});
export type MandateConstraints = z.infer<typeof MandateConstraintsSchema>;

export const MandateSchema = z.object({
  id: z.string().uuid(),
  description: z.string().min(1),
  rawRequest: z.string().min(1),
  readback: z.string().min(1),
  constraints: MandateConstraintsSchema,
  status: MandateStatusSchema,
  budgetCents: z.number().int().positive(),
  heldCents: z.number().int().nonnegative(),
  capturedCents: z.number().int().nonnegative(),
  remainingCents: z.number().int().nonnegative(),
  paypalOrderId: z.string().nullable().optional(),
  paypalAuthorizationId: z.string().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  expiresAt: z.string().datetime()
});
export type Mandate = z.infer<typeof MandateSchema>;

export const ParseMandateRequestSchema = z.object({
  prompt: z.string().min(1)
});
export type ParseMandateRequest = z.infer<typeof ParseMandateRequestSchema>;

export const ParseMandateResponseSchema = z.object({
  readback: z.string().min(1),
  constraints: MandateConstraintsSchema
});
export type ParseMandateResponse = z.infer<typeof ParseMandateResponseSchema>;

export const CreateMandateRequestSchema = z.object({
  rawRequest: z.string().min(1),
  readback: z.string().min(1),
  constraints: MandateConstraintsSchema
});
export type CreateMandateRequest = z.infer<typeof CreateMandateRequestSchema>;

export const CreateMandateResponseSchema = z.object({
  mandate: MandateSchema,
  paypalOrderId: z.string(),
  approveUrl: z.string().url()
});
export type CreateMandateResponse = z.infer<typeof CreateMandateResponseSchema>;
