import type { PayPalClient } from "./client.js";
import type { AuthorizeResult, AuthorizationDetails, CaptureResult } from "../../ports/paypal.port.js";

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
  id?: string;
  status?: string;
  amount?: {
    value?: string;
    currency_code?: string;
  };
  seller_receivable_breakdown?: {
    gross_amount?: {
      value?: string;
      currency_code?: string;
    };
    paypal_fee?: {
      value?: string;
      currency_code?: string;
    };
    net_amount?: {
      value?: string;
      currency_code?: string;
    };
  };
}

interface PayPalGetAuthResponse {
  id?: string;
  status?: string;
  amount?: {
    value?: string;
    currency_code?: string;
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

export const getAuthorization = async (
  client: PayPalClient,
  authorizationId: string
): Promise<AuthorizationDetails> => {
  const response = await client.request<PayPalGetAuthResponse>(
    `/v2/payments/authorizations/${authorizationId}`,
    {
      method: "GET"
    }
  );

  if (!response || typeof response !== "object" || !response.id || !response.status) {
    throw new Error(`PayPal getAuthorization response missing required fields for ${authorizationId}`);
  }

  let amountCents = 0;
  const rawValue = response.amount?.value;
  if (rawValue !== undefined) {
    const parsed = parseFloat(rawValue);
    if (!Number.isNaN(parsed)) {
      amountCents = Math.round(parsed * 100);
    }
  }

  return {
    authorizationId: response.id,
    status: response.status,
    amountCents
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

  if (!response || typeof response !== "object") {
    throw new Error(`PayPal capture response invalid for authorization ${authorizationId}`);
  }

  const captureId = response.id;
  const status = response.status;
  if (!captureId || !status) {
    throw new Error(`PayPal capture response missing required id or status for authorization ${authorizationId}`);
  }

  if (status !== "COMPLETED" && status !== "PENDING") {
    throw new Error(`PayPal capture returned non-success status: ${status}`);
  }

  let capturedCents = amountCents;
  const rawCapturedValue = response.amount?.value;
  if (rawCapturedValue !== undefined) {
    const parsed = parseFloat(rawCapturedValue);
    if (!Number.isNaN(parsed)) {
      capturedCents = Math.round(parsed * 100);
    }
  }

  let feeCents: number | undefined;
  const rawFee = response.seller_receivable_breakdown?.paypal_fee?.value;
  if (rawFee !== undefined) {
    const parsedFee = parseFloat(rawFee);
    if (!Number.isNaN(parsedFee)) {
      feeCents = Math.round(parsedFee * 100);
    }
  }

  let netCents: number | undefined;
  const rawNet = response.seller_receivable_breakdown?.net_amount?.value;
  if (rawNet !== undefined) {
    const parsedNet = parseFloat(rawNet);
    if (!Number.isNaN(parsedNet)) {
      netCents = Math.round(parsedNet * 100);
    }
  }

  return {
    captureId,
    status,
    capturedCents,
    ...(feeCents !== undefined ? { feeCents } : {}),
    ...(netCents !== undefined ? { netCents } : {})
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
