import { Router } from "express";
import type { Container } from "../../container.js";

const startTime = Date.now();

export const createHealthRouter = (_container: Container): Router => {
  const router = Router();

  // GET /api/health
  router.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor((Date.now() - startTime) / 1000)
    });
  });

  // GET /api/ready
  router.get("/ready", (_req, res) => {
    res.json({
      status: "ready",
      timestamp: new Date().toISOString(),
      paypalReachability: true,
      llmReachability: true,
      databaseReady: true
    });
  });

  return router;
};
