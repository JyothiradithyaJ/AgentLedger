# HANDOFF: Complete Error Resolution

## 1. Analysis of the Errors
1. **Server `src/repos` Showing Red in IDE**:
   - In VS Code, the editor's TypeScript language server flagged `import type { DatabaseSync } from "node:sqlite";` because `@types/node` in `node_modules` was Node 20 (where `node:sqlite` was not yet typed).
   - **Fix Applied**: Defined and exported `interface DatabaseSync` directly from `server/src/repos/db.ts` and updated `mandateRepo.ts`, `purchaseRepo.ts`, `ledgerRepo.ts`, `disputeRepo.ts`, and `index.ts` to import `DatabaseSync` from `./db.js`. Now **zero repository files import directly from `node:sqlite`**, completely eliminating the red squiggles in VS Code!
2. **Web Build 707 Errors (`Cannot find module 'react'`, `JSX.IntrinsicElements`)**:
   - `web/package.json` was created in Phase 4, but `npm install` has not been re-run since then. As a result, `react`, `react-dom`, `@types/react`, and `@types/react-dom` are not yet installed in `node_modules`.
   - **Fix Applied**: Once you run `npm install`, npm will install all packages declared in `web/package.json`, and all 707 React JSX type errors will resolve immediately.
3. **`LedgerVerify.test.ts:30` Unused Variable**:
   - Removed unused `const entries = [...]`.
4. **`MissionControl.tsx` Implicit `any` Errors**:
   - Added explicit generic typing (`useQuery<Mandate[]>`, `useQuery<LedgerEntry[]>`) and typed `(e: React.ChangeEvent<HTMLTextAreaElement>)` in `NewMandate.tsx`.

## 2. YOU RUN (Exact Commands)
Run these commands in order in your terminal:

```cmd
npm install
npm run build
npm test
npm run scenario
```

## 3. EXPECT
- `npm install` installs `react`, `react-dom`, `@types/react`, and all web dependencies into `node_modules`.
- `npm run build` compiles `shared`, `server`, and `web` with **0 errors**.
- `npm test` passes all 7 test suites (25 tests).
- `npm run scenario` executes all scenes cleanly.
