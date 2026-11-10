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
