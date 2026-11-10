import type { PayPalClient } from "./client.js";
import { logger } from "../../observability/logger.js";

interface VerifyWebhookSignatureResponse {
  verification_status: "SUCCESS" | "FAILURE";
}

export const verifyWebhookSignature = async (
  client: PayPalClient,
  headers: Record<string, string>,
  rawBody: string,
  webhookId: string
): Promise<boolean> => {
  const transmissionId = headers["paypal-transmission-id"] ?? headers["PAYPAL-TRANSMISSION-ID"];
  const transmissionTime = headers["paypal-transmission-time"] ?? headers["PAYPAL-TRANSMISSION-TIME"];
  const certUrl = headers["paypal-cert-url"] ?? headers["PAYPAL-CERT-URL"];
  const authAlgo = headers["paypal-auth-algo"] ?? headers["PAYPAL-AUTH-ALGO"];
  const transmissionSig = headers["paypal-transmission-sig"] ?? headers["PAYPAL-TRANSMISSION-SIG"];

  if (!transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig) {
    logger.warn({ headers }, "Missing required PayPal webhook signature headers");
    return false;
  }

  let parsedBody: Record<string, unknown> = {};
  try {
    parsedBody = JSON.parse(rawBody);
  } catch {
    logger.warn("Webhook raw body is not valid JSON for verification");
    return false;
  }

  const payload = {
    transmission_id: transmissionId,
    transmission_time: transmissionTime,
    cert_url: certUrl,
    auth_algo: authAlgo,
    transmission_sig: transmissionSig,
    webhook_id: webhookId,
    webhook_event: parsedBody
  };

  try {
    const response = await client.request<VerifyWebhookSignatureResponse>(
      "/v1/notifications/verify-webhook-signature",
      {
        method: "POST",
        body: payload
      }
    );
    return response.verification_status === "SUCCESS";
  } catch (err) {
    logger.error({ err }, "PayPal webhook signature verification failed with error");
    return false;
  }
};
