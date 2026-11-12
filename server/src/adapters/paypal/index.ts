import type {
  PayPalPort,
  CreateOrderResult,
  AuthorizeResult,
  AuthorizationDetails,
  CaptureResult,
  DisputeDetails
} from "../../ports/paypal.port.js";
import { PayPalClient } from "./client.js";
import { createAuthorizeOrder, getOrder } from "./orders.js";
import {
  authorizeOrder,
  getAuthorization,
  captureAuthorization,
  voidAuthorization,
  reauthorizePayment
} from "./authorizations.js";
import { getDispute, provideDisputeEvidence } from "./disputes.js";
import { verifyWebhookSignature } from "./webhooks.js";
import { createToolkitTools } from "./toolkit.js";
import { env } from "../../config/env.js";
import { logger } from "../../observability/logger.js";

export class PayPalAdapter implements PayPalPort {
  private readonly client: PayPalClient;

  constructor(client: PayPalClient = new PayPalClient()) {
    this.client = client;
  }

  async createOrder(amountCents: number, currency: string, customId: string): Promise<CreateOrderResult> {
    if (env.PAYPAL_MODE === "mock") {
      logger.info({ amountCents, customId }, "MOCK PayPal createOrder invoked");
      return {
        orderId: `MOCK_ORDER_${customId}`,
        approveUrl: `https://www.sandbox.paypal.com/checkoutnow?token=MOCK_ORDER_${customId}`
      };
    }
    return createAuthorizeOrder(this.client, amountCents, currency, customId);
  }

  async authorizeOrder(orderId: string): Promise<AuthorizeResult> {
    if (env.PAYPAL_MODE === "mock") {
      logger.info({ orderId }, "MOCK PayPal authorizeOrder invoked");
      return {
        authorizationId: `MOCK_AUTH_${orderId}`,
        status: "CREATED"
      };
    }
    return authorizeOrder(this.client, orderId);
  }

  async getAuthorization(authorizationId: string): Promise<AuthorizationDetails> {
    if (env.PAYPAL_MODE === "mock") {
      logger.info({ authorizationId }, "MOCK PayPal getAuthorization invoked");
      // SIMULATED/MOCK: Hardcoded authorization details used strictly in mock mode
      return {
        authorizationId,
        status: "CAPTURED",
        amountCents: 9840
      };
    }
    return getAuthorization(this.client, authorizationId);
  }

  async captureAuthorization(
    authorizationId: string,
    amountCents: number,
    currency: string,
    requestId: string,
    finalCapture: boolean = false
  ): Promise<CaptureResult> {
    if (env.PAYPAL_MODE === "mock") {
      logger.info({ authorizationId, amountCents, requestId }, "MOCK PayPal captureAuthorization invoked");
      return {
        captureId: `MOCK_CAP_${requestId}`,
        status: "COMPLETED",
        capturedCents: amountCents
      };
    }
    return captureAuthorization(this.client, authorizationId, amountCents, currency, requestId, finalCapture);
  }

  async voidAuthorization(authorizationId: string, requestId: string): Promise<{ status: string }> {
    if (env.PAYPAL_MODE === "mock") {
      logger.info({ authorizationId, requestId }, "MOCK PayPal voidAuthorization invoked");
      return { status: "VOIDED" };
    }
    return voidAuthorization(this.client, authorizationId, requestId);
  }

  async reauthorize(
    authorizationId: string,
    amountCents: number,
    currency: string,
    requestId: string
  ): Promise<{ authorizationId: string; status: string }> {
    if (env.PAYPAL_MODE === "mock") {
      return { authorizationId: `MOCK_REAUTH_${authorizationId}`, status: "CREATED" };
    }
    return reauthorizePayment(this.client, authorizationId, amountCents, currency, requestId);
  }

  async getDispute(disputeId: string): Promise<DisputeDetails> {
    if (env.PAYPAL_MODE === "mock" || disputeId.startsWith("MOCK_") || disputeId.startsWith("SIM_")) {
      return {
        disputeId,
        status: "WAITING_FOR_SELLER_RESPONSE",
        amountCents: 9850,
        reason: "MERCHANDISE_OR_SERVICE_NOT_AS_DESCRIBED",
        allowedEvidenceTypes: ["PROOF_OF_FULFILLMENT", "ADDITIONAL_INFORMATION_EVIDENCE"]
      };
    }
    return getDispute(this.client, disputeId);
  }

  async provideDisputeEvidence(
    disputeId: string,
    evidenceType: string,
    notes: string
  ): Promise<{ status: string }> {
    if (env.PAYPAL_MODE === "mock" || disputeId.startsWith("MOCK_") || disputeId.startsWith("SIM_")) {
      logger.info({ disputeId, evidenceType }, "MOCK PayPal provideDisputeEvidence submitted");
      return { status: "EVIDENCE_SUBMITTED" };
    }
    return provideDisputeEvidence(this.client, disputeId, evidenceType, notes);
  }

  async verifyWebhookSignature(
    headers: Record<string, string>,
    rawBody: string,
    webhookId: string
  ): Promise<boolean> {
    if (env.PAYPAL_MODE === "mock") {
      return true;
    }
    return verifyWebhookSignature(this.client, headers, rawBody, webhookId);
  }

  async getOrder(orderId: string): Promise<{ orderId: string; status: string }> {
    if (env.PAYPAL_MODE === "mock") {
      return { orderId, status: "APPROVED" };
    }
    return getOrder(this.client, orderId);
  }
}

export const createPayPalAdapter = (client: PayPalClient = new PayPalClient()): PayPalPort => {
  return new PayPalAdapter(client);
};

export {
  PayPalClient,
  createAuthorizeOrder,
  getOrder,
  authorizeOrder,
  getAuthorization,
  captureAuthorization,
  voidAuthorization,
  reauthorizePayment,
  getDispute,
  provideDisputeEvidence,
  verifyWebhookSignature,
  createToolkitTools
};
