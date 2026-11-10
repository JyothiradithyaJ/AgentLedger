import React, { useState } from "react";
import {
  PayPalButtons,
  PayPalScriptProvider,
  usePayPalScriptReducer
} from "@paypal/react-paypal-js";
import { CheckCircle, CreditCard, ExternalLink } from "lucide-react";

interface PayPalButtonProps {
  orderId: string;
  approveUrl: string;
  paypalMode: "sandbox" | "mock";
  paypalClientId: string;
  onSuccess: () => void | Promise<void>;
}

interface SandboxPayPalButtonProps {
  orderId: string;
  onSuccess: () => void | Promise<void>;
}

const SandboxPayPalButton: React.FC<SandboxPayPalButtonProps> = ({ orderId, onSuccess }) => {
  const [{ isPending, isRejected }] = usePayPalScriptReducer();
  const [message, setMessage] = useState<string | null>(null);

  if (isRejected) {
    return <div role="alert">PayPal Sandbox could not be loaded. Check your connection and try again.</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%" }}>
      {isPending ? <span>Loading PayPal Sandbox...</span> : null}
      <PayPalButtons
        style={{ layout: "vertical", label: "paypal" }}
        createOrder={() => Promise.resolve(orderId)}
        onApprove={async () => {
          setMessage(null);
          await onSuccess();
        }}
        onCancel={() => {
          setMessage("PayPal approval was cancelled. The hold was not authorized.");
        }}
        onError={() => {
          setMessage("PayPal Sandbox could not complete approval. The hold was not authorized.");
        }}
      />
      {message ? <div role="alert">{message}</div> : null}
    </div>
  );
};

export const PayPalButton: React.FC<PayPalButtonProps> = ({
  orderId,
  approveUrl,
  paypalMode,
  paypalClientId,
  onSuccess
}) => {
  const [isApproved, setIsApproved] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleMockApproval = () => {
    setLoading(true);
    setTimeout(() => {
      setIsApproved(true);
      setLoading(false);
      void onSuccess();
    }, 600);
  };

  if (isApproved) {
    return (
      <div className="badge badge-pass" style={{ padding: "8px 16px", fontSize: "0.9rem" }}>
        <CheckCircle size={18} />
        <span>HOLD ACTIVE - AUTHORIZED VIA PAYPAL</span>
      </div>
    );
  }

  if (paypalMode === "sandbox") {
    return (
      <PayPalScriptProvider
        options={{ clientId: paypalClientId, currency: "USD", intent: "authorize" }}
      >
        <SandboxPayPalButton orderId={orderId} onSuccess={onSuccess} />
      </PayPalScriptProvider>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%", maxWidth: "340px" }}>
      <button
        onClick={handleMockApproval}
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
