import React from "react";
import { Link, useLocation } from "react-router-dom";
import { ShieldCheck, Moon, Sun, SlidersHorizontal } from "lucide-react";
import { LiveBadges } from "./LiveBadges.js";

interface HeaderProps {
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onOpenDrawer: () => void;
}

export const Header: React.FC<HeaderProps> = ({ theme, onToggleTheme, onOpenDrawer }) => {
  const location = useLocation();

  const navLinks = [
    { to: "/", label: "Mission Control" },
    { to: "/mandates/new", label: "New Mandate" },
    { to: "/ledger", label: "Evidence Ledger" },
    { to: "/disputes", label: "Disputes" }
  ];

  return (
    <header
      style={{
        background: "var(--bg-surface)",
        borderBottom: "1px solid var(--border)",
        padding: "10px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "12px"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
        <Link
          to="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            color: "var(--text-main)",
            fontWeight: 700,
            fontSize: "1.2rem",
            textDecoration: "none"
          }}
        >
          <ShieldCheck color="var(--primary)" size={24} />
          <span>AgentLedger</span>
        </Link>

        <nav style={{ display: "flex", gap: "16px" }}>
          {navLinks.map((link) => {
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                style={{
                  color: isActive ? "var(--primary)" : "var(--text-muted)",
                  fontWeight: isActive ? 600 : 400,
                  textDecoration: "none",
                  fontSize: "0.9rem"
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <LiveBadges />

      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <button
          onClick={onOpenDrawer}
          className="btn btn-outline"
          title="Demo Drawer (Key: D)"
          style={{ padding: "6px 12px", fontSize: "0.85rem" }}
        >
          <SlidersHorizontal size={16} />
          <span>Demo Controls [D]</span>
        </button>

        <button
          onClick={onToggleTheme}
          className="btn btn-outline"
          style={{ padding: "6px 10px" }}
          aria-label="Toggle Theme"
        >
          {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
        </button>
      </div>
    </header>
  );
};
