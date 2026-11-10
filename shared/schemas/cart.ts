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
  imageUrl: z.string().url().optional()
});
export type CartItem = z.infer<typeof CartItemSchema>;

export const ProposedCartSchema = z.object({
  id: z.string().uuid(),
  mandateId: z.string().uuid(),
  merchant: z.string().min(1),
  items: z.array(CartItemSchema).min(1),
  totalCents: z.number().int().positive(),
  currency: z.literal("USD").default("USD"),
  proposedAt: z.string().datetime()
});
export type ProposedCart = z.infer<typeof ProposedCartSchema>;
