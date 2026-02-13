import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { callLogs } from "@/shared/schema";
import { eq, and, sql, gte, isNotNull } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const daysParam = parseInt(request.nextUrl.searchParams.get("days") || "30", 10);
    const days = Math.min(365, Math.max(1, isNaN(daysParam) ? 30 : daysParam));
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - days);

    const outcomes = await db
      .select({
        outcome: callLogs.finalOutcome,
        count: sql<number>`COUNT(*)`,
      })
      .from(callLogs)
      .where(and(
        eq(callLogs.orgId, auth.orgId),
        gte(callLogs.createdAt, thirtyDaysAgo),
        isNotNull(callLogs.finalOutcome)
      ))
      .groupBy(callLogs.finalOutcome);

    const directions = await db
      .select({
        direction: callLogs.direction,
        count: sql<number>`COUNT(*)`,
      })
      .from(callLogs)
      .where(and(
        eq(callLogs.orgId, auth.orgId),
        gte(callLogs.createdAt, thirtyDaysAgo)
      ))
      .groupBy(callLogs.direction);

    const resolutions = await db
      .select({
        status: callLogs.resolutionStatus,
        count: sql<number>`COUNT(*)`,
      })
      .from(callLogs)
      .where(and(
        eq(callLogs.orgId, auth.orgId),
        gte(callLogs.createdAt, thirtyDaysAgo),
        isNotNull(callLogs.resolutionStatus)
      ))
      .groupBy(callLogs.resolutionStatus);

    const hourlyVolume = await db
      .select({
        hour: sql<number>`EXTRACT(HOUR FROM ${callLogs.startedAt})`,
        count: sql<number>`COUNT(*)`,
      })
      .from(callLogs)
      .where(and(
        eq(callLogs.orgId, auth.orgId),
        gte(callLogs.createdAt, thirtyDaysAgo),
        isNotNull(callLogs.startedAt)
      ))
      .groupBy(sql`EXTRACT(HOUR FROM ${callLogs.startedAt})`)
      .orderBy(sql`EXTRACT(HOUR FROM ${callLogs.startedAt})`);

    const [durationStats] = await db
      .select({
        avgDuration: sql<number>`AVG(${callLogs.duration})`,
        maxDuration: sql<number>`MAX(${callLogs.duration})`,
        totalCalls: sql<number>`COUNT(*)`,
        avgTurns: sql<number>`AVG(${callLogs.turnCount})`,
      })
      .from(callLogs)
      .where(and(
        eq(callLogs.orgId, auth.orgId),
        gte(callLogs.createdAt, thirtyDaysAgo)
      ));

    const [handoffStats] = await db
      .select({
        total: sql<number>`COUNT(*)`,
        handoffs: sql<number>`SUM(CASE WHEN ${callLogs.handoffTriggered} = true THEN 1 ELSE 0 END)`,
      })
      .from(callLogs)
      .where(and(
        eq(callLogs.orgId, auth.orgId),
        gte(callLogs.createdAt, thirtyDaysAgo)
      ));

    return NextResponse.json({
      outcomes,
      directions,
      resolutions,
      hourlyVolume,
      stats: {
        avgDuration: durationStats.avgDuration ? Math.round(durationStats.avgDuration) : 0,
        maxDuration: durationStats.maxDuration || 0,
        totalCalls: durationStats.totalCalls || 0,
        avgTurns: durationStats.avgTurns ? Math.round(durationStats.avgTurns * 10) / 10 : 0,
        handoffRate: handoffStats.total > 0 ? Math.round((handoffStats.handoffs / handoffStats.total) * 100) : 0,
      },
    });
  } catch (error) {
    console.error("Intelligence analytics error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
