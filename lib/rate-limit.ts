import { NextRequest } from "next/server";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitResult {
  allowed: boolean;
  retryAfterMs?: number;
  remaining?: number;
}

const MAX_STORE_SIZE = 10_000;

function rateLimit({ windowMs, maxRequests }: { windowMs: number; maxRequests: number }) {
  const store = new Map<string, RateLimitEntry>();

  const cleanup = setInterval(() => {
    const now = Date.now();
    store.forEach((entry, key) => {
      if (entry.resetAt <= now) {
        store.delete(key);
      }
    });
  }, 60_000);

  if (cleanup.unref) {
    cleanup.unref();
  }

  return async function check(request: NextRequest): Promise<RateLimitResult> {
    const cfIp = request.headers.get("cf-connecting-ip");
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = cfIp || forwarded?.split(",")[0]?.trim() || "unknown";
    const now = Date.now();

    const existing = store.get(ip);

    if (!existing || existing.resetAt <= now) {
      if (store.size >= MAX_STORE_SIZE) {
        const oldest = store.keys().next().value;
        if (oldest) store.delete(oldest);
      }
      store.set(ip, { count: 1, resetAt: now + windowMs });
      return { allowed: true, remaining: maxRequests - 1 };
    }

    if (existing.count < maxRequests) {
      existing.count++;
      return { allowed: true, remaining: maxRequests - existing.count };
    }

    return { allowed: false, retryAfterMs: existing.resetAt - now, remaining: 0 };
  };
}

export const authLimiter = rateLimit({ windowMs: 60_000, maxRequests: 10 });
export const aiLimiter = rateLimit({ windowMs: 60_000, maxRequests: 20 });
export const knowledgeLimiter = rateLimit({ windowMs: 60_000, maxRequests: 10 });
export const generalLimiter = rateLimit({ windowMs: 60_000, maxRequests: 100 });
export const settingsLimiter = rateLimit({ windowMs: 60_000, maxRequests: 5 });
export const adminLimiter = rateLimit({ windowMs: 60_000, maxRequests: 30 });
export const callLimiter = rateLimit({ windowMs: 60_000, maxRequests: 10 });
export const apiKeyLimiter = rateLimit({ windowMs: 60_000, maxRequests: 10 });
export const webhookLimiter = rateLimit({ windowMs: 60_000, maxRequests: 20 });
export const billingLimiter = rateLimit({ windowMs: 60_000, maxRequests: 10 });
export const exportLimiter = rateLimit({ windowMs: 60_000, maxRequests: 5 });
export const notificationLimiter = rateLimit({ windowMs: 60_000, maxRequests: 30 });
