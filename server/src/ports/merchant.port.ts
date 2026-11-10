import type { CartItem } from "@agentledger/shared";

export interface MerchantInfo {
  name: string;
  isResale: boolean;
  trusted: boolean;
}

export interface MerchantPort {
  searchCatalog(query: string, category?: string, maxPriceCents?: number): Promise<CartItem[]>;
  getItem(itemId: string): Promise<CartItem | null>;
  listMerchants(): Promise<MerchantInfo[]>;
}
