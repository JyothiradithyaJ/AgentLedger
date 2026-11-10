import crypto from "node:crypto";
import type { LLMPort } from "../ports/llm.port.js";
import type { MerchantPort } from "../ports/merchant.port.js";
import type { CartItem, Mandate, ProposedCart } from "@agentledger/shared";
import { ProposedCartSchema } from "@agentledger/shared";

const RESALE_MERCHANT = "ReSole Outlet";
const DRIFT_CATEGORIES = ["office chair", "coffee table", "wireless headphones"];

const titleCase = (value: string): string => value.replace(/\b\w/g, (letter) => letter.toUpperCase());

const compliantPrice = (mandate: Mandate): number => {
  return Math.max(1, Math.floor(mandate.constraints.budgetAmountCents * 82 / 100));
};

const pickCompliantMerchant = (mandate: Mandate): string => {
  if (mandate.constraints.merchantAllow.length > 0) {
    return mandate.constraints.merchantAllow[0] ?? "StrideCo";
  }
  const denied = new Set(mandate.constraints.merchantDeny.map((m) => m.toLowerCase()));
  if (!denied.has("strideco")) return "StrideCo";
  if (!denied.has("everydaymart")) return "EverydayMart";
  return "AuthorizedShop";
};

const wrongSize = (size: string | undefined): string => {
  if (!size) return "unavailable";
  const numeric = Number.parseFloat(size.replace(/^(UK|US|EU)\s*/i, ""));
  if (Number.isFinite(numeric)) return String(numeric + 1);
  const upper = size.toUpperCase();
  if (upper === "M") return "L";
  if (upper === "L") return "XL";
  if (upper === "XL") return "S";
  if (upper === "S") return "M";
  if (upper === "XS") return "M";
  return `${size} alternative`;
};

const itemFor = (
  mandate: Mandate,
  merchant: string,
  priceCents: number,
  category: string,
  size: string | undefined
): CartItem => {
  const colors = mandate.constraints.attributes.filter((attribute) => {
    return [
      "red", "blue", "black", "white", "green", "grey", "gray", "yellow",
      "pink", "purple", "orange", "brown", "navy", "beige"
    ].includes(attribute.toLowerCase());
  });
  const description = [merchant, "Everyday", ...colors.map(titleCase), titleCase(category)].join(" ");
  const title = size ? `${description} (Size ${size})` : description;

  return {
    id: `item_${mandate.id}_${priceCents}`,
    title,
    merchant,
    priceCents,
    quantity: 1,
    size,
    attributes: [...mandate.constraints.attributes, ...category.split(/\s+/)],
    url: `https://strideco.example.com/products/${encodeURIComponent(category.replace(/\s+/g, "-"))}`
  };
};

export const proposeCart = async (
  _llm: LLMPort,
  _merchant: MerchantPort,
  mandate: Mandate,
  targetScenario?: "A" | "B" | "C" | "D" | "E"
): Promise<ProposedCart> => {
  const budgetCents = mandate.constraints.budgetAmountCents;
  const compliantCents = compliantPrice(mandate);
  let merchant = pickCompliantMerchant(mandate);
  let category = mandate.constraints.itemCategory;
  let size = mandate.constraints.size;
  let priceCents = compliantCents;

  if (targetScenario === "B") {
    priceCents = Math.max(budgetCents + 1, Math.floor(budgetCents * 130 / 100));
  } else if (targetScenario === "C") {
    merchant = mandate.constraints.merchantDeny[0] ?? RESALE_MERCHANT;
  } else if (targetScenario === "D") {
    if (mandate.constraints.size) {
      size = wrongSize(mandate.constraints.size);
    } else {
      merchant = mandate.constraints.merchantDeny[0] ?? RESALE_MERCHANT;
    }
  } else if (targetScenario === "E") {
    category = DRIFT_CATEGORIES.find((candidate) => {
      return candidate.toLowerCase() !== mandate.constraints.itemCategory.toLowerCase();
    }) ?? "different item";
  }

  const item = itemFor(mandate, merchant, priceCents, category, size);
  return ProposedCartSchema.parse({
    id: crypto.randomUUID(),
    mandateId: mandate.id,
    merchant,
    items: [item],
    totalCents: priceCents,
    currency: "USD",
    proposedAt: new Date().toISOString()
  });
};
