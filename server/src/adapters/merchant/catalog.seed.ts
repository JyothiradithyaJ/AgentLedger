import type { CartItem } from "@agentledger/shared";

export const SEEDED_CATALOG: CartItem[] = [
  {
    id: "prod_stride_white_10",
    title: "StrideCo CloudRunner Running Shoes White (Size 10)",
    merchant: "StrideCo",
    priceCents: 9850, // $98.50 - Perfect fit for Scenario A
    quantity: 1,
    size: "10",
    attributes: ["running", "shoes", "white", "cushioned"],
    url: "https://strideco.example.com/products/cloudrunner-white-10"
  },
  {
    id: "prod_stride_black_10",
    title: "StrideCo CloudRunner Running Shoes Black (Size 10)",
    merchant: "StrideCo",
    priceCents: 10500, // $105.00
    quantity: 1,
    size: "10",
    attributes: ["running", "shoes", "black", "breathable"],
    url: "https://strideco.example.com/products/cloudrunner-black-10"
  },
  {
    id: "prod_trail_apex_10",
    title: "TrailNest Apex Pro Trail Running Shoes (Size 10)",
    merchant: "TrailNest",
    priceCents: 13900, // $139.00 - Over budget for Scenario B
    quantity: 1,
    size: "10",
    attributes: ["running", "shoes", "trail", "waterproof"],
    url: "https://trailnest.example.com/products/apex-pro-10"
  },
  {
    id: "prod_resole_retro_10",
    title: "ReSole Pre-Owned Retro Running Shoes (Size 10)",
    merchant: "ReSole Outlet",
    priceCents: 7500, // $75.00 - Prohibited resale store for Scenario C
    quantity: 1,
    size: "10",
    attributes: ["running", "shoes", "retro", "pre-owned", "resale"],
    url: "https://resoleoutlet.example.com/products/retro-runner-10"
  },
  {
    id: "prod_stride_white_9",
    title: "StrideCo CloudRunner Running Shoes White (Size 9)",
    merchant: "StrideCo",
    priceCents: 9850,
    quantity: 1,
    size: "9",
    attributes: ["running", "shoes", "white"],
    url: "https://strideco.example.com/products/cloudrunner-white-9"
  }
];
