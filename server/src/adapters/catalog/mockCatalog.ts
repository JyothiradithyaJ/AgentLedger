import type { CatalogProduct } from "@agentledger/shared";
import type { CatalogPort, CatalogSearchOptions } from "../../ports/catalog.port.js";
import { SEEDED_CATALOG } from "../merchant/catalog.seed.js";

const COLOR_WORDS = [
  "red", "blue", "black", "white", "green", "grey", "gray", "yellow",
  "pink", "purple", "orange", "brown", "navy", "beige"
];

export class MockCatalogAdapter implements CatalogPort {
  private readonly products: CatalogProduct[];

  constructor() {
    this.products = SEEDED_CATALOG.map((item) => {
      const rawId = item.id.replace(/^mock:/, "");
      const product: CatalogProduct = {
        id: `mock:${rawId}`,
        title: item.title,
        merchant: item.merchant,
        priceCents: item.priceCents,
        currency: "USD",
        category: "running shoes",
        attributes: item.attributes,
        sizes: item.size ? [item.size] : undefined,
        url: item.url ? item.url : `https://mock.local/products/${rawId}`,
        imageUrl: item.imageUrl,
        source: "mock"
      };
      return product;
    });
  }

  async search(options: CatalogSearchOptions): Promise<CatalogProduct[]> {
    const q = options.text.toLowerCase().trim();
    const cat = options.category ? options.category.toLowerCase().trim() : undefined;
    const maxPrice = options.maxPriceCents;
    const limit = options.limit && options.limit > 0 ? options.limit : 30;

    let filtered = this.products.filter((item) => {
      if (maxPrice !== undefined && item.priceCents > maxPrice) {
        return false;
      }

      if (cat !== undefined && cat.length > 0) {
        const matchesCategory = item.category.toLowerCase().includes(cat);
        const matchesAttributes = item.attributes.some((attr) => attr.toLowerCase().includes(cat));
        const matchesTitle = item.title.toLowerCase().includes(cat);
        if (!matchesCategory && !matchesAttributes && !matchesTitle) {
          return false;
        }
      }

      if (q.length > 0) {
        const matchesTitle = item.title.toLowerCase().includes(q);
        const matchesMerchant = item.merchant.toLowerCase().includes(q);
        const matchesAttributes = item.attributes.some((attr) => attr.toLowerCase().includes(q));
        if (!matchesTitle && !matchesMerchant && !matchesAttributes) {
          return false;
        }
      }

      return true;
    });

    if (filtered.length === 0 && (q.length > 0 || cat !== undefined)) {
      const displayCategory = cat && cat.length > 0 ? cat : "General Merchandise";
      const rawWords = q.split(/\s+/).filter((w) => w.length > 0);
      const colorWords = rawWords.filter((w) => COLOR_WORDS.includes(w.toLowerCase()));
      const otherWords = rawWords.filter((w) => !COLOR_WORDS.includes(w.toLowerCase()));
      const orderedWords = [...colorWords, ...otherWords].map(
        (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
      );
      const displayTitle = orderedWords.length > 0
        ? `Everyday ${orderedWords.join(" ")}`
        : `Everyday ${displayCategory}`;

      const priceCents = maxPrice !== undefined && maxPrice > 0 ? Math.min(maxPrice, 4999) : 4999;
      const syntheticProduct: CatalogProduct = {
        id: `mock:syn_${encodeURIComponent(q.length > 0 ? q : displayCategory).slice(0, 20)}`,
        title: displayTitle,
        merchant: "Mock Mart",
        priceCents,
        currency: "USD",
        category: displayCategory,
        attributes: q.length > 0 ? q.split(/\s+/) : [displayCategory],
        sizes: ["M", "L", "30"],
        url: "https://mock.local/products/synthetic",
        source: "mock"
      };
      filtered = [syntheticProduct];
    }

    if (filtered.length > limit) {
      return filtered.slice(0, limit);
    }

    return filtered;
  }

  async getById(id: string): Promise<CatalogProduct | null> {
    const normalizedId = id.startsWith("mock:") ? id : `mock:${id}`;
    const found = this.products.find((p) => p.id === normalizedId || p.id === id);
    if (found) {
      return found;
    }

    if (normalizedId.startsWith("mock:syn_")) {
      const syntheticProduct: CatalogProduct = {
        id: normalizedId,
        title: "Mock Item",
        merchant: "Mock Mart",
        priceCents: 4999,
        currency: "USD",
        category: "general",
        attributes: ["mock"],
        url: "https://mock.local/products/synthetic",
        source: "mock"
      };
      return syntheticProduct;
    }

    return null;
  }
}
