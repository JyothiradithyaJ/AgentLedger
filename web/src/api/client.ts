import type {
  Mandate,
  ParseMandateResponse,
  CreateMandateResponse,
  PurchaseRecord,
  LedgerEntry,
  VerifyLedgerResponse,
  DisputeRecord,
  DisputeVerdict,
  PurchaseDecision
} from "@agentledger/shared";

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(endpoint, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers
    },
    ...options
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson?.error?.message || `Request failed: ${res.statusText}`);
  }

  return res.json() as Promise<T>;
}

export interface AppConfig {
  paypalMode: "sandbox" | "mock";
  paypalClientId: string;
  catalogProvider: "mock" | "dummyjson";
  llmProvider: "gemini" | "ollama" | "mock";
  disputeMode: "simulated" | "sandbox";
}

export const apiClient = {
  getConfig: () => request<AppConfig>("/api/config"),
  getPayPalConfig: () => request<AppConfig>("/api/config"),

  // Mandates
  parsePrompt: (prompt: string) =>
    request<ParseMandateResponse>("/api/mandates/parse", {
      method: "POST",
      body: JSON.stringify({ prompt })
    }),

  createMandate: (rawRequest: string, readback: string, constraints: Mandate["constraints"]) =>
    request<CreateMandateResponse>("/api/mandates", {
      method: "POST",
      body: JSON.stringify({ rawRequest, readback, constraints })
    }),

  authorizeMandate: (id: string) =>
    request<Mandate>(`/api/mandates/${id}/authorize`, { method: "POST" }),

  revokeMandate: (id: string) =>
    request<Mandate>(`/api/mandates/${id}/revoke`, { method: "POST" }),

  getMandate: (id: string) => request<Mandate>(`/api/mandates/${id}`),

  listMandates: () => request<Mandate[]>("/api/mandates"),

  startRun: (mandateId: string, scenario?: string, bypassReferee?: boolean) =>
    request<{ runId: string; mandateId: string; status: string; purchaseId: string }>(
      `/api/mandates/${mandateId}/runs`,
      {
        method: "POST",
        body: JSON.stringify({ scenario, bypassReferee })
      }
    ),

  // Purchases
  getPurchase: (id: string) => request<PurchaseRecord>(`/api/purchases/${id}`),

  submitPurchaseDecision: (purchaseId: string, decision: PurchaseDecision, reason?: string) =>
    request<PurchaseRecord>(`/api/purchases/${purchaseId}/decision`, {
      method: "POST",
      body: JSON.stringify({ decision, reason })
    }),

  // Ledger
  getLedger: () => request<LedgerEntry[]>("/api/ledger"),

  verifyLedger: () =>
    request<VerifyLedgerResponse>("/api/ledger/verify", { method: "POST" }),

  tamperLedger: (seq: number) =>
    request<{ message: string }>(`/api/ledger/${seq}/tamper`, { method: "POST" }),

  // Disputes
  listDisputes: () => request<DisputeRecord[]>("/api/disputes"),

  getDispute: (id: string) => request<DisputeRecord>(`/api/disputes/${id}`),

  simulateDispute: (purchaseId: string, reason: string) =>
    request<DisputeRecord>("/api/disputes/simulate", {
      method: "POST",
      body: JSON.stringify({ purchaseId, reason })
    }),

  analyzeDispute: (id: string) =>
    request<DisputeVerdict>(`/api/disputes/${id}/analyze`, { method: "POST" }),

  submitEvidence: (id: string) =>
    request<DisputeRecord>(`/api/disputes/${id}/submit-evidence`, { method: "POST" }),

  // Demo
  runScenario: (scenario: string) =>
    request<Record<string, unknown>>(`/api/demo/scenario/${scenario}`, { method: "POST" }),

  resetDemo: () => request<{ message: string }>("/api/demo/reset", { method: "POST" })
};
