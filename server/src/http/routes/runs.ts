import { Router } from "express";
import { sseManager } from "../sse.js";
import type { Container } from "../../container.js";

export const createRunsRouter = (_container: Container): Router => {
  const router = Router();

  // GET /api/runs/:id/events (SSE)
  router.get("/:id/events", (req, res) => {
    const runId = req.params.id;
    sseManager.addClient(runId, res);
  });

  return router;
};
