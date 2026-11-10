# MANIFEST.md

Contract first: every file in AgentLedger, its exported symbols, and its import dependencies.

---

## 1. shared/

### `shared/schemas/mandate.ts`
- **Imports**: `zod`
- **Exports**:
  - `MandateConstraintsSchema`, `type MandateConstraints`
  - `MandateStatusSchema`, `type MandateStatus`
  - `MandateSchema`, `type Mandate`
  - `ParseMandateRequestSchema`, `type ParseMandateRequest`
  - `ParseMandateResponseSchema`, `type ParseMandateResponse`
  - `CreateMandateRequestSchema`, `type CreateMandateRequest`
  - `CreateMandateResponseSchema`, `type CreateMandateResponse`

### `shared/schemas/cart.ts`
- **Imports**: `zod`
- **Exports**:
  - `CartItemSchema`, `type CartItem`
  - `ProposedCartSchema`, `type ProposedCart`

### `shared/schemas/decision.ts`
- **Imports**: `zod`, `./cart.js`
- **Exports**:
  - `RefereeCheckSchema`, `type RefereeCheck`
  - `RefereeDecisionSchema`, `type RefereeDecision`
  - `PurchaseStatusSchema`, `type PurchaseStatus`
  - `PurchaseDecisionSchema`, `type PurchaseDecision`
  - `PurchaseRecordSchema`, `type PurchaseRecord`

### `shared/schemas/ledger.ts`
- **Imports**: `zod`
- **Exports**:
  - `LedgerEventTypeSchema`, `type LedgerEventType`
  - `LedgerEntrySchema`, `type LedgerEntry`
  - `VerifyLedgerResponseSchema`, `type VerifyLedgerResponse`

### `shared/schemas/dispute.ts`
- **Imports**: `zod`
- **Exports**:
  - `DisputeStatusSchema`, `type DisputeStatus`
  - `FaultAttributionSchema`, `type FaultAttribution`
  - `DisputeVerdictSchema`, `type DisputeVerdict`
  - `ThreePartyResponsibilitySchema`, `type ThreePartyResponsibility`
  - `DisputeRecordSchema`, `type DisputeRecord`

### `shared/schemas/api.ts`
- **Imports**: `zod`, `./mandate.js`, `./cart.js`, `./decision.js`, `./ledger.js`, `./dispute.js`
- **Exports**:
  - `AppErrorDetailsSchema`, `type AppErrorDetails`
  - `ApiErrorResponseSchema`, `type ApiErrorResponse`
  - `RunTimelineEventSchema`, `type RunTimelineEvent`
  - `HealthResponseSchema`, `type HealthResponse`
  - `ReadyResponseSchema`, `type ReadyResponse`
  - `DemoScenarioNameSchema`, `type DemoScenarioName`

### `shared/index.ts`
- **Imports**: All `./schemas/*.js`
- **Exports**: Re-exports all schemas and inferred types.

---

## 2. server/

### `server/src/config/env.ts`
- **Imports**: `zod`, `dotenv`
- **Exports**: `env`, `type Env`

### `server/src/observability/logger.ts`
- **Imports**: `pino`, `../config/env.js`
- **Exports**: `logger`, `createRequestLogger`

### `server/src/domain/rules/referee.ts`
- **Imports**: `@shared`
- **Exports**: `evaluateDeterministicRules`

### `server/src/domain/ledgerChain.ts`
- **Imports**: `node:crypto`, `@shared`
- **Exports**: `canonicalJson`, `computeEntryHash`, `generateKeyPair`, `signPayload`, `verifySignature`, `verifyChain`

### `server/src/domain/verdict.ts`
- **Imports**: `@shared`
- **Exports**: `attributeFault`

### `server/src/domain/stateMachine.ts`
- **Imports**: `@shared`
- **Exports**: `canTransitionMandate`, `transitionMandate`, `canTransitionPurchase`, `transitionPurchase`

### `server/src/domain/index.ts`
- **Imports**: `./rules/referee.js`, `./ledgerChain.js`, `./verdict.js`, `./stateMachine.js`
- **Exports**: Re-exports all domain functions.

### `server/src/ports/paypal.port.ts`
- **Imports**: None
- **Exports**: `CreateOrderResult`, `AuthorizeResult`, `AuthorizationDetails`, `CaptureResult`, `DisputeDetails`, `interface PayPalPort`

### `server/src/ports/llm.port.ts`
- **Imports**: `zod`
- **Exports**: `interface LLMPort`

### `server/src/ports/merchant.port.ts`
- **Imports**: `@shared`
- **Exports**: `interface MerchantPort`

### `server/src/ports/index.ts`
- **Imports**: `./paypal.port.js`, `./llm.port.js`, `./merchant.port.js`
- **Exports**: Re-exports all ports.

### `server/src/adapters/paypal/client.ts`
- **Imports**: `../../config/env.js`, `../../observability/logger.js`
- **Exports**: `PayPalClient`

### `server/src/adapters/paypal/orders.ts`
- **Imports**: `./client.js`, `@shared`
- **Exports**: `createAuthorizeOrder`, `getOrder`

### `server/src/adapters/paypal/authorizations.ts`
- **Imports**: `./client.js`, `../../ports/paypal.port.js`
- **Exports**: `authorizeOrder`, `getAuthorization`, `captureAuthorization`, `voidAuthorization`, `reauthorizePayment`

### `server/src/adapters/paypal/disputes.ts`
- **Imports**: `./client.js`, `@shared`
- **Exports**: `getDispute`, `provideDisputeEvidence`

### `server/src/adapters/paypal/webhooks.ts`
- **Imports**: `./client.js`, `@shared`
- **Exports**: `verifyWebhookSignature`

### `server/src/adapters/paypal/toolkit.ts`
- **Imports**: `../../config/env.js`, `../../observability/logger.js`
- **Exports**: `createToolkitTools`

### `server/src/adapters/paypal/index.ts`
- **Imports**: `./client.js`, `./orders.js`, `./authorizations.js`, `./disputes.js`, `./webhooks.js`, `./toolkit.js`, `../../ports/paypal.port.js`
- **Exports**: `PayPalAdapter`, `createPayPalAdapter`, `PayPalClient`, `createAuthorizeOrder`, `getOrder`, `authorizeOrder`, `getAuthorization`, `captureAuthorization`, `voidAuthorization`, `reauthorizePayment`, `getDispute`, `provideDisputeEvidence`, `verifyWebhookSignature`, `createToolkitTools`

### `server/src/adapters/llm/rateLimiter.ts`
- **Exports**: `RateLimiter`

### `server/src/adapters/llm/mock.ts`
- **Imports**: `../../ports/llm.port.js`, `zod`
- **Exports**: `MockLLMAdapter`

### `server/src/adapters/llm/gemini.ts`
- **Imports**: `../../ports/llm.port.js`, `../../config/env.js`, `./rateLimiter.js`, `zod`
- **Exports**: `GeminiLLMAdapter`

### `server/src/adapters/llm/ollama.ts`
- **Imports**: `../../ports/llm.port.js`, `../../config/env.js`, `zod`
- **Exports**: `OllamaLLMAdapter`

### `server/src/adapters/llm/structured.ts`
- **Imports**: `../../ports/llm.port.js`, `zod`
- **Exports**: `generateStructuredJson`

### `server/src/adapters/llm/index.ts`
- **Imports**: `./mock.js`, `./gemini.js`, `./ollama.js`, `./structured.js`, `./rateLimiter.js`
- **Exports**: `createLLMAdapter`

### `server/src/adapters/merchant/catalog.seed.ts`
- **Imports**: `@shared`
- **Exports**: `SEEDED_CATALOG`

### `server/src/adapters/merchant/demomart.ts`
- **Imports**: `../../ports/merchant.port.js`, `./catalog.seed.js`, `@shared`
- **Exports**: `DemoMartAdapter`

### `server/src/adapters/merchant/index.ts`
- **Imports**: `./demomart.js`, `./catalog.seed.js`
- **Exports**: `createMerchantAdapter`

### `server/src/repos/db.ts`
- **Imports**: `node:sqlite`, `node:fs`, `node:path`, `../config/env.js`
- **Exports**: `getDb`, `initDb`

### `server/src/repos/mandateRepo.ts`
- **Imports**: `node:sqlite`, `@shared`
- **Exports**: `MandateRepo`

### `server/src/repos/purchaseRepo.ts`
- **Imports**: `node:sqlite`, `@shared`
- **Exports**: `PurchaseRepo`

### `server/src/repos/ledgerRepo.ts`
- **Imports**: `node:sqlite`, `@shared`
- **Exports**: `LedgerRepo`

### `server/src/repos/disputeRepo.ts`
- **Imports**: `node:sqlite`, `@shared`
- **Exports**: `DisputeRepo`

### `server/src/repos/index.ts`
- **Imports**: `./db.js`, `./mandateRepo.js`, `./purchaseRepo.js`, `./ledgerRepo.js`, `./disputeRepo.js`
- **Exports**: `createRepos`, `type Repos`

### `server/src/agents/mandateParser.ts`
- **Imports**: `../ports/llm.port.js`, `../config/env.js`, `../observability/logger.js`, `./mandateExtractor.js`, `@shared`
- **Exports**: `parseMandateRequest`

### `server/src/agents/mandateExtractor.ts`
- **Imports**: None
- **Exports**: `extractMandateRules`, `type ExtractedMandateRules`

### `server/src/agents/shopper.ts`
- **Imports**: `node:crypto`, `../ports/llm.port.js`, `../ports/merchant.port.js`, `@shared`
- **Exports**: `proposeCart`

### `server/src/agents/refereeAI.ts`
- **Imports**: `../ports/llm.port.js`, `@shared`
- **Exports**: `evaluateSemanticIntent`

### `server/src/agents/disputeAnalyst.ts`
- **Imports**: `../ports/llm.port.js`, `../ports/paypal.port.js`, `@shared`
- **Exports**: `analyzeDispute`

### `server/src/agents/index.ts`
- **Imports**: `./mandateParser.js`, `./mandateExtractor.js`, `./shopper.js`, `./refereeAI.js`, `./disputeAnalyst.js`
- **Exports**: Re-exports all agents.

### `server/src/services/mandateService.ts`
- **Imports**: `../ports/paypal.port.js`, `../repos/index.js`, `@shared`
- **Exports**: `MandateService`

### `server/src/services/purchaseService.ts`
- **Imports**: `../ports/paypal.port.js`, `../ports/merchant.port.js`, `../ports/llm.port.js`, `../repos/index.js`, `@shared`
- **Exports**: `PurchaseService`

### `server/src/services/ledgerService.ts`
- **Imports**: `../repos/index.js`, `@shared`
- **Exports**: `LedgerService`

### `server/src/services/disputeService.ts`
- **Imports**: `../ports/paypal.port.js`, `../ports/llm.port.js`, `../repos/index.js`, `@shared`
- **Exports**: `DisputeService`

### `server/src/services/demoService.ts`
- **Imports**: `./mandateService.js`, `./purchaseService.js`, `./disputeService.js`, `./ledgerService.js`, `@shared`
- **Exports**: `DemoService`

### `server/src/services/index.ts`
- **Imports**: `./mandateService.js`, `./purchaseService.js`, `./ledgerService.js`, `./disputeService.js`, `./demoService.js`
- **Exports**: `createServices`, `type Services`

### `server/src/container.ts`
- **Imports**: All ports, adapters, repos, services
- **Exports**: `createContainer`, `type Container`

### `server/src/http/middleware/errorHandler.ts`
- **Imports**: `express`, `@shared`
- **Exports**: `errorHandler`, `AppError`

### `server/src/http/middleware/rateLimit.ts`
- **Imports**: `express-rate-limit`
- **Exports**: `apiRateLimiter`

### `server/src/http/sse.ts`
- **Imports**: `express`
- **Exports**: `SSEChannelManager`

### `server/src/http/routes/mandates.ts`
- **Imports**: `express`, `../../container.js`
- **Exports**: `mandatesRouter`

### `server/src/http/routes/purchases.ts`
- **Imports**: `express`, `../../container.js`
- **Exports**: `purchasesRouter`

### `server/src/http/routes/runs.ts`
- **Imports**: `express`, `../../container.js`
- **Exports**: `runsRouter`

### `server/src/http/routes/ledger.ts`
- **Imports**: `express`, `../../container.js`
- **Exports**: `ledgerRouter`

### `server/src/http/routes/disputes.ts`
- **Imports**: `express`, `../../container.js`
- **Exports**: `disputesRouter`

### `server/src/http/routes/webhooks.ts`
- **Imports**: `express`, `../../container.js`
- **Exports**: `webhooksRouter`

### `server/src/http/routes/demo.ts`
- **Imports**: `express`, `../../container.js`
- **Exports**: `demoRouter`

### `server/src/http/routes/health.ts`
- **Imports**: `express`, `../../container.js`
- **Exports**: `healthRouter`

### `server/src/http/app.ts`
- **Imports**: `express`, `helmet`, `cors`, `../container.js`
- **Exports**: `createApp`

### `server/src/index.ts`
- **Imports**: `./config/env.js`, `./observability/logger.js`, `./container.js`, `./http/app.js`
- **Exports**: `startServer`

---

## 3. web/

### `web/src/api/client.ts`
- **Imports**: `@shared`
- **Exports**: `apiClient`

### `web/src/components/Header.tsx`
- **Exports**: `Header`

### `web/src/components/SandboxBanner.tsx`
- **Exports**: `SandboxBanner`

### `web/src/components/DemoDrawer.tsx`
- **Exports**: `DemoDrawer`

### `web/src/components/PayPalButton.tsx`
- **Exports**: `PayPalButton`

### `web/src/pages/MissionControl.tsx`
- **Exports**: `MissionControlPage`

### `web/src/pages/NewMandate.tsx`
- **Exports**: `NewMandatePage`

### `web/src/pages/MandateDetail.tsx`
- **Exports**: `MandateDetailPage`

### `web/src/pages/AgentRun.tsx`
- **Exports**: `AgentRunPage`

### `web/src/pages/EvidenceLedger.tsx`
- **Exports**: `EvidenceLedgerPage`

### `web/src/pages/Disputes.tsx`
- **Exports**: `DisputesPage`

---

## 4. server/tests/

### `server/tests/mandateExtractor.test.ts`
- **Imports**: `vitest`, `../src/agents/index.js`
- **Exports**: None

### `server/tests/shoppingAgent.test.ts`
- **Imports**: `vitest`, `@shared`, `../src/agents/shopper.js`, `../src/domain/rules/referee.js`
- **Exports**: None

### `server/tests/structuredLLM.test.ts`
- **Imports**: `vitest`, `zod`, `../src/ports/llm.port.js`, `../src/adapters/llm/structured.js`, `../src/adapters/llm/rateLimiter.js`, `../src/adapters/llm/index.js`
- **Exports**: None
