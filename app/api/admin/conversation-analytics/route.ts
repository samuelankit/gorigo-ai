import { db } from "@/lib/db";
import { callLogs } from "@/shared/schema";
import { eq, and, sql, gte, lte, count, avg } from "drizzle-orm";
import { getAuthenticatedUser, requireSuperAdmin } from "@/lib/get-user";
import { NextRequest, NextResponse } from "next/server";
import { adminLimiter } from "@/lib/rate-limit";

import { handleRouteError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const rl = await adminLimiter(request);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    const auth = await getAuthenticatedUser();
    const access = requireSuperAdmin(auth);
    if (!access.allowed) return NextResponse.json({ error: access.error }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("orgId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (!orgId) return NextResponse.json({ error: "orgId is required" }, { status: 400 });

    const conditions: any[] = [eq(callLogs.orgId, parseInt(orgId))];
    if (from) conditions.push(gte(callLogs.createdAt, new Date(from)));
    if (to) conditions.push(lte(callLogs.createdAt, new Date(to)));

    const whereClause = and(...conditions);

    const [overview] = await db
      .select({
        totalCalls: count(),
        avgSentiment: avg(callLogs.sentimentScore),
        avgQuality: avg(callLogs.qualityScore),
        avgDuration: avg(callLogs.duration),
        avgCsat: avg(callLogs.csatPrediction),
        completedCalls: sql<number>`count(*) FILTER (WHERE ${callLogs.status} = 'completed')::int`,
        handoffCalls: sql<number>`count(*) FILTER (WHERE ${callLogs.handoffTriggered} = true)::int`,
        resolvedCalls: sql<number>`count(*) FILTER (WHERE ${callLogs.resolutionStatus} = 'resolved')::int`,
      })
      .from(callLogs)
      .where(whereClause);

    const resolutionRate = overview.totalCalls > 0
      ? Math.round((overview.resolvedCalls / overview.totalCalls) * 10000) / 100
      : 0;

    const volumeTrends = await db
      .select({
        date: sql<string>`TO_CHAR(${callLogs.createdAt}, 'YYYY-MM-DD')`,
        total: count(),
        completed: sql<number>`count(*) FILTER (WHERE ${callLogs.status} = 'completed')::int`,
        handoffs: sql<number>`count(*) FILTER (WHERE ${callLogs.handoffTriggered} = true)::int`,
      })
      .from(callLogs)
      .where(whereClause)
      .groupBy(sql`TO_CHAR(${callLogs.createdAt}, 'YYYY-MM-DD')`)
      .orderBy(sql`TO_CHAR(${callLogs.createdAt}, 'YYYY-MM-DD')`);

    return NextResponse.json({
      overview: {
        totalCalls: overview.totalCalls,
        avgSentiment: overview.avgSentiment ? Math.round(Number(overview.avgSentiment) * 100) / 100 : null,
        avgQuality: overview.avgQuality ? Math.round(Number(overview.avgQuality) * 100) / 100 : null,
        avgDuration: overview.avgDuration ? Math.round(Number(overview.avgDuration)) : null,
        avgCsat: overview.avgCsat ? Math.round(Number(overview.avgCsat) * 100) / 100 : null,
        completedCalls: overview.completedCalls,
        handoffCalls: overview.handoffCalls,
        resolutionRate,
      },
      volumeTrends: volumeTrends.map((v) => ({
        date: v.date,
        total: Number(v.total),
        completed: v.completed,
        handoffs: v.handoffs,
      })),
    });
  } catch (error) {
    return handleRouteError(error, "ConversationAnalytics");
  }
}
