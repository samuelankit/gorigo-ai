module.exports = [
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/lib/incremental-cache/tags-manifest.external.js [external] (next/dist/server/lib/incremental-cache/tags-manifest.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/lib/incremental-cache/tags-manifest.external.js", () => require("next/dist/server/lib/incremental-cache/tags-manifest.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/node:async_hooks [external] (node:async_hooks, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:async_hooks", () => require("node:async_hooks"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[project]/middleware.ts [middleware] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "config",
    ()=>config,
    "middleware",
    ()=>middleware,
    "runtime",
    ()=>runtime
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [middleware] (ecmascript)");
;
function createRateLimiter(windowMs, maxRequests) {
    const store = new Map();
    const cleanup = setInterval(()=>{
        const now = Date.now();
        store.forEach((entry, key)=>{
            if (entry.resetAt <= now) store.delete(key);
        });
    }, 60_000);
    if (cleanup.unref) cleanup.unref();
    return function check(ip) {
        const now = Date.now();
        const existing = store.get(ip);
        if (!existing || existing.resetAt <= now) {
            store.set(ip, {
                count: 1,
                resetAt: now + windowMs
            });
            return {
                allowed: true
            };
        }
        if (existing.count < maxRequests) {
            existing.count++;
            return {
                allowed: true
            };
        }
        return {
            allowed: false,
            retryAfterMs: existing.resetAt - now
        };
    };
}
const authMutateLimiter = createRateLimiter(60_000, 15);
const authReadLimiter = createRateLimiter(60_000, 60);
const aiLimiter = createRateLimiter(60_000, 20);
const knowledgeLimiter = createRateLimiter(60_000, 10);
const adminLimiter = createRateLimiter(60_000, 30);
const exportLimiter = createRateLimiter(60_000, 5);
const generalLimiter = createRateLimiter(60_000, 100);
function getLimiterForPath(pathname) {
    if (pathname === "/api/auth/me") return authReadLimiter;
    if (pathname.startsWith("/api/auth/")) return authMutateLimiter;
    if (pathname.startsWith("/api/ai/")) return aiLimiter;
    if (pathname.startsWith("/api/knowledge")) return knowledgeLimiter;
    if (pathname.startsWith("/api/admin/")) return adminLimiter;
    if (pathname.startsWith("/api/export/")) return exportLimiter;
    if (pathname.startsWith("/api/twilio/")) return null;
    return generalLimiter;
}
const BODY_SIZE_LIMITS = {
    "/api/auth/": 10 * 1024,
    "/api/ai/": 100 * 1024,
    "/api/knowledge": 5 * 1024 * 1024,
    "/api/admin/": 50 * 1024,
    "/api/settings/": 50 * 1024,
    "/api/agents/test-chat": 100 * 1024,
    "/api/compliance/": 50 * 1024,
    "/api/twilio/": 50 * 1024,
    "/api/billing/stripe-webhook": 1 * 1024 * 1024
};
const DEFAULT_BODY_LIMIT = 1 * 1024 * 1024;
function getBodyLimitForPath(pathname) {
    for (const [prefix, limit] of Object.entries(BODY_SIZE_LIMITS)){
        if (pathname.startsWith(prefix)) return limit;
    }
    return DEFAULT_BODY_LIMIT;
}
const MUTATION_METHODS = new Set([
    "POST",
    "PUT",
    "PATCH",
    "DELETE"
]);
const CSRF_EXEMPT_PATHS = [
    "/api/twilio/",
    "/api/billing/stripe-webhook",
    "/api/affiliate/track",
    "/api/auth/logout",
    "/api/health",
    "/api/v1/",
    "/.well-known/"
];
const IS_DEVELOPMENT = ("TURBOPACK compile-time value", "development") !== "production";
function addSecurityHeaders(response) {
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("X-XSS-Protection", "1; mode=block");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    const scriptSrc = ("TURBOPACK compile-time truthy", 1) ? "script-src 'self' 'unsafe-inline' 'unsafe-eval';" : "TURBOPACK unreachable";
    const csp = [
        "default-src 'self';",
        scriptSrc,
        "style-src 'self' 'unsafe-inline';",
        "img-src 'self' data: blob: https:;",
        "font-src 'self' data:;",
        "connect-src 'self' https:;",
        "frame-ancestors 'none';",
        "base-uri 'self';",
        "form-action 'self';",
        "object-src 'none';"
    ].join(" ");
    response.headers.set("Content-Security-Policy", csp);
}
function middleware(request) {
    const requestId = request.headers.get("x-request-id") || globalThis.crypto.randomUUID();
    const pathname = request.nextUrl.pathname;
    const method = request.method;
    if (!pathname.startsWith("/api/")) {
        const requestHeaders = new Headers(request.headers);
        requestHeaders.set("x-request-id", requestId);
        const response = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["NextResponse"].next({
            request: {
                headers: requestHeaders
            }
        });
        response.headers.set("x-request-id", requestId);
        addSecurityHeaders(response);
        return response;
    }
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() || "unknown";
    const limiter = getLimiterForPath(pathname);
    if (limiter) {
        const result = limiter(ip);
        if (!result.allowed) {
            const retryAfter = Math.ceil((result.retryAfterMs || 60000) / 1000);
            const errorResponse = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: "Too many requests. Please try again later."
            }, {
                status: 429
            });
            errorResponse.headers.set("Retry-After", String(retryAfter));
            addSecurityHeaders(errorResponse);
            return errorResponse;
        }
    }
    if (MUTATION_METHODS.has(method)) {
        const contentLength = request.headers.get("content-length");
        if (contentLength) {
            const bodyLimit = getBodyLimitForPath(pathname);
            if (parseInt(contentLength, 10) > bodyLimit) {
                const errorResponse = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    error: "Request body too large"
                }, {
                    status: 413
                });
                addSecurityHeaders(errorResponse);
                return errorResponse;
            }
        }
    }
    if (MUTATION_METHODS.has(method) && pathname.startsWith("/api/")) {
        const isExempt = CSRF_EXEMPT_PATHS.some((p)=>pathname.startsWith(p));
        const hasApiKey = !!request.headers.get("x-api-key");
        if (!isExempt && !hasApiKey) {
            const origin = request.headers.get("origin");
            const referer = request.headers.get("referer");
            const host = request.headers.get("host");
            const sourceUrl = origin || referer;
            if (!sourceUrl || !host) {
                const errorResponse = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    error: "Forbidden: missing origin"
                }, {
                    status: 403
                });
                addSecurityHeaders(errorResponse);
                return errorResponse;
            }
            try {
                const sourceHost = new URL(sourceUrl).host;
                if (sourceHost !== host) {
                    const errorResponse = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["NextResponse"].json({
                        error: "Forbidden: cross-origin request"
                    }, {
                        status: 403
                    });
                    addSecurityHeaders(errorResponse);
                    return errorResponse;
                }
            } catch  {
                const errorResponse = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["NextResponse"].json({
                    error: "Forbidden: invalid origin"
                }, {
                    status: 403
                });
                addSecurityHeaders(errorResponse);
                return errorResponse;
            }
        }
    }
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-request-id", requestId);
    const response = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$middleware$5d$__$28$ecmascript$29$__["NextResponse"].next({
        request: {
            headers: requestHeaders
        }
    });
    response.headers.set("x-request-id", requestId);
    addSecurityHeaders(response);
    return response;
}
const runtime = "nodejs";
const config = {
    matcher: [
        "/api/:path*",
        "/((?!_next/static|_next/image|favicon.ico).*)"
    ]
};
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__591b8a9e._.js.map