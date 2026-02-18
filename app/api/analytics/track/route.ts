import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { analyticsEvents, analyticsSessions, sessions as dbSessions, orgMembers } from "@/shared/schema";
import { sql, eq, countDistinct } from "drizzle-orm";
import { hashToken } from "@/lib/auth";
import { z } from "zod";
import { publicLimiter } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/api-error";

const WINDOW_MS = 1000;
const MAX_REQUESTS = 10;
const MAX_EVENTS_PER_REQUEST = 100;
const MAX_PAYLOAD_BYTES = 100 * 1024;
const SESSION_COOKIE_NAME = "gorigo_session";

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

setInterval(() => {
  const now = Date.now();
  rateLimitStore.forEach((entry, key) => {
    if (entry.resetAt <= now) rateLimitStore.delete(key);
  });
}, 30_000);

const batchIdStore = new Map<string, number>();
const BATCH_TTL_MS = 60_000;
const MAX_BATCH_IDS = 10_000;

setInterval(() => {
  const now = Date.now();
  batchIdStore.forEach((expiresAt, key) => {
    if (expiresAt <= now) batchIdStore.delete(key);
  });
}, 15_000);

function stripHtml(raw: string, maxLen: number): string {
  return raw.replace(/<[^>]*>/g, "").trim().slice(0, maxLen);
}

function redactPii(text: string): string {
  return text
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[redacted]")
    .replace(/\+?\d[\d\s\-()]{6,}/g, "[redacted]");
}

function sanitizeField(raw: string | undefined | null, maxLen: number): string | null {
  if (!raw || typeof raw !== "string") return null;
  return stripHtml(raw, maxLen);
}

function getIp(request: NextRequest): string {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

function checkRate(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);
  if (!entry || entry.resetAt <= now) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (entry.count < MAX_REQUESTS) {
    entry.count++;
    return true;
  }
  return false;
}

const eventSchema = z.object({
  sessionId: z.string().max(50),
  visitorId: z.string().max(50),
  eventType: z.enum(["pageview", "click", "scroll_depth", "time_on_page", "conversion"]),
  page: z.string().max(500),
  pageTitle: z.string().max(200).optional().nullable(),
  referrer: z.string().max(1000).optional().nullable(),
  utmSource: z.string().max(200).optional().nullable(),
  utmMedium: z.string().max(200).optional().nullable(),
  utmCampaign: z.string().max(200).optional().nullable(),
  searchKeyword: z.string().max(200).optional().nullable(),
  deviceType: z.string().max(50).optional().nullable(),
  browser: z.string().max(100).optional().nullable(),
  os: z.string().max(100).optional().nullable(),
  screenWidth: z.number().int().min(0).max(10000).optional().nullable(),
  screenHeight: z.number().int().min(0).max(10000).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  city: z.string().max(200).optional().nullable(),
  scrollDepth: z.number().min(0).max(100).optional().nullable(),
  timeOnPage: z.number().min(0).max(86400).optional().nullable(),
  elementId: z.string().max(200).optional().nullable(),
  elementText: z.string().max(500).optional().nullable(),
  timestamp: z.number().optional().nullable(),
  metadata: z.any().optional().nullable(),
});

const payloadSchema = z.object({
  batchId: z.string().max(50).optional().nullable(),
  events: z.array(eventSchema).min(1).max(MAX_EVENTS_PER_REQUEST),
});

async function resolveAuth(request: NextRequest): Promise<{ orgId: number | null; userId: number | null }> {
  try {
    const cookieHeader = request.headers.get("cookie");
    if (!cookieHeader) return { orgId: null, userId: null };

    const cookies = cookieHeader.split(";").map((c) => c.trim());
    let sessionToken: string | null = null;
    for (const cookie of cookies) {
      const [name, ...rest] = cookie.split("=");
      if (name.trim() === SESSION_COOKIE_NAME) {
        sessionToken = rest.join("=").trim();
        break;
      }
    }

    if (!sessionToken) return { orgId: null, userId: null };

    const tokenHash = hashToken(sessionToken);
    const [session] = await db
      .select()
      .from(dbSessions)
      .where(eq(dbSessions.token, tokenHash))
      .limit(1);

    if (!session) return { orgId: null, userId: null };

    const now = new Date();
    if (new Date(session.expiresAt) < now) return { orgId: null, userId: null };

    const userId = session.userId;

    let orgId: number | null = null;
    if (session.activeOrgId) {
      orgId = session.activeOrgId;
    } else {
      const [membership] = await db
        .select()
        .from(orgMembers)
        .where(eq(orgMembers.userId, userId))
        .limit(1);
      orgId = membership?.orgId ?? null;
    }

    return { orgId, userId };
  } catch (error) {
    return { orgId: null, userId: null };
  }
}

export async function POST(request: NextRequest) {
  try {
    const rl = await publicLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const ip = getIp(request);
    if (!checkRate(ip)) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_PAYLOAD_BYTES) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }

    let body: any;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = payloadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues.slice(0, 5) },
        { status: 400 },
      );
    }

    const { events, batchId } = parsed.data;

    if (batchId) {
      if (batchIdStore.has(batchId)) {
        return NextResponse.json({ ok: true, deduplicated: true });
      }
      if (batchIdStore.size >= MAX_BATCH_IDS) {
        const oldestKey = batchIdStore.keys().next().value;
        if (oldestKey) batchIdStore.delete(oldestKey);
      }
      batchIdStore.set(batchId, Date.now() + BATCH_TTL_MS);
    }

    const { orgId, userId } = await resolveAuth(request);

    const cfCountry = request.headers.get("cf-ipcountry") || undefined;
    const cfCity = request.headers.get("cf-ipcity") || undefined;

    const sessionMap = new Map<
      string,
      {
        visitorId: string;
        pages: Set<string>;
        lastPage: string;
        entryPage: string;
        referrer: string | null;
        utmSource: string | null;
        utmMedium: string | null;
        utmCampaign: string | null;
        deviceType: string;
        browser: string | null;
        os: string | null;
        country: string | null;
        city: string | null;
        minTimestamp: number;
        maxTimestamp: number;
        isConverted: boolean;
        conversionPage: string | null;
      }
    >();

    const eventRows: any[] = [];

    for (const evt of events) {
      const deviceType = sanitizeField(evt.deviceType, 50) || "unknown";
      const country = sanitizeField(evt.country, 100) || cfCountry || null;
      const city = sanitizeField(evt.city, 200) || cfCity || null;
      const page = sanitizeField(evt.page, 500) || evt.page.slice(0, 500);

      const elementTextRaw = sanitizeField(evt.elementText, 500);
      const elementTextClean = elementTextRaw ? redactPii(elementTextRaw) : null;

      eventRows.push({
        sessionId: evt.sessionId,
        visitorId: evt.visitorId,
        orgId: orgId,
        userId: userId,
        eventType: evt.eventType,
        page,
        pageTitle: sanitizeField(evt.pageTitle, 200),
        referrer: sanitizeField(evt.referrer, 1000),
        utmSource: sanitizeField(evt.utmSource, 200),
        utmMedium: sanitizeField(evt.utmMedium, 200),
        utmCampaign: sanitizeField(evt.utmCampaign, 200),
        searchKeyword: sanitizeField(evt.searchKeyword, 200),
        deviceType,
        browser: sanitizeField(evt.browser, 100),
        os: sanitizeField(evt.os, 100),
        screenWidth: evt.screenWidth ?? null,
        screenHeight: evt.screenHeight ?? null,
        country,
        city,
        scrollDepth: evt.scrollDepth ?? null,
        timeOnPage: evt.timeOnPage ?? null,
        elementId: sanitizeField(evt.elementId, 200),
        elementText: elementTextClean,
        metadata: null,
      });

      const existing = sessionMap.get(evt.sessionId);
      if (existing) {
        existing.pages.add(page);
        existing.lastPage = page;
        const ts = evt.timestamp || Date.now();
        if (ts < existing.minTimestamp) existing.minTimestamp = ts;
        if (ts > existing.maxTimestamp) existing.maxTimestamp = ts;
        if (evt.eventType === "conversion") {
          existing.isConverted = true;
          existing.conversionPage = page;
        }
      } else {
        const pages = new Set<string>();
        pages.add(page);
        sessionMap.set(evt.sessionId, {
          visitorId: evt.visitorId,
          pages,
          lastPage: page,
          entryPage: page,
          referrer: sanitizeField(evt.referrer, 1000),
          utmSource: sanitizeField(evt.utmSource, 200),
          utmMedium: sanitizeField(evt.utmMedium, 200),
          utmCampaign: sanitizeField(evt.utmCampaign, 200),
          deviceType,
          browser: sanitizeField(evt.browser, 100),
          os: sanitizeField(evt.os, 100),
          country,
          city,
          minTimestamp: evt.timestamp || Date.now(),
          maxTimestamp: evt.timestamp || Date.now(),
          isConverted: evt.eventType === "conversion",
          conversionPage: evt.eventType === "conversion" ? page : null,
        });
      }
    }

    if (eventRows.length > 0) {
      await db.insert(analyticsEvents).values(eventRows);
    }

    for (const [sessionId, data] of Array.from(sessionMap.entries())) {
      const startedAt = new Date(data.minTimestamp);
      const endedAt = new Date(data.maxTimestamp);
      const batchPageCount = data.pages.size;

      await db
        .insert(analyticsSessions)
        .values({
          sessionId,
          visitorId: data.visitorId,
          orgId: orgId,
          userId: userId,
          entryPage: data.entryPage,
          exitPage: data.lastPage,
          referrer: data.referrer,
          utmSource: data.utmSource,
          utmMedium: data.utmMedium,
          utmCampaign: data.utmCampaign,
          deviceType: data.deviceType,
          browser: data.browser,
          os: data.os,
          country: data.country,
          city: data.city,
          startedAt,
          endedAt,
          duration: 0,
          pageCount: batchPageCount,
          isBounce: batchPageCount <= 1,
          isConverted: data.isConverted,
          conversionPage: data.conversionPage,
        })
        .onConflictDoUpdate({
          target: analyticsSessions.sessionId,
          set: {
            endedAt,
            exitPage: data.lastPage,
            isConverted: data.isConverted ? true : sql`${analyticsSessions.isConverted}`,
            conversionPage: data.conversionPage || sql`${analyticsSessions.conversionPage}`,
            orgId: orgId ?? sql`${analyticsSessions.orgId}`,
            userId: userId ?? sql`${analyticsSessions.userId}`,
          },
        });

      const [distinctResult] = await db
        .select({ count: countDistinct(analyticsEvents.page) })
        .from(analyticsEvents)
        .where(eq(analyticsEvents.sessionId, sessionId));

      const actualPageCount = distinctResult?.count ?? batchPageCount;

      await db
        .update(analyticsSessions)
        .set({
          pageCount: actualPageCount,
          isBounce: actualPageCount <= 1,
          duration: sql`GREATEST(0, EXTRACT(EPOCH FROM (${endedAt}::timestamp - ${analyticsSessions.startedAt}))::integer)`,
        })
        .where(eq(analyticsSessions.sessionId, sessionId));
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error, "AnalyticsTrack");
  }
}
