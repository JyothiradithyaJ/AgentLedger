import express, { type Express } from "express";
import helmet from "helmet";
import cors from "cors";
import path from "node:path";
import fs from "node:fs";
import { createContainer, type Container } from "../container.js";
import { createRequestLogger } from "../observability/logger.js";
import { apiRateLimiter } from "./middleware/rateLimit.js";
import { errorHandler } from "./middleware/errorHandler.js";

import { createMandatesRouter } from "./routes/mandates.js";
import { createPurchasesRouter } from "./routes/purchases.js";
import { createRunsRouter } from "./routes/runs.js";
import { createLedgerRouter } from "./routes/ledger.js";
import { createDisputesRouter } from "./routes/disputes.js";
import { createWebhooksRouter } from "./routes/webhooks.js";
import { createDemoRouter } from "./routes/demo.js";
import { createHealthRouter } from "./routes/health.js";
import { env, getPublicConfig } from "../config/env.js";

export const createApp = (container: Container = createContainer()): Express => {
  const app = express();

  app.set("trust proxy", 1);

  // Basic security and parsing middleware
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          ...helmet.contentSecurityPolicy.getDefaultDirectives(),
          "script-src": ["'self'", "https://*.paypal.com", "https://*.paypalobjects.com"],
          "connect-src": ["'self'", "https://*.paypal.com", "https://*.paypalobjects.com"],
          "frame-src": ["'self'", "https://*.paypal.com"],
          "img-src": ["'self'", "data:", "https://*.paypal.com", "https://*.paypalobjects.com"]
        }
      }
    })
  );

  const allowedOrigins: string[] = [];
  if (env.FRONTEND_URL) {
    allowedOrigins.push(env.FRONTEND_URL.replace(/\/$/, ""));
  }
  if (env.NODE_ENV !== "production") {
    allowedOrigins.push("http://localhost:5173");
  }

  app.use(
    cors({
      origin: allowedOrigins.length > 0 ? allowedOrigins : false
    })
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(createRequestLogger());
  app.use("/api/", apiRateLimiter);

  // Mount API Contract Routes
  app.get("/api/config", (_req, res) => {
    res.json(getPublicConfig());
  });
  app.use("/api/mandates", createMandatesRouter(container));
  app.use("/api/purchases", createPurchasesRouter(container));
  app.use("/api/runs", createRunsRouter(container));
  app.use("/api/ledger", createLedgerRouter(container));
  app.use("/api/disputes", createDisputesRouter(container));
  app.use("/api/webhooks/paypal", createWebhooksRouter(container));
  app.use("/api/demo", createDemoRouter(container));
  app.use("/api", createHealthRouter(container));

  // Production static serving for built React SPA (web/dist)
  const distPath = path.resolve(process.cwd(), "web/dist");
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api")) return next();
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Central Error Handler
  app.use(errorHandler);

  return app;
};
