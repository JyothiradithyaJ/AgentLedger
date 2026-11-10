import type { PayPalClient } from "./client.js";
import type { AuthorizeResult, CaptureResult } from "../../ports/paypal.port.js";

interface PayPalAuthorizeOrderResponse {
  id: string;
  status: string;
  purchase_units: Array<{
    payments?: {
      authorizations?: Array<{
        id: string;
        status: string;
      }>;
    };
  }>;
}

interface PayPalCaptureResponse {
  id: string;
  status: string;
  amount: {
    value: string;
    currency_code: string;
  };
}

export const authorizeOrder = async (
  client: PayPalClient,
  orderId: string
): Promise<AuthorizeResult> => {
  const response = await client.request<PayPalAuthorizeOrderResponse>(
    `/v2/checkout/orders/${orderId}/authorize`,
    {
      method: "POST",
      requestId: `auth_${orderId}`
    }
  );

  const auth = response.purchase_units[0]?.payments?.authorizations?.[0];
  if (!auth) {
    throw new Error(`PayPal authorization response missing authorization block for order ${orderId}`);
  }

  return {
    authorizationId: auth.id,
    status: auth.status
  };
};

export const captureAuthorization = async (
  client: PayPalClient,
  authorizationId: string,
  amountCents: number,
  currency: string,
  requestId: string,
  finalCapture: boolean = false
): Promise<CaptureResult> => {
  const value = (amountCents / 100).toFixed(2);
  const body = {
    amount: {
      currency_code: currency,
      value
    },
    final_capture: finalCapture,
    invoice_id: `inv_${requestId}`
  };

  const response = await client.request<PayPalCaptureResponse>(
    `/v2/payments/authorizations/${authorizationId}/capture`,
    {
      method: "POST",
      body,
      requestId: `cap_${requestId}`
    }
  );

  const capturedCents = Math.round(parseFloat(response.amount.value) * 100);

  return {
    captureId: response.id,
    status: response.status,
    capturedCents
  };
};

export const voidAuthorization = async (
  client: PayPalClient,
  authorizationId: string,
  requestId: string
): Promise<{ status: string }> => {
  await client.request<Record<string, unknown>>(
    `/v2/payments/authorizations/${authorizationId}/void`,
    {
      method: "POST",
      requestId: `void_${requestId}`
    }
  );

  return { status: "VOIDED" };
};

export const reauthorizePayment = async (
  client: PayPalClient,
  authorizationId: string,
  amountCents: number,
  currency: string,
  requestId: string
): Promise<{ authorizationId: string; status: string }> => {
  const value = (amountCents / 100).toFixed(2);
  const body = {
    amount: {
      currency_code: currency,
      value
    }
  };

  const response = await client.request<{ id: string; status: string }>(
    `/v2/payments/authorizations/${authorizationId}/reauthorize`,
    {
      method: "POST",
      body,
      requestId: `reauth_${requestId}`
    }
  );

  return {
    authorizationId: response.id,
    status: response.status
  };
};
