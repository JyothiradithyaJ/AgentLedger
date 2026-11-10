import { Router } from "express";
import { DemoScenarioNameSchema } from "@agentledger/shared";
import type { Container } from "../../container.js";

export const createDemoRouter = (container: Container): Router => {
  const router = Router();
  const { demo } = container.services;

  // POST /api/demo/scenario/:name
  router.post("/scenario/:name", async (req, res, next) => {
    try {
      const scenario = DemoScenarioNameSchema.parse(req.params.name);
      const result = await demo.runScenario(scenario);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  // POST /api/demo/reset
  router.post("/reset", async (_req, res, next) => {
    try {
      await demo.resetDemo();
      res.json({ message: "Demo database reset cleanly." });
    } catch (err) {
      next(err);
    }
  });

  return router;
};
