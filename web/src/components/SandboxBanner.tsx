import React from "react";
import { ShieldAlert } from "lucide-react";

export const SandboxBanner: React.FC = () => {
  return (
    <div
      style={{
        background: "var(--status-warn-bg)",
        borderBottom: "1px solid var(--status-warn)",
        color: "var(--status-warn)",
        padding: "6px 16px",
        fontSize: "0.825rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        fontWeight: 600
      }}
    >
      <ShieldAlert size={16} />
      <span>PAYPAL SANDBOX ENVIRONMENT &bull; SIMULATED MONEY & ACCOUNTS ONLY</span>
    </div>
  );
};
