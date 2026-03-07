import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emailEvents } from "@/shared/schema";
import { sql, gte, count, and, inArray } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";
import { generalLimiter } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/api-error";

const DELIVERABILITY_EVENTS = ["delivered", "bounce", "dropped", "spam_report", "deferred"];

export async function GET(request: NextRequest) {
  try {
    const rl = await generalLimiter(request);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const auth = await getAuthenticatedUser();
    if (!auth || auth.globalRole !== "SUPERADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [stats24h] = await db
      .select({
        total: count(),
        delivered: sql<number>`COUNT(*) FILTER (WHERE ${emailEvents.eventType} = 'delivered')`,
        bounced: sql<number>`COUNT(*) FILTER (WHERE ${emailEvents.eventType} = 'bounce')`,
        dropped: sql<number>`COUNT(*) FILTER (WHERE ${emailEvents.eventType} = 'dropped')`,
        spamReports: sql<number>`COUNT(*) FILTER (WHERE ${emailEvents.eventType} = 'spam_report')`,
        deferred: sql<number>`COUNT(*) FILTER (WHERE ${emailEvents.eventType} = 'deferred')`,
      })
      .from(emailEvents)
      .where(and(
        gte(emailEvents.createdAt, last24h),
        inArray(emailEvents.eventType, DELIVERABILITY_EVENTS)
      ));

    const [stats7d] = await db
      .select({
        total: count(),
        delivered: sql<number>`COUNT(*) FILTER (WHERE ${emailEvents.eventType} = 'delivered')`,
        bounced: sql<number>`COUNT(*) FILTER (WHERE ${emailEvents.eventType} = 'bounce')`,
        spamReports: sql<number>`COUNT(*) FILTER (WHERE ${emailEvents.eventType} = 'spam_report')`,
      })
      .from(emailEvents)
      .where(and(
        gte(emailEvents.createdAt, last7d),
        inArray(emailEvents.eventType, DELIVERABILITY_EVENTS)
      ));

    const totalSent24h = stats24h.total || 0;
    const totalSent7d = stats7d.total || 0;

    const bounceRate24h = totalSent24h > 0 ? ((stats24h.bounced || 0) / totalSent24h * 100).toFixed(2) : "0.00";
    const spamRate24h = totalSent24h > 0 ? ((stats24h.spamReports || 0) / totalSent24h * 100).toFixed(2) : "0.00";
    const deliveryRate24h = totalSent24h > 0 ? ((stats24h.delivered || 0) / totalSent24h * 100).toFixed(2) : "0.00";

    const bounceRate7d = totalSent7d > 0 ? ((stats7d.bounced || 0) / totalSent7d * 100).toFixed(2) : "0.00";
    const spamRate7d = totalSent7d > 0 ? ((stats7d.spamReports || 0) / totalSent7d * 100).toFixed(2) : "0.00";

    const recentBounces = await db
      .select({
        email: emailEvents.email,
        reason: emailEvents.reason,
        bounceType: emailEvents.bounceType,
        createdAt: emailEvents.createdAt,
      })
      .from(emailEvents)
      .where(and(
        sql`${emailEvents.eventType} = 'bounce'`,
        gte(emailEvents.createdAt, last7d)
      ))
      .orderBy(sql`${emailEvents.createdAt} DESC`)
      .limit(20);

    let healthStatus: "healthy" | "warning" | "critical" = "healthy";
    if (parseFloat(bounceRate24h) >= 5 || parseFloat(spamRate24h) >= 0.5) {
      healthStatus = "critical";
    } else if (parseFloat(bounceRate24h) >= 2 || parseFloat(spamRate24h) >= 0.1) {
      healthStatus = "warning";
    }

    return NextResponse.json({
      status: healthStatus,
      last24h: {
        totalDeliverabilityEvents: totalSent24h,
        delivered: stats24h.delivered || 0,
        bounced: stats24h.bounced || 0,
        dropped: stats24h.dropped || 0,
        spamReports: stats24h.spamReports || 0,
        deferred: stats24h.deferred || 0,
        bounceRate: `${bounceRate24h}%`,
        spamRate: `${spamRate24h}%`,
        deliveryRate: `${deliveryRate24h}%`,
      },
      last7d: {
        totalDeliverabilityEvents: totalSent7d,
        delivered: stats7d.delivered || 0,
        bounced: stats7d.bounced || 0,
        spamReports: stats7d.spamReports || 0,
        bounceRate: `${bounceRate7d}%`,
        spamRate: `${spamRate7d}%`,
      },
      recentBounces,
      thresholds: {
        bounceRateCritical: "5%",
        bounceRateWarning: "2%",
        spamRateCritical: "0.5%",
        spamRateWarning: "0.1%",
      },
    });
  } catch (err: any) {
    return handleRouteError(err, "EmailHealth");
  }
}
