# SPEC Requirement to Implementation Audit

Mapping of every specification requirement from `docs/SPEC.md` to its implementation file.

| SPEC Section | Requirement | Implementing File |
| :--- | :--- | :--- |
| **Mandate as Hold** | Order creation with `intent: AUTHORIZE` | `server/src/adapters/paypal/orders.ts` |
| **Mandate as Hold** | Authorize order and record hold | `server/src/adapters/paypal/authorizations.ts` |
| **Mandate as Hold** | Partial capture with `final_capture` & release | `server/src/adapters/paypal/authorizations.ts` |
| **Mandate as Hold** | Immediate revocation via `voidAuthorization` | `server/src/adapters/paypal/authorizations.ts` |
| **Mandate as Hold** | Reauthorization job past 3-day honor period | `server/scripts/reauthorizeJob.ts` |
| **Referee Engine** | Deterministic rules (budget, seller, size, qty, expiry) | `server/src/domain/rules/referee.ts` |
| **Referee Engine** | Semantic AI intent & fuzzy constraints check | `server/src/agents/refereeAI.ts` |
| **Referee Engine** | Dual-gate evaluation pipeline & pre-execution block | `server/src/services/purchaseService.ts` |
| **Evidence Ledger** | Canonical JSON deterministic serialization | `server/src/domain/ledgerChain.ts` |
| **Evidence Ledger** | SHA-256 hash chaining (`previousHash` -> `currentHash`) | `server/src/domain/ledgerChain.ts` |
| **Evidence Ledger** | Ed25519 cryptographic key generation & signing | `server/src/domain/ledgerChain.ts` |
| **Evidence Ledger** | Chain verification and tamper detection | `server/src/domain/ledgerChain.ts` |
| **Evidence Ledger** | Ledger persistence repository & tamper simulation | `server/src/repos/ledgerRepo.ts` |
| **Dispute Resolution** | 3-Party fault attribution (Agent / Merchant / Buyer) | `server/src/domain/verdict.ts` |
| **Dispute Resolution** | AI Dispute Analyst reading signed ledger | `server/src/agents/disputeAnalyst.ts` |
| **Dispute Resolution** | Dynamic evidence types from PayPal Disputes API | `server/src/adapters/paypal/disputes.ts` |
| **Dispute Resolution** | Evidence packet submission to PayPal | `server/src/adapters/paypal/disputes.ts` |
| **Dispute Resolution** | `DISPUTE_MODE=simulated` & `sandbox` switching | `server/src/services/disputeService.ts` |
| **Data Boundaries** | Integer cents enforcement across app | `shared/schemas/*.ts` |
| **Security & Rails** | PayPal-Request-Id deterministic idempotency | `server/src/adapters/paypal/client.ts` |
| **Security & Rails** | Rejection of live PayPal URLs (sandbox only) | `server/src/config/env.ts` |
| **Security & Rails** | Webhook signature verification | `server/src/adapters/paypal/webhooks.ts` |
| **AI Reliability** | 10 req/min rate limiter | `server/src/adapters/llm/rateLimiter.ts` |
| **AI Reliability** | Circuit Breaker with deterministic mock fallback | `server/src/adapters/llm/rateLimiter.ts` |
| **AI Reliability** | Self-repair retry on schema validation failure | `server/src/adapters/llm/structured.ts` |
| **UI: Mission Control** | 4 KPI tiles, live SSE feed, Revoke All button | `web/src/pages/MissionControl.tsx` |
| **UI: New Mandate** | 3-step wizard (Describe, Review chips, PayPal Hold) | `web/src/pages/NewMandate.tsx` |
| **UI: Mandate Detail** | Budget breakdown ring, constraints, countdown, runs | `web/src/pages/MandateDetail.tsx` |
| **UI: Agent Run** | 3-column view (Thought stream, Cart, Referee checklist) | `web/src/pages/AgentRun.tsx` |
| **UI: Ledger** | Signed vertical chain, Verify animation, Tamper button | `web/src/pages/EvidenceLedger.tsx` |
| **UI: Disputes** | Verdict card, 3-party table, evidence submit button | `web/src/pages/Disputes.tsx` |
| **UI: Demo Drawer** | Scenarios A-E, Referee toggle, Persona switch, Reset | `web/src/components/DemoDrawer.tsx` |
| **Design Rules** | Tokens, tabular numerals, 8px grid, no Tailwind | `web/src/styles/tokens.css`, `base.css` |
| **Hosting & Deploy** | Static production serve of `web/dist` | `server/src/http/app.ts` |
| **Hosting & Deploy** | Render configuration on free plan | `render.yaml` |
| **Testing** | Adapter unit tests with mocked fetch | `server/tests/paypal.test.ts` |
| **Testing** | Domain referee, ledger, and verdict unit tests | `server/tests/*.test.ts` |
| **Testing** | End-to-end integration tests (Scenarios A, B, D) | `server/tests/integration.test.ts` |
| **Testing** | Frontend component tests (Referee & Ledger verify) | `web/src/components/*.test.ts` |
| **Scripts** | Doctor environment & version diagnostic | `server/scripts/doctor.ts` |
| **Scripts** | Standalone PayPal smoke test | `server/scripts/smokePaypal.ts` |
| **Scripts** | Headless scenario runner (A to E) | `server/scripts/scenario.ts` |
| **Scripts** | CLI ledger integrity verification | `server/scripts/verifyLedger.ts` |
