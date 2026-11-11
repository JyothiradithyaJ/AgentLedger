import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ShieldCheck,
  ShieldAlert,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  AlertCircle
} from "lucide-react";
import { apiClient } from "../api/client.js";
import { useToast } from "../components/Toast.js";
import { classifyCheck } from "../lib/checkStatus.js";
import type { VerifyLedgerResponse, LedgerEntry } from "@agentledger/shared";

const getObjectArray = (obj: Record<string, unknown>, key: string): Record<string, unknown>[] => {
  const val = obj[key];
  if (!Array.isArray(val)) return [];
  return val.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null);
};

const getStringArray = (obj: Record<string, unknown>, key: string): string[] => {
  const val = obj[key];
  if (!Array.isArray(val)) return [];
  return val.filter((item): item is string => typeof item === "string");
};

const renderReadableSummary = (entry: LedgerEntry) => {
  const p = entry.payload;

  if (entry.eventType === "CART_PROPOSED") {
    const items = getObjectArray(p, "items");
    const firstItem = items.length > 0 ? items[0] : undefined;
    const title = typeof firstItem?.title === "string"
      ? firstItem.title
      : (typeof p.query === "string" ? `Item (${p.query})` : "Proposed Cart Item");
    const totalCents = typeof p.totalCents === "number" ? p.totalCents : 0;
    const merchant = typeof p.merchant === "string" ? p.merchant : "Store";
    const catalogSource = typeof p.catalogSource === "string"
      ? p.catalogSource
      : (typeof firstItem?.source === "string" ? firstItem.source : "mock");
    const selectedBy = typeof p.selectedBy === "string" ? p.selectedBy : "rules";
    const productUrl = typeof p.productUrl === "string" ? p.productUrl : (typeof firstItem?.url === "string" ? firstItem.url : undefined);
    const candidates = getObjectArray(p, "candidatesConsidered");
    const verifiedPriceCents = typeof p.verifiedPriceCents === "number" ? p.verifiedPriceCents : undefined;

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "6px", background: "var(--bg-subtle)", padding: "10px 12px", borderRadius: "var(--radius-sm)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <strong style={{ fontSize: "0.88rem", color: "var(--text-main)" }}>{title}</strong>
              {productUrl && (
                <a href={productUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.75rem", color: "var(--primary)" }}>
                  (Link)
                </a>
              )}
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "2px" }}>
              Merchant: <strong style={{ color: "var(--text-main)" }}>{merchant}</strong>
              {typeof p.query === "string" && <span> &bull; Query: &ldquo;{p.query}&rdquo;</span>}
              {candidates.length > 0 && <span> &bull; Candidates: {candidates.length}</span>}
              {verifiedPriceCents !== undefined && (
                <span> &bull; Verified: ${(verifiedPriceCents / 100).toFixed(2)}</span>
              )}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span className={`badge ${catalogSource === "dummyjson" ? "badge-pass" : catalogSource === "demo-overlay" ? "badge-info" : "badge-warn"}`}>
              {catalogSource === "dummyjson" ? "Live: DummyJSON" : catalogSource === "demo-overlay" ? "Demo overlay" : "Demo catalogue"}
            </span>
            <span className="badge" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
              {selectedBy === "llm" ? "AI" : "Rules"}
            </span>
            <span className="tabular-num" style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--primary)" }}>
              ${(totalCents / 100).toFixed(2)} USD
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (entry.eventType === "REFEREE_EVALUATED") {
    const allowed = Boolean(p.allowed);
    const checks = getObjectArray(p, "checks");
    const reasons = getStringArray(p, "reasons");

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "6px", background: "var(--bg-subtle)", padding: "10px 12px", borderRadius: "var(--radius-sm)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <strong style={{ fontSize: "0.85rem" }}>Referee Pre-Execution Gate</strong>
          <span className={`badge ${allowed ? "badge-pass" : "badge-fail"}`}>
            {allowed ? "ALLOWED" : "BLOCKED"}
          </span>
        </div>

        {checks.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {checks.map((chk, i) => {
              const checkName = typeof chk.name === "string" ? chk.name : "check";
              const checkReason = typeof chk.reason === "string" ? chk.reason : "";
              const status = classifyCheck({ passed: Boolean(chk.passed), reason: checkReason });
              const isFail = status === "fail";
              const isWarn = status === "warn";

              return (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "6px", fontSize: "0.78rem" }}>
                  {isFail ? (
                    <XCircle size={14} color="var(--status-fail)" style={{ marginTop: "2px", flexShrink: 0 }} />
                  ) : isWarn ? (
                    <AlertCircle size={14} color="var(--status-warn)" style={{ marginTop: "2px", flexShrink: 0 }} />
                  ) : (
                    <CheckCircle2 size={14} color="var(--status-pass)" style={{ marginTop: "2px", flexShrink: 0 }} />
                  )}
                  <span style={{ fontWeight: 600, textTransform: "capitalize", color: "var(--text-main)" }}>
                    {checkName === "price_verified" ? "Price Verified" : checkName.replace(/_/g, " ")}:
                  </span>
                  <span style={{ color: "var(--text-muted)" }}>{checkReason}</span>
                </div>
              );
            })}
          </div>
        )}

        {!allowed && reasons.length > 0 && (
          <div style={{ fontSize: "0.75rem", color: "var(--status-fail)", fontWeight: 500, marginTop: "2px" }}>
            Failure Reason: {reasons.join("; ")}
          </div>
        )}
      </div>
    );
  }

  if (entry.eventType === "PAYMENT_BLOCKED") {
    const reasons = getStringArray(p, "reasons");
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "4px", background: "var(--status-fail-bg)", border: "1px solid var(--status-fail)", padding: "10px 12px", borderRadius: "var(--radius-sm)", color: "var(--status-fail)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <strong style={{ fontSize: "0.85rem" }}>Payment Blocked: $0.00 Captured</strong>
          <span className="badge badge-fail">Rail Protected</span>
        </div>
        <div style={{ fontSize: "0.78rem" }}>
          {reasons.length > 0 ? reasons.join(" ") : "Financial rail protected. Zero dollars moved from pre-authorized hold."}
        </div>
      </div>
    );
  }

  return null;
};

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
            const readableSummary = renderReadableSummary(entry);

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

                {/* Readable Summary */}
                {readableSummary}

                {/* Collapsed Raw JSON Section */}
                <details style={{ marginTop: "4px" }}>
                  <summary style={{ cursor: "pointer", fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>
                    Raw Cryptographic Payload (JSON)
                  </summary>
                  <pre
                    style={{
                      background: "var(--bg-subtle)",
                      padding: "8px",
                      borderRadius: "var(--radius-sm)",
                      fontSize: "0.72rem",
                      overflowX: "auto",
                      marginTop: "6px"
                    }}
                  >
                    {JSON.stringify(entry.payload, null, 2)}
                  </pre>
                </details>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
