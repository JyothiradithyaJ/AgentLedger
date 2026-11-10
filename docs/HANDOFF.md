# HANDOFF: PayPal Capture Robustness, Reconciliation, LLM Rate-Limit Pruning & Mandate Idempotency

## 1. Phase Completed
PayPal Capture Parsing Defensiveness, Reconciliation via GET Authorization, LLM 429/503 Quota-Preserving Fallback, and Mandate Closed Idempotency (HTTP 409).

## 2. Files Written / Changed
- `server/src/ports/paypal.port.ts`: Added `AuthorizationDetails` interface, updated `CaptureResult` with optional `feeCents` and `netCents`, and added `getAuthorization` to `PayPalPort`.
- `server/src/adapters/paypal/authorizations.ts`: Made capture response parsing defensive (handles missing `amount.value`, missing `seller_receivable_breakdown`, accepts `COMPLETED` and `PENDING`, converts values to integer cents), added `getAuthorization` method.
- `server/src/adapters/paypal/index.ts`: Implemented `getAuthorization` on `PayPalAdapter` (with mock mode fallback) and re-exported it.
- `server/src/ports/llm.port.ts`: Added optional `isFallbackActive?(): boolean` method to `LLMPort`.
- `server/src/adapters/llm/gemini.ts`: Retries once on HTTP 503 after 1s backoff; does not retry on 429; throws `GeminiResponseError` with status.
- `server/src/adapters/llm/structured.ts`: Added check for 429/503 errors to skip repair retries, trip circuit breaker immediately, and route directly to mock fallback; repair retries are preserved strictly for schema validation and unparsable JSON.
- `server/src/adapters/llm/index.ts`: Implemented `isFallbackActive()` on `ResilientLLMAdapter` tracking circuit-breaker and fallback usage.
- `server/src/adapters/llm/mock.ts`: Added `isFallbackActive(): boolean { return true; }` to `MockLLMAdapter`.
- `server/src/adapters/llm/ollama.ts`: Added `isFallbackActive(): boolean { return false; }` to `OllamaLLMAdapter`.
- `server/src/agents/refereeAI.ts`: Appends `" [AI fallback: mock]"` to semantic check reason whenever fallback was used.
- `server/src/agents/disputeAnalyst.ts`: Appends `" [AI fallback: mock]"` to first verdict reason whenever fallback was used.
- `server/src/services/purchaseService.ts`: Reconciles via `getAuthorization` when capture returns 422 `AUTHORIZATION_ALREADY_CAPTURED` or throws; prevents agent runs on closed mandates with `"MANDATE_ALREADY_CAPTURED"`; marks mandate `COMPLETED` upon final capture.
- `server/src/http/routes/mandates.ts`: Safely extracts request parameters without type casts; maps `MANDATE_ALREADY_CAPTURED`, `AUTHORIZATION_ALREADY_CAPTURED`, `ORDER_NOT_APPROVED`, and `AUTHORIZATION_VOIDED` to HTTP 409, and `MAX_NUMBER_OF_PAYMENT_ATTEMPTS_EXCEEDED` / `PAYMENT_DENIED` to HTTP 422.
- `web/src/pages/MandateDetail.tsx`: Disables "Run Shopping Agent" button and displays informational 409 message when mandate is `COMPLETED` or exhausted; surfaces server errors as toasts instead of silent failures.
- `server/tests/paypal.test.ts`: Added unit tests for defensive capture (without breakdown, with `PENDING` status, with breakdown extracting fee/net) and `getAuthorization`.
- `server/tests/structuredLLM.test.ts`: Created new unit tests verifying that 429 and 503 errors route directly to fallback without repair retry, while schema errors attempt one repair retry.
- `docs/MANIFEST.md`: Updated manifest to record `AuthorizationDetails`, `getAuthorization`, and `server/tests/structuredLLM.test.ts`.
- `docs/DECISIONS.md`: Recorded DEC-010 (Defensive capture and reconciliation) and DEC-011 (Mandate idempotency and LLM 429/503 retry pruning).

## 3. Manifest Changes
- `server/src/ports/paypal.port.ts`: Added `AuthorizationDetails` and updated `CaptureResult` & `PayPalPort`.
- `server/src/adapters/paypal/authorizations.ts`: Added `getAuthorization`.
- `server/src/adapters/paypal/index.ts`: Re-exported `getAuthorization` and `PayPalAdapter`.
- `server/src/ports/llm.port.ts`: Added `isFallbackActive` to `LLMPort`.
- `server/tests/structuredLLM.test.ts`: Added new test suite to manifest.

## 4. Decisions Made
- **DEC-010**: Defensive PayPal capture parsing and reconciliation via `GET /v2/payments/authorizations/{id}`.
- **DEC-011**: Mandate hold idempotency (HTTP 409) and LLM 429/503 retry pruning with circuit-breaker trip.

## 5. YOU RUN
Execute these commands in order in Windows cmd:
```cmd
npm run build
npm test
```

## 6. EXPECT
- `npm run build`: Compiles cleanly with 0 errors across all workspaces (`shared`, `server`, `web`).
- `npm test`: All unit and integration test suites pass (including new tests in `server/tests/paypal.test.ts` and `server/tests/structuredLLM.test.ts`).

## 7. IF IT FAILS
Paste the full error output to me; I will fix only that.

## 8. Not Done and Known Gaps (Honest)
Written, not run. All code changes and tests have been written without executing commands per AGENT_RULES.md Rule 1.

## 9. STOP
Waiting for user execution and next phase prompt.
