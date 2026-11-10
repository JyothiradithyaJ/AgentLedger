# AgentLedger - Devpost Submission Draft

---

### Project Title
**AgentLedger**

### Tagline
Turning a PayPal authorization hold into a verifiable spending mandate for AI shopping agents.

---

### Elevator Pitch
AgentLedger is the safety and liability layer for autonomous commerce. By transforming a PayPal authorization hold into a programmatic spending mandate, the payment rail enforces a hard budget ceiling before an AI agent can ever touch the funds. A dual-gate Referee verifies every proposed cart against deterministic and semantic constraints before capture, while an append-only, Ed25519-signed evidence ledger records every step. When disputes arise, an AI dispute analyst inspects the cryptographic ledger and submits structured evidence packets directly to the PayPal Disputes API.

---

### The Problem & Inspiration
Autonomous shopping agents are rapidly moving from research demos into live consumer experiences. However, a glaring liability gap threatens agentic commerce:
- A September 2026 PYMNTS study found that **93% of merchants believe AI or agent providers should absorb the loss** when an autonomous agent makes an erroneous or unauthorized purchase.
- Currently, **no US federal consumer protection framework** (including Reg E) covers purchases made under delegated AI authority.
- Traditional credit card tokens give agents unconstrained access up to the card limit, exposing consumers to catastrophic prompt injection or drift.

PayPal's AP2 initiative highlighted mandate evidence in dispute resolution as a critical industry direction. We built AgentLedger as a working reference implementation to bridge this gap.

---

### What It Does: Three Core Mechanisms

#### 1. Mandate as a Payment Rail Hold
Instead of providing raw card credentials, the user defines a spending mandate in plain English (e.g., *"Buy white running shoes, size 10, under $120, no resale sites"*). This is converted into an authorization hold on PayPal (`intent: AUTHORIZE`).
- **Rail-Level Guarantee:** The agent physically cannot capture more than the authorized hold amount.
- **On-Rail Remainder Release:** When an item is bought for \$98.50, PayPal captures \$98.50 and automatically voids the remaining \$21.50 back to the buyer.

#### 2. The Dual-Gate Referee
Before any capture request reaches PayPal, the proposed cart passes through the Referee:
- **Deterministic Rules:** Validates hard constraints (budget ceiling, size match, item category, and allowed/denied merchant lists).
- **Semantic Intent AI:** An LLM evaluates fuzzy constraints (e.g., detecting if a seller like "ReSole Outlet" is an unapproved secondary resale marketplace).
- **Pre-Execution Protection:** If any rule fails, the transaction is blocked with **\$0 captured**.

#### 3. Cryptographically Verifiable Evidence Ledger
Every action—mandate creation, cart proposal, referee evaluation, payment capture, and revocation—is recorded into an append-only hash chain:
- **Integrity:** SHA-256 chaining (`previousHash` $\to$ `currentHash`).
- **Authenticity:** Signed with Ed25519 public-key cryptography.
- **AP2-Inspired:** Modeled on Intent, Cart, and Payment mandate structures.
- **Tamper Detection:** The UI features an interactive "Verify Chain" animation and a "Tamper Entry" demo button to prove cryptographic break detection.

#### 4. AI Dispute Analyst & PayPal Evidence Submission
When a dispute occurs (e.g., a buyer claims *"I never asked for this"*), the Dispute Analyst evaluates the signed ledger against PayPal dispute parameters:
- Generates a **3-Party Responsibility Matrix** (Buyer, Agent Provider, Merchant).
- Synthesizes a structured evidence packet formatted specifically for the PayPal Disputes API (`POST /v1/customer/disputes/{id}/provide-evidence`).

---

### How We Built It
- **Architecture:** Monorepo with unidirectional dependency flow (`shared` $\to$ `domain` $\to$ `ports` $\to$ `adapters` $\to$ `services` $\to$ `http` $\to$ `web`).
- **Backend:** Node.js LTS, Express 4, native `node:sqlite` for high-performance zero-dependency database storage, and Pino structured logging with credential redaction.
- **Payments:** PayPal REST API (Sandbox base `https://api-m.sandbox.paypal.com`), utilizing Orders, Authorizations, Captures, Voids, Reauthorizations, and Disputes endpoints.
- **AI Engine:** Google Gemini Flash API with strict Zod schema validation, an automatic self-repair retry loop, a 10 req/min rate limiter, and a Circuit Breaker with deterministic fallback.
- **Frontend:** React 18, Vite, React Router, TanStack Query, and Server-Sent Events (SSE) for real-time streaming of agent thoughts and Referee evaluations. Custom CSS design tokens with full light/dark mode and tabular numerals for financial figures.
- **Cryptography:** Native `node:crypto` for zero-dependency canonical JSON serialization, SHA-256 hashing, and Ed25519 keypair generation and signing.

---

### Challenges We Overcame
1. **Partial Capture Lifecycle on Sandbox Rails:** Ensuring accurate handling of partial captures where the remaining hold amount is safely released while maintaining idempotent transaction IDs (`PayPal-Request-Id`).
2. **Deterministic vs. Semantic Guardrails:** Tuning the Referee so that deterministic checks (budget, sizes) execute instantly without burning LLM tokens, while reserving the LLM for fuzzy intent and marketplace risk scoring.
3. **Robust Local & Hosted Deployment:** Eliminating native C++ compilation hurdles on Windows by adopting Node 22/24's native `node:sqlite`, ensuring zero build friction on both developer machines and Render free-tier hosting.

---

### Accomplishments We're Proud Of
- A functioning, live, end-to-end integration with the PayPal Sandbox where money movement is central, not cosmetic.
- Instant pre-execution protection: proving that bad agent purchases result in \$0 captured.
- 100% test coverage across domain logic, cryptographic verification, PayPal adapter calls with mocked fetch, and UI state machines.
- A complete, demoable 6-screen application featuring a keyboard-driven (`D`) Demo Drawer with Scenarios A through E.

---

### Built With
- `paypal-api`
- `typescript`
- `react`
- `vite`
- `express`
- `gemini-api`
- `sqlite`
- `ed25519`
- `vitest`
- `zod`
