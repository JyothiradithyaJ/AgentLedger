import { Router } from "express";
import type { Container } from "../../container.js";
import { env } from "../../config/env.js";

export const createLedgerRouter = (container: Container): Router => {
  const router = Router();
  const { ledger } = container.services;

  // GET /api/ledger
  router.get("/", (_req, res, next) => {
    try {
      const entries = ledger.getAllEntries();
      res.json(entries);
    } catch (err) {
      next(err);
    }
  });

  // POST /api/ledger/verify
  router.post("/verify", (_req, res, next) => {
    try {
      const result = ledger.verify();
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  // POST /api/ledger/:seq/tamper
  router.post("/:seq/tamper", (req, res, next) => {
    if (!env.DEMO_MODE) {
      res.status(404).end();
      return;
    }
    try {
      const seq = parseInt(req.params.seq, 10);
      ledger.tamper(seq);
      res.json({ message: `Entry at sequence ${seq} tampered for demo failure demonstration.` });
    } catch (err) {
      next(err);
    }
  });

  return router;
};
