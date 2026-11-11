# Architectural & Implementation Decisions

Record of decisions made during development following Rule 4.

| Decision ID | Decision | Reason | Date |
| :--- | :--- | :--- | :--- |
| **DEC-001** | Integer cents for all financial figures | Prevents IEEE-754 floating-point rounding errors in currency calculations. Strings formatted strictly at PayPal wire boundary. | 2026-11-09 |
| **DEC-002** | Ed25519 for ledger signatures | High performance, compact signatures, built natively into Node.js `crypto` with zero external dependencies. | 2026-11-09 |
| **DEC-003** | Express 4 pinned over Express 5 | Stability with common middleware (pino-http, helmet, express-rate-limit). | 2026-11-09 |
| **DEC-004** | Plain CSS tokens instead of Tailwind | Zero config file fragility, native CSS variables, instant builds, fully custom dark/light theme. | 2026-11-09 |
| **DEC-005** | `DISPUTE_MODE=simulated` default | Real PayPal dispute creation requires complex buyer OAuth consent flow; simulated pipeline exercises exact same processing code. | 2026-11-09 |
| **DEC-006** | Mock LLM provider fallback | Eliminates external downtime or quota failures during testing and offline evaluation. | 2026-11-09 |
| **DEC-007** | Built-in `node:sqlite` over `better-sqlite3` | Node.js 22+ and 24 LTS include native `node:sqlite` (`DatabaseSync`), eliminating C++ compilation errors and node-gyp Visual Studio requirements on Windows. | 2026-11-09 |
| **DEC-008** | Deterministic mandate extraction precedes LLM enrichment | Budget, size, category, colors, and exclusions are grounded directly in user text so model output cannot invent enforceable mandate constraints. | 2026-11-10 |
| **DEC-009** | Deterministic carts derive from mandate constraints | Demo scenarios retain their public names while generating compliant and violating carts for any mandate instead of a fixed shoe item. | 2026-11-10 |
| **DEC-010** | Defensive PayPal capture parsing and reconciliation | PayPal capture response may omit breakdown fields and returns PENDING or COMPLETED; reconciliation via `GET /v2/payments/authorizations/{id}` ensures money movement on financial rail is never stranded locally as an unhandled 500 error. | 2026-11-10 |
| **DEC-011** | Mandate hold idempotency and LLM 429/503 retry pruning | Completed holds transition to COMPLETED returning HTTP 409 on subsequent runs. LLM adapter skips prompt repair on 429/503 and routes directly to mock fallback with transparency annotation. | 2026-11-10 |
| **DEC-012** | CatalogPort with live DummyJSON and resilient mock fallback | Abstract product search and lookup behind CatalogPort with live DummyJSON provider (5s timeout, 60s in-memory TTL cache, 1 retry on 5xx) and automatic fallback to mock catalog on failure or empty results, governed by CATALOG_PROVIDER env var. | 2026-11-11 |
| **DEC-013** | Live catalog shopping planner, demo overlays, and referee price re-verification | Connects shopping agent to CatalogPort with candidate ranking (in-budget, text match, top 5) and demo-overlay tagging; adds Referee `price_verified` check re-fetching live items by id with graceful 0.5 confidence when unreachable. | 2026-11-11 |
| **DEC-014** | Compliant candidate filtering and dispute creation guard | Filter unapproved resale/outlet merchants and prioritize matching sizes/attributes during compliant candidate search so legitimate purchases pass Referee evaluation; guard simulated dispute creation against purchases with zero captured amount. | 2026-11-11 |
| **DEC-015** | UI Transparency for Live Catalogue, Price Verification, and Simulation | Exposes runtime config (/api/config) for live-vs-simulated badging; renders live product details with lazy loading and SVG fallback; classifies Referee check statuses into pass/warn/fail with amber info states for unverified/fallback checks; structures run timeline and evidence ledger entries into human-readable summaries. | 2026-11-11 |
