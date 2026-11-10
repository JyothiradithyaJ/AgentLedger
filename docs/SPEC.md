# AgentLedger Build Blueprint

**Nov 7, 2026 · @JacxJ**

AgentLedger turns a PayPal authorization hold into a spending mandate for AI shopping agents, and records every step as signed evidence so disputes resolve in minutes.

---

## 1. What We Are Building

AgentLedger is the safety layer between an AI shopping agent and the money. The user funds a mandate ("running shoes, size 10, under $120, no resale sites") as one PayPal authorization hold. The agent shops inside it. A Referee checks every cart against the mandate before any money is captured, and every step goes into a tamper-evident signed ledger. When a dispute arrives, an evidence agent reads the ledger and says who is at fault: the agent, the merchant or the buyer.

### Three Mechanisms
1. **Mandate = authorization hold**: PayPal cannot capture more than was authorized, so the budget cap is enforced by the payment rail, not only by our code.
2. **Referee = rules plus AI**: Deterministic checks (budget, merchant, size, quantity) run first. An LLM judges fuzzy constraints such as "no resale sites". The result is allow, block or ask the human.
3. **Ledger = signed evidence**: Hash-chained, Ed25519-signed records modeled on AP2's Intent, Cart and Payment mandates. AP2-inspired, not a full AP2 implementation.

### The Demo in Three Scenes
- **Scene 1 (Inside the mandate)**: Agent buys a $98.50 pair. Referee passes. PayPal captures $98.50 and releases the rest of the $120 hold.
- **Scene 2 (Agent drifts)**: Agent tries a $139 pair from a resale site. Referee blocks it. Nothing is captured.
- **Scene 3 (Dispute)**: Buyer says "I never asked for this." Evidence agent reads the ledger, issues a verdict and builds the evidence packet.
- **Revoke**: Button voids the remaining hold instantly.

---

## 2. Architecture & PayPal Roles

PayPal does money movement through REST calls the app owns (`https://api-m.sandbox.paypal.com`).
- `POST /v1/oauth2/token`
- `POST /v2/checkout/orders` (intent: AUTHORIZE)
- `POST /v2/checkout/orders/{id}/authorize`
- `POST /v2/payments/authorizations/{id}/capture` (amount, final_capture, invoice_id, PayPal-Request-Id)
- `POST /v2/payments/authorizations/{id}/void`
- `POST /v2/payments/authorizations/{id}/reauthorize`
- Webhooks verification + ingestion
- Disputes: `GET /v1/customer/disputes/{id}`, `POST /v1/customer/disputes/{id}/provide-evidence`

---

## 3. Tech Stack

- **Runtime**: Node.js 20 LTS+, TypeScript strict.
- **API**: Express 4, zod, pino, helmet, express-rate-limit.
- **Database**: SQLite via `better-sqlite3`, plain SQL migrations.
- **Web**: React 18, Vite, react-router, TanStack Query, plain CSS tokens, lucide-react.
- **Payments**: PayPal sandbox, `@paypal/react-paypal-js`.
- **Crypto**: Node built-in `crypto`: SHA-256 chain, Ed25519 signatures.
- **LLM**: Gemini API Flash models (default), Ollama (optional), Mock provider (fallback).

---

## 4. API Contract

- `POST /api/mandates/parse` - Plain English to draft mandate with readback
- `POST /api/mandates` - Save draft, create PayPal funding order
- `POST /api/mandates/:id/authorize` - Authorize after buyer approval
- `GET /api/mandates`, `GET /api/mandates/:id` - List and detail with remaining budget
- `POST /api/mandates/:id/revoke` - Void the hold
- `POST /api/mandates/:id/runs` - Start an agent run; returns runId
- `GET /api/runs/:id/events` - SSE for live timeline
- `POST /api/purchases/:id/decision` - Human approves/denies purchase
- `GET /api/ledger`, `POST /api/ledger/verify` - Read chain, verify hashes/signatures
- `POST /api/ledger/:seq/tamper` - Corrupt one entry (demo only)
- `GET /api/disputes`, `POST /api/disputes/simulate` - List and create simulated dispute
- `POST /api/disputes/:id/analyze`, `POST /api/disputes/:id/submit-evidence` - Verdict & evidence packet
- `POST /api/webhooks/paypal` - Webhook ingestion
- `POST /api/demo/scenario/:name`, `POST /api/demo/reset` - Demo scenarios
- `GET /api/health`, `GET /api/ready` - Health and readiness probes
