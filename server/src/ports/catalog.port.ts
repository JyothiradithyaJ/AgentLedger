import type { CatalogProduct } from "@agentledger/shared";

export interface CatalogSearchOptions {
  text: string;
  category?: string;
  maxPriceCents?: number;
  limit?: number;
}

export interface CatalogPort {
  search(options: CatalogSearchOptions): Promise<CatalogProduct[]>;
  getById(id: string): Promise<CatalogProduct | null>;
}
