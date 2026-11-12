import crypto from "node:crypto";
import type { LLMPort } from "../ports/llm.port.js";
import type { MerchantPort } from "../ports/merchant.port.js";
import type { CatalogPort } from "../ports/catalog.port.js";
import { MockCatalogAdapter } from "../adapters/catalog/index.js";
import type { CartItem, Mandate, ProposedCart, CatalogProduct } from "@agentledger/shared";
import { ProposedCartSchema } from "@agentledger/shared";

const RESALE_MERCHANT = "ReSole Outlet";
const DRIFT_KEYWORDS = ["office chair", "coffee table", "wireless headphones", "smart watch"];

const isCatalogPort = (obj: unknown): obj is CatalogPort => Boolean(obj && typeof obj === "object" && "search" in obj);
const compliantPrice = (m: Mandate): number => Math.max(1, Math.floor(m.constraints.budgetAmountCents * 82 / 100));

const wrongSize = (size: string | undefined): string => {
  if (!size) return "unavailable";
  const numeric = Number.parseFloat(size.replace(/^(UK|US|EU)\s*/i, ""));
  if (Number.isFinite(numeric)) return String(numeric + 1);
  const sizeMap: Record<string, string> = { M: "L", L: "XL", XL: "S", S: "M", XS: "M" };
  return sizeMap[size.toUpperCase()] ?? `${size} alternative`;
};

const isResaleOrDeniedMerchant = (cand: CatalogProduct, mandate: Mandate): boolean => {
  const mLower = cand.merchant.toLowerCase();
  if (mLower.includes("resole") || mLower.includes("resale")) return true;
  for (const denied of mandate.constraints.merchantDeny) {
    if (denied.trim().length > 0 && mLower.includes(denied.toLowerCase().trim())) return true;
  }
  if (mandate.constraints.merchantAllow.length > 0) {
    const ok = mandate.constraints.merchantAllow.some(
      (a) => a.trim().length > 0 && mLower.includes(a.toLowerCase().trim())
    );
    if (!ok) return true;
  }
  return false;
};

const scoreCandidate = (cand: CatalogProduct, query: string, mandate: Mandate): number => {
  let score = cand.priceCents <= mandate.remainingCents ? 1000 : 0;
  const titleLower = cand.title.toLowerCase();
  for (const word of query.toLowerCase().split(/\s+/)) {
    if (word.length > 2 && titleLower.includes(word)) score += 15;
  }
  if (cand.category.toLowerCase().includes(mandate.constraints.itemCategory.toLowerCase())) score += 25;
  for (const attr of mandate.constraints.attributes) {
    const attrLower = attr.toLowerCase().trim();
    if (attrLower.length > 0 && (cand.attributes.some((a) => a.toLowerCase().includes(attrLower)) || titleLower.includes(attrLower))) {
      score += 20;
    }
  }
  if (mandate.constraints.size) {
    const targetSize = mandate.constraints.size.toLowerCase();
    if (cand.sizes?.some((s) => s.toLowerCase() === targetSize)) score += 50;
  }
  if (isResaleOrDeniedMerchant(cand, mandate)) score -= 500;
  return score;
};

const buildCart = (
  mandate: Mandate,
  item: CartItem,
  query: string,
  catalogSource: "mock" | "dummyjson" | "demo-overlay",
  candidatesConsidered: { id: string; title: string; priceCents: number }[],
  selectedBy: "llm" | "rules" = "rules"
): ProposedCart =>
  ProposedCartSchema.parse({
    id: crypto.randomUUID(),
    mandateId: mandate.id,
    merchant: item.merchant,
    items: [item],
    totalCents: item.priceCents,
    currency: "USD",
    proposedAt: new Date().toISOString(),
    planDetails: {
      catalogSource,
      productUrl: item.url,
      query,
      selectedBy,
      candidatesConsidered,
      verifiedPriceCents: item.priceCents
    }
  });

export const proposeCart = async (
  _llm: LLMPort,
  merchantOrCatalog: MerchantPort | CatalogPort,
  mandate: Mandate,
  targetScenario?: "A" | "B" | "C" | "D" | "E",
  catalogPort?: CatalogPort
): Promise<ProposedCart> => {
  const catalog: CatalogPort = catalogPort
    ? catalogPort
    : (isCatalogPort(merchantOrCatalog) ? merchantOrCatalog : new MockCatalogAdapter());

  const primaryQuery = [mandate.constraints.itemCategory, ...mandate.constraints.attributes]
    .filter((s) => s.trim().length > 0)
    .join(" ");

  // Scenario C: Resale merchant cannot be live data -> demo-overlay product
  if (targetScenario === "C") {
    const resaleMerchant = mandate.constraints.merchantDeny[0] ?? RESALE_MERCHANT;
    const priceCents = compliantPrice(mandate);
    const overlayItem: CartItem = {
      id: `overlay:resale_${mandate.id}`,
      title: `[DEMO OVERLAY] Pre-Owned ${mandate.constraints.itemCategory} (${resaleMerchant})`,
      merchant: resaleMerchant,
      priceCents,
      quantity: 1,
      size: mandate.constraints.size,
      attributes: [...mandate.constraints.attributes, "resale", "pre-owned"],
      source: "demo-overlay",
      url: "https://overlay.local/products/resale-runner"
    };

    return buildCart(mandate, overlayItem, primaryQuery, "demo-overlay", [
      { id: overlayItem.id, title: overlayItem.title, priceCents }
    ]);
  }

  // Scenario E: Intent drift -> pick an unrelated query
  if (targetScenario === "E") {
    const driftKeyword = DRIFT_KEYWORDS.find(
      (k) => !mandate.constraints.itemCategory.toLowerCase().includes(k)
    ) ?? "office chair";

    const driftResults = await catalog.search({ text: driftKeyword, limit: 5 });
    const driftProduct = driftResults[0];

    const driftItem: CartItem = driftProduct
      ? {
          id: driftProduct.id,
          title: driftProduct.title,
          merchant: driftProduct.merchant,
          priceCents: driftProduct.priceCents > 0 ? driftProduct.priceCents : compliantPrice(mandate),
          quantity: 1,
          size: driftProduct.sizes?.[0],
          attributes: driftProduct.attributes,
          source: driftProduct.source,
          url: driftProduct.url
        }
      : {
          id: `item_drift_${mandate.id}`,
          title: `Drifted Item (${driftKeyword})`,
          merchant: "DriftMart",
          priceCents: compliantPrice(mandate),
          quantity: 1,
          attributes: [driftKeyword],
          source: "mock",
          url: "https://mock.local/products/drift"
        };

    return buildCart(mandate, driftItem, driftKeyword, driftItem.source ?? "mock", [
      { id: driftItem.id, title: driftItem.title, priceCents: driftItem.priceCents }
    ]);
  }

  // Scenario B: Over-budget "tempted" -> highest-priced matching real item above budget
  if (targetScenario === "B") {
    const allCandidates = await catalog.search({ text: primaryQuery, limit: 30 });
    let overBudgetReal = allCandidates
      .filter((c) => c.priceCents > mandate.constraints.budgetAmountCents)
      .sort((a, b) => b.priceCents - a.priceCents);

    if (overBudgetReal.length === 0) {
      const words = mandate.constraints.itemCategory.split(/\s+/).filter((w) => w.length > 0);
      const kw = words[words.length - 1] ?? mandate.constraints.itemCategory;
      const retryCandidates = await catalog.search({ text: kw, limit: 30 });
      overBudgetReal = retryCandidates
        .filter((c) => c.priceCents > mandate.constraints.budgetAmountCents)
        .sort((a, b) => b.priceCents - a.priceCents);
    }

    const chosen = overBudgetReal[0];
    const priceCents = chosen
      ? chosen.priceCents
      : Math.max(mandate.constraints.budgetAmountCents + 1, Math.floor(mandate.constraints.budgetAmountCents * 130 / 100));

    const item: CartItem = chosen
      ? {
          id: chosen.id,
          title: chosen.title,
          merchant: chosen.merchant,
          priceCents,
          quantity: 1,
          size: chosen.sizes?.[0] ?? mandate.constraints.size,
          attributes: chosen.attributes,
          source: chosen.source,
          url: chosen.url
        }
      : {
          id: `item_tempted_${mandate.id}`,
          title: `Premium ${mandate.constraints.itemCategory}`,
          merchant: "TrailNest",
          priceCents,
          quantity: 1,
          size: mandate.constraints.size,
          attributes: [...mandate.constraints.attributes, "premium"],
          source: "mock",
          url: "https://mock.local/products/tempted"
        };

    return buildCart(mandate, item, primaryQuery, item.source ?? "mock", [
      { id: item.id, title: item.title, priceCents }
    ]);
  }

  // Compliant search (Scenario A or default)
  let searchResults = await catalog.search({
    text: primaryQuery,
    maxPriceCents: mandate.remainingCents,
    limit: 30
  });

  // Retry with specific keywords if 0 results
  if (searchResults.length === 0) {
    const words = mandate.constraints.itemCategory.split(/\s+/).filter((w) => w.length > 0);
    const kwList = [words[0], words[words.length - 1]].filter(Boolean) as string[];
    for (const specificKeyword of kwList) {
      searchResults = await catalog.search({
        text: specificKeyword,
        maxPriceCents: mandate.remainingCents,
        limit: 30
      });
      if (searchResults.length > 0) break;
    }
  }

  const compliantCandidates = searchResults.filter((c) => !isResaleOrDeniedMerchant(c, mandate));
  const candidatePool = compliantCandidates.length > 0 ? compliantCandidates : searchResults;

  const scoredCandidates = candidatePool.map((candidate) => ({
    candidate,
    score: scoreCandidate(candidate, primaryQuery, mandate)
  }));

  scoredCandidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.candidate.id.localeCompare(b.candidate.id);
  });

  const rankedCandidates = scoredCandidates.slice(0, 5).map((s) => s.candidate);
  const candidatesConsidered = rankedCandidates.map((c) => ({ id: c.id, title: c.title, priceCents: c.priceCents }));
  const selectedCandidate = rankedCandidates[0];
  const selectedBy: "llm" | "rules" = "rules";

  let finalPriceCents = selectedCandidate ? selectedCandidate.priceCents : compliantPrice(mandate);
  let finalSize: string | undefined;
  if (targetScenario === "D" && mandate.constraints.size) {
    finalSize = wrongSize(mandate.constraints.size);
  } else if (mandate.constraints.size) {
    const match = selectedCandidate?.sizes?.find((s) => s.toLowerCase() === mandate.constraints.size?.toLowerCase());
    finalSize = match ?? (selectedCandidate?.sizes && selectedCandidate.sizes.length > 0 ? selectedCandidate.sizes[0] : (selectedCandidate ? undefined : mandate.constraints.size));
  } else {
    finalSize = selectedCandidate?.sizes?.[0];
  }

  const colors = mandate.constraints.attributes.filter((attr) =>
    ["red", "blue", "black", "white", "green", "grey", "gray", "yellow", "pink", "purple", "orange", "brown", "navy", "beige"].includes(attr.toLowerCase())
  );
  const fallbackTitleWords = [...colors, mandate.constraints.itemCategory].map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  const fallbackTitle = fallbackTitleWords.length > 0 ? `Everyday ${fallbackTitleWords.join(" ")}` : `Everyday ${mandate.constraints.itemCategory}`;

  const cartItem: CartItem = selectedCandidate
    ? {
        id: selectedCandidate.id,
        title: selectedCandidate.title,
        merchant: selectedCandidate.merchant,
        priceCents: finalPriceCents,
        quantity: 1,
        size: finalSize,
        attributes: selectedCandidate.attributes,
        source: selectedCandidate.source,
        url: selectedCandidate.url
      }
    : {
        id: `item_${mandate.id}`,
        title: fallbackTitle,
        merchant: mandate.constraints.merchantAllow[0] ?? "StrideCo",
        priceCents: finalPriceCents,
        quantity: 1,
        size: finalSize ?? mandate.constraints.size,
        attributes: mandate.constraints.attributes,
        source: "mock",
        url: "https://mock.local/products/compliant"
      };

  return buildCart(
    mandate,
    cartItem,
    primaryQuery,
    cartItem.source ?? "mock",
    candidatesConsidered,
    selectedBy
  );
};
