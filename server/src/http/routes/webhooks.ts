import { Router } from "express";
import type { Container } from "../../container.js";
import { env } from "../../config/env.js";
import { logger } from "../../observability/logger.js";

export const createWebhooksRouter = (container: Container): Router => {
  const router = Router();
  const { paypal } = container.ports;

  // POST /api/webhooks/paypal
  router.post("/", async (req, res) => {
    const rawBody = JSON.stringify(req.body);
    const webhookId = env.PAYPAL_WEBHOOK_ID ?? "MOCK_WEBHOOK_ID";

    // Verify webhook signature
    const isValid = await paypal.verifyWebhookSignature(
      req.headers as Record<string, string>,
      rawBody,
      webhookId
    );

    if (!isValid && env.PAYPAL_MODE !== "mock") {
      logger.warn("Received invalid PayPal webhook signature");
      res.status(400).send("Invalid signature");
      return;
    }

    const eventType = req.body?.event_type;
    logger.info({ eventType }, "Ingested PayPal webhook event");

    // Handle asynchronous sync if needed
    res.status(200).send("Webhook received");
  });

  return router;
};
