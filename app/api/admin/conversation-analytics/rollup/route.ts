import { db } from "@/lib/db";
import { callLogs, callAnalyticsRollups } from "@/shared/schema";
import { eq, and, sql, gte, lte, count, avg, sum } from "drizzle-orm";
import { getAuthenticatedUser, requireSuperAdmin } from "@/lib/get-user";
import { NextRequest, NextResponse } from "next/server";
import { adminLimiter } from "@/lib/rate-limit";

import { handleRouteError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const rl = await adminLimiter(request);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    const auth = await getAuthenticatedUser();
    const access = requireSuperAdmin(auth);
    if (!access.allowed) return NextResponse.json({ error: access.error }, { status: 403 });

    const body = await request.json();
    const { orgId, period } = body;

    if (!orgId || !period) {
      return NextResponse.json({ error: "orgId and period are required" }, { status: 400 });
    }

    const now = new Date();
    let periodStart: Date;
    let periodEnd: Date;

    if (period === "daily") {
      periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      periodEnd = new Date(periodStart.getTime() + 24 * 60 * 60 * 1000);
    } else if (period === "weekly") {
      const dayOfWeek = now.getDay();
      periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
      periodEnd = new Date(periodStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    } else if (period === "monthly") {
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    } else {
      return NextResponse.json({ error: "period must be daily, weekly, or monthly" }, { status: 400 });
    }

    const conditions = [
      eq(callLogs.orgId, orgId),
      gte(callLogs.createdAt, periodStart),
      lte(callLogs.createdAt, periodEnd),
    ];

    const [metrics] = await db
      .select({
        totalCalls: count(),
        completedCalls: sql<number>`count(*) FILTER (WHERE ${callLogs.status} = 'completed')::int`,
        handoffCalls: sql<number>`count(*) FILTER (WHERE ${callLogs.handoffTriggered} = true)::int`,
        avgDuration: avg(callLogs.duration),
        avgSentiment: avg(callLogs.sentimentScore),
        avgQuality: avg(callLogs.qualityScore),
        avgCsat: avg(callLogs.csatPrediction),
        resolvedCalls: sql<number>`count(*) FILTER (WHERE ${callLogs.resolutionStatus} = 'resolved')::int`,
        totalCost: sum(callLogs.callCost),
      })
      .from(callLogs)
      .where(and(...conditions));

    const resolutionRate = metrics.totalCalls > 0
      ? Math.round((metrics.resolvedCalls / metrics.totalCalls) * 10000) / 100
      : 0;

    const topAgentsResult = await db
      .select({
        agentId: callLogs.agentId,
        callCount: count(),
        avgQuality: avg(callLogs.qualityScore),
      })
      .from(callLogs)
      .where(and(...conditions))
      .groupBy(callLogs.agentId)
      .orderBy(sql`count(*) DESC`)
      .limit(10);

    const [rollup] = await db
      .insert(callAnalyticsRollups)
      .values({
        orgId,
        period,
        periodStart,
        totalCalls: metrics.totalCalls,
        completedCalls: metrics.completedCalls,
        handoffCalls: metrics.handoffCalls,
        avgDuration: metrics.avgDuration ? String(Math.round(Number(metrics.avgDuration) * 100) / 100) : null,
        avgSentiment: metrics.avgSentiment ? String(Math.round(Number(metrics.avgSentiment) * 100) / 100) : null,
        avgQuality: metrics.avgQuality ? String(Math.round(Number(metrics.avgQuality) * 100) / 100) : null,
        avgCsat: metrics.avgCsat ? String(Math.round(Number(metrics.avgCsat) * 100) / 100) : null,
        resolutionRate: String(resolutionRate),
        topTopics: [],
        topAgents: topAgentsResult.map((a) => ({
          agentId: a.agentId,
          callCount: Number(a.callCount),
          avgQuality: a.avgQuality ? Math.round(Number(a.avgQuality) * 100) / 100 : null,
        })),
        totalCost: metrics.totalCost ? String(Math.round(Number(metrics.totalCost) * 100) / 100) : "0",
      })
      .returning();

    return NextResponse.json({ rollup }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "AnalyticsRollup");
  }
}
