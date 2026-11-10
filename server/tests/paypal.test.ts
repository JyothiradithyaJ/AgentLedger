import { describe, it, expect, vi, beforeEach } from "vitest";
import { PayPalClient } from "../src/adapters/paypal/client.js";
import { createAuthorizeOrder } from "../src/adapters/paypal/orders.js";
import {
  authorizeOrder,
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
