import { Router } from "express";
import { SimulateDisputeRequestSchema } from "@agentledger/shared";
import type { Container } from "../../container.js";

export const createDisputesRouter = (container: Container): Router => {
  const router = Router();
  const { disputes } = container.services;

  // GET /api/disputes
  router.get("/", (_req, res, next) => {
    try {
      const list = disputes.listDisputes();
      res.json(list);
    } catch (err) {
      next(err);
    }
  });

  // GET /api/disputes/:id
  router.get("/:id", (req, res, next) => {
    try {
      const dispute = disputes.getDispute(req.params.id);
      if (!dispute) {
        res.status(404).json({ error: { code: "NOT_FOUND", message: "Dispute not found" } });
        return;
      }
      res.json(dispute);
    } catch (err) {
      next(err);
    }
  });

  // POST /api/disputes/simulate
  router.post("/simulate", async (req, res, next) => {
    try {
      const body = SimulateDisputeRequestSchema.parse(req.body);
      const dispute = await disputes.createSimulatedDispute(
        body.purchaseId,
        body.reason
      );
      res.status(201).json(dispute);
    } catch (err) {
      next(err);
    }
  });

  // POST /api/disputes/:id/analyze
  router.post("/:id/analyze", async (req, res, next) => {
    try {
      const verdict = await disputes.runDisputeAnalysis(req.params.id);
      res.json(verdict);
    } catch (err) {
      next(err);
    }
  });

  // POST /api/disputes/:id/submit-evidence
  router.post("/:id/submit-evidence", async (req, res, next) => {
    try {
      const updated = await disputes.submitEvidenceToPayPal(req.params.id);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  return router;
};
