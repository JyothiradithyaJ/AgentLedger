import React from "react";
import { Search, Sparkles, Sliders, Check, ShoppingBag } from "lucide-react";
import type { ProposedCart } from "@agentledger/shared";
import { ProductCard } from "./ProductCard.js";

interface CatalogPanelProps {
  cart?: ProposedCart;
}

export const CatalogPanel: React.FC<CatalogPanelProps> = ({ cart }) => {
  if (!cart) {
    return (
      <div className="card" style={{ display: "flex", flexDirection: "column" }}>
        <h3 style={{ fontSize: "1rem", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
          <ShoppingBag size={16} color="var(--primary)" />
          <span>Proposed Cart</span>
        </h3>
        <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
          Waiting for agent to search catalogue and select an item...
        </div>
      </div>
    );
  }

  const chosenItem = cart.items.length > 0 ? cart.items[0] : undefined;
  const plan = cart.planDetails;
  const source = plan?.catalogSource ?? chosenItem?.source ?? "mock";
  const query = plan?.query ?? chosenItem?.title ?? "running shoes";
  const selectedBy = plan?.selectedBy ?? "rules";
  const candidates = plan?.candidatesConsidered ?? [];

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
        <h3 style={{ fontSize: "1rem", display: "flex", alignItems: "center", gap: "6px" }}>
          <ShoppingBag size={16} color="var(--primary)" />
          <span>Proposed Cart</span>
        </h3>

        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
          {/* Source Badge */}
          {source === "dummyjson" ? (
            <span className="badge badge-pass" title="Fetched from live DummyJSON catalogue">
              Live: DummyJSON
            </span>
          ) : source === "demo-overlay" ? (
            <span
              className="badge"
              style={{
                background: "var(--primary-bg)",
                color: "var(--primary)",
                border: "1px solid var(--primary)"
              }}
              title="Demo overlay product for counterfactual scenario"
            >
              Demo overlay
            </span>
          ) : (
            <span className="badge badge-warn" title="Seeded in-memory test catalogue">
              Demo data fallback
            </span>
          )}

          {/* Selected By Badge */}
          {selectedBy === "llm" ? (
            <span className="badge badge-info" style={{ display: "inline-flex", gap: "3px" }}>
              <Sparkles size={11} /> Selected by: AI
            </span>
          ) : (
            <span
              className="badge"
              style={{
                background: "var(--bg-subtle)",
                color: "var(--text-muted)",
                border: "1px solid var(--border)",
                display: "inline-flex",
                gap: "3px"
              }}
            >
              <Sliders size={11} /> Selected by: Rules
            </span>
          )}
        </div>
      </div>

      {/* Query Banner */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "6px 10px",
          background: "var(--bg-subtle)",
          borderRadius: "var(--radius-sm)",
          fontSize: "0.8rem",
          color: "var(--text-muted)"
        }}
      >
        <Search size={14} color="var(--primary)" />
        <span>Catalogue Search:</span>
        <strong style={{ color: "var(--text-main)" }}>&ldquo;{query}&rdquo;</strong>
      </div>

      {/* Chosen Item Card */}
      {chosenItem ? (
        <ProductCard
          title={chosenItem.title}
          merchant={chosenItem.merchant}
          priceCents={chosenItem.priceCents}
          imageUrl={chosenItem.imageUrl}
          url={chosenItem.url ?? plan?.productUrl}
          size={chosenItem.size}
          source={source}
        />
      ) : (
        <div style={{ padding: "16px", color: "var(--text-muted)", fontSize: "0.85rem" }}>
          No item details available in cart.
        </div>
      )}

      {/* Candidates Considered List */}
      {candidates.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "4px" }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>
            Candidates Considered ({candidates.length})
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {candidates.slice(0, 5).map((cand, idx) => {
              const isChosen = chosenItem ? (cand.id === chosenItem.id || cand.title === chosenItem.title) : idx === 0;
              return (
                <div
                  key={cand.id || idx}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "6px 8px",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "0.78rem",
                    background: isChosen ? "var(--primary-bg)" : "var(--bg-subtle)",
                    border: isChosen ? "1px solid var(--primary)" : "1px solid transparent"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0, flex: 1 }}>
                    {isChosen ? (
                      <Check size={14} color="var(--primary)" style={{ flexShrink: 0 }} />
                    ) : (
                      <span style={{ width: "14px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.7rem" }}>
                        {idx + 1}
                      </span>
                    )}
                    <span
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        fontWeight: isChosen ? 600 : 400,
                        color: isChosen ? "var(--text-main)" : "var(--text-muted)"
                      }}
                    >
                      {cand.title}
                    </span>
                  </div>

                  <span
                    className="tabular-num"
                    style={{
                      flexShrink: 0,
                      fontWeight: isChosen ? 700 : 500,
                      color: isChosen ? "var(--primary)" : "var(--text-muted)",
                      marginLeft: "8px"
                    }}
                  >
                    ${(cand.priceCents / 100).toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Cart Total Footnote */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "8px 12px",
          background: "var(--bg-subtle)",
          borderRadius: "var(--radius-sm)",
          borderTop: "1px solid var(--border)"
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Cart Total</span>
          {plan?.verifiedPriceCents !== undefined && (
            <span style={{ fontSize: "0.72rem", color: "var(--status-pass)", fontWeight: 600 }}>
              Re-verified price: ${(plan.verifiedPriceCents / 100).toFixed(2)} USD
            </span>
          )}
        </div>
        <span className="tabular-num" style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-main)" }}>
          ${(cart.totalCents / 100).toFixed(2)} USD
        </span>
      </div>
    </div>
  );
};
