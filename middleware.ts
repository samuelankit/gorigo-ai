import { NextRequest, NextResponse } from "next/server";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const fallbackStore = new Map<string, RateLimitEntry>();
const FALLBACK_WINDOW_MS = 60_000;
const FALLBACK_MAX_REQUESTS = 120;

const cleanupTimer = setInterval(() => {
  const now = Date.now();
  fallbackStore.forEach((entry, key) => {
    if (entry.resetAt <= now) fallbackStore.delete(key);
  });
}, 60_000);
(cleanupTimer as unknown as { unref?: () => void })?.unref?.();

function fallbackRateLimit(ip: string): boolean {
  const now = Date.now();
  const existing = fallbackStore.get(ip);
  if (!existing || existing.resetAt <= now) {
    fallbackStore.set(ip, { count: 1, resetAt: now + FALLBACK_WINDOW_MS });
    return true;
  }
  if (existing.count < FALLBACK_MAX_REQUESTS) {
    existing.count++;
    return true;
  }
  return false;
}

const BODY_SIZE_LIMITS: Record<string, number> = {
  "/api/auth/": 10 * 1024,
  "/api/ai/": 100 * 1024,
  "/api/knowledge": 5 * 1024 * 1024,
  "/api/admin/": 50 * 1024,
  "/api/settings/": 50 * 1024,
  "/api/agents/test-chat": 100 * 1024,
  "/api/compliance/": 50 * 1024,
  "/api/twilio/": 50 * 1024,
  "/api/billing/stripe-webhook": 1 * 1024 * 1024,
  "/api/public/": 50 * 1024,
  "/api/rigo": 50 * 1024,
  "/api/wallet/": 10 * 1024,
  "/api/billing/": 10 * 1024,
};
const DEFAULT_BODY_LIMIT = 1 * 1024 * 1024;

function getBodyLimitForPath(pathname: string): number {
  for (const [prefix, limit] of Object.entries(BODY_SIZE_LIMITS)) {
    if (pathname.startsWith(prefix)) return limit;
  }
  return DEFAULT_BODY_LIMIT;
}

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const CSRF_EXEMPT_PATHS = [
  "/api/twilio/",
  "/api/billing/stripe-webhook",
  "/api/affiliate/track",
  "/api/auth/logout",
  "/api/health",
  "/api/v1/",
  "/.well-known/",
];

const IS_DEVELOPMENT = process.env.NODE_ENV !== "production";

function addSecurityHeaders(response: NextResponse): void {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(self), geolocation=()");
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains"
  );

  const scriptSrc = IS_DEVELOPMENT
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval';"
    : "script-src 'self' 'unsafe-inline';";
  const csp = [
    "default-src 'self';",
    scriptSrc,
    "style-src 'self' 'unsafe-inline';",
    "img-src 'self' data: blob: https:;",
    "font-src 'self' data:;",
    "connect-src 'self' https:;",
    "media-src 'self' blob:;",
    "worker-src 'self' blob:;",
    "frame-ancestors 'none';",
    "base-uri 'self';",
    "form-action 'self';",
    "object-src 'none';",
  ].join(" ");
  response.headers.set("Content-Security-Policy", csp);
}

export function middleware(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") || globalThis.crypto.randomUUID();
  const startMs = Date.now();
  const pathname = request.nextUrl.pathname;
  const method = request.method;

  if (!pathname.startsWith("/api/")) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-request-id", requestId);
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    response.headers.set("x-request-id", requestId);
    response.headers.set("Cache-Control", "public, max-age=0, s-maxage=60, stale-while-revalidate=30");
    response.headers.set("CDN-Cache-Control", "max-age=60");
    addSecurityHeaders(response);
    return response;
  }

  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";

  if (!fallbackRateLimit(ip)) {
    const errorResponse = NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
    errorResponse.headers.set("Retry-After", "60");
    errorResponse.headers.set("x-request-id", requestId);
    addSecurityHeaders(errorResponse);
    return errorResponse;
  }

  if (MUTATION_METHODS.has(method)) {
    const contentLength = request.headers.get("content-length");
    if (contentLength) {
      const bodyLimit = getBodyLimitForPath(pathname);
      if (parseInt(contentLength, 10) > bodyLimit) {
        const errorResponse = NextResponse.json(
          { error: "Request body too large" },
          { status: 413 }
        );
        errorResponse.headers.set("x-request-id", requestId);
        addSecurityHeaders(errorResponse);
        return errorResponse;
      }
    }
  }

  if (MUTATION_METHODS.has(method) && pathname.startsWith("/api/")) {
    const isExempt = CSRF_EXEMPT_PATHS.some((p) => pathname.startsWith(p));
    const hasApiKey = !!request.headers.get("x-api-key");
    const hasBearerToken = !!request.headers.get("authorization")?.startsWith("Bearer ");
    const isMobileClient = request.headers.get("x-client-type") === "mobile";
    if (!isExempt && !hasApiKey && !(hasBearerToken && isMobileClient)) {
      const origin = request.headers.get("origin");
      const referer = request.headers.get("referer");
      const host = request.headers.get("host");

      const sourceUrl = origin || referer;
      if (!sourceUrl || !host) {
        const errorResponse = NextResponse.json(
          { error: "Forbidden: missing origin" },
          { status: 403 }
        );
        errorResponse.headers.set("x-request-id", requestId);
        addSecurityHeaders(errorResponse);
        return errorResponse;
      }

      try {
        const sourceHost = new URL(sourceUrl).host;
        if (sourceHost !== host) {
          const errorResponse = NextResponse.json(
            { error: "Forbidden: cross-origin request" },
            { status: 403 }
          );
          errorResponse.headers.set("x-request-id", requestId);
          addSecurityHeaders(errorResponse);
          return errorResponse;
        }
      } catch {
        const errorResponse = NextResponse.json(
          { error: "Forbidden: invalid origin" },
          { status: 403 }
        );
        errorResponse.headers.set("x-request-id", requestId);
        addSecurityHeaders(errorResponse);
        return errorResponse;
      }
    }
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);
  requestHeaders.set("x-request-start", String(startMs));

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  response.headers.set("x-request-id", requestId);
  response.headers.set("Server-Timing", `mw;dur=${Date.now() - startMs}`);
  addSecurityHeaders(response);

  return response;
}

export const runtime = "nodejs";

export const config = {
  matcher: ["/api/:path*", "/((?!_next/static|_next/image|favicon.ico).*)"],
};
