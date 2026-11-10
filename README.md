# AgentLedger

> Turning a PayPal authorization hold into a verifiable spending mandate for AI shopping agents.

AgentLedger is the safety layer between an autonomous AI shopping agent and the money. The user funds a mandate ("running shoes, size 10, under $120, no resale sites") as one PayPal authorization hold. The agent shops inside it. A Referee checks every cart against the mandate before any money is captured, and every step goes into a tamper-evident signed ledger. When a dispute arrives, an evidence agent reads the ledger and determines fault: the agent, the merchant, or the buyer.

---

## 1. The Gap It Fills

A September 2026 PYMNTS survey found **93% of merchants think AI or agent providers should bear the loss** when an autonomous agent buys wrong. Yet no US federal framework (including Reg E) covers agent-delegated purchases, and EMVCo's draft leaves non-fraud liability open. PayPal's AP2 initiative lists mandate evidence in disputes as a priority pilot direction. AgentLedger provides a working reference architecture.

---

## 2. Core Architecture: Three Mechanisms

```
[ User Prompt ] 
      │
      ▼
[ Mandate Parser (LLM + Zod) ] ──► [ User Confirmation ]
                                            │
                                            ▼
                               [ PayPal Authorization Hold ]
                               (Hard budget cap enforced on-rail)
                                            │
                                            ▼
       ┌───────────────────────── Shopping Agent ────────────────────────┐
       │ Proposes a cart from merchant catalog                           │
       └────────────────────────────────────┬────────────────────────────┘
                                            │
                                            ▼
                                   [ Referee Engine ]
                           ┌────────────────┴───────────────┐
                   Deterministic Rules               Semantic LLM Check
               (Budget, size, merchant list)      (Fuzzy rules, resale check)
                           └────────────────┬───────────────┘
                                            │
                     ┌──────────────────────┴──────────────────────┐
                     ▼                                             ▼
            [ Passed / Allowed ]                           [ Failed / Blocked ]
                     │                                             │
      PayPal Partial Capture ($98.50)                     No funds captured.
      Hold Remainder Released ($21.50)                    Rail hold preserved.
                     │                                             │
                     └──────────────────────┬──────────────────────┘
                                            │
                                            ▼
                           [ Cryptographic Evidence Ledger ]
                       (Canonical JSON, SHA-256 chain, Ed25519)
                                            │
                                            ▼
                                [ Dispute Analyst Agent ]
                      (Reads ledger, attributes liability, generates
                       evidence packet for PayPal Disputes API)
```

1. **Mandate = Authorization Hold:** PayPal cannot capture more than was authorized, so the budget cap is enforced by the payment rail, not only by our application code.
2. **Referee = Rules plus AI:** Deterministic checks (budget, merchant, size, quantity) run first. An LLM judges fuzzy constraints such as "no resale sites". The result is allow, block, or escalate to human review.
3. **Ledger = Signed Evidence:** Hash-chained (SHA-256), Ed25519-signed records modeled on AP2's Intent, Cart, and Payment mandates.

---

## 3. Quickstart & Setup on Windows

### Prerequisites
- Node.js 20 LTS or higher (`node -v`)
- Windows Command Prompt (`cmd.exe`) or PowerShell

### Installation
```cmd
cd /d D:\whatever
npm install
npm run build --workspace=shared
```

### Verification Checks
```cmd
npm run doctor
npm test
npm run scenario
```

### Running the Application
```cmd
npm run dev
```
- **Web UI:** http://localhost:5173
- **Backend API:** http://localhost:3000

---

## 4. Environment Variables

Copy `.env.example` to `.env`:

| Variable | Description | Default |
| :--- | :--- | :--- |
| `PAYPAL_MODE` | PayPal integration mode: `sandbox` or `mock` | `sandbox` |
| `PAYPAL_BASE_URL` | Base API endpoint (refuses live URLs) | `https://api-m.sandbox.paypal.com` |
| `PAYPAL_CLIENT_ID` | PayPal Sandbox merchant App Client ID | *(from developer.paypal.com)* |
| `PAYPAL_CLIENT_SECRET` | PayPal Sandbox merchant App Secret | *(from developer.paypal.com)* |
| `PAYPAL_WEBHOOK_ID` | Optional webhook ID for signature verification | *(empty)* |
| `LLM_PROVIDER` | AI provider: `gemini`, `ollama`, or `mock` | `gemini` |
| `GEMINI_API_KEY` | Google AI Studio free-tier API Key | *(empty)* |
| `GEMINI_MODEL` | Gemini model ID | `gemini-1.5-flash` |
| `DISPUTE_MODE` | Dispute handling mode: `simulated` or `sandbox` | `simulated` |
| `DATABASE_PATH` | Path to embedded SQLite database | `data/agentledger.db` |
| `KEYS_DIR` | Directory storing Ed25519 keypair | `data/keys` |

---

## 5. Demo Walkthrough: 3 Scenes in 3 Minutes

Press **`D`** on any screen or navigate with the interactive demo drawer:

- **Scene 1 (Inside the Mandate):** Agent buys a $98.50 pair. Referee passes. PayPal captures $98.50 and releases the rest of the $120 hold. Proves PayPal is central and partial capture works on-rail.
- **Scene 2 (Agent Drift):** Agent attempts a $139 pair from a prohibited resale site. The Referee blocks it. Zero dollars captured. Proves the guardrail catches failures before money moves.
- **Scene 3 (Dispute Analysis):** Buyer states "I never asked for this." The Dispute Analyst reads the signed ledger, proves buyer authorized the hold, issues a verdict, and submits an evidence packet to PayPal.
- **Revoke:** Revoke button instantly voids any remaining authorization hold.

---

## 6. Risks and Honest Limits

1. **Disputes are simulated by default:** Creating a real sandbox dispute requires complex buyer-side OAuth consent. `DISPUTE_MODE=simulated` posts synthetic events into the exact same processing pipeline as real webhooks; `DISPUTE_MODE=sandbox` is used when a real dispute ID is supplied.
2. **AP2-Inspired:** We model Intent, Cart, and Payment mandates in spirit; we do not implement the entire AP2 network specification.
3. **Decision Support, Not Legal Shield:** The Referee and dispute verdicts are automated risk reduction tools, not legal arbitration rulings. Verdicts are phrased as "evidence indicates".
4. **Sandbox Only:** Strictly configured for PayPal Sandbox. Config validation explicitly rejects live production URLs.

---

## License
MIT License - Copyright (c) 2026 JacxJ / AgentLedger
