import React from "react";
import { useParams, Link } from "react-router-dom";
import { CheckCircle2, XCircle, Clock, ArrowLeft } from "lucide-react";
import { useRunTimeline } from "../hooks/useSSE";
import { ShoeSvgArt } from "../components/SvgArt";

export const AgentRunPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { events, isCompleted, error } = useRunTimeline(id ?? null);

  // Find latest cart and purchase records from events
  const latestEventWithCart = [...events].reverse().find((e) => e.cart);
  const cart = latestEventWithCart?.cart;

  const latestEventWithPurchase = [...events].reverse().find((e) => e.purchase);
  const purchase = latestEventWithPurchase?.purchase;
  const refereeChecks = purchase?.refereeDecision?.checks ?? [];

  return (
    <div
      style={{
        maxWidth: "1200px",
        margin: "24px auto",
        padding: "0 16px",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
      }}
    >
      {/* Top Banner */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Link
          to="/"
          className="btn btn-outline"
          style={{ fontSize: "0.85rem" }}
        >
          <ArrowLeft size={16} /> Back to Mission Control
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
            Run ID: {id?.slice(0, 8)}...
          </span>
          {isCompleted ? (
            <span className="badge badge-pass">Run Finished</span>
          ) : (
            <span className="badge badge-info">Agent Streaming...</span>
          )}
        </div>
      </div>

      {error && (
        <div
          className="card"
          style={{
            background: "var(--status-warn-bg)",
            color: "var(--status-warn)",
          }}
        >
          {error}
        </div>
      )}

      {/* 3-Column Layout: Steps | Proposed Cart | Referee Checklist */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "20px",
        }}
      >
        {/* Column 1: Streamed Agent Steps */}
        <div
          className="card"
          style={{ display: "flex", flexDirection: "column", height: "420px" }}
        >
          <h3
            style={{
              fontSize: "1rem",
              marginBottom: "12px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <Clock size={16} color="var(--primary)" />
            <span>Agent Thought Stream</span>
          </h3>
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            {events.map((e, idx) => (
              <div
                key={idx}
                style={{
                  padding: "8px 12px",
                  background: "var(--bg-subtle)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "0.825rem",
                  borderLeft: "3px solid var(--primary)",
                }}
              >
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: "0.75rem",
                    color: "var(--primary)",
                  }}
                >
                  {e.step}
                </div>
                <div style={{ marginTop: "2px" }}>{e.message}</div>
                <div
                  className="tabular-num"
                  style={{
                    fontSize: "0.7rem",
                    color: "var(--text-muted)",
                    marginTop: "4px",
                  }}
                >
                  {new Date(e.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Column 2: Proposed Cart Card */}
        <div
          className="card"
          style={{ display: "flex", flexDirection: "column" }}
        >
          <h3 style={{ fontSize: "1rem", marginBottom: "12px" }}>
            Proposed Cart
          </h3>
          {!cart ? (
            <div
              style={{
                padding: "40px",
                textAlign: "center",
                color: "var(--text-muted)",
              }}
            >
              Waiting for agent to select an item...
            </div>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              <div
                style={{ display: "flex", gap: "16px", alignItems: "center" }}
              >
                <ShoeSvgArt size={70} color="#0284c7" />
                <div>
                  <h4 style={{ fontSize: "1rem" }}>{cart.items[0]?.title}</h4>
                  <div
                    style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}
                  >
                    Merchant: {cart.merchant}
                  </div>
                  <div
                    style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}
                  >
                    Size: {cart.items[0]?.size ?? "N/A"}
                  </div>
                </div>
              </div>

              <div
                style={{
                  padding: "12px",
                  background: "var(--bg-subtle)",
                  borderRadius: "var(--radius-sm)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ fontWeight: 600 }}>Cart Total</span>
                <span
                  className="tabular-num"
                  style={{ fontSize: "1.3rem", fontWeight: 700 }}
                >
                  ${(cart.totalCents / 100).toFixed(2)} USD
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Column 3: Referee Checklist */}
        <div className="card">
          <h3 style={{ fontSize: "1rem", marginBottom: "12px" }}>
            Referee Pre-Execution Gate
          </h3>
          {refereeChecks.length === 0 ? (
            <div
              style={{
                padding: "40px",
                textAlign: "center",
                color: "var(--text-muted)",
              }}
            >
              Referee evaluating cart constraints...
            </div>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              {refereeChecks.map((check, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: "8px 10px",
                    background: check.passed
                      ? "var(--status-pass-bg)"
                      : "var(--status-fail-bg)",
                    border: `1px solid ${check.passed ? "var(--status-pass)" : "var(--status-fail)"}`,
                    borderRadius: "var(--radius-sm)",
                    fontSize: "0.8rem",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "8px",
                  }}
                >
                  {check.passed ? (
                    <CheckCircle2
                      size={16}
                      color="var(--status-pass)"
                      style={{ marginTop: "2px" }}
                    />
                  ) : (
                    <XCircle
                      size={16}
                      color="var(--status-fail)"
                      style={{ marginTop: "2px" }}
                    />
                  )}
                  <div>
                    <div
                      style={{ fontWeight: 600, textTransform: "capitalize" }}
                    >
                      {check.name.replace("_", " ")} (
                      {Math.round(check.confidence * 100)}% conf)
                    </div>
                    <div style={{ fontSize: "0.75rem", marginTop: "2px" }}>
                      {check.reason}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Action / Payment Timeline */}
      {purchase && (
        <div className="card">
          <h3 style={{ fontSize: "1rem", marginBottom: "12px" }}>
            PayPal Payment Rail Execution
          </h3>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              flexWrap: "wrap",
            }}
          >
            <span
              className={`badge ${
                purchase.status === "CAPTURED"
                  ? "badge-pass"
                  : purchase.status === "BLOCKED"
                    ? "badge-fail"
                    : "badge-warn"
              }`}
              style={{ fontSize: "0.85rem", padding: "6px 14px" }}
            >
              Rail Status: {purchase.status}
            </span>

            {purchase.status === "CAPTURED" && (
              <span className="tabular-num" style={{ fontSize: "0.9rem" }}>
                Captured{" "}
                <strong>
                  ${(purchase.capturedAmountCents / 100).toFixed(2)} USD
                </strong>{" "}
                &bull; Released remaining hold:{" "}
                <strong>
                  ${(purchase.releasedAmountCents / 100).toFixed(2)} USD
                </strong>
              </span>
            )}

            {purchase.status === "BLOCKED" && (
              <span style={{ fontSize: "0.9rem", color: "var(--status-fail)" }}>
                Zero money captured. Rail hold preserved. Reason:{" "}
                {purchase.failureReason}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
