# HANDOFF: Phase HARDENING-FIXES

## 1. Phase Completed
HARDENING-FIXES: Applied all 11 security hardening, payment reconciliation, safety guardrail, and configuration fixes across the repository.

## 2. Files Written / Changed
- `server/src/config/env.ts` (Fix 0): Added `DEMO_MODE` (boolean, default false) and `FRONTEND_URL` (optional URL string) to Zod environment schema.
- `.env.example` (Fix 0): Added blank template entries for `DEMO_MODE=` and `FRONTEND_URL=`.
- `render.yaml` (Fix 0 & Fix 2): Added `DEMO_MODE` and `FRONTEND_URL` with `sync: false`, and added `NODE_VERSION=22` to server service environment variables.
- `package.json` (Fix 2): Added top-level `"engines": { "node": "22.x" }`.
- `server/package.json` (Fix 1): Inspected `start` script; verified it targets `"node dist/src/index.js"`.
- `server/src/http/app.ts` (Fix 3 & Fix 10): Mounted `app.use(helmet(...))` with extended CSP whitelisting `*.paypal.com` and `*.paypalobjects.com`; added `app.set("trust proxy", 1)`; replaced wildcard CORS with allowlist from `env.FRONTEND_URL` plus Vite dev origin (`http://localhost:5173`) in non-production.
- `server/src/services/purchaseService.ts` (Fix 4a & Fix 5): Refactored `captureOrReconcile` to safely catch `unknown` errors, reconciling ONLY on `AUTHORIZATION_ALREADY_CAPTURED` and re-verifying `status === "CAPTURED"` before returning, otherwise rethrowing; defined `const requestId = purchaseId;` (TS2552); transitioned purchase to `ALLOWED` immediately upon referee approval so subsequent capture failures transition cleanly from `ALLOWED` to `FAILED` per state machine; threw `AppError("UNAUTHORIZED_MANDATE", 409)` if `mandate.paypalAuthorizationId` is missing in non-mock mode. File maintained at 299 lines (<300 limit).
- `server/src/adapters/paypal/index.ts` (Fix 4b): Restricted hardcoded captured response in `getAuthorization` strictly to `env.PAYPAL_MODE === "mock"` with explicit `SIMULATED/MOCK` label; delegates all other calls to real REST endpoint.
- `server/src/adapters/paypal/authorizations.ts` (Fix 4b): Added Zod schema validation (`PayPalGetAuthResponseSchema`) to `getAuthorization` REST responses; removed unused `PayPalGetAuthResponse` interface (TS6196).
- `server/src/http/routes/mandates.ts` (Fix 6): Enforced `const bypass = env.DEMO_MODE === true && rawBypass === true`, forcing `bypassReferee` to false unless `DEMO_MODE` is explicitly enabled.
- `server/src/agents/refereeAI.ts` (Fix 7): Updated catch block to fail closed, returning `passed: false`, `confidence: 0`, and `reason: "Semantic check unavailable; blocked pending review."`.
- `server/src/http/routes/demo.ts` (Fix 8): Added `if (!env.DEMO_MODE) { res.status(404).end(); return; }` to `POST /reset` ensuring explicit void return on all branches (TS7030).
- `server/src/http/routes/ledger.ts` (Fix 8): Added `if (!env.DEMO_MODE) { res.status(404).end(); return; }` to `POST /:seq/tamper` ensuring explicit void return on all branches (TS7030).
- `web/src/components/LiveBadges.tsx` (Fix 9): Dynamically rendered green "PayPal Sandbox" badge only when `config?.paypalMode === "sandbox"`; renders amber "PayPal MOCK" chip otherwise.
- `shared/schemas/mandate.ts` (Fix 11): Added `.max(500)` boundary validation to `ParseMandateRequestSchema.prompt`.
- `server/tests/mandateExtractor.test.ts` (Fix 11 test): Added unit test asserting 500-character prompts pass and 501-character prompts are rejected.
- `server/src/repos/db.ts` (DEC-018): Added cross-environment multi-candidate path resolver for `001_init.sql` using `fileURLToPath(import.meta.url)` that resolves migrations whether executed via `tsx` or `node dist/src/index.js` from the repository root or the `server/` directory.
- `server/src/http/app.ts` (DEC-019): Added multi-candidate path resolver for static `web/dist` SPA assets so Express mounts static files when `process.cwd()` is `server/` or the repository root.
- `server/tests/hardening.test.ts` (Fix 4a, Fix 5, Fix 6, Fix 7, Fix 8 tests): Created dedicated integration suite testing capture error rethrowing, missing authorization rejection, referee enforcement when `DEMO_MODE=false`, semantic fail-closed fallback, and 404 gating for `/reset` and `/tamper`; verified non-capture ledger event counts accurately (`ledgerCountBefore + 2`).
- `docs/MANIFEST.md`: Registered `server/tests/hardening.test.ts` and updated `db.ts` and `app.ts` imports.
- `docs/DECISIONS.md`: Recorded `DEC-016`, `DEC-017`, `DEC-018`, and `DEC-019`.

## 3. Manifest Changes
Added entry under Section 4 (`server/tests/`):
- `server/tests/hardening.test.ts`: Imports `vitest`, `@shared`, `../src/container.js`, `../src/http/app.js`, `../src/config/env.js`, `../src/agents/refereeAI.js`; Exports: None.
Updated `server/src/repos/db.ts` and `server/src/http/app.ts` to document `node:url` and filesystem path imports.

## 4. Decisions Made
- `DEC-016`: 409 Conflict on missing mandate authorization in non-mock mode.
- `DEC-017`: CORS origin allowlist with Vite dev origin fallback in non-production.
- `DEC-018`: Multi-candidate migration path resolver in `db.ts`.
- `DEC-019`: Multi-candidate static `web/dist` path resolver in `app.ts` enabling React SPA serving on `/` across monorepo and workspace runtime working directories.

## 5. YOU RUN
Execute the following commands in order in Windows cmd:

1. Build workspaces:
```cmd
npm run build
```

2. Run test suites:
```cmd
npm test
```

3. Start server and verify health probe:
```cmd
cd server
npm start
```
In a second cmd window (server listens on port 3000 by default from .env):
```cmd
curl -i http://localhost:3000/api/health
```

4. Verify destructive endpoints return 404 when DEMO_MODE is unset:
```cmd
curl -i -X POST http://localhost:3000/api/demo/reset
curl -i -X POST http://localhost:3000/api/ledger/1/tamper
```

5. Enable DEMO_MODE, restart server, and verify destructive endpoints work:
In the server window:
Press `Ctrl+C` to stop the server, then run:
```cmd
set DEMO_MODE=true
npm start
```
In the second window:
```cmd
curl -i -X POST http://localhost:3000/api/demo/reset
```

6. Verify bypassReferee is ignored when DEMO_MODE is unset:
In the server window, press `Ctrl+C`, run:
```cmd
set DEMO_MODE=false
npm start
```
In the second window, initiate a run with `bypassReferee: true` on an existing mandate ID (or create one):
```cmd
curl -i -X POST http://localhost:3000/api/mandates/PLACEHOLDER_MANDATE_ID/runs -H "Content-Type: application/json" -d "{\"scenario\":\"B\",\"bypassReferee\":true}"
```

7. Verify Helmet Content Security Policy in browser:
Run the frontend (`npm run --workspace=web dev`), open `http://localhost:5173/mandates/new`, open Developer Tools (`F12`), navigate to Step 3 (PayPal Hold), and inspect the Console tab.

## 6. EXPECT
1. `npm run build`: Exit code 0 across `@agentledger/shared`, `@agentledger/server`, and `@agentledger/web`.
2. `npm test`: All 14 test suites pass, including `hardening.test.ts` and `mandateExtractor.test.ts`.
3. `curl -i http://localhost:3000/api/health`: Returns `HTTP/1.1 200 OK` with JSON `{"status":"ok",...}`.
4. `POST /api/demo/reset` and `POST /api/ledger/1/tamper`: Both return `HTTP/1.1 404 Not Found`.
5. With `DEMO_MODE=true`: `POST /api/demo/reset` returns `HTTP/1.1 200 OK` with `{"message":"Demo database reset cleanly."}`.
6. Run with `bypassReferee: true` and `DEMO_MODE=false`: Response returns `HTTP/1.1 202` with `"status":"BLOCKED"` (Scenario B), proving the referee ran and was NOT bypassed.
7. Browser Console: Zero Content Security Policy violations for `https://*.paypal.com` or `https://*.paypalobjects.com`.

## 7. IF IT FAILS
Paste the full error output to me; I will fix only that.

## 8. Not Done and Known Gaps (Honest)
- Written, not run. All modifications and tests were authored strictly through file tools without invoking execution commands per AGENT_RULES.md Rule 1.
- Tests edited:
  - `server/tests/mandateExtractor.test.ts`: Added test asserting 500-character prompt passes and 501-character prompt fails schema validation. (No existing tests asserted old fail-open behavior).
- Differences between audit description and real code:
  - Fix 1: `server/package.json` line 9 was already configured as `"start": "node dist/src/index.js"`.
  - Fix 2: Root `package.json` already contained `"engines": { "node": "22.x" }`; normalized formatting.
  - Fix 3: `server/src/http/app.ts` contained a floating `helmet({...})` call missing `app.use(...)`; wrapped it in `app.use(helmet(...))`.
  - Fix 4a: `purchaseService.ts` catch block had incomplete snippets referencing undefined `isAlreadyCaptured` and `captureErr`; refactored cleanly into type-safe reconciliation path.
- Other issues noticed but not touched:
  - `POST /api/demo/scenario/:name` (`server/src/http/routes/demo.ts:10-18`) runs pre-seeded scenarios that insert mock records; left un-gated as instructed (not raw SQL wipe or ledger mutation).
  - Unauthenticated access on all other API routes (`/api/mandates`, `/api/purchases`, `/api/disputes`); deferred to future authentication phase.
  - Dependency audit: `docs/DEPENDENCIES.md` unchanged as zero new external packages were introduced.

## 9. STOP
Waiting for user execution and feedback.
