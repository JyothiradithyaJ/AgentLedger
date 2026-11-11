import React from "react";
import {
  ShoppingCart,
  CheckCircle2,
  ShieldCheck,
  ShieldAlert,
  CreditCard,
  Unlock,
  Tag,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type {
  ProposedCart,
  PurchaseRecord,
  RefereeCheck,
} from "@agentledger/shared";
import { classifyCheck, type CheckStatus } from "../lib/checkStatus.js";

export interface RunTimelineProps {
  cart?: ProposedCart;
  purchase?: PurchaseRecord;
  refereeChecks?: RefereeCheck[];
}

interface TimelineStep {
  id: string;
  title: string;
  amount?: string;
  description: string;
  status: CheckStatus;
  icon: LucideIcon;
}

export const RunTimeline: React.FC<RunTimelineProps> = ({
  cart,
  purchase,
  refereeChecks = [],
}) => {
  if (!cart && !purchase) return null;

  const isBlocked = purchase?.status === "BLOCKED";
  const isCaptured = purchase?.status === "CAPTURED";
  const priceCheck = refereeChecks.find((c) => c.name === "price_verified");
  const priceStatus: CheckStatus = priceCheck
    ? classifyCheck(priceCheck)
    : "pass";

  const steps: TimelineStep[] = [
    {
      id: "cart",
      title: "Cart Proposed",
      amount: cart ? `$${(cart.totalCents / 100).toFixed(2)}` : undefined,
      description: cart
        ? `${cart.items[0]?.title ?? "Item"} from "${cart.merchant}"`
        : "Cart proposal generated",
      status: "pass",
      icon: ShoppingCart,
    },
    {
      id: "price",
      title: "Price Verified",
      amount: cart?.planDetails?.verifiedPriceCents
        ? `$${(cart.planDetails.verifiedPriceCents / 100).toFixed(2)}`
        : cart
          ? `$${(cart.totalCents / 100).toFixed(2)}`
          : undefined,
      description: priceCheck
        ? priceCheck.reason
        : cart?.planDetails?.catalogSource === "dummyjson"
          ? "Live DummyJSON price match confirmed"
          : "Catalogue price re-verification complete",
      status: priceStatus,
      icon: Tag,
    },
    {
      id: "referee",
      title: "Referee Pre-Execution Gate",
      amount: undefined,
      description: isBlocked
        ? (purchase?.failureReason ??
          "Referee blocked purchase due to constraint violation")
        : (purchase?.refereeDecision?.reasons[0] ??
          "All deterministic and semantic checks passed"),
      status: isBlocked ? "fail" : "pass",
      icon: isBlocked ? ShieldAlert : ShieldCheck,
    },
    {
      id: "capture",
      title: isBlocked ? "Capture Prevented" : "PayPal Capture",
      amount: isCaptured
        ? `$${(purchase.capturedAmountCents / 100).toFixed(2)}`
        : "$0.00",
      description: isCaptured
        ? `Captured from active PayPal authorization (ID: ${purchase.paypalCaptureId?.slice(0, 14) ?? "simulated"}...)`
        : "Zero dollars captured from financial rail. Hold preserved.",
      status: isCaptured ? "pass" : isBlocked ? "fail" : "warn",
      icon: CreditCard,
    },
    {
      id: "release",
      title: "Hold Settlement",
      amount:
        isCaptured && purchase.releasedAmountCents > 0
          ? `Released $${(purchase.releasedAmountCents / 100).toFixed(2)}`
          : undefined,
      description: isCaptured
        ? `Released unspent remainder ($${(purchase.releasedAmountCents / 100).toFixed(2)} USD) back to buyer hold balance`
        : isBlocked
          ? "Pre-authorized hold untouched and remains available on buyer card"
          : "Settlement pending final execution",
      status: "pass",
      icon: Unlock,
    },
  ];

  return (
    <div
      className="card"
      style={{ display: "flex", flexDirection: "column", gap: "16px" }}
    >
      <h3
        style={{
          fontSize: "1rem",
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        <CheckCircle2 size={16} color="var(--primary)" />
        <span>Execution Rail Timeline</span>
      </h3>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {steps.map((step, idx) => {
          const StepIcon = step.icon;
          const isFail = step.status === "fail";
          const isWarn = step.status === "warn";
          const iconColor = isFail
            ? "var(--status-fail)"
            : isWarn
              ? "var(--status-warn)"
              : "var(--status-pass)";

          return (
            <div
              key={step.id}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
                padding: "10px 12px",
                borderRadius: "var(--radius-sm)",
                background: isFail
                  ? "var(--status-fail-bg)"
                  : isWarn
                    ? "var(--status-warn-bg)"
                    : "var(--bg-subtle)",
                border: `1px solid ${
                  isFail
                    ? "var(--status-fail)"
                    : isWarn
                      ? "var(--status-warn)"
                      : "var(--border)"
                }`,
              }}
            >
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  background: "var(--bg-surface)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginTop: "2px",
                  border: `1px solid ${iconColor}`,
                }}
              >
                <StepIcon size={14} color={iconColor} />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.72rem",
                        color: "var(--text-muted)",
                        fontWeight: 700,
                      }}
                    >
                      0{idx + 1}.
                    </span>
                    <strong
                      style={{ fontSize: "0.85rem", color: "var(--text-main)" }}
                    >
                      {step.title}
                    </strong>
                  </div>

                  {step.amount && (
                    <span
                      className="tabular-num"
                      style={{
                        fontSize: "0.85rem",
                        fontWeight: 700,
                        color: isFail ? "var(--status-fail)" : "var(--primary)",
                      }}
                    >
                      {step.amount}
                    </span>
                  )}
                </div>

                <div
                  style={{
                    fontSize: "0.78rem",
                    color: "var(--text-muted)",
                    marginTop: "2px",
                  }}
                >
                  {step.description}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
