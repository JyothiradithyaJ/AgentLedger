import React, { createContext, useContext, useState, useCallback } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

interface Toast {
  id: string;
  type: "success" | "error" | "info";
  message: string;
}

interface ToastContextType {
  showToast: (message: string, type?: "success" | "error" | "info") => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: "success" | "error" | "info" = "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          zIndex: 9999
        }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            style={{
              background:
                toast.type === "error"
                  ? "var(--status-fail-bg)"
                  : toast.type === "success"
                  ? "var(--status-pass-bg)"
                  : "var(--bg-surface)",
              color:
                toast.type === "error"
                  ? "var(--status-fail)"
                  : toast.type === "success"
                  ? "var(--status-pass)"
                  : "var(--text-main)",
              border: `1px solid ${
                toast.type === "error"
                  ? "var(--status-fail)"
                  : toast.type === "success"
                  ? "var(--status-pass)"
                  : "var(--border)"
              }`,
              padding: "10px 16px",
              borderRadius: "var(--radius-sm)",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              boxShadow: "var(--shadow-md)",
              minWidth: "280px",
              maxWidth: "400px"
            }}
          >
            {toast.type === "error" && <AlertCircle size={18} />}
            {toast.type === "success" && <CheckCircle2 size={18} />}
            {toast.type === "info" && <Info size={18} />}
            <span style={{ flex: 1, fontSize: "0.875rem" }}>{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              style={{ background: "transparent", border: "none", cursor: "pointer", color: "inherit" }}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
};
