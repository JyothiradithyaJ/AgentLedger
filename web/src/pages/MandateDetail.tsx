import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Play, AlertTriangle, ShieldCheck, Clock } from "lucide-react";
import { apiClient } from "../api/client";
import { useToast } from "../components/Toast";
import type { Mandate, LedgerEntry } from "@agentledger/shared";

export const MandateDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [running, setRunning] = useState(false);

  const { data: mandate, refetch } = useQuery<Mandate | null>({
    queryKey: ["mandate", id],
    queryFn: () => apiClient.getMandate(id!),
    enabled: Boolean(id)
  });

  const { data: ledger = [] } = useQuery<LedgerEntry[]>({
    queryKey: ["ledger"],
    queryFn: () => apiClient.getLedger()
  });

  if (!mandate) {
    return <div style={{ padding: "40px", textAlign: "center" }}>Loading mandate details...</div>;
  }

  const handleStartRun = async () => {
    setRunning(true);
    try {
      const res = await apiClient.startRun(mandate.id);
      showToast("Shopping agent run started!", "info");
      navigate(`/runs/${res.runId}`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Error starting agent run", "error");
      setRunning(false);
    }
  };

  const handleRevoke = async () => {
    if (!confirm("Are you sure you want to revoke this agent and release all remaining held funds?")) return;
    try {
      await apiClient.revokeMandate(mandate.id);
      showToast("Agent revoked. Remaining hold voided on PayPal rail.", "success");
      refetch();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Error revoking mandate hold", "error");
    }
  };

  const isClosed = mandate.status === "COMPLETED" || (mandate.capturedCents > 0 && mandate.heldCents === 0);
  const mandateEvents = ledger.filter((e) => e.mandateId === mandate.id);

  return (
    <div style={{ maxWidth: "1000px", margin: "24px auto", padding: "0 16px", display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header & Status Card */}
      <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <h1 style={{ fontSize: "1.4rem" }}>{mandate.description}</h1>
            <span className={`badge ${mandate.status === "ACTIVE" ? "badge-pass" : mandate.status === "REVOKED" ? "badge-fail" : mandate.status === "COMPLETED" ? "badge-info" : "badge-info"}`}>
              {mandate.status}
            </span>
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "4px" }}>
            Mandate ID: <span className="tabular-num" style={{ fontFamily: "monospace" }}>{mandate.id}</span>
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px" }}>
          <div style={{ display: "flex", gap: "12px" }}>
            {mandate.status === "ACTIVE" && !isClosed && (
              <>
                <button onClick={handleStartRun} disabled={running} className="btn btn-primary">
                  <Play size={16} />
                  <span>{running ? "Launching Agent..." : "Run Shopping Agent"}</span>
                </button>
                <button onClick={handleRevoke} className="btn btn-danger">
                  <AlertTriangle size={16} />
                  <span>Revoke Hold</span>
                </button>
              </>
            )}
            {isClosed && (
              <button disabled className="btn btn-primary" style={{ opacity: 0.5, cursor: "not-allowed" }}>
                <Play size={16} />
                <span>Run Shopping Agent</span>
              </button>
            )}
          </div>
          {isClosed && (
            <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", margin: 0 }}>
              This mandate&apos;s hold has already been captured. Create a new mandate.
            </p>
          )}
        </div>
      </div>

      {/* Budget Breakdown Ring / Visual Metric Bar */}
      <div className="card">
        <h3 style={{ fontSize: "1rem", marginBottom: "16px" }}>Budget Utilization</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
          <div style={{ padding: "12px", background: "var(--bg-subtle)", borderRadius: "var(--radius-sm)" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Total Authorized Cap</span>
            <div className="tabular-num" style={{ fontSize: "1.4rem", fontWeight: 700 }}>
              ${(mandate.budgetCents / 100).toFixed(2)}
            </div>
          </div>

          <div style={{ padding: "12px", background: "var(--bg-subtle)", borderRadius: "var(--radius-sm)" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Active Hold (PayPal)</span>
            <div className="tabular-num" style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--status-warn)" }}>
              ${(mandate.heldCents / 100).toFixed(2)}
            </div>
          </div>

          <div style={{ padding: "12px", background: "var(--bg-subtle)", borderRadius: "var(--radius-sm)" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Captured</span>
            <div className="tabular-num" style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--status-pass)" }}>
              ${(mandate.capturedCents / 100).toFixed(2)}
            </div>
          </div>

          <div style={{ padding: "12px", background: "var(--bg-subtle)", borderRadius: "var(--radius-sm)" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Remaining Balance</span>
            <div className="tabular-num" style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--primary)" }}>
              ${(mandate.remainingCents / 100).toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Constraints & Readback */}
      <div className="card">
        <h3 style={{ fontSize: "1rem", marginBottom: "12px" }}>Signed Rules & Expiry</h3>
        <p style={{ fontStyle: "italic", marginBottom: "16px", color: "var(--text-main)" }}>
          "{mandate.readback}"
        </p>

        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", fontSize: "0.85rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <ShieldCheck size={16} color="var(--primary)" />
            <span>Category: <strong>{mandate.constraints.itemCategory}</strong></span>
          </div>
          {mandate.constraints.size && (
            <div>Size: <strong>{mandate.constraints.size}</strong></div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-muted)" }}>
            <Clock size={16} />
            <span>Expires: {new Date(mandate.expiresAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Transaction & Audit History */}
      <div className="card">
        <h3 style={{ fontSize: "1rem", marginBottom: "16px" }}>Ledger Audit Events</h3>
        {mandateEvents.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>No events for this mandate yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {mandateEvents.map((e) => (
              <div
                key={e.sequence}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "8px 12px",
                  background: "var(--bg-subtle)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "0.85rem"
                }}
              >
                <span>#{e.sequence} &bull; <strong>{e.eventType}</strong></span>
                <span className="tabular-num" style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                  {new Date(e.timestamp).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
