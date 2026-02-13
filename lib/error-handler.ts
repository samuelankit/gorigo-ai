import { NextResponse } from "next/server";

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code: string;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = "INTERNAL_ERROR",
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: string) {
    super(details ? `${message}: ${details}` : message, 400, "VALIDATION_ERROR");
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = "Authentication required") {
    super(message, 401, "AUTHENTICATION_ERROR");
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = "Insufficient permissions") {
    super(message, 403, "AUTHORIZATION_ERROR");
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = "Resource") {
    super(`${resource} not found`, 404, "NOT_FOUND");
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, "CONFLICT");
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfterMs?: number) {
    super("Too many requests", 429, "RATE_LIMIT");
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string) {
    super(`${service} error: ${message}`, 502, "EXTERNAL_SERVICE_ERROR");
  }
}

interface ErrorLogEntry {
  timestamp: string;
  requestId: string;
  error: string;
  code: string;
  statusCode: number;
  stack?: string;
  path?: string;
  method?: string;
}

const recentErrors: ErrorLogEntry[] = [];
const MAX_ERROR_LOG = 100;

function logError(entry: ErrorLogEntry): void {
  console.error(`[ERROR] [${entry.requestId}] ${entry.code}: ${entry.error}`);
  if (entry.stack && process.env.NODE_ENV !== "production") {
    console.error(entry.stack);
  }
  recentErrors.push(entry);
  if (recentErrors.length > MAX_ERROR_LOG) {
    recentErrors.shift();
  }
}

export function getRecentErrors(): ErrorLogEntry[] {
  return [...recentErrors];
}

export function clearErrorLog(): void {
  recentErrors.length = 0;
}

export function handleApiError(
  error: unknown,
  request?: Request
): NextResponse {
  const requestId = request?.headers?.get("x-request-id") || "unknown";
  const path = request ? new URL(request.url).pathname : "unknown";
  const method = request?.method || "unknown";

  if (error instanceof AppError) {
    logError({
      timestamp: new Date().toISOString(),
      requestId,
      error: error.message,
      code: error.code,
      statusCode: error.statusCode,
      path,
      method,
    });

    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        requestId,
      },
      { status: error.statusCode }
    );
  }

  const isDbError = error instanceof Error && (
    error.message.includes("connection") ||
    error.message.includes("ECONNREFUSED") ||
    error.message.includes("timeout") ||
    error.message.includes("pool")
  );

  const statusCode = isDbError ? 503 : 500;
  const code = isDbError ? "DATABASE_ERROR" : "INTERNAL_ERROR";
  const userMessage = isDbError
    ? "Service temporarily unavailable. Please try again."
    : "An unexpected error occurred.";

  logError({
    timestamp: new Date().toISOString(),
    requestId,
    error: error instanceof Error ? error.message : String(error),
    code,
    statusCode,
    stack: error instanceof Error ? error.stack : undefined,
    path,
    method,
  });

  return NextResponse.json(
    {
      error: userMessage,
      code,
      requestId,
    },
    { status: statusCode }
  );
}

export function withErrorHandler(
  handler: (request: Request, context?: any) => Promise<NextResponse>
) {
  return async (request: Request, context?: any): Promise<NextResponse> => {
    try {
      return await handler(request, context);
    } catch (error) {
      return handleApiError(error, request);
    }
  };
}
