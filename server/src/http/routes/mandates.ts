import { Router } from "express";
import {
  ParseMandateRequestSchema,
  CreateMandateRequestSchema
} from "@agentledger/shared";
import type { Container } from "../../container.js";
import { sseManager } from "../sse.js";
import { env } from "../../config/env.js";

export const createMandatesRouter = (container: Container): Router => {
  const router = Router();
  const { mandates, purchases } = container.services;

  // POST /api/mandates/parse
  router.post("/parse", async (req, res, next) => {
    try {
      const parsed = ParseMandateRequestSchema.parse(req.body);
      const result = await mandates.parsePrompt(parsed.prompt);
      res.json(result);
    } catch (err) {
      if (err instanceof Error && err.message === "Could not understand the request") {
        res.status(422).json({
          error: {
            code: "MANDATE_PARSE_FAILED",
            message: "Could not understand the request"
          }
        });
        return;
      }
      next(err);
    }
  });

  // POST /api/mandates
  router.post("/", async (req, res, next) => {
    try {
      const body = CreateMandateRequestSchema.parse(req.body);
      const result = await mandates.createMandate(
        body.rawRequest,
        body.readback,
        body.constraints
      );
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  });

  // GET /api/mandates
  router.get("/", (_req, res, next) => {
    try {
      const list = mandates.listMandates();
      res.json(list);
    } catch (err) {
      next(err);
    }
  });

  // GET /api/mandates/:id
  router.get("/:id", (req, res, next) => {
    try {
      const mandate = mandates.getMandate(req.params.id);
      if (!mandate) {
        res.status(404).json({ error: { code: "NOT_FOUND", message: "Mandate not found" } });
        return;
      }
      res.json(mandate);
    } catch (err) {
      next(err);
    }
  });

  // POST /api/mandates/:id/authorize
  router.post("/:id/authorize", async (req, res, next) => {
    try {
      const authorized = await mandates.authorizeMandate(req.params.id);
      res.json(authorized);
    } catch (err) {
      if (err instanceof Error && err.message === "ORDER_NOT_APPROVED") {
        res.status(409).json({
          error: {
            code: "ORDER_NOT_APPROVED",
            message: "Buyer has not approved the PayPal order yet"
          }
        });
        return;
      }
      next(err);
    }
  });

  // POST /api/mandates/:id/revoke
  router.post("/:id/revoke", async (req, res, next) => {
    try {
      const revoked = await mandates.revokeMandate(req.params.id);
      res.json(revoked);
    } catch (err) {
      next(err);
    }
  });

  // POST /api/mandates/:id/runs
  router.post("/:id/runs", async (req, res, next) => {
    try {
      const mandateId = req.params.id;
      let scenario: "A" | "B" | "C" | "D" | "E" | undefined;
      if (typeof req.body === "object" && req.body !== null) {
        const rawScenario = Reflect.get(req.body, "scenario");
        if (
          rawScenario === "A" ||
          rawScenario === "B" ||
          rawScenario === "C" ||
          rawScenario === "D" ||
          rawScenario === "E"
        ) {
          scenario = rawScenario;
        }
      }
      const rawBypass = typeof req.body === "object" && req.body !== null ? Reflect.get(req.body, "bypassReferee") : undefined;
      const bypass = env.DEMO_MODE === true && rawBypass === true;

      // Async execution with timeline events broadcasting over SSE
      const runPromise = purchases.executeAgentRun(
        mandateId,
        scenario,
        bypass,
        (event) => sseManager.broadcast(event.runId, event)
      );

      // We immediately create and return run result
      const result = await runPromise;
      res.status(202).json({
        runId: result.runId,
        mandateId,
        status: result.purchase.status,
        purchaseId: result.purchase.id
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("MANDATE_ALREADY_CAPTURED") || msg.includes("already been captured")) {
        res.status(409).json({
          error: {
            code: "MANDATE_ALREADY_CAPTURED",
            message: "This mandate's hold has already been captured. Create a new mandate."
          }
        });
        return;
      }
      if (msg.includes("AUTHORIZATION_ALREADY_CAPTURED")) {
        res.status(409).json({
          error: {
            code: "AUTHORIZATION_ALREADY_CAPTURED",
            message: "This authorization has already been captured."
          }
        });
        return;
      }
      if (msg.includes("ORDER_NOT_APPROVED")) {
        res.status(409).json({
          error: {
            code: "ORDER_NOT_APPROVED",
            message: "Buyer has not approved the PayPal order yet"
          }
        });
        return;
      }
      if (msg.includes("AUTHORIZATION_VOIDED")) {
        res.status(409).json({
          error: {
            code: "AUTHORIZATION_VOIDED",
            message: "This authorization has been voided and cannot be captured."
          }
        });
        return;
      }
      if (msg.includes("MAX_NUMBER_OF_PAYMENT_ATTEMPTS_EXCEEDED")) {
        res.status(422).json({
          error: {
            code: "MAX_NUMBER_OF_PAYMENT_ATTEMPTS_EXCEEDED",
            message: "Maximum number of payment attempts exceeded for this authorization."
          }
        });
        return;
      }
      if (msg.includes("PAYMENT_DENIED")) {
        res.status(422).json({
          error: {
            code: "PAYMENT_DENIED",
            message: "Payment was denied by PayPal."
          }
        });
        return;
      }
      next(err);
    }
  });

  return router;
};
