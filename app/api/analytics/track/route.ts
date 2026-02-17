import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { analyticsEvents, analyticsSessions } from "@/shared/schema";
import { sql } from "drizzle-orm";

const WINDOW_MS = 1000;
const MAX_REQUESTS = 10;
const MAX_EVENTS_PER_REQUEST = 100;

const store = new Map<string, { count: number; resetAt: number }>();

setInterval(() => {
  const now = Date.now();
  store.forEach((entry, key) => {
    if (entry.resetAt <= now) store.delete(key);
  });
}, 30_000);

function sanitizeText(raw: string): string {
  const clean = raw.trim().slice(0, 50);
  return clean
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[redacted]')
    .replace(/\+?\d[\d\s\-()]{6,}/g, '[redacted]');
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
  const entry = store.get(ip);
  if (!entry || entry.resetAt <= now) {
    store.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (entry.count < MAX_REQUESTS) {
    entry.count++;
    return true;
  }
  return false;
}

export async function POST(request: NextRequest) {
  try {
    const ip = getIp(request);
    if (!checkRate(ip)) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const events = body?.events;
    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json({ error: "No events provided" }, { status: 400 });
    }

    if (events.length > MAX_EVENTS_PER_REQUEST) {
      return NextResponse.json({ error: `Max ${MAX_EVENTS_PER_REQUEST} events per request` }, { status: 400 });
    }

    const cfCountry = request.headers.get("cf-ipcountry") || undefined;
    const cfCity = request.headers.get("cf-ipcity") || undefined;

    const sessionMap = new Map<string, {
      visitorId: string;
      pages: Set<string>;
      lastPage: string;
      entryPage: string;
      referrer?: string;
      utmSource?: string;
      utmMedium?: string;
      utmCampaign?: string;
      deviceType: string;
      browser?: string;
      os?: string;
      country?: string;
      city?: string;
      maxTimestamp: number;
      isConverted: boolean;
      conversionPage?: string;
    }>();

    const eventRows: any[] = [];

    for (const evt of events) {
      if (!evt.sessionId || !evt.visitorId || !evt.page) continue;

      const eventType = evt.eventType || "pageview";
      const deviceType = evt.deviceType || "unknown";
      const country = evt.country || cfCountry;
      const city = evt.city || cfCity;

      eventRows.push({
        sessionId: evt.sessionId,
        visitorId: evt.visitorId,
        eventType,
        page: evt.page,
        pageTitle: evt.pageTitle || null,
        referrer: evt.referrer || null,
        utmSource: evt.utmSource || null,
        utmMedium: evt.utmMedium || null,
        utmCampaign: evt.utmCampaign || null,
        searchKeyword: evt.searchKeyword || null,
        deviceType,
        browser: evt.browser || null,
        os: evt.os || null,
        screenWidth: evt.screenWidth || null,
        screenHeight: evt.screenHeight || null,
        country: country || null,
        city: city || null,
        scrollDepth: evt.scrollDepth || null,
        timeOnPage: evt.timeOnPage || null,
        elementId: evt.elementId ? String(evt.elementId).slice(0, 100) : null,
        elementText: evt.elementText ? sanitizeText(String(evt.elementText)) : null,
        metadata: null,
      });

      const existing = sessionMap.get(evt.sessionId);
      if (existing) {
        existing.pages.add(evt.page);
        existing.lastPage = evt.page;
        const ts = evt.timestamp || Date.now();
        if (ts > existing.maxTimestamp) existing.maxTimestamp = ts;
        if (eventType === "conversion") {
          existing.isConverted = true;
          existing.conversionPage = evt.page;
        }
      } else {
        const pages = new Set<string>();
        pages.add(evt.page);
        sessionMap.set(evt.sessionId, {
          visitorId: evt.visitorId,
          pages,
          lastPage: evt.page,
          entryPage: evt.page,
          referrer: evt.referrer,
          utmSource: evt.utmSource,
          utmMedium: evt.utmMedium,
          utmCampaign: evt.utmCampaign,
          deviceType,
          browser: evt.browser,
          os: evt.os,
          country: country,
          city: city,
          maxTimestamp: evt.timestamp || Date.now(),
          isConverted: eventType === "conversion",
          conversionPage: eventType === "conversion" ? evt.page : undefined,
        });
      }
    }

    if (eventRows.length > 0) {
      await db.insert(analyticsEvents).values(eventRows);
    }

    for (const [sessionId, data] of Array.from(sessionMap.entries())) {
      const now = new Date();
      const endedAt = new Date(data.maxTimestamp);
      const pageCount = data.pages.size;

      await db
        .insert(analyticsSessions)
        .values({
          sessionId,
          visitorId: data.visitorId,
          entryPage: data.entryPage,
          exitPage: data.lastPage,
          referrer: data.referrer || null,
          utmSource: data.utmSource || null,
          utmMedium: data.utmMedium || null,
          utmCampaign: data.utmCampaign || null,
          deviceType: data.deviceType,
          browser: data.browser || null,
          os: data.os || null,
          country: data.country || null,
          city: data.city || null,
          startedAt: now,
          endedAt,
          duration: 0,
          pageCount,
          isBounce: pageCount <= 1,
          isConverted: data.isConverted,
          conversionPage: data.conversionPage || null,
        })
        .onConflictDoUpdate({
          target: analyticsSessions.sessionId,
          set: {
            endedAt,
            exitPage: data.lastPage,
            pageCount: sql`${analyticsSessions.pageCount} + ${pageCount}`,
            duration: sql`EXTRACT(EPOCH FROM (${endedAt}::timestamp - ${analyticsSessions.startedAt}))::integer`,
            isBounce: sql`CASE WHEN ${analyticsSessions.pageCount} + ${pageCount} > 1 THEN false ELSE true END`,
            isConverted: data.isConverted ? true : sql`${analyticsSessions.isConverted}`,
            conversionPage: data.conversionPage || sql`${analyticsSessions.conversionPage}`,
          },
        });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Analytics track error:", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
