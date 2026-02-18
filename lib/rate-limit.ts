import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { rateLimits } from "@/shared/schema";
import { and, eq, gt, lt, sql } from "drizzle-orm";

interface RateLimitResult {
  allowed: boolean;
  retryAfterMs?: number;
  remaining?: number;
}

function getClientIp(request: NextRequest): string {
  const cfIp = request.headers.get("cf-connecting-ip");
  const forwarded = request.headers.get("x-forwarded-for");
  return cfIp || forwarded?.split(",")[0]?.trim() || "unknown";
}

function rateLimit({ windowMs, maxRequests, bucket }: { windowMs: number; maxRequests: number; bucket: string }) {
  return async function check(request: NextRequest): Promise<RateLimitResult> {
    const ip = getClientIp(request);
    const key = `${ip}`;
    const now = new Date();
    const windowEnd = new Date(now.getTime() + windowMs);

    try {
      const [existing] = await db
        .select()
        .from(rateLimits)
        .where(
          and(
            eq(rateLimits.key, key),
            eq(rateLimits.bucket, bucket),
            gt(rateLimits.windowEnd, now)
          )
        )
        .limit(1);

      if (!existing) {
        await db.insert(rateLimits).values({
          key,
          bucket,
          count: 1,
          windowStart: now,
          windowEnd,
        });
        return { allowed: true, remaining: maxRequests - 1 };
      }

      if (existing.count < maxRequests) {
        await db
          .update(rateLimits)
          .set({ count: sql`${rateLimits.count} + 1` })
          .where(eq(rateLimits.id, existing.id));
        return { allowed: true, remaining: maxRequests - existing.count - 1 };
      }

      const retryAfterMs = existing.windowEnd.getTime() - now.getTime();
      return { allowed: false, retryAfterMs, remaining: 0 };
    } catch (error) {
      console.error(`Rate limit check failed for bucket ${bucket}:`, error);
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
