import { Router } from "express";
import { HumanDecisionRequestSchema } from "@agentledger/shared";
import type { Container } from "../../container.js";

export const createPurchasesRouter = (container: Container): Router => {
  const router = Router();
  const { purchases } = container.services;

  // GET /api/purchases/:id
  router.get("/:id", (req, res, next) => {
    try {
      const purchase = purchases.getPurchase(req.params.id);
      if (!purchase) {
        res.status(404).json({ error: { code: "NOT_FOUND", message: "Purchase not found" } });
        return;
      }
      res.json(purchase);
    } catch (err) {
      next(err);
    }
  });

  // POST /api/purchases/:id/decision
  router.post("/:id/decision", async (req, res, next) => {
    try {
      const body = HumanDecisionRequestSchema.parse(req.body);
      const updated = await purchases.handleHumanDecision(
        req.params.id,
        body.decision,
        body.reason
      );
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  return router;
};
