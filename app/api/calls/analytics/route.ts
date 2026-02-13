import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/get-user";
import { db } from "@/lib/db";
import { callLogs, agents } from "@/shared/schema";
import { eq, sql, and, gte, desc } from "drizzle-orm";

export async function GET() {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (!auth.orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyTrends = await db
      .select({
        date: sql<string>`TO_CHAR(${callLogs.createdAt}, 'YYYY-MM-DD')`,
        callCount: sql<number>`count(*)::int`,
        avgDuration: sql<number>`COALESCE(AVG(${callLogs.duration}), 0)::int`,
        totalMinutes: sql<number>`COALESCE(SUM(${callLogs.duration}) / 60.0, 0)::float`,
      })
      .from(callLogs)
      .where(
        and(
          eq(callLogs.orgId, auth.orgId),
          gte(callLogs.createdAt, thirtyDaysAgo)
        )
      )
      .groupBy(sql`TO_CHAR(${callLogs.createdAt}, 'YYYY-MM-DD')`)
      .orderBy(sql`TO_CHAR(${callLogs.createdAt}, 'YYYY-MM-DD')`);

    const outcomeBreakdown = await db
      .select({
        outcome: sql<string>`COALESCE(${callLogs.finalOutcome}, ${callLogs.status}, 'unknown')`,
        count: sql<number>`count(*)::int`,
      })
      .from(callLogs)
      .where(eq(callLogs.orgId, auth.orgId))
      .groupBy(sql`COALESCE(${callLogs.finalOutcome}, ${callLogs.status}, 'unknown')`);

    const directionBreakdown = await db
      .select({
        direction: callLogs.direction,
        count: sql<number>`count(*)::int`,
      })
      .from(callLogs)
      .where(eq(callLogs.orgId, auth.orgId))
      .groupBy(callLogs.direction);

    const agentPerformance = await db
      .select({
        agentId: callLogs.agentId,
        agentName: agents.name,
        callCount: sql<number>`count(*)::int`,
        avgDuration: sql<number>`COALESCE(AVG(${callLogs.duration}), 0)::int`,
        avgQuality: sql<number>`COALESCE(AVG(${callLogs.qualityScore}), 0)::float`,
        avgSentiment: sql<number>`COALESCE(AVG(${callLogs.sentimentScore}), 0)::float`,
        leadsCapt: sql<number>`SUM(CASE WHEN ${callLogs.leadCaptured} THEN 1 ELSE 0 END)::int`,
      })
      .from(callLogs)
      .leftJoin(agents, eq(callLogs.agentId, agents.id))
      .where(eq(callLogs.orgId, auth.orgId))
      .groupBy(callLogs.agentId, agents.name);

    const sentimentDistribution = await db
      .select({
        label: sql<string>`COALESCE(${callLogs.sentimentLabel}, 'unknown')`,
        count: sql<number>`count(*)::int`,
      })
      .from(callLogs)
      .where(eq(callLogs.orgId, auth.orgId))
      .groupBy(sql`COALESCE(${callLogs.sentimentLabel}, 'unknown')`);

    return NextResponse.json({
      dailyTrends,
      outcomeBreakdown,
      directionBreakdown,
      agentPerformance,
      sentimentDistribution,
    });
  } catch (error) {
    console.error("Call analytics error:", error);
    return NextResponse.json({ error: "Failed to load analytics" }, { status: 500 });
  }
}
