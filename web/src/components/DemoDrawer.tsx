import React, { useState } from "react";
import { X, Play, RotateCcw, UserCheck, Shield } from "lucide-react";
import { apiClient } from "../api/client";
import { useToast } from "./Toast";

interface DemoDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectScenario: (scenario: string) => void;
  bypassReferee: boolean;
  onToggleReferee: () => void;
  persona: "Consumer" | "Merchant" | "Auditor";
  onChangePersona: (p: "Consumer" | "Merchant" | "Auditor") => void;
}

export const DemoDrawer: React.FC<DemoDrawerProps> = ({
  isOpen,
  onClose,
  onSelectScenario,
  bypassReferee,
  onToggleReferee,
  persona,
  onChangePersona
}) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const scenarios = [
    {
      id: "A",
      name: "Compliant purchase",
      cue: "Proves PayPal captures compliant cart and automatically releases remainder of hold.",
      tag: "PASS"
    },
    {
      id: "B",
      name: "Tempted: over budget",
      cue: "Proves budget guardrail catches violation before any money moves.",
      tag: "BLOCKED"
    },
    {
      id: "C",
      name: "Resale Site [Demo overlay]",
      cue: "Proves semantic AI referee halts unauthorized marketplace using overlay data.",
      tag: "BLOCKED"
    },
    {
      id: "D",
      name: "Merchant Fault Dispute",
      cue: "Buyer claims defective product; Evidence agent verifies merchant liability.",
      tag: "DISPUTE"
    },
    {
      id: "E",
      name: "Intent drift",
      cue: "Runs agent drift with Referee OFF (captured & disputed) vs Referee ON (blocked).",
      tag: "A/B TEST"
    }
  ];

  const handleReset = async () => {
    setLoading(true);
    try {
      await apiClient.resetDemo();
      showToast("Demo database and state successfully reset", "success");
    } catch {
      showToast("Failed to reset demo state", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        width: "380px",
        background: "var(--bg-surface)",
        borderLeft: "1px solid var(--border)",
        boxShadow: "var(--shadow-md)",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column"
      }}
    >
      <div
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Shield size={20} color="var(--primary)" />
          <h3 style={{ fontSize: "1.1rem" }}>Demo Control Drawer</h3>
        </div>
        <button onClick={onClose} className="btn btn-outline" style={{ padding: "4px 8px" }}>
          <X size={16} />
        </button>
      </div>

      <div style={{ padding: "20px", flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "20px" }}>
        {/* Persona Switch */}
        <div>
          <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "6px" }}>
            <UserCheck size={14} /> Persona Switcher
          </label>
          <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
            {(["Consumer", "Merchant", "Auditor"] as const).map((p) => (
              <button
                key={p}
                onClick={() => onChangePersona(p)}
                className={`btn ${persona === p ? "btn-primary" : "btn-outline"}`}
                style={{ flex: 1, padding: "6px 8px", fontSize: "0.8rem", justifyContent: "center" }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Referee Counterfactual Toggle */}
        <div className="card" style={{ background: "var(--bg-subtle)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>Referee Gate</div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                {bypassReferee ? "DISABLED (Demonstrates unprotected agent drift)" : "ACTIVE (Deterministic + AI checks)"}
              </div>
            </div>
            <button
              onClick={onToggleReferee}
              className={`btn ${bypassReferee ? "btn-danger" : "btn-primary"}`}
              style={{ padding: "4px 10px", fontSize: "0.8rem" }}
            >
              {bypassReferee ? "Bypassed" : "Active"}
            </button>
          </div>
        </div>

        {/* Scenarios */}
        <div>
          <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-muted)" }}>Interactive Scenarios</label>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "8px" }}>
            {scenarios.map((sc) => (
              <div
                key={sc.id}
                className="card"
                style={{ cursor: "pointer", transition: "border-color 150ms" }}
                onClick={() => onSelectScenario(sc.id)}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>{sc.name}</span>
                  <span className={`badge ${sc.tag === "PASS" ? "badge-pass" : sc.tag === "BLOCKED" ? "badge-fail" : "badge-warn"}`}>
                    {sc.tag}
                  </span>
                </div>
                <p style={{ fontSize: "0.775rem", color: "var(--text-muted)", marginTop: "4px" }}>{sc.cue}</p>
                <div style={{ marginTop: "8px", display: "flex", justifyContent: "flex-end" }}>
                  <button className="btn btn-outline" style={{ padding: "2px 8px", fontSize: "0.75rem" }}>
                    <Play size={12} /> Run
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Reset State */}
        <div style={{ marginTop: "auto" }}>
          <button
            onClick={handleReset}
            disabled={loading}
            className="btn btn-outline"
            style={{ width: "100%", justifyContent: "center", color: "var(--status-fail)" }}
          >
            <RotateCcw size={16} />
            <span>Reset Demo State</span>
          </button>
        </div>
      </div>
    </div>
  );
};
