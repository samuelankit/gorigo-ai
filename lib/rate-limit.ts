import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { rateLimits } from "@/shared/schema";
import { lt, sql } from "drizzle-orm";

interface RateLimitResult {
  allowed: boolean;
  retryAfterMs?: number;
  remaining?: number;
}

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  bucket: string;
}

const SENSITIVE_BUCKETS = new Set(["auth", "billing", "admin", "settings", "apikey"]);

function getClientIp(request: NextRequest): string {
  const cfIp = request.headers.get("cf-connecting-ip");
  const forwarded = request.headers.get("x-forwarded-for");
  return cfIp || forwarded?.split(",")[0]?.trim() || "unknown";
}

function getUserIdFromRequest(request: NextRequest): string | null {
  const userId = request.headers.get("x-rate-limit-user-id");
  return userId || null;
}

function buildRateLimitKey(request: NextRequest, email?: string): string {
  const ip = getClientIp(request);
  if (email) {
    return `email:${email.toLowerCase()}`;
  }
  const userId = getUserIdFromRequest(request);
  if (userId) {
    return `${userId}:${ip}`;
  }
  return ip;
}

function rateLimit({ windowMs, maxRequests, bucket }: RateLimitOptions) {
  const failClosed = SENSITIVE_BUCKETS.has(bucket);

  return async function check(request: NextRequest, opts?: { email?: string }): Promise<RateLimitResult> {
    const compositeKey = buildRateLimitKey(request, opts?.email);
    const now = new Date();
    const windowEndMs = now.getTime() + windowMs;

    try {
      const result = await db.execute(sql`
        INSERT INTO rate_limits (key, bucket, count, window_start, window_end)
        VALUES (${compositeKey}, ${bucket}, 1, NOW(), to_timestamp(${windowEndMs / 1000}))
        ON CONFLICT (key, bucket) DO UPDATE SET
          count = CASE
            WHEN rate_limits.window_end <= NOW() THEN 1
            ELSE rate_limits.count + 1
          END,
          window_start = CASE
            WHEN rate_limits.window_end <= NOW() THEN NOW()
            ELSE rate_limits.window_start
          END,
          window_end = CASE
            WHEN rate_limits.window_end <= NOW() THEN to_timestamp(${windowEndMs / 1000})
            ELSE rate_limits.window_end
          END
        RETURNING count, window_end
      `);

      const row = result.rows?.[0] as { count: number; window_end: string | Date } | undefined;
      if (!row) {
        return failClosed
          ? { allowed: false, retryAfterMs: windowMs, remaining: 0 }
          : { allowed: true, remaining: maxRequests };
      }

      const count = Number(row.count);
      if (count <= maxRequests) {
        return { allowed: true, remaining: maxRequests - count };
      }

      const windowEndTime = new Date(row.window_end).getTime();
      const retryAfterMs = Math.max(windowEndTime - Date.now(), 1000);
      return { allowed: false, retryAfterMs, remaining: 0 };
    } catch (error) {
      console.error(`Rate limit check failed for bucket ${bucket}:`, error);
      if (failClosed) {
        return { allowed: false, retryAfterMs: windowMs, remaining: 0 };
      }
      return { allowed: true, remaining: maxRequests };
    }
  };
}

function rateLimitByEmail({ windowMs, maxRequests, bucket }: RateLimitOptions) {
  const limiter = rateLimit({ windowMs, maxRequests, bucket });
  const ipLimiter = rateLimit({ windowMs, maxRequests, bucket: `${bucket}_ip` });

  return async function check(request: NextRequest, email?: string): Promise<RateLimitResult> {
    const ipResult = await ipLimiter(request);
    if (!ipResult.allowed) {
      return ipResult;
    }

    if (email) {
      const emailResult = await limiter(request, { email });
      if (!emailResult.allowed) {
        return emailResult;
      }
      return {
        allowed: true,
        remaining: Math.min(ipResult.remaining ?? 0, emailResult.remaining ?? 0),
      };
    }

    return ipResult;
  };
}

let cleanupStarted = false;
function startCleanup() {
  if (cleanupStarted) return;
  cleanupStarted = true;
  const interval = setInterval(async () => {
    try {
      await db.delete(rateLimits).where(lt(rateLimits.windowEnd, new Date()));
    } catch (error) {
      console.error("Rate limit cleanup failed:", error);
    }
  }, 5 * 60_000);
  if (typeof interval === "object" && interval && "unref" in interval) {
    (interval as { unref: () => void }).unref();
  }
}

startCleanup();

export const authLimiter = rateLimitByEmail({ windowMs: 60_000, maxRequests: 10, bucket: "auth" });
export const aiLimiter = rateLimit({ windowMs: 60_000, maxRequests: 60, bucket: "ai" });
export const knowledgeLimiter = rateLimit({ windowMs: 60_000, maxRequests: 60, bucket: "knowledge" });
export const generalLimiter = rateLimit({ windowMs: 60_000, maxRequests: 300, bucket: "general" });
export const settingsLimiter = rateLimit({ windowMs: 60_000, maxRequests: 60, bucket: "settings" });
export const adminLimiter = rateLimit({ windowMs: 60_000, maxRequests: 120, bucket: "admin" });
export const callLimiter = rateLimit({ windowMs: 60_000, maxRequests: 30, bucket: "call" });
export const apiKeyLimiter = rateLimit({ windowMs: 60_000, maxRequests: 30, bucket: "apikey" });
export const webhookLimiter = rateLimit({ windowMs: 60_000, maxRequests: 60, bucket: "webhook" });
export const billingLimiter = rateLimit({ windowMs: 60_000, maxRequests: 30, bucket: "billing" });
export const exportLimiter = rateLimit({ windowMs: 60_000, maxRequests: 20, bucket: "export" });
export const notificationLimiter = rateLimit({ windowMs: 60_000, maxRequests: 120, bucket: "notification" });
export const rigoLimiter = rateLimit({ windowMs: 60_000, maxRequests: 30, bucket: "rigo" });
export const analyticsTrackLimiter = rateLimit({ windowMs: 1_000, maxRequests: 30, bucket: "analytics_track" });
export const publicLimiter = rateLimit({ windowMs: 60_000, maxRequests: 60, bucket: "public" });
