import React, { useState } from "react";
import { ExternalLink, CheckCircle, CreditCard } from "lucide-react";

interface PayPalButtonProps {
  orderId: string;
  approveUrl: string;
  onSuccess: () => void;
}

export const PayPalButton: React.FC<PayPalButtonProps> = ({
  orderId,
  approveUrl,
  onSuccess
}) => {
  const [isApproved, setIsApproved] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSimulatedApproval = () => {
    setLoading(true);
    setTimeout(() => {
      setIsApproved(true);
      setLoading(false);
      onSuccess();
    }, 600);
  };

  if (isApproved) {
    return (
      <div
        className="badge badge-pass"
        style={{ padding: "8px 16px", fontSize: "0.9rem" }}
      >
        <CheckCircle size={18} />
        <span>HOLD ACTIVE &bull; AUTHORIZED VIA PAYPAL</span>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%", maxWidth: "340px" }}>
      {/* Primary PayPal Sandbox Action Button */}
      <button
        onClick={handleSimulatedApproval}
        disabled={loading}
        className="btn"
        style={{
          background: "#ffc439",
          color: "#003087",
          justifyContent: "center",
          fontWeight: 700,
          padding: "12px",
          border: "1px solid #e0aa28"
        }}
      >
        <CreditCard size={18} />
        <span>{loading ? "Placing Hold..." : "Authorize Hold with PayPal"}</span>
      </button>

      {/* Fallback external link */}
      <div style={{ textAlign: "center", fontSize: "0.8rem", color: "var(--text-muted)" }}>
        <span>Alternative: </span>
        <a
          href={approveUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
        >
          <span>Open Sandbox Approval Window (Order: {orderId.slice(0, 10)}...)</span>
          <ExternalLink size={12} />
        </a>
      </div>
    </div>
  );
};
