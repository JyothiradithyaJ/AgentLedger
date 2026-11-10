import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";
import { apiClient } from "../api/client";
import { PayPalButton } from "../components/PayPalButton";
import { useToast } from "../components/Toast";
import type { MandateConstraints, Mandate } from "@agentledger/shared";

export const NewMandatePage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);

  // Parsed state
  const [readback, setReadback] = useState("");
  const [constraints, setConstraints] = useState<MandateConstraints | null>(null);

  // Created funding order state
  const [createdMandate, setCreatedMandate] = useState<Mandate | null>(null);
  const [orderId, setOrderId] = useState("");
  const [approveUrl, setApproveUrl] = useState("");

  const exampleChips = [
    "Buy white running shoes, size 10, under $120, no resale sites",
    "Find trail running shoes under $140, waterproof, exclude ReSole Outlet",
    "Casual sneakers under $90, black or white, verified stores only"
  ];

  const handleParse = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      const parsed = await apiClient.parsePrompt(prompt);
      setReadback(parsed.readback);
      setConstraints(parsed.constraints);
      setStep(2);
    } catch {
      showToast("Failed to parse prompt. Using fallback structure.", "error");
      setReadback(`The agent may spend up to $120 on items matching: "${prompt}".`);
      setConstraints({
        budgetAmountCents: 12000,
        currency: "USD",
        itemCategory: "running shoes",
        size: "10",
        attributes: ["white"],
        merchantAllow: [],
        merchantDeny: ["ReSole Outlet"]
      });
      setStep(2);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrder = async () => {
    if (!constraints) return;
    setLoading(true);
    try {
      const res = await apiClient.createMandate(prompt, readback, constraints);
      setCreatedMandate(res.mandate);
      setOrderId(res.paypalOrderId);
      setApproveUrl(res.approveUrl);
      setStep(3);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Error creating PayPal funding order", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleHoldAuthorized = async () => {
    if (!createdMandate) return;
    try {
      await apiClient.authorizeMandate(createdMandate.id);
      showToast("Hold placed successfully! Spending mandate is ACTIVE.", "success");
      setTimeout(() => {
        navigate(`/mandates/${createdMandate.id}`);
      }, 1200);
    } catch {
      showToast("Error confirming authorization hold", "error");
    }
  };

  return (
    <div style={{ maxWidth: "800px", margin: "24px auto", padding: "0 16px" }}>
      {/* Step Indicator */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "24px" }}>
        {[
          { num: 1, label: "1. Describe Intent" },
          { num: 2, label: "2. Review Constraints" },
          { num: 3, label: "3. Fund with PayPal Hold" }
        ].map((s) => (
          <div
            key={s.num}
            style={{
              fontWeight: 600,
              fontSize: "0.9rem",
              color: step >= s.num ? "var(--primary)" : "var(--text-muted)",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            {step > s.num ? <CheckCircle2 size={16} color="var(--status-pass)" /> : null}
            <span>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Step 1: Describe */}
      {step === 1 && (
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <h2 style={{ fontSize: "1.3rem" }}>Describe Shopping Intent</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
              Specify item, budget ceiling, sizes, and seller exclusions. The AI parser will translate this into signed mandate rules.
            </p>
          </div>

          <textarea
            rows={4}
            value={prompt}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPrompt(e.target.value)}
            placeholder="e.g. Buy white running shoes, size 10, under $120, no resale sites"
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border)",
              background: "var(--bg-app)"
            }}
          />

          <div>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Example Prompts:</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "6px" }}>
              {exampleChips.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setPrompt(chip)}
                  className="btn btn-outline"
                  style={{ fontSize: "0.75rem", padding: "4px 8px" }}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={handleParse}
              disabled={loading || !prompt.trim()}
              className="btn btn-primary"
            >
              <Sparkles size={16} />
              <span>{loading ? "Parsing Intent..." : "Parse Spending Mandate"}</span>
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Review Constraints */}
      {step === 2 && constraints && (
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <h2 style={{ fontSize: "1.3rem" }}>Review Spending Mandate</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
              Verify the parsed limits. Once funded, the payment rail prevents any charges exceeding this budget.
            </p>
          </div>

          {/* Plain-English Readback */}
          <div style={{ background: "var(--primary-bg)", padding: "12px 16px", borderRadius: "var(--radius-sm)", color: "var(--text-main)" }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--primary)", textTransform: "uppercase" }}>
              Mandate Readback Agreement
            </div>
            <div style={{ marginTop: "4px", fontWeight: 500 }}>"{readback}"</div>
          </div>

          {/* Constraint Chips */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div className="card" style={{ padding: "12px", background: "var(--bg-subtle)" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Budget Cap (Enforced on rail)</span>
              <div className="tabular-num" style={{ fontSize: "1.2rem", fontWeight: 700 }}>
                ${(constraints.budgetAmountCents / 100).toFixed(2)} USD
              </div>
            </div>

            <div className="card" style={{ padding: "12px", background: "var(--bg-subtle)" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Category & Size</span>
              <div style={{ fontSize: "1.1rem", fontWeight: 600 }}>
                {constraints.itemCategory} {constraints.size ? `(Size ${constraints.size})` : ""}
              </div>
            </div>
          </div>

          {constraints.merchantDeny.length > 0 && (
            <div style={{ fontSize: "0.85rem" }}>
              <span style={{ color: "var(--status-fail)", fontWeight: 600 }}>Prohibited Merchants: </span>
              <span>{constraints.merchantDeny.join(", ")}</span>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px" }}>
            <button onClick={() => setStep(1)} className="btn btn-outline">
              Back to Edit
            </button>
            <button onClick={handleCreateOrder} disabled={loading} className="btn btn-primary">
              <span>{loading ? "Creating Funding Order..." : "Proceed to PayPal Authorization"}</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Fund with PayPal */}
      {step === 3 && (
        <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px", textAlign: "center" }}>
          <div>
            <h2 style={{ fontSize: "1.3rem" }}>Authorize Mandate Hold</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", maxWidth: "480px" }}>
              Authorize a PayPal hold for ${(constraints ? constraints.budgetAmountCents / 100 : 120).toFixed(2)} USD. No money is captured until an item passes the Referee check.
            </p>
          </div>

          <PayPalButton
            orderId={orderId}
            approveUrl={approveUrl}
            onSuccess={handleHoldAuthorized}
          />
        </div>
      )}
    </div>
  );
};
