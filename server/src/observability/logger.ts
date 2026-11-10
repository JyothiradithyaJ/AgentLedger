import { pino } from "pino";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { RequestHandler } from "express";
import pinoHttpModule from "pino-http";
import { env } from "../config/env.js";

export const logger = pino({
  level: env.NODE_ENV === "test" ? "silent" : "info",
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers['paypal-client-metadata-id']",
      "client_secret",
      "access_token",
      "refresh_token"
    ],
    censor: "[REDACTED]"
  },
  timestamp: pino.stdTimeFunctions.isoTime
});

type PinoHttpFn = (opts?: unknown) => RequestHandler;

const getPinoHttp = (): PinoHttpFn => {
  if (typeof pinoHttpModule === "function") {
    return pinoHttpModule as unknown as PinoHttpFn;
  }
  const mod = pinoHttpModule as unknown as { default?: PinoHttpFn };
  if (typeof mod.default === "function") {
    return mod.default;
  }
  return pinoHttpModule as unknown as PinoHttpFn;
};

export const createRequestLogger = (): RequestHandler => {
  const httpLogger = getPinoHttp();
  return httpLogger({
    logger,
    genReqId: (req: IncomingMessage) => {
      const existing = req.headers["x-request-id"];
      if (typeof existing === "string") return existing;
      return crypto.randomUUID();
    },
    customLogLevel: (_req: IncomingMessage, res: ServerResponse, err?: Error) => {
      if (res.statusCode >= 500 || err) return "error";
      if (res.statusCode >= 400) return "warn";
      return "info";
    }
  });
};
