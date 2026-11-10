import crypto from "node:crypto";
import type { LLMPort } from "../ports/llm.port.js";
import type { MerchantPort } from "../ports/merchant.port.js";
import type { Mandate, ProposedCart } from "@agentledger/shared";
import { ProposedCartSchema } from "@agentledger/shared";

export const proposeCart = async (
  _llm: LLMPort,
  merchant: MerchantPort,
  mandate: Mandate,
  targetScenario?: "A" | "B" | "C" | "D" | "E"
): Promise<ProposedCart> => {
  // Scenario A / D: Inside mandate ($98.50, StrideCo, size 10)
  // Scenario B: Over budget ($139, TrailNest)
  // Scenario C: Resale site / Prohibited (ReSole Outlet)
  let items = await merchant.searchCatalog(
    mandate.constraints.itemCategory,
    mandate.constraints.itemCategory,
    mandate.constraints.budgetAmountCents
  );

  if (targetScenario === "B") {
    // Select an over-budget item ($139)
    items = await merchant.searchCatalog("trail", undefined, 20000);
    const overBudgetItem = items.find((i) => i.priceCents > mandate.constraints.budgetAmountCents);
    if (overBudgetItem) {
      return {
        id: crypto.randomUUID(),
        mandateId: mandate.id,
        merchant: overBudgetItem.merchant,
        items: [overBudgetItem],
        totalCents: overBudgetItem.priceCents,
        currency: "USD",
        proposedAt: new Date().toISOString()
      };
    }
  }

  if (targetScenario === "C") {
    // Select from resale store
    items = await merchant.searchCatalog("resole", undefined, 20000);
    const resaleItem = items.find((i) => i.merchant.toLowerCase().includes("resole"));
    if (resaleItem) {
      return {
        id: crypto.randomUUID(),
        mandateId: mandate.id,
        merchant: resaleItem.merchant,
        items: [resaleItem],
        totalCents: resaleItem.priceCents,
        currency: "USD",
        proposedAt: new Date().toISOString()
      };
    }
  }

  // Default: Choose optimal matching item within budget
  const bestItem = items[0] ?? {
    id: "item_stride_runner",
    title: "StrideCo CloudRunner White (Size 10)",
    merchant: "StrideCo",
    priceCents: 9850,
    quantity: 1,
    size: mandate.constraints.size ?? "10",
    attributes: ["running", "white"],
    url: "https://strideco.example.com/products/cloudrunner"
  };

  const cart: ProposedCart = {
    id: crypto.randomUUID(),
    mandateId: mandate.id,
    merchant: bestItem.merchant,
    items: [bestItem],
    totalCents: bestItem.priceCents * bestItem.quantity,
    currency: "USD",
    proposedAt: new Date().toISOString()
  };

  return ProposedCartSchema.parse(cart);
};
