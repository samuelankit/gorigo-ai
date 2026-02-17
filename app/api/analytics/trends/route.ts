import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { callLogs } from "@/shared/schema";
import { eq, and, sql, gte, isNotNull } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";
import { settingsLimiter } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const rl = await settingsLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const daysParam = parseInt(request.nextUrl.searchParams.get("days") || "30", 10);
    const days = Math.min(365, Math.max(1, isNaN(daysParam) ? 30 : daysParam));
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const dailyVolume = await db
      .select({
        day: sql<string>`TO_CHAR(${callLogs.createdAt}, 'YYYY-MM-DD')`,
        total: sql<number>`COUNT(*)`,
        completed: sql<number>`SUM(CASE WHEN ${callLogs.status} = 'completed' THEN 1 ELSE 0 END)`,
        failed: sql<number>`SUM(CASE WHEN ${callLogs.status} = 'failed' THEN 1 ELSE 0 END)`,
        inbound: sql<number>`SUM(CASE WHEN ${callLogs.direction} = 'inbound' THEN 1 ELSE 0 END)`,
        outbound: sql<number>`SUM(CASE WHEN ${callLogs.direction} = 'outbound' THEN 1 ELSE 0 END)`,
      })
      .from(callLogs)
      .where(and(
        eq(callLogs.orgId, auth.orgId),
        gte(callLogs.createdAt, startDate)
      ))
      .groupBy(sql`TO_CHAR(${callLogs.createdAt}, 'YYYY-MM-DD')`)
      .orderBy(sql`TO_CHAR(${callLogs.createdAt}, 'YYYY-MM-DD')`);

    const successRate = dailyVolume.map(d => ({
      day: d.day,
      rate: d.total > 0 ? Math.round(((d.completed || 0) / d.total) * 10000) / 100 : 0,
    }));

    const durationTrend = await db
      .select({
        day: sql<string>`TO_CHAR(${callLogs.createdAt}, 'YYYY-MM-DD')`,
        avgDuration: sql<number>`AVG(${callLogs.duration})`,
        totalMinutes: sql<number>`SUM(${callLogs.duration}) / 60.0`,
      })
      .from(callLogs)
      .where(and(
        eq(callLogs.orgId, auth.orgId),
        gte(callLogs.createdAt, startDate)
      ))
      .groupBy(sql`TO_CHAR(${callLogs.createdAt}, 'YYYY-MM-DD')`)
      .orderBy(sql`TO_CHAR(${callLogs.createdAt}, 'YYYY-MM-DD')`);

    const formattedDurationTrend = durationTrend.map(d => ({
      day: d.day,
      avgDuration: d.avgDuration ? Math.round(d.avgDuration) : 0,
      totalMinutes: d.totalMinutes ? Math.round(d.totalMinutes * 100) / 100 : 0,
    }));

    const peakHours = await db
      .select({
        dayOfWeek: sql<number>`EXTRACT(DOW FROM ${callLogs.startedAt})`,
        hour: sql<number>`EXTRACT(HOUR FROM ${callLogs.startedAt})`,
        count: sql<number>`COUNT(*)`,
      })
      .from(callLogs)
      .where(and(
        eq(callLogs.orgId, auth.orgId),
        gte(callLogs.createdAt, startDate),
        isNotNull(callLogs.startedAt)
      ))
      .groupBy(
        sql`EXTRACT(DOW FROM ${callLogs.startedAt})`,
        sql`EXTRACT(HOUR FROM ${callLogs.startedAt})`
      )
      .orderBy(
        sql`EXTRACT(DOW FROM ${callLogs.startedAt})`,
        sql`EXTRACT(HOUR FROM ${callLogs.startedAt})`
      );

    const [summaryData] = await db
      .select({
        totalCalls: sql<number>`COUNT(*)`,
        completedCalls: sql<number>`SUM(CASE WHEN ${callLogs.status} = 'completed' THEN 1 ELSE 0 END)`,
        failedCalls: sql<number>`SUM(CASE WHEN ${callLogs.status} = 'failed' THEN 1 ELSE 0 END)`,
        avgDuration: sql<number>`AVG(${callLogs.duration})`,
        totalMinutes: sql<number>`SUM(${callLogs.duration}) / 60.0`,
      })
      .from(callLogs)
      .where(and(
        eq(callLogs.orgId, auth.orgId),
        gte(callLogs.createdAt, startDate)
      ));

    const totalCalls = summaryData.totalCalls || 0;
    const completedCalls = summaryData.completedCalls || 0;

    return NextResponse.json({
      dailyVolume,
      successRate,
      durationTrend: formattedDurationTrend,
      peakHours,
      summary: {
        totalCalls,
        completedCalls,
        failedCalls: summaryData.failedCalls || 0,
        avgDuration: summaryData.avgDuration ? Math.round(summaryData.avgDuration) : 0,
        totalMinutes: summaryData.totalMinutes ? Math.round(summaryData.totalMinutes * 100) / 100 : 0,
        successRate: totalCalls > 0 ? Math.round((completedCalls / totalCalls) * 10000) / 100 : 0,
      },
    });
  } catch (error) {
    console.error("Trends analytics error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
