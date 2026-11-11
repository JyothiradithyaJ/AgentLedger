import { describe, it, expect, vi } from "vitest";
import type { Mandate, CatalogProduct, ProposedCart } from "@agentledger/shared";
import type { CatalogPort } from "../src/ports/catalog.port.js";
import type { LLMPort } from "../src/ports/llm.port.js";
import type { MerchantPort } from "../src/ports/merchant.port.js";
import { proposeCart } from "../src/agents/shopper.js";
import {
  evaluateDeterministicRules,
  verifyPriceAgainstCatalog
} from "../src/domain/rules/referee.js";

const mockLlm: LLMPort = { generateStructured: vi.fn() };
const mockMerchant: MerchantPort = {
  searchCatalog: vi.fn().mockResolvedValue([]),
  getItem: vi.fn().mockResolvedValue(null),
  listMerchants: vi.fn().mockResolvedValue([])
};

const createTestMandate = (budgetAmountCents: number = 10000): Mandate => ({
  id: "44444444-4444-4444-4444-444444444444",
  description: "Trail Running Shoes Mandate",
  rawRequest: "Buy waterproof trail running shoes under $100 size 10",
  readback: "Buy waterproof trail running shoes under $100, size 10",
  constraints: {
    budgetAmountCents,
    currency: "USD",
    itemCategory: "trail running shoes",
    size: "10",
    attributes: ["waterproof"],
    merchantAllow: [],
    merchantDeny: ["ReSole Outlet"],
    expiresAt: new Date(Date.now() + 86400000).toISOString()
  },
  status: "ACTIVE",
  budgetCents: budgetAmountCents,
  heldCents: budgetAmountCents,
  capturedCents: 0,
  remainingCents: budgetAmountCents,
  paypalOrderId: null,
  paypalAuthorizationId: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 86400000).toISOString()
});

describe("Live Catalog Shopper and Referee Verification Tests", () => {
  it("ranking picks the best in-budget candidate and records planner metadata", async () => {
    const mandate = createTestMandate(10000); // $100

    const candidates: CatalogProduct[] = [
      {
        id: "dummyjson:1",
        title: "Generic Running Socks",
        merchant: "FitStore",
        priceCents: 1500,
        currency: "USD",
        category: "apparel",
        attributes: ["socks"],
        url: "https://dummyjson.com/products/1",
        source: "dummyjson"
      },
      {
        id: "dummyjson:2",
        title: "Apex Waterproof Trail Running Shoes",
        merchant: "TrailKing",
        priceCents: 8900, // Best match, in budget ($89)
        currency: "USD",
        category: "trail running shoes",
        attributes: ["waterproof", "trail"],
        sizes: ["10"],
        url: "https://dummyjson.com/products/2",
        source: "dummyjson"
      },
      {
        id: "dummyjson:3",
        title: "Basic Trail Running Shoes",
        merchant: "EcoRun",
        priceCents: 9500,
        currency: "USD",
        category: "trail running shoes",
        attributes: ["trail"],
        sizes: ["10"],
        url: "https://dummyjson.com/products/3",
        source: "dummyjson"
      }
    ];

    const stubCatalog: CatalogPort = {
      search: vi.fn().mockResolvedValue(candidates),
      getById: vi.fn().mockImplementation((id: string) => {
        const found = candidates.find((c) => c.id === id);
        return Promise.resolve(found ?? null);
      })
    };

    const cart = await proposeCart(mockLlm, mockMerchant, mandate, "A", stubCatalog);

    expect(cart.totalCents).toBe(8900);
    expect(cart.items[0]?.id).toBe("dummyjson:2");
    expect(cart.items[0]?.title).toContain("Apex Waterproof Trail Running Shoes");
    expect(cart.planDetails).toBeDefined();
    expect(cart.planDetails?.selectedBy).toBe("rules");
    expect(cart.planDetails?.catalogSource).toBe("dummyjson");
    expect(cart.planDetails?.productUrl).toBe("https://dummyjson.com/products/2");
    expect(cart.planDetails?.query).toBe("trail running shoes waterproof");
    expect(cart.planDetails?.candidatesConsidered.length).toBeGreaterThanOrEqual(1);
    expect(cart.planDetails?.verifiedPriceCents).toBe(8900);

    // Verify price passes
    const priceCheck = await verifyPriceAgainstCatalog(stubCatalog, cart);
    expect(priceCheck.passed).toBe(true);
    expect(priceCheck.name).toBe("price_verified");
  });

  it("tempted mode (Scenario B) picks the highest-priced real matching item above budget", async () => {
    const mandate = createTestMandate(10000); // $100

    const candidates: CatalogProduct[] = [
      {
        id: "dummyjson:20",
        title: "Budget Trail Running Shoes",
        merchant: "TrailKing",
        priceCents: 7500,
        currency: "USD",
        category: "trail running shoes",
        attributes: ["trail"],
        url: "https://dummyjson.com/products/20",
        source: "dummyjson"
      },
      {
        id: "dummyjson:21",
        title: "Pro Carbon Trail Running Shoes",
        merchant: "TrailKing",
        priceCents: 14500, // Over budget ($145)
        currency: "USD",
        category: "trail running shoes",
        attributes: ["trail", "carbon"],
        url: "https://dummyjson.com/products/21",
        source: "dummyjson"
      },
      {
        id: "dummyjson:22",
        title: "Ultra Elite Waterproof Trail Running Shoes",
        merchant: "SummitGear",
        priceCents: 18900, // Highest over budget ($189)
        currency: "USD",
        category: "trail running shoes",
        attributes: ["waterproof", "trail"],
        url: "https://dummyjson.com/products/22",
        source: "dummyjson"
      }
    ];

    const stubCatalog: CatalogPort = {
      search: vi.fn().mockResolvedValue(candidates),
      getById: vi.fn().mockImplementation((id: string) => {
        const found = candidates.find((c) => c.id === id);
        return Promise.resolve(found ?? null);
      })
    };

    const cart = await proposeCart(mockLlm, mockMerchant, mandate, "B", stubCatalog);

    expect(cart.totalCents).toBe(18900);
    expect(cart.items[0]?.id).toBe("dummyjson:22");
    expect(cart.totalCents).toBeGreaterThan(mandate.constraints.budgetAmountCents);

    const rules = evaluateDeterministicRules(mandate, cart);
    expect(rules.passed).toBe(false);
    expect(rules.reasons.some((r) => r.includes("exceeds available budget"))).toBe(true);
  });

  it("fails price verification when live catalogue price mismatches cart price", async () => {
    const cart: ProposedCart = {
      id: "55555555-5555-5555-5555-555555555555",
      mandateId: "44444444-4444-4444-4444-444444444444",
      merchant: "DummyStore",
      items: [
        {
          id: "dummyjson:50",
          title: "Manipulated Running Shoe",
          merchant: "DummyStore",
          priceCents: 5000, // Cart claims $50
          quantity: 1,
          attributes: [],
          source: "dummyjson"
        }
      ],
      totalCents: 5000,
      currency: "USD",
      proposedAt: new Date().toISOString()
    };

    const stubCatalog: CatalogPort = {
      search: vi.fn().mockResolvedValue([]),
      getById: vi.fn().mockResolvedValue({
        id: "dummyjson:50",
        title: "Manipulated Running Shoe",
        merchant: "DummyStore",
        priceCents: 8500, // Actual catalog price is $85
        currency: "USD",
        category: "shoes",
        attributes: [],
        url: "https://dummyjson.com/products/50",
        source: "dummyjson"
      })
    };

    const check = await verifyPriceAgainstCatalog(stubCatalog, cart);
    expect(check.passed).toBe(false);
    expect(check.name).toBe("price_verified");
    expect(check.reason).toContain("Price mismatch");
  });

  it("returns Not verifiable with confidence 0.5 when catalogue is unreachable", async () => {
    const cart: ProposedCart = {
      id: "66666666-6666-6666-6666-666666666666",
      mandateId: "44444444-4444-4444-4444-444444444444",
      merchant: "LiveStore",
      items: [
        {
          id: "dummyjson:99",
          title: "Live Product",
          merchant: "LiveStore",
          priceCents: 4000,
          quantity: 1,
          attributes: [],
          source: "dummyjson"
        }
      ],
      totalCents: 4000,
      currency: "USD",
      proposedAt: new Date().toISOString()
    };

    const unreachableCatalog: CatalogPort = {
      search: vi.fn().mockRejectedValue(new Error("Network timeout after 5000ms")),
      getById: vi.fn().mockRejectedValue(new Error("Network timeout after 5000ms"))
    };

    const check = await verifyPriceAgainstCatalog(unreachableCatalog, cart);
    expect(check.passed).toBe(true);
    expect(check.confidence).toBe(0.5);
    expect(check.reason.startsWith("Not verifiable:")).toBe(true);
  });

  it("exempts demo-overlay products with clear labelling and reason", async () => {
    const mandate = createTestMandate(10000);
    const cart = await proposeCart(mockLlm, mockMerchant, mandate, "C");

    expect(cart.items[0]?.source).toBe("demo-overlay");
    expect(cart.items[0]?.title.startsWith("[DEMO OVERLAY]")).toBe(true);

    const emptyCatalog: CatalogPort = {
      search: vi.fn().mockResolvedValue([]),
      getById: vi.fn().mockResolvedValue(null)
    };

    const check = await verifyPriceAgainstCatalog(emptyCatalog, cart);
    expect(check.passed).toBe(true);
    expect(check.reason).toContain("Exempt: demo-overlay");
  });

  it("size check passes with Not verifiable and confidence 0.5 when product lacks sizes", async () => {
    const mandate = createTestMandate(10000); // requires size: "10"
    const cartWithoutSize: ProposedCart = {
      id: "77777777-7777-7777-7777-777777777777",
      mandateId: mandate.id,
      merchant: "DummyStore",
      items: [
        {
          id: "dummyjson:100",
          title: "Unsized Trail Running Shoes",
          merchant: "DummyStore",
          priceCents: 6500,
          quantity: 1,
          attributes: ["trail", "running", "shoes"],
          source: "dummyjson"
          // size is intentionally undefined
        }
      ],
      totalCents: 6500,
      currency: "USD",
      proposedAt: new Date().toISOString()
    };

    const rules = evaluateDeterministicRules(mandate, cartWithoutSize);
    const sizeCheck = rules.checks.find((c) => c.name === "size");

    expect(sizeCheck).toBeDefined();
    if (sizeCheck) {
      expect(sizeCheck.passed).toBe(true);
      expect(sizeCheck.confidence).toBe(0.5);
      expect(sizeCheck.reason).toBe("Not verifiable: size not available on this catalogue");
    }
  });
});
