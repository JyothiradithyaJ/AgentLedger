import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ShieldCheck,
  CreditCard,
  Ban,
  Activity,
  PlusCircle,
  AlertTriangle,
} from "lucide-react";
import { apiClient } from "../api/client";
import { useToast } from "../components/Toast";
import type { Mandate, LedgerEntry } from "@agentledger/shared";

export const MissionControlPage: React.FC = () => {
  const { showToast } = useToast();

  const { data: mandates = [], refetch: refetchMandates } = useQuery<Mandate[]>(
    {
      queryKey: ["mandates"],
      queryFn: () => apiClient.listMandates(),
    },
  );

  const { data: ledger = [] } = useQuery<LedgerEntry[]>({
    queryKey: ["ledger"],
    queryFn: () => apiClient.getLedger(),
  });

  // Calculate Metrics
  const activeMandates = mandates.filter((m) => m.status === "ACTIVE");
  const totalHeldCents = activeMandates.reduce(
    (sum, m) => sum + m.heldCents,
    0,
  );
  const totalCapturedCents = mandates.reduce(
    (sum, m) => sum + m.capturedCents,
    0,
  );
  const blockedEvents = ledger.filter((e) => e.eventType === "PAYMENT_BLOCKED");

  const handleRevokeAll = async () => {
    if (
      !confirm(
        "Revoke all active agent mandates and immediately void on-rail holds?",
      )
    )
      return;
    try {
      for (const m of activeMandates) {
        await apiClient.revokeMandate(m.id);
      }
      showToast("All active mandates revoked and holds released", "success");
      refetchMandates();
    } catch {
      showToast("Error revoking mandates", "error");
    }
  };

  return (
    <div
      style={{
        padding: "24px",
        maxWidth: "1200px",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
      }}
    >
      {/* KPI Tiles */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "16px",
        }}
      >
        <div className="card">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: "0.85rem",
                color: "var(--text-muted)",
                fontWeight: 500,
              }}
            >
              Active Mandates
            </span>
            <ShieldCheck color="var(--primary)" size={20} />
          </div>
          <div
            className="tabular-num"
            style={{ fontSize: "2rem", fontWeight: 700, marginTop: "8px" }}
          >
            {activeMandates.length}
          </div>
        </div>

        <div className="card">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: "0.85rem",
                color: "var(--text-muted)",
                fontWeight: 500,
              }}
            >
              Funds on Hold
            </span>
            <CreditCard color="var(--status-warn)" size={20} />
          </div>
          <div
            className="tabular-num"
            style={{ fontSize: "2rem", fontWeight: 700, marginTop: "8px" }}
          >
            ${(totalHeldCents / 100).toFixed(2)}
          </div>
        </div>

        <div className="card">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: "0.85rem",
                color: "var(--text-muted)",
                fontWeight: 500,
              }}
            >
              Captured by Agents
            </span>
            <Activity color="var(--status-pass)" size={20} />
          </div>
          <div
            className="tabular-num"
            style={{ fontSize: "2rem", fontWeight: 700, marginTop: "8px" }}
          >
            ${(totalCapturedCents / 100).toFixed(2)}
          </div>
        </div>

        <div className="card">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: "0.85rem",
                color: "var(--text-muted)",
                fontWeight: 500,
              }}
            >
              Blocked Drift Attempts
            </span>
            <Ban color="var(--status-fail)" size={20} />
          </div>
          <div
            className="tabular-num"
            style={{ fontSize: "2rem", fontWeight: 700, marginTop: "8px" }}
          >
            {blockedEvents.length}
          </div>
        </div>
      </div>

      {/* Control Card & Actions */}
      <div
        className="card"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <h3 style={{ fontSize: "1.1rem" }}>Autonomous Agent Guardrails</h3>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
            Financial rails enforce strict budget holds. Autonomous shopping
            agents cannot exceed mandate caps.
          </p>
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          {activeMandates.length > 0 && (
            <button
              onClick={handleRevokeAll}
              className="btn btn-danger"
              style={{ fontSize: "0.85rem" }}
            >
              <AlertTriangle size={16} /> Revoke All Active Holds
            </button>
          )}
          <Link
            to="/mandates/new"
            className="btn btn-primary"
            style={{ fontSize: "0.85rem" }}
          >
            <PlusCircle size={16} /> New Spending Mandate
          </Link>
        </div>
      </div>

      {/* Live Activity Feed */}
      <div className="card">
        <h3
          style={{
            fontSize: "1rem",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <Activity size={18} color="var(--primary)" />
          <span>Cryptographic Ledger Activity Feed</span>
        </h3>

        {ledger.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "40px",
              color: "var(--text-muted)",
            }}
          >
            <p>No activity recorded yet.</p>
            <Link
              to="/mandates/new"
              className="btn btn-primary"
              style={{ marginTop: "12px" }}
            >
              Create Your First Mandate
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {ledger
              .slice(-6)
              .reverse()
              .map((entry) => (
                <div
                  key={entry.sequence}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    background: "var(--bg-subtle)",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "0.85rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                    }}
                  >
                    <span
                      className="tabular-num"
                      style={{
                        color: "var(--text-muted)",
                        fontSize: "0.75rem",
                      }}
                    >
                      #{entry.sequence}
                    </span>
                    <span className="badge badge-info">{entry.eventType}</span>
                    <span>Mandate: {entry.mandateId.slice(0, 8)}...</span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "16px",
                    }}
                  >
                    <span
                      className="tabular-num"
                      style={{
                        fontFamily: "monospace",
                        fontSize: "0.75rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      sig: {entry.signature.slice(0, 10)}...
                    </span>
                    <span
                      className="tabular-num"
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};
