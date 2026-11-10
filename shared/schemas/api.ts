import { z } from "zod";
import { MandateSchema } from "./mandate.js";
import { PurchaseRecordSchema, PurchaseDecisionSchema } from "./decision.js";
import { ProposedCartSchema } from "./cart.js";
import { LedgerEntrySchema, VerifyLedgerResponseSchema } from "./ledger.js";
import { DisputeRecordSchema, DisputeVerdictSchema } from "./dispute.js";

export const AppErrorDetailsSchema = z.record(z.unknown()).optional();
export type AppErrorDetails = z.infer<typeof AppErrorDetailsSchema>;

export const ApiErrorResponseSchema = z.object({
  error: z.object({
    code: z.string().min(1),
    message: z.string().min(1),
    details: AppErrorDetailsSchema
  })
});
export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;

export const RunTimelineEventSchema = z.object({
  runId: z.string().uuid(),
  timestamp: z.string().datetime(),
  step: z.enum([
    "STARTED",
    "SEARCHING_CATALOG",
    "CART_PROPOSED",
    "REFEREE_EVALUATING",
    "REFEREE_PASSED",
    "REFEREE_BLOCKED",
    "WAITING_HUMAN",
    "PAYPAL_CAPTURING",
    "PAYPAL_CAPTURED",
    "PAYPAL_BLOCKED",
    "COMPLETED",
    "FAILED"
  ]),
  message: z.string().min(1),
  cart: ProposedCartSchema.optional(),
  purchase: PurchaseRecordSchema.optional()
});
export type RunTimelineEvent = z.infer<typeof RunTimelineEventSchema>;

export const HealthResponseSchema = z.object({
  status: z.literal("ok"),
  timestamp: z.string().datetime(),
  uptimeSeconds: z.number().nonnegative()
});
export type HealthResponse = z.infer<typeof HealthResponseSchema>;

export const ReadyResponseSchema = z.object({
  status: z.literal("ready"),
  timestamp: z.string().datetime(),
  paypalReachability: z.boolean(),
  llmReachability: z.boolean(),
  databaseReady: z.boolean()
});
export type ReadyResponse = z.infer<typeof ReadyResponseSchema>;

export const DemoScenarioNameSchema = z.enum(["A", "B", "C", "D", "E"]);
export type DemoScenarioName = z.infer<typeof DemoScenarioNameSchema>;

export const StartRunResponseSchema = z.object({
  runId: z.string().uuid(),
  mandateId: z.string().uuid(),
  status: z.string()
});
export type StartRunResponse = z.infer<typeof StartRunResponseSchema>;

export const HumanDecisionRequestSchema = z.object({
  decision: PurchaseDecisionSchema,
  reason: z.string().optional()
});
export type HumanDecisionRequest = z.infer<typeof HumanDecisionRequestSchema>;

export const SimulateDisputeRequestSchema = z.object({
  purchaseId: z.string().uuid(),
  reason: z.string().min(1)
});
export type SimulateDisputeRequest = z.infer<typeof SimulateDisputeRequestSchema>;

export {
  MandateSchema,
  PurchaseRecordSchema,
  ProposedCartSchema,
  LedgerEntrySchema,
  VerifyLedgerResponseSchema,
  DisputeRecordSchema,
  DisputeVerdictSchema
};
