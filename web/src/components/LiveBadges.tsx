import React, { useEffect, useState } from "react";
import { ShieldCheck, Activity, Cpu, Database, AlertCircle } from "lucide-react";
import { apiClient, type AppConfig } from "../api/client.js";

interface LiveBadgesProps {
  className?: string;
  style?: React.CSSProperties;
}

export const LiveBadges: React.FC<LiveBadgesProps> = ({ className, style }) => {
  const [config, setConfig] = useState<AppConfig | null>(null);

  useEffect(() => {
    let isMounted = true;
    apiClient
      .getConfig()
      .then((cfg) => {
        if (isMounted) setConfig(cfg);
      })
      .catch(() => {
        // Fallback default
        if (isMounted) {
          setConfig({
            paypalMode: "sandbox",
            paypalClientId: "mock_client_id",
            catalogProvider: "mock",
            llmProvider: "mock",
            disputeMode: "simulated"
          });
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const isLiveCatalog = config?.catalogProvider === "dummyjson";
  const isLiveLLM = config?.llmProvider === "gemini" || config?.llmProvider === "ollama";
  const llmLabel = config?.llmProvider === "gemini" ? "Gemini" : (config?.llmProvider === "ollama" ? "Ollama" : "AI fallback");

  const liveChipStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    padding: "2px 8px",
    borderRadius: "9999px",
    fontSize: "0.72rem",
    fontWeight: 600,
    background: "var(--status-pass-bg)",
    color: "var(--status-pass)",
    border: "1px solid var(--status-pass)",
    lineHeight: 1.4
  };

  const warnChipStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    padding: "2px 8px",
    borderRadius: "9999px",
    fontSize: "0.72rem",
    fontWeight: 600,
    background: "var(--status-warn-bg)",
    color: "var(--status-warn)",
    border: "1px solid var(--status-warn)",
    lineHeight: 1.4
  };

  const simChipStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    padding: "2px 8px",
    borderRadius: "9999px",
    fontSize: "0.72rem",
    fontWeight: 600,
    background: "var(--bg-subtle)",
    color: "var(--text-muted)",
    border: "1px solid var(--border)",
    lineHeight: 1.4
  };

  return (
    <div
      className={className}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        flexWrap: "wrap",
        ...style
      }}
    >
      <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", marginRight: "2px" }}>
        SYSTEM:
      </span>

      {/* LIVE Chips */}
      <span style={liveChipStyle} title="Live PayPal Sandbox REST API">
        <Activity size={12} /> PayPal Sandbox
      </span>

      {isLiveCatalog ? (
        <span style={liveChipStyle} title="Live Catalog: DummyJSON API">
          <Database size={12} /> Live catalogue: DummyJSON
        </span>
      ) : (
        <span style={warnChipStyle} title="Seeded in-memory catalogue">
          <AlertCircle size={12} /> Demo catalogue
        </span>
      )}

      {isLiveLLM ? (
        <span style={liveChipStyle} title={`Active Model: ${llmLabel}`}>
          <Cpu size={12} /> {llmLabel}
        </span>
      ) : (
        <span style={warnChipStyle} title="Deterministic mock responses">
          <AlertCircle size={12} /> AI fallback
        </span>
      )}

      <span style={liveChipStyle} title="Ed25519 & SHA-256 Verifiable Hash Chain">
        <ShieldCheck size={12} /> Signed ledger
      </span>

      {/* SIMULATED Chips */}
      <span style={simChipStyle} title="Simulated dispute pipeline">
        SIM: Dispute case
      </span>
      <span style={simChipStyle} title="Simulated logistics rail">
        SIM: Delivery
      </span>
    </div>
  );
};
