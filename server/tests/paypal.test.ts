import { describe, it, expect, vi, beforeEach } from "vitest";
import { PayPalClient } from "../src/adapters/paypal/client.js";
import { createAuthorizeOrder } from "../src/adapters/paypal/orders.js";
import {
  authorizeOrder,
  getAuthorization,
  captureAuthorization,
  voidAuthorization
} from "../src/adapters/paypal/authorizations.js";
import { getDispute } from "../src/adapters/paypal/disputes.js";

describe("PayPal Adapter Unit Tests (Mocked Fetch)", () => {
  let client: PayPalClient;

  beforeEach(() => {
    vi.restoreAllMocks();
    client = new PayPalClient("test_client_id", "test_secret", "https://api-m.sandbox.paypal.com");

    // Mock OAuth token endpoint response by default
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/v1/oauth2/token")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            access_token: "mock_test_token_123",
            expires_in: 3600
          })
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({})
      });
    });
  });

  it("creates an order with intent AUTHORIZE using integer cents", async () => {
    const mockOrderResponse = {
      id: "ORDER_999",
      status: "CREATED",
      links: [
        {
          rel: "approve",
          href: "https://www.sandbox.paypal.com/checkoutnow?token=ORDER_999",
          method: "GET"
        }
      ]
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string, opts: RequestInit) => {
      if (url.includes("/v1/oauth2/token")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ access_token: "mock_token", expires_in: 3600 })
        });
      }
      if (url.includes("/v2/checkout/orders")) {
        const body = JSON.parse(opts.body as string);
        expect(body.intent).toBe("AUTHORIZE");
        // Verify integer cents 12000 is formatted to string "120.00" at wire boundary
        expect(body.purchase_units[0].amount.value).toBe("120.00");
        return Promise.resolve({
          ok: true,
          status: 201,
          json: async () => mockOrderResponse
        });
      }
      return Promise.reject(new Error("Unexpected endpoint"));
    });

    const result = await createAuthorizeOrder(client, 12000, "USD", "test_mandate_1");
    expect(result.orderId).toBe("ORDER_999");
    expect(result.approveUrl).toContain("token=ORDER_999");
  });

  it("authorizes an approved order and returns authorizationId", async () => {
    const mockAuthResponse = {
      id: "ORDER_999",
      status: "COMPLETED",
      purchase_units: [
        {
          payments: {
            authorizations: [{ id: "AUTH_777", status: "CREATED" }]
          }
        }
      ]
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url.includes("/v1/oauth2/token")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ access_token: "mock_token", expires_in: 3600 })
        });
      }
      if (url.includes("/v2/checkout/orders/ORDER_999/authorize")) {
        return Promise.resolve({
          ok: true,
          status: 201,
          json: async () => mockAuthResponse
        });
      }
      return Promise.reject(new Error("Unexpected endpoint"));
    });

    const result = await authorizeOrder(client, "ORDER_999");
    expect(result.authorizationId).toBe("AUTH_777");
    expect(result.status).toBe("CREATED");
  });

  it("captures partial amount and converts string to integer cents", async () => {
    const mockCaptureResponse = {
      id: "CAP_555",
      status: "COMPLETED",
      amount: { value: "98.50", currency_code: "USD" }
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string, opts: RequestInit) => {
      if (url.includes("/v1/oauth2/token")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ access_token: "mock_token", expires_in: 3600 })
        });
      }
      if (url.includes("/v2/payments/authorizations/AUTH_777/capture")) {
        const body = JSON.parse(opts.body as string);
        expect(body.amount.value).toBe("98.50");
        return Promise.resolve({
          ok: true,
          status: 201,
          json: async () => mockCaptureResponse
        });
      }
      return Promise.reject(new Error("Unexpected endpoint"));
    });

    const result = await captureAuthorization(client, "AUTH_777", 9850, "USD", "req_1", false);
    expect(result.captureId).toBe("CAP_555");
    expect(result.capturedCents).toBe(9850);
  });

  it("captures authorization defensively when seller_receivable_breakdown is missing and status is PENDING", async () => {
    const mockPendingCaptureResponse = {
      id: "CAP_PENDING_1",
      status: "PENDING",
      amount: { value: "45.00", currency_code: "USD" }
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url.includes("/v1/oauth2/token")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ access_token: "mock_token", expires_in: 3600 })
        });
      }
      if (url.includes("/v2/payments/authorizations/AUTH_PENDING/capture")) {
        return Promise.resolve({
          ok: true,
          status: 201,
          json: async () => mockPendingCaptureResponse
        });
      }
      return Promise.reject(new Error("Unexpected endpoint"));
    });

    const result = await captureAuthorization(client, "AUTH_PENDING", 4500, "USD", "req_pending", true);
    expect(result.captureId).toBe("CAP_PENDING_1");
    expect(result.status).toBe("PENDING");
    expect(result.capturedCents).toBe(4500);
    expect(result.feeCents).toBeUndefined();
    expect(result.netCents).toBeUndefined();
  });

  it("captures authorization and parses seller_receivable_breakdown fee and net", async () => {
    const mockBreakdownResponse = {
      id: "CAP_BREAKDOWN_1",
      status: "COMPLETED",
      amount: { value: "98.50", currency_code: "USD" },
      seller_receivable_breakdown: {
        paypal_fee: { value: "3.20", currency_code: "USD" },
        net_amount: { value: "95.30", currency_code: "USD" }
      }
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url.includes("/v1/oauth2/token")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ access_token: "mock_token", expires_in: 3600 })
        });
      }
      if (url.includes("/v2/payments/authorizations/AUTH_FEE/capture")) {
        return Promise.resolve({
          ok: true,
          status: 201,
          json: async () => mockBreakdownResponse
        });
      }
      return Promise.reject(new Error("Unexpected endpoint"));
    });

    const result = await captureAuthorization(client, "AUTH_FEE", 9850, "USD", "req_fee", true);
    expect(result.captureId).toBe("CAP_BREAKDOWN_1");
    expect(result.capturedCents).toBe(9850);
    expect(result.feeCents).toBe(320);
    expect(result.netCents).toBe(9530);
  });

  it("retrieves authorization details defensively via getAuthorization", async () => {
    const mockAuthDetailsResponse = {
      id: "AUTH_DETAILS_1",
      status: "CAPTURED",
      amount: { value: "85.25", currency_code: "USD" }
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url.includes("/v1/oauth2/token")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ access_token: "mock_token", expires_in: 3600 })
        });
      }
      if (url.includes("/v2/payments/authorizations/AUTH_DETAILS_1")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockAuthDetailsResponse
        });
      }
      return Promise.reject(new Error("Unexpected endpoint"));
    });

    const result = await getAuthorization(client, "AUTH_DETAILS_1");
    expect(result.authorizationId).toBe("AUTH_DETAILS_1");
    expect(result.status).toBe("CAPTURED");
    expect(result.amountCents).toBe(8525);
  });

  it("voids an authorization successfully", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url.includes("/v1/oauth2/token")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ access_token: "mock_token", expires_in: 3600 })
        });
      }
      if (url.includes("/v2/payments/authorizations/AUTH_777/void")) {
        return Promise.resolve({
          ok: true,
          status: 204,
          json: async () => ({})
        });
      }
      return Promise.reject(new Error("Unexpected endpoint"));
    });

    const result = await voidAuthorization(client, "AUTH_777", "req_void");
    expect(result.status).toBe("VOIDED");
  });

  it("retrieves dispute details and dynamically extracts allowed evidence types", async () => {
    const mockDisputeResponse = {
      dispute_id: "DISPUTE_001",
      status: "WAITING_FOR_SELLER_RESPONSE",
      dispute_amount: { value: "98.50", currency_code: "USD" },
      reason: "MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED",
      allowed_response_options: [
        { evidence_type: ["PROOF_OF_FULFILLMENT", "CUSTOMS_DOCUMENTATION"] }
      ]
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url.includes("/v1/oauth2/token")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ access_token: "mock_token", expires_in: 3600 })
        });
      }
      if (url.includes("/v1/customer/disputes/DISPUTE_001")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockDisputeResponse
        });
      }
      return Promise.reject(new Error("Unexpected endpoint"));
    });

    const dispute = await getDispute(client, "DISPUTE_001");
    expect(dispute.disputeId).toBe("DISPUTE_001");
    expect(dispute.amountCents).toBe(9850);
    expect(dispute.allowedEvidenceTypes).toContain("PROOF_OF_FULFILLMENT");
    expect(dispute.allowedEvidenceTypes).toContain("CUSTOMS_DOCUMENTATION");
  });
});
