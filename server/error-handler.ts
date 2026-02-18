import type { Request, Response } from "express";
import { ZodError } from "zod";

const IS_PRODUCTION = process.env.NODE_ENV === "production";

export function handleRouteError(err: unknown, res: Response, context?: string): void {
  if (res.headersSent) return;

  if (err instanceof ZodError) {
    const messages = err.errors.map((e) => {
      const path = e.path.length > 0 ? e.path.join(".") : "input";
      return `${path}: ${e.message}`;
    });
    res.status(400).json({
      error: "Validation failed",
      code: "VALIDATION_ERROR",
      ...(IS_PRODUCTION ? {} : { details: messages }),
    });
    return;
  }

  const isDbError =
    err instanceof Error &&
    (err.message.includes("connection") ||
      err.message.includes("ECONNREFUSED") ||
      err.message.includes("timeout") ||
      err.message.includes("pool"));

  const statusCode = isDbError ? 503 : 500;
  const code = isDbError ? "DATABASE_ERROR" : "INTERNAL_ERROR";
  const message = isDbError
    ? "Service temporarily unavailable"
    : "Internal server error";

  const label = context || "Route";
  console.error(
    `[${label}] ${err instanceof Error ? err.message : String(err)}`,
  );

  res.status(statusCode).json({ error: message, code });
}
