import React from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { CheckCircle2, XCircle, AlertCircle, Clock, ArrowLeft, Loader2, Play } from "lucide-react";
import { useRunTimeline } from "../hooks/useSSE.js";
import { CatalogPanel } from "../components/CatalogPanel.js";
import { RunTimeline } from "../components/RunTimeline.js";
import { LiveBadges } from "../components/LiveBadges.js";
import { classifyCheck } from "../lib/checkStatus.js";
import { useToast } from "../components/Toast.js";
import { apiClient } from "../api/client.js";

const SCENARIOS = [
  { id: "A", label: "Compliant purchase" },
  { id: "B", label: "Tempted: over budget" },
  { id: "C", label: "Resale Site [Demo overlay]" },
  { id: "E", label: "Intent drift" }
];

export const AgentRunPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { events, isCompleted, error } = useRunTimeline(id ?? null);

  const latestWithCart = [...events].reverse().find((e) => Boolean(e.cart));
  const cart = latestWithCart?.cart;

  const latestWithPurchase = [...events].reverse().find((e) => Boolean(e.purchase));
  const purchase = latestWithPurchase?.purchase;
  const refereeChecks = purchase?.refereeDecision?.checks ?? [];

  React.useEffect(() => {
    if (error) {
      showToast(error, "error");
    }
  }, [error, showToast]);

  const handleLaunchScenario = async (scenarioId: string) => {
    try {
      showToast(`Launching ${scenarioId}...`, "info");
      const res = await apiClient.runScenario(scenarioId);
      const newRunId = res && typeof res === "object" && "runId" in res && typeof res.runId === "string" ? res.runId : undefined;
      if (newRunId) {
        navigate(`/runs/${newRunId}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to run scenario";
      showToast(msg, "error");
    }
  };

  return (
    <div style={{ maxWidth: "1200px", margin: "24px auto", padding: "0 16px", display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* System Status Badges */}
      <LiveBadges />

      {/* Top Banner */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <Link to="/" className="btn btn-outline" style={{ fontSize: "0.85rem" }}>
          <ArrowLeft size={16} /> Back to Mission Control
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
            Run ID: {id?.slice(0, 8)}...
          </span>
          {isCompleted ? (
            <span className="badge badge-pass">Run Finished</span>
          ) : (
            <span className="badge badge-info" style={{ display: "inline-flex", gap: "4px" }}>
              <Loader2 size={12} className="spin" /> Streaming Agent...
            </span>
          )}
        </div>
      </div>

      {/* Scenario Launch Buttons */}
      <div className="card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px", padding: "10px 16px" }}>
        <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)" }}>
          Run Alternative Scenario:
        </span>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {SCENARIOS.map((sc) => (
            <button
              key={sc.id}
              onClick={() => handleLaunchScenario(sc.id)}
              className="btn btn-outline"
              style={{ fontSize: "0.78rem", padding: "4px 10px" }}
              title={`Execute ${sc.label}`}
            >
              <Play size={12} color="var(--primary)" />
              <span>{sc.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* In-Progress Progress Indicator */}
      {!isCompleted && (
        <div
          className="card"
          style={{
            background: "var(--primary-bg)",
            borderColor: "var(--primary)",
            color: "var(--primary)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontSize: "0.85rem",
            fontWeight: 600
          }}
        >
          <Loader2 size={18} className="spin" />
          <span>Searching catalogue, verifying price, Referee checking, PayPal capturing...</span>
        </div>
      )}

      {error && (
        <div className="card" style={{ background: "var(--status-warn-bg)", color: "var(--status-warn)", fontSize: "0.85rem" }}>
          {error}
        </div>
      )}

      {/* 3-Column Layout: Stream | Catalog Panel | Referee Gate */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px", alignItems: "start" }}>
        {/* Column 1: Streamed Agent Steps */}
        <div className="card" style={{ display: "flex", flexDirection: "column", height: "460px" }}>
          <h3 style={{ fontSize: "1rem", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
            <Clock size={16} color="var(--primary)" />
            <span>Agent Thought Stream</span>
          </h3>
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px" }}>
            {events.length === 0 ? (
              <div style={{ padding: "40px 16px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                Connecting to live stream...
              </div>
            ) : (
              events.map((e, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: "8px 12px",
                    background: "var(--bg-subtle)",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "0.825rem",
                    borderLeft: "3px solid var(--primary)"
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: "0.75rem", color: "var(--primary)" }}>
                    {e.step}
                  </div>
                  <div style={{ marginTop: "2px" }}>{e.message}</div>
                  <div className="tabular-num" style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "4px" }}>
                    {new Date(e.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 2: Proposed Cart with Catalog Panel */}
        <CatalogPanel cart={cart} />

        {/* Column 3: Referee Pre-Execution Gate */}
        <div className="card" style={{ display: "flex", flexDirection: "column" }}>
          <h3 style={{ fontSize: "1rem", marginBottom: "12px" }}>
            Referee Pre-Execution Gate
          </h3>
          {refereeChecks.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>
              Referee evaluating cart constraints...
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {refereeChecks.map((check, idx) => {
                const status = classifyCheck(check);
                const isFail = status === "fail";
                const isWarn = status === "warn";
                const bg = isFail ? "var(--status-fail-bg)" : isWarn ? "var(--status-warn-bg)" : "var(--status-pass-bg)";
                const border = isFail ? "var(--status-fail)" : isWarn ? "var(--status-warn)" : "var(--status-pass)";

                return (
                  <div
                    key={idx}
                    style={{
                      padding: "8px 10px",
                      background: bg,
                      border: `1px solid ${border}`,
                      borderRadius: "var(--radius-sm)",
                      fontSize: "0.8rem",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "8px"
                    }}
                  >
                    {isFail ? (
                      <XCircle size={16} color="var(--status-fail)" style={{ marginTop: "2px", flexShrink: 0 }} />
                    ) : isWarn ? (
                      <AlertCircle size={16} color="var(--status-warn)" style={{ marginTop: "2px", flexShrink: 0 }} />
                    ) : (
                      <CheckCircle2 size={16} color="var(--status-pass)" style={{ marginTop: "2px", flexShrink: 0 }} />
                    )}

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: 600, textTransform: "capitalize" }}>
                          {check.name === "price_verified" ? "Price Verified" : check.name.replace(/_/g, " ")}
                        </span>
                        <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                          {Math.round(check.confidence * 100)}% conf
                        </span>
                      </div>
                      <div style={{ fontSize: "0.75rem", marginTop: "2px" }}>
                        {check.reason}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Action / Payment Timeline */}
      <RunTimeline cart={cart} purchase={purchase} refereeChecks={refereeChecks} />
    </div>
  );
};
