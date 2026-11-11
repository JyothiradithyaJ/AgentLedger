import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CatalogProductSchema, type CatalogProduct } from "@agentledger/shared";
import {
  DummyJsonCatalogAdapter,
  MockCatalogAdapter,
  ResilientCatalogAdapter
} from "../src/adapters/catalog/index.js";
import type { CatalogPort } from "../src/ports/catalog.port.js";

describe("Product Catalog Unit Tests (Mocked Network)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("converts price float to integer cents and validates against CatalogProductSchema", async () => {
    const mockApiResponse = {
      products: [
        {
          id: 101,
          title: "Wireless Running Earbuds",
          price: 49.99,
          brand: "SoundWave",
          category: "electronics",
          tags: ["audio", "wireless", "running"],
          thumbnail: "https://dummyjson.local/thumb101.jpg"
        }
      ],
      total: 1
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockApiResponse
    });
    vi.stubGlobal("fetch", fetchMock);

    const adapter = new DummyJsonCatalogAdapter("https://dummyjson.local");
    const results = await adapter.search({ text: "earbuds" });

    expect(results.length).toBe(1);
    const product = results[0];
    expect(product).toBeDefined();
    if (product) {
      expect(product.id).toBe("dummyjson:101");
      expect(product.priceCents).toBe(4999);
      expect(product.merchant).toBe("SoundWave");
      expect(product.category).toBe("electronics");
      expect(product.source).toBe("dummyjson");
      expect(product.url).toBe("https://dummyjson.local/products/101");
      expect(product.imageUrl).toBe("https://dummyjson.local/thumb101.jpg");

      // Validate schema
      const parsed = CatalogProductSchema.parse(product);
      expect(parsed.priceCents).toBe(4999);
    }
  });

  it("handles missing optional fields defensively with safe defaults", async () => {
    const mockSingleProduct = {
      id: 202,
      title: "Plain White T-Shirt",
      price: 15.5
      // Notice brand, category, tags, thumbnail, images are all omitted
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockSingleProduct
    });
    vi.stubGlobal("fetch", fetchMock);

    const adapter = new DummyJsonCatalogAdapter("https://dummyjson.local");
    const product = await adapter.getById("dummyjson:202");

    expect(product).not.toBeNull();
    if (product) {
      expect(product.id).toBe("dummyjson:202");
      expect(product.title).toBe("Plain White T-Shirt");
      expect(product.merchant).toBe("DummyJSON Store"); // Safe default
      expect(product.category).toBe("general"); // Safe default
      expect(product.priceCents).toBe(1550);
      expect(product.attributes).toEqual(["white"]); // Extracted color word
      expect(product.imageUrl).toBeUndefined();

      const parsed = CatalogProductSchema.parse(product);
      expect(parsed.merchant).toBe("DummyJSON Store");
    }
  });

  it("caches HTTP responses in memory to prevent duplicate network calls within 60s TTL", async () => {
    const mockApiResponse = {
      products: [
        {
          id: 303,
          title: "Speed Trail Running Shoes",
          price: 120.0,
          brand: "StrideMaster"
        }
      ]
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockApiResponse
    });
    vi.stubGlobal("fetch", fetchMock);

    const adapter = new DummyJsonCatalogAdapter("https://dummyjson.local");

    // First call triggers network fetch
    const firstCall = await adapter.search({ text: "trail shoes" });
    expect(firstCall.length).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Second identical call hits memory cache
    const secondCall = await adapter.search({ text: "trail shoes" });
    expect(secondCall.length).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries once on 5xx server error and recovers if second attempt succeeds", async () => {
    const mockSuccessResponse = {
      products: [
        {
          id: 404,
          title: "Recovered Running Belt",
          price: 25.0
        }
      ]
    };

    let attemptCount = 0;
    const fetchMock = vi.fn().mockImplementation(() => {
      attemptCount += 1;
      if (attemptCount === 1) {
        return Promise.resolve({
          ok: false,
          status: 502,
          json: async () => ({ error: "Bad Gateway" })
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => mockSuccessResponse
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const adapter = new DummyJsonCatalogAdapter("https://dummyjson.local");
    const results = await adapter.search({ text: "belt" });

    expect(attemptCount).toBe(2);
    expect(results.length).toBe(1);
    const item = results[0];
    expect(item).toBeDefined();
    if (item) {
      expect(item.id).toBe("dummyjson:404");
      expect(item.priceCents).toBe(2500);
    }
  });

  it("ResilientCatalogAdapter falls back to mock adapter and updates lastSource on network error", async () => {
    const failingPrimary: CatalogPort = {
      search: vi.fn().mockRejectedValue(new Error("Network timeout after 5000ms")),
      getById: vi.fn().mockRejectedValue(new Error("Network timeout after 5000ms"))
    };

    const mockFallback = new MockCatalogAdapter();
    const resilientAdapter = new ResilientCatalogAdapter(failingPrimary, mockFallback);

    const results = await resilientAdapter.search({ text: "running shoes" });
    expect(results.length).toBeGreaterThan(0);
    expect(resilientAdapter.lastSource).toBe("mock");

    const firstResult = results[0];
    expect(firstResult).toBeDefined();
    if (firstResult) {
      expect(firstResult.source).toBe("mock");
      expect(firstResult.id.startsWith("mock:")).toBe(true);
      CatalogProductSchema.parse(firstResult);
    }
  });

  it("ResilientCatalogAdapter falls back to mock adapter when primary returns empty array", async () => {
    const emptyPrimary: CatalogPort = {
      search: vi.fn().mockResolvedValue([]),
      getById: vi.fn().mockResolvedValue(null)
    };

    const mockFallback = new MockCatalogAdapter();
    const resilientAdapter = new ResilientCatalogAdapter(emptyPrimary, mockFallback);

    const results = await resilientAdapter.search({ text: "running shoes" });
    expect(results.length).toBeGreaterThan(0);
    expect(resilientAdapter.lastSource).toBe("mock");
  });

  it("ResilientCatalogAdapter retains dummyjson lastSource when primary search succeeds", async () => {
    const dummyProduct: CatalogProduct = {
      id: "dummyjson:505",
      title: "Live Running Singlet",
      merchant: "FastWear",
      priceCents: 3500,
      currency: "USD",
      category: "apparel",
      attributes: ["running", "singlet"],
      url: "https://dummyjson.local/products/505",
      source: "dummyjson"
    };

    const successfulPrimary: CatalogPort = {
      search: vi.fn().mockResolvedValue([dummyProduct]),
      getById: vi.fn().mockResolvedValue(dummyProduct)
    };

    const mockFallback = new MockCatalogAdapter();
    const resilientAdapter = new ResilientCatalogAdapter(successfulPrimary, mockFallback);

    const results = await resilientAdapter.search({ text: "singlet" });
    expect(results.length).toBe(1);
    expect(resilientAdapter.lastSource).toBe("dummyjson");
    expect(results[0]?.id).toBe("dummyjson:505");
  });

  it("MockCatalogAdapter returns valid CatalogProduct instances for search and getById", async () => {
    const mockAdapter = new MockCatalogAdapter();
    const results = await mockAdapter.search({ text: "CloudRunner", maxPriceCents: 10000 });

    expect(results.length).toBeGreaterThan(0);
    for (const item of results) {
      expect(item.source).toBe("mock");
      expect(item.priceCents).toBeLessThanOrEqual(10000);
      const parsed = CatalogProductSchema.parse(item);
      expect(parsed.currency).toBe("USD");
    }

    const first = results[0];
    expect(first).toBeDefined();
    if (first) {
      const byId = await mockAdapter.getById(first.id);
      expect(byId).not.toBeNull();
      if (byId) {
        expect(byId.id).toBe(first.id);
        expect(byId.title).toBe(first.title);
      }
    }
  });
});
