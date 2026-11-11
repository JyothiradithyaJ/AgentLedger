import { z } from "zod";

export const CartItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  merchant: z.string().min(1),
  priceCents: z.number().int().positive(),
  quantity: z.number().int().positive(),
  size: z.string().optional(),
  attributes: z.array(z.string()).default([]),
  url: z.string().url().optional(),
  imageUrl: z.string().url().optional(),
  source: z.enum(["mock", "dummyjson", "demo-overlay"]).optional()
});
export type CartItem = z.infer<typeof CartItemSchema>;

export const ProposedCartPlanDetailsSchema = z.object({
  catalogSource: z.string(),
  productUrl: z.string().optional(),
  query: z.string(),
  selectedBy: z.enum(["llm", "rules"]),
  candidatesConsidered: z.array(z.object({
    id: z.string(),
    title: z.string(),
    priceCents: z.number().int()
  })),
  verifiedPriceCents: z.number().int().optional()
});
export type ProposedCartPlanDetails = z.infer<typeof ProposedCartPlanDetailsSchema>;

export const ProposedCartSchema = z.object({
  id: z.string().uuid(),
  mandateId: z.string().uuid(),
  merchant: z.string().min(1),
  items: z.array(CartItemSchema).min(1),
  totalCents: z.number().int().positive(),
  currency: z.literal("USD").default("USD"),
  proposedAt: z.string().datetime(),
  planDetails: ProposedCartPlanDetailsSchema.optional()
});
export type ProposedCart = z.infer<typeof ProposedCartSchema>;
