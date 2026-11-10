import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Send, CheckCircle } from "lucide-react";
import { apiClient } from "../api/client";
import { useToast } from "../components/Toast";
import type { DisputeRecord } from "@agentledger/shared";

export const DisputesPage: React.FC = () => {
  const { showToast } = useToast();
  const [selectedDisputeId, setSelectedDisputeId] = useState<string | null>(
    null,
  );
  const [analyzing, setAnalyzing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { data: disputes = [], refetch } = useQuery<DisputeRecord[]>({
    queryKey: ["disputes"],
    queryFn: () => apiClient.listDisputes(),
  });

  const selectedDispute: DisputeRecord | undefined =
    disputes.find((d) => d.id === selectedDisputeId) ?? disputes[0];

  const handleRunAnalysis = async () => {
    if (!selectedDispute) return;
    setAnalyzing(true);
    try {
      await apiClient.analyzeDispute(selectedDispute.id);
      showToast(
        "AI Dispute Analyst finished reviewing cryptographic ledger!",
        "success",
      );
      refetch();
    } catch {
      showToast("Error running dispute analysis", "error");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSubmitEvidence = async () => {
    if (!selectedDispute) return;
    setSubmitting(true);
    try {
      await apiClient.submitEvidence(selectedDispute.id);
      showToast("Evidence packet submitted to PayPal Disputes API!", "success");
      refetch();
    } catch {
      showToast("Failed to submit evidence to PayPal", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: "1200px",
        margin: "24px auto",
        padding: "0 16px",
        display: "grid",
        gridTemplateColumns: "340px 1fr",
        gap: "24px",
      }}
    >
      {/* Dispute List (Sidebar) */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <h2 style={{ fontSize: "1.1rem" }}>Disputes Workspace</h2>
        {disputes.length === 0 ? (
          <div
            className="card"
            style={{
              padding: "24px",
              textAlign: "center",
              color: "var(--text-muted)",
            }}
          >
            No disputes registered. Use Demo Drawer to trigger Scenario D or E.
          </div>
        ) : (
          disputes.map((d) => (
            <div
              key={d.id}
              onClick={() => setSelectedDisputeId(d.id)}
              className="card"
              style={{
                cursor: "pointer",
                borderLeft:
                  selectedDispute?.id === d.id
                    ? "4px solid var(--primary)"
                    : "1px solid var(--border)",
                background:
                  selectedDispute?.id === d.id
                    ? "var(--bg-subtle)"
                    : "var(--bg-surface)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span
                  className="tabular-num"
                  style={{ fontWeight: 600, fontSize: "0.85rem" }}
                >
                  ${(d.amountCents / 100).toFixed(2)} USD
                </span>
                {d.isSimulated && (
                  <span className="badge badge-warn">SIMULATED</span>
                )}
              </div>
              <div
                style={{
                  fontSize: "0.8rem",
                  color: "var(--text-muted)",
                  marginTop: "4px",
                }}
              >
                {d.reason}
              </div>
              <div
                style={{
                  fontSize: "0.75rem",
                  marginTop: "8px",
                  color: "var(--primary)",
                }}
              >
                Status: {d.status}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Dispute Detail Workspace */}
      {!selectedDispute ? (
        <div
          className="card"
          style={{
            padding: "40px",
            textAlign: "center",
            color: "var(--text-muted)",
          }}
        >
          Select a dispute to view evidence and attribution.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Dispute Header */}
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
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                <h2 style={{ fontSize: "1.2rem" }}>
                  Dispute #{selectedDispute.paypalDisputeId}
                </h2>
                {selectedDispute.isSimulated && (
                  <span className="badge badge-warn">SIMULATED</span>
                )}
              </div>
              <p
                style={{
                  color: "var(--text-muted)",
                  fontSize: "0.85rem",
                  marginTop: "4px",
                }}
              >
                Reason: <strong>{selectedDispute.reason}</strong>
              </p>
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={handleRunAnalysis}
                disabled={analyzing}
                className="btn btn-primary"
              >
                <AlertCircle size={16} />
                <span>
                  {analyzing
                    ? "Analyzing Evidence..."
                    : "Run AI Dispute Analysis"}
                </span>
              </button>
            </div>
          </div>

          {/* AI Verdict Card */}
          {selectedDispute.verdict && (
            <div
              className="card"
              style={{
                borderLeft: "4px solid var(--primary)",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-muted)",
                      textTransform: "uppercase",
                      fontWeight: 700,
                    }}
                  >
                    AI Evidence Verdict
                  </span>
                  <h3 style={{ fontSize: "1.3rem", marginTop: "2px" }}>
                    Liability Assigned:{" "}
                    <strong>{selectedDispute.verdict.fault}</strong> (
                    {Math.round(selectedDispute.verdict.confidence * 100)}%
                    confidence)
                  </h3>
                </div>
                <span className="badge badge-pass">ANALYSIS COMPLETE</span>
              </div>

              <div style={{ fontSize: "0.9rem" }}>
                <strong>Recommendation: </strong>{" "}
                {selectedDispute.verdict.recommendedAction}
              </div>

              {/* Three-Party Responsibility Matrix */}
              <div>
                <h4
                  style={{
                    fontSize: "0.85rem",
                    color: "var(--text-muted)",
                    marginBottom: "8px",
                  }}
                >
                  Three-Party Responsibility Assessment
                </h4>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: "12px",
                  }}
                >
                  <div
                    style={{
                      padding: "10px",
                      background: "var(--bg-subtle)",
                      borderRadius: "var(--radius-sm)",
                      fontSize: "0.8rem",
                    }}
                  >
                    <strong>Buyer:</strong>
                    <div
                      style={{ marginTop: "4px", color: "var(--text-muted)" }}
                    >
                      {selectedDispute.verdict.responsibility.buyer}
                    </div>
                  </div>
                  <div
                    style={{
                      padding: "10px",
                      background: "var(--bg-subtle)",
                      borderRadius: "var(--radius-sm)",
                      fontSize: "0.8rem",
                    }}
                  >
                    <strong>Agent Provider:</strong>
                    <div
                      style={{ marginTop: "4px", color: "var(--text-muted)" }}
                    >
                      {selectedDispute.verdict.responsibility.agentProvider}
                    </div>
                  </div>
                  <div
                    style={{
                      padding: "10px",
                      background: "var(--bg-subtle)",
                      borderRadius: "var(--radius-sm)",
                      fontSize: "0.8rem",
                    }}
                  >
                    <strong>Merchant:</strong>
                    <div
                      style={{ marginTop: "4px", color: "var(--text-muted)" }}
                    >
                      {selectedDispute.verdict.responsibility.merchant}
                    </div>
                  </div>
                </div>
              </div>

              {/* Evidence Packet Preview */}
              <div>
                <h4
                  style={{
                    fontSize: "0.85rem",
                    color: "var(--text-muted)",
                    marginBottom: "6px",
                  }}
                >
                  Synthesized PayPal Evidence Packet
                </h4>
                <pre
                  style={{
                    background: "var(--bg-subtle)",
                    padding: "12px",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "0.75rem",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {selectedDispute.verdict.evidencePacket}
                </pre>
              </div>

              {/* Submit Button */}
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                {selectedDispute.evidenceSubmittedAt ? (
                  <div
                    className="badge badge-pass"
                    style={{ padding: "8px 16px" }}
                  >
                    <CheckCircle size={16} /> Evidence Submitted to PayPal (
                    {new Date(
                      selectedDispute.evidenceSubmittedAt,
                    ).toLocaleTimeString()}
                    )
                  </div>
                ) : (
                  <button
                    onClick={handleSubmitEvidence}
                    disabled={submitting}
                    className="btn btn-primary"
                  >
                    <Send size={16} />
                    <span>
                      {submitting
                        ? "Transmitting..."
                        : "Submit Evidence to PayPal Disputes API"}
                    </span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
