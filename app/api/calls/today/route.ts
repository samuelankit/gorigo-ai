import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/get-user";
import { db } from "@/lib/db";
import { callLogs } from "@/shared/schema";
import { eq, and, gte, sql } from "drizzle-orm";
import { generalLimiter } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  try {
    const rl = await generalLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    const auth = await getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (!auth.orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [stats] = await db
      .select({
        totalToday: sql<number>`count(*)::int`,
        completedToday: sql<number>`SUM(CASE WHEN ${callLogs.status} = 'completed' THEN 1 ELSE 0 END)::int`,
        activeNow: sql<number>`SUM(CASE WHEN ${callLogs.currentState} NOT IN ('CLOSING', 'GREETING') AND ${callLogs.endedAt} IS NULL AND ${callLogs.startedAt} IS NOT NULL THEN 1 ELSE 0 END)::int`,
        failedToday: sql<number>`SUM(CASE WHEN ${callLogs.status} IN ('failed', 'error', 'no-answer') THEN 1 ELSE 0 END)::int`,
        totalMinutesToday: sql<number>`COALESCE(SUM(${callLogs.duration}) / 60.0, 0)::float`,
        leadsToday: sql<number>`SUM(CASE WHEN ${callLogs.leadCaptured} THEN 1 ELSE 0 END)::int`,
      })
      .from(callLogs)
      .where(
        and(
          eq(callLogs.orgId, auth.orgId),
          gte(callLogs.createdAt, todayStart)
        )
      );

    return NextResponse.json({
      totalToday: stats?.totalToday ?? 0,
      completedToday: stats?.completedToday ?? 0,
      activeNow: stats?.activeNow ?? 0,
      failedToday: stats?.failedToday ?? 0,
      totalMinutesToday: Math.round((stats?.totalMinutesToday ?? 0) * 10) / 10,
      leadsToday: stats?.leadsToday ?? 0,
    });
  } catch (error) {
    console.error("Today stats error:", error);
    return NextResponse.json({ error: "Failed to load today's stats" }, { status: 500 });
  }
}
