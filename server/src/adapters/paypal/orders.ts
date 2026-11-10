import type { PayPalClient } from "./client.js";
import type { CreateOrderResult } from "../../ports/paypal.port.js";

interface PayPalLink {
  href: string;
  rel: string;
  method: string;
}

interface PayPalOrderResponse {
  id: string;
  status: string;
  links: PayPalLink[];
}

export const createAuthorizeOrder = async (
  client: PayPalClient,
  amountCents: number,
  currency: string,
  customId: string
): Promise<CreateOrderResult> => {
  const value = (amountCents / 100).toFixed(2);
  const body = {
    intent: "AUTHORIZE",
    purchase_units: [
      {
        custom_id: customId,
        amount: {
          currency_code: currency,
          value
        },
        description: "AgentLedger Shopping Mandate Hold"
      }
    ],
    application_context: {
      user_action: "CONTINUE",
      shipping_preference: "NO_SHIPPING"
    }
  };

  const response = await client.request<PayPalOrderResponse>("/v2/checkout/orders", {
    method: "POST",
    body,
    requestId: `order_${customId}`
  });

  const approveLink = response.links.find((l) => l.rel === "approve");
  if (!approveLink) {
    throw new Error(`PayPal order created without an approval link: ${response.id}`);
  }

  return {
    orderId: response.id,
    approveUrl: approveLink.href
  };
};

export const getOrder = async (
  client: PayPalClient,
  orderId: string
): Promise<{ orderId: string; status: string }> => {
  const response = await client.request<PayPalOrderResponse>(`/v2/checkout/orders/${orderId}`);
  return {
    orderId: response.id,
    status: response.status
  };
};
