import React from "react";

interface ShoeSvgProps {
  color?: string;
  size?: number;
}

export const ShoeSvgArt: React.FC<ShoeSvgProps> = ({ color = "#0284c7", size = 80 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ borderRadius: "8px", background: "var(--bg-subtle)" }}
    >
      <path
        d="M20 70C20 70 30 50 55 50C75 50 90 60 100 65C105 68 105 75 105 75L15 75C15 75 16 72 20 70Z"
        fill={color}
      />
      <rect x="15" y="75" width="90" height="12" rx="4" fill="#64748b" />
      <path d="M45 50L55 65" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
      <path d="M55 50L65 65" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
      <path d="M65 50L75 65" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
};
