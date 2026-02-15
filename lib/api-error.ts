import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { headers } from "next/headers";

const IS_PRODUCTION = process.env.NODE_ENV === "production";

interface ApiErrorOptions {
  status?: number;
  details?: unknown;
}

export function apiError(message: string, opts: ApiErrorOptions = {}): NextResponse {
  const status = opts.status ?? 500;
  const body: Record<string, unknown> = { error: message };

  if (opts.details && !IS_PRODUCTION) {
    body.details = opts.details;
  }

  return NextResponse.json(body, { status });
}

export function handleRouteError(error: unknown, context?: string): NextResponse {
  if (error instanceof ZodError) {
    const messages = error.errors.map((e) => {
      const path = e.path.length > 0 ? e.path.join(".") : "input";
      return `${path}: ${e.message}`;
    });
    return apiError("Validation failed", {
      status: 400,
      details: messages,
    });
  }

  const label = context ? `[${context}]` : "[API]";
  if (error instanceof Error) {
    console.error(`${label} ${error.message}`, IS_PRODUCTION ? "" : error.stack);
  } else {
    console.error(`${label} Unknown error:`, error);
  }

  return apiError("Internal server error", { status: 500 });
}

export async function getRequestId(): Promise<string> {
  try {
    const h = await headers();
    return h.get("x-request-id") || "unknown";
  } catch {
    return "unknown";
  }
}
