import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { rateLimits } from "@/shared/schema";
import { lt, sql } from "drizzle-orm";

interface RateLimitResult {
  allowed: boolean;
  retryAfterMs?: number;
  remaining?: number;
}

const SENSITIVE_BUCKETS = new Set(["auth", "billing", "admin", "settings", "apikey"]);

function getClientIp(request: NextRequest): string {
  const cfIp = request.headers.get("cf-connecting-ip");
  const forwarded = request.headers.get("x-forwarded-for");
  return cfIp || forwarded?.split(",")[0]?.trim() || "unknown";
}

function rateLimit({ windowMs, maxRequests, bucket }: { windowMs: number; maxRequests: number; bucket: string }) {
  const failClosed = SENSITIVE_BUCKETS.has(bucket);

  return async function check(request: NextRequest): Promise<RateLimitResult> {
    const ip = getClientIp(request);
    const now = new Date();
    const windowEndMs = now.getTime() + windowMs;

    try {
      const result = await db.execute(sql`
        INSERT INTO rate_limits (key, bucket, count, window_start, window_end)
        VALUES (${ip}, ${bucket}, 1, NOW(), to_timestamp(${windowEndMs / 1000}))
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

export const authLimiter = rateLimit({ windowMs: 60_000, maxRequests: 10, bucket: "auth" });
export const aiLimiter = rateLimit({ windowMs: 60_000, maxRequests: 20, bucket: "ai" });
export const knowledgeLimiter = rateLimit({ windowMs: 60_000, maxRequests: 10, bucket: "knowledge" });
export const generalLimiter = rateLimit({ windowMs: 60_000, maxRequests: 100, bucket: "general" });
export const settingsLimiter = rateLimit({ windowMs: 60_000, maxRequests: 5, bucket: "settings" });
export const adminLimiter = rateLimit({ windowMs: 60_000, maxRequests: 30, bucket: "admin" });
export const callLimiter = rateLimit({ windowMs: 60_000, maxRequests: 10, bucket: "call" });
export const apiKeyLimiter = rateLimit({ windowMs: 60_000, maxRequests: 10, bucket: "apikey" });
export const webhookLimiter = rateLimit({ windowMs: 60_000, maxRequests: 20, bucket: "webhook" });
export const billingLimiter = rateLimit({ windowMs: 60_000, maxRequests: 10, bucket: "billing" });
export const exportLimiter = rateLimit({ windowMs: 60_000, maxRequests: 5, bucket: "export" });
export const notificationLimiter = rateLimit({ windowMs: 60_000, maxRequests: 30, bucket: "notification" });
export const rigoLimiter = rateLimit({ windowMs: 60_000, maxRequests: 10, bucket: "rigo" });
export const analyticsTrackLimiter = rateLimit({ windowMs: 1_000, maxRequests: 10, bucket: "analytics_track" });
export const publicLimiter = rateLimit({ windowMs: 60_000, maxRequests: 30, bucket: "public" });
