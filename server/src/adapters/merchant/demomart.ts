import type { CartItem } from "@agentledger/shared";
import type { MerchantPort, MerchantInfo } from "../../ports/merchant.port.js";
import { SEEDED_CATALOG } from "./catalog.seed.js";

export class DemoMartAdapter implements MerchantPort {
  private readonly catalog: CartItem[];

  constructor(catalog: CartItem[] = SEEDED_CATALOG) {
    this.catalog = catalog;
  }

  async searchCatalog(
    query: string,
    category?: string,
    maxPriceCents?: number
  ): Promise<CartItem[]> {
    const q = query.toLowerCase();
    const cat = category?.toLowerCase();

    return this.catalog.filter((item) => {
      if (maxPriceCents && item.priceCents > maxPriceCents) return false;
      if (cat && !item.attributes.some((a) => a.toLowerCase().includes(cat))) {
        // Also check title
        if (!item.title.toLowerCase().includes(cat)) return false;
      }
      if (q) {
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesMerchant = item.merchant.toLowerCase().includes(q);
        const matchesAttr = item.attributes.some((a) => a.toLowerCase().includes(q));
        if (!matchesTitle && !matchesMerchant && !matchesAttr) return false;
      }
      return true;
    });
  }

  async getItem(itemId: string): Promise<CartItem | null> {
    const item = this.catalog.find((i) => i.id === itemId);
    return item ?? null;
  }

  async listMerchants(): Promise<MerchantInfo[]> {
    return [
      { name: "StrideCo", isResale: false, trusted: true },
      { name: "TrailNest", isResale: false, trusted: true },
      { name: "ReSole Outlet", isResale: true, trusted: false }
    ];
  }
}

export const createMerchantAdapter = (): MerchantPort => {
  return new DemoMartAdapter();
};
