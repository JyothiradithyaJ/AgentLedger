import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, ShieldAlert, Download, RefreshCw, AlertTriangle } from "lucide-react";
import { apiClient } from "../api/client";
import { useToast } from "../components/Toast";
import type { VerifyLedgerResponse, LedgerEntry } from "@agentledger/shared";

export const EvidenceLedgerPage: React.FC = () => {
  const { showToast } = useToast();
  const [verifying, setVerifying] = useState(false);
  const [verification, setVerification] = useState<VerifyLedgerResponse | null>(null);

  const { data: entries = [], refetch } = useQuery<LedgerEntry[]>({
    queryKey: ["ledger"],
    queryFn: () => apiClient.getLedger()
  });

  const handleVerify = async () => {
    setVerifying(true);
    setVerification(null);
    try {
      const res = await apiClient.verifyLedger();
      setTimeout(() => {
        setVerification(res);
        setVerifying(false);
        if (res.valid) {
          showToast("Entire ledger chain is cryptographically VALID", "success");
        } else {
          showToast(`Cryptographic failure detected at #${res.brokenSequence}`, "error");
        }
      }, 600);
    } catch {
      showToast("Error executing ledger verification", "error");
      setVerifying(false);
    }
  };

  const handleTamper = async (seq: number) => {
    try {
      await apiClient.tamperLedger(seq);
      showToast(`Entry #${seq} corrupted for demo tampering verification!`, "info");
      refetch();
      handleVerify();
    } catch {
      showToast("Error tampering with entry", "error");
    }
  };

  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(entries, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `agentledger_chain_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div style={{ maxWidth: "1000px", margin: "24px auto", padding: "0 16px", display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header and Controls */}
      <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ fontSize: "1.3rem" }}>Verifiable Cryptographic Evidence Ledger</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
            Append-only, SHA-256 hash-chained, and Ed25519-signed records modeled on AP2 intent, cart, and payment mandates.
          </p>
        </div>

        <div style={{ display: "flex", gap: "12px" }}>
          <button onClick={handleVerify} disabled={verifying || entries.length === 0} className="btn btn-primary">
            <RefreshCw size={16} className={verifying ? "spin" : ""} />
            <span>{verifying ? "Verifying Chain..." : "Verify Chain"}</span>
          </button>
          <button onClick={handleExportJson} disabled={entries.length === 0} className="btn btn-outline">
            <Download size={16} />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* Verification Status Banner */}
      {verification && (
        <div
          className="card"
          style={{
            background: verification.valid ? "var(--status-pass-bg)" : "var(--status-fail-bg)",
            border: `1px solid ${verification.valid ? "var(--status-pass)" : "var(--status-fail)"}`,
            color: verification.valid ? "var(--status-pass)" : "var(--status-fail)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", fontWeight: 600 }}>
            {verification.valid ? <ShieldCheck size={20} /> : <ShieldAlert size={20} />}
            <span>
              {verification.valid
                ? `Cryptographic Verification PASSED: ${verification.totalEntries} entries verified with valid SHA-256 hashes and Ed25519 signatures.`
                : `CHAIN COMPROMISED: Break detected at sequence #${verification.brokenSequence}. ${verification.reason}`}
            </span>
          </div>
        </div>
      )}

      {/* Vertical Chain */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {entries.length === 0 ? (
          <div className="card" style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
            No entries in the ledger chain yet.
          </div>
        ) : (
          entries.map((entry) => {
            const isBroken = verification && !verification.valid && verification.brokenSequence === entry.sequence;

            return (
              <div
                key={entry.sequence}
                className="card"
                style={{
                  borderLeft: isBroken ? "4px solid var(--status-fail)" : "4px solid var(--primary)",
                  background: isBroken ? "var(--status-fail-bg)" : "var(--bg-surface)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span className="tabular-num" style={{ fontWeight: 700, fontSize: "1rem" }}>
                      #{entry.sequence}
                    </span>
                    <span className="badge badge-info">{entry.eventType}</span>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      Mandate: {entry.mandateId.slice(0, 8)}...
                    </span>
                  </div>

                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => handleTamper(entry.sequence)}
                      className="btn btn-outline"
                      style={{ fontSize: "0.75rem", padding: "2px 8px", color: "var(--status-fail)" }}
                      title="Demo Only: Corrupt this entry to test verification failure"
                    >
                      <AlertTriangle size={12} /> Tamper (Demo)
                    </button>
                    <span className="tabular-num" style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>

                {/* Hashes and Signature */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "0.75rem", fontFamily: "monospace", color: "var(--text-muted)" }}>
                  <div>Prev Hash: {entry.previousHash.slice(0, 16)}...</div>
                  <div>Curr Hash: {entry.currentHash.slice(0, 16)}...</div>
                </div>

                {/* Payload snippet */}
                <pre
                  style={{
                    background: "var(--bg-subtle)",
                    padding: "8px",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "0.75rem",
                    overflowX: "auto"
                  }}
                >
                  {JSON.stringify(entry.payload, null, 2)}
                </pre>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
