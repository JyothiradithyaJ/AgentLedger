import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { logger } from "../../observability/logger.js";

export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly httpStatus: number,
    public readonly userMessage: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(userMessage);
    this.name = "AppError";
  }
}

export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const reqId = req.headers["x-request-id"] ?? "unknown";

  if (err instanceof AppError) {
    logger.warn({ reqId, code: err.code, status: err.httpStatus }, err.userMessage);
    res.status(err.httpStatus).json({
      error: {
        code: err.code,
        message: err.userMessage,
        details: err.details
      }
    });
    return;
  }

  if (err instanceof ZodError) {
    logger.warn({ reqId, issues: err.issues }, "Schema validation error");
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request payload format",
        details: { issues: err.issues }
      }
    });
    return;
  }

  const message = err instanceof Error ? err.message : "Internal server error";
  logger.error({ reqId, err, message }, "Unhandled server error");

  res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected error occurred. Please try again later."
    }
  });
};
