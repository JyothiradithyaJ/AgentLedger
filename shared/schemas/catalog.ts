import { z } from "zod";

export const CatalogProductSourceSchema = z.enum(["mock", "dummyjson", "demo-overlay"]);
export type CatalogProductSource = z.infer<typeof CatalogProductSourceSchema>;

export const CatalogProductSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  merchant: z.string().min(1).default("DummyJSON Store"),
  priceCents: z.number().int().nonnegative(),
  currency: z.literal("USD").default("USD"),
  category: z.string().min(1),
  attributes: z.array(z.string()).default([]),
  sizes: z.array(z.string()).optional(),
  url: z.string(),
  imageUrl: z.string().optional(),
  source: CatalogProductSourceSchema
});
export type CatalogProduct = z.infer<typeof CatalogProductSchema>;
