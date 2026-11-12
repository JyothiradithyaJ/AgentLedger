import type { CatalogProduct } from "@agentledger/shared";
import type { CatalogPort, CatalogSearchOptions } from "../../ports/catalog.port.js";

interface CacheEntry {
  data: unknown;
  expiresAt: number;
}

const COLOR_WORDS = [
  "red", "blue", "black", "white", "green", "grey", "gray", "yellow",
  "pink", "purple", "orange", "brown", "navy", "beige", "gold", "silver"
];

const isObject = (val: unknown): val is Record<string, unknown> => {
  return typeof val === "object" && val !== null;
};

const extractAttributes = (raw: Record<string, unknown>): string[] => {
  const attrs = new Set<string>();

  const tags = raw.tags;
  if (Array.isArray(tags)) {
    for (const tag of tags) {
      if (typeof tag === "string" && tag.trim().length > 0) {
        attrs.add(tag.trim().toLowerCase());
      }
    }
  }

  const titleLower = typeof raw.title === "string" ? raw.title.toLowerCase() : "";
  for (const color of COLOR_WORDS) {
    if (titleLower.includes(color)) {
      attrs.add(color);
    }
  }

  return Array.from(attrs);
};

export class DummyJsonCatalogAdapter implements CatalogPort {
  private readonly baseUrl: string;
  private readonly cache = new Map<string, CacheEntry>();
  private readonly timeoutMs: number = 5000;
  private readonly ttlMs: number = 60_000;

  constructor(baseUrl: string = "https://dummyjson.com") {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  clearCache(): void {
    this.cache.clear();
  }

  private async fetchWithRetryAndCache(url: string): Promise<unknown> {
    const cached = this.cache.get(url);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data;
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timer);

        if (!response.ok) {
          if (response.status >= 500 && attempt === 0) {
            continue;
          }
          throw new Error(`DummyJSON request failed with status ${response.status}`);
        }

        const data: unknown = await response.json();
        this.cache.set(url, { data, expiresAt: Date.now() + this.ttlMs });
        return data;
      } catch (err) {
        clearTimeout(timer);
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt === 0) {
          continue;
        }
      }
    }

    throw lastError ?? new Error("DummyJSON request failed after retry");
  }

  private normalizeProduct(raw: Record<string, unknown>): CatalogProduct {
    const rawId = typeof raw.id === "number" || typeof raw.id === "string" ? String(raw.id) : "0";
    const id = `dummyjson:${rawId}`;

    const title = typeof raw.title === "string" && raw.title.trim().length > 0
      ? raw.title.trim()
      : "Untitled Product";

    const rawPrice = typeof raw.price === "number" && !Number.isNaN(raw.price) ? raw.price : 0;
    const priceCents = Math.round(rawPrice * 100);

    const merchant = typeof raw.brand === "string" && raw.brand.trim().length > 0
      ? raw.brand.trim()
      : "DummyJSON Store";

    const category = typeof raw.category === "string" && raw.category.trim().length > 0
      ? raw.category.trim()
      : "general";

    const attributes = extractAttributes(raw);

    let imageUrl: string | undefined;
    if (typeof raw.thumbnail === "string" && raw.thumbnail.trim().length > 0) {
      imageUrl = raw.thumbnail.trim();
    } else if (Array.isArray(raw.images) && raw.images.length > 0) {
      const firstImage = raw.images[0];
      if (typeof firstImage === "string" && firstImage.trim().length > 0) {
        imageUrl = firstImage.trim();
      }
    }

    const url = `${this.baseUrl}/products/${rawId}`;

    return {
      id,
      title,
      merchant,
      priceCents,
      currency: "USD",
      category,
      attributes,
      url,
      imageUrl,
      source: "dummyjson"
    };
  }

  async search(options: CatalogSearchOptions): Promise<CatalogProduct[]> {
    const limit = options.limit && options.limit > 0 ? options.limit : 30;
    const trimmedText = options.text.trim();

    const fetchAndFilter = async (queryText: string): Promise<CatalogProduct[]> => {
      let endpointUrl = "";
      if (queryText.length > 0) {
        endpointUrl = `${this.baseUrl}/products/search?q=${encodeURIComponent(queryText)}&limit=${limit}`;
      } else if (options.category && options.category.trim().length > 0) {
        endpointUrl = `${this.baseUrl}/products/category/${encodeURIComponent(options.category.trim())}?limit=${limit}`;
      } else {
        endpointUrl = `${this.baseUrl}/products?limit=${limit}`;
      }

      try {
        const responseData = await this.fetchWithRetryAndCache(endpointUrl);
        if (!isObject(responseData) || !Array.isArray(responseData.products)) {
          return [];
        }

        const products: CatalogProduct[] = [];
        for (const item of responseData.products) {
          if (isObject(item) && "id" in item && "title" in item && "price" in item) {
            const normalized = this.normalizeProduct(item);

            if (options.maxPriceCents !== undefined && normalized.priceCents > options.maxPriceCents) {
              continue;
            }

            if (options.category && options.category.trim().length > 0) {
              const cat = options.category.toLowerCase().trim();
              const matchesCat = normalized.category.toLowerCase().includes(cat);
              const matchesAttrs = normalized.attributes.some((a) => a.toLowerCase().includes(cat));
              const matchesTitle = normalized.title.toLowerCase().includes(cat);
              if (!matchesCat && !matchesAttrs && !matchesTitle) {
                continue;
              }
            }

            products.push(normalized);
          }
        }
        return products;
      } catch {
        return [];
      }
    };

    let products = await fetchAndFilter(trimmedText);

    if (products.length === 0 && trimmedText.includes(" ")) {
      const words = trimmedText
        .split(/\s+/)
        .map((w) => w.replace(/[^a-zA-Z0-9]/g, "").trim())
        .filter((w) => w.length >= 3);

      for (const word of words) {
        const keywordResults = await fetchAndFilter(word);
        if (keywordResults.length > 0) {
          products = keywordResults;
          break;
        }
      }
    }

    if (options.limit && options.limit > 0 && products.length > options.limit) {
      return products.slice(0, options.limit);
    }

    return products;
  }

  async getById(id: string): Promise<CatalogProduct | null> {
    const numericId = id.replace(/^dummyjson:/, "").trim();
    if (numericId.length === 0) return null;

    const url = `${this.baseUrl}/products/${encodeURIComponent(numericId)}`;
    try {
      const data = await this.fetchWithRetryAndCache(url);
      if (isObject(data) && "id" in data && "title" in data && "price" in data) {
        return this.normalizeProduct(data);
      }
      return null;
    } catch {
      return null;
    }
  }
}
