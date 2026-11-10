import { Router } from "express";
import {
  ParseMandateRequestSchema,
  CreateMandateRequestSchema
} from "@agentledger/shared";
import type { Container } from "../../container.js";
import { sseManager } from "../sse.js";

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
      const scenario = req.body.scenario as "A" | "B" | "C" | "D" | "E" | undefined;
      const bypass = Boolean(req.body.bypassReferee);

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
      next(err);
    }
  });

  return router;
};
