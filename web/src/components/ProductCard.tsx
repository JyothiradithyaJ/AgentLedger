import React, { useState } from "react";
import { ExternalLink } from "lucide-react";
import { ShoeSvgArt } from "./SvgArt.js";

export interface ProductCardProps {
  title: string;
  merchant: string;
  priceCents: number;
  imageUrl?: string;
  url?: string;
  size?: string;
  source?: string;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  title,
  merchant,
  priceCents,
  imageUrl,
  url,
  size,
  source,
}) => {
  const [imgError, setImgError] = useState(false);

  return (
    <div
      style={{
        display: "flex",
        gap: "16px",
        alignItems: "center",
        background: "var(--bg-subtle)",
        padding: "12px",
        borderRadius: "var(--radius-sm)",
        border: "1px solid var(--border)",
      }}
    >
      <div style={{ flexShrink: 0 }}>
        {imageUrl && !imgError ? (
          <img
            src={imageUrl}
            alt={title}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            style={{
              width: "70px",
              height: "70px",
              objectFit: "cover",
              borderRadius: "var(--radius-sm)",
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
            }}
          />
        ) : (
          <ShoeSvgArt size={70} color="#0284c7" />
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <h4
          style={{
            fontSize: "0.95rem",
            fontWeight: 600,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            color: "var(--text-main)",
          }}
          title={title}
        >
          {title}
        </h4>

        <div
          style={{
            fontSize: "0.8rem",
            color: "var(--text-muted)",
            marginTop: "2px",
          }}
        >
          Merchant:{" "}
          <strong style={{ color: "var(--text-main)" }}>{merchant}</strong>
          {size && <span> &bull; Size: {size}</span>}
          {source && (
            <span style={{ marginLeft: "6px" }} className="badge badge-info">
              {source}
            </span>
          )}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: "6px",
          }}
        >
          <span
            className="tabular-num"
            style={{
              fontSize: "1.1rem",
              fontWeight: 700,
              color: "var(--primary)",
            }}
          >
            ${(priceCents / 100).toFixed(2)} USD
          </span>

          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "var(--primary)",
              }}
            >
              <span>Open product</span>
              <ExternalLink size={12} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
