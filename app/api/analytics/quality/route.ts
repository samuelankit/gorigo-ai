import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { callLogs } from "@/shared/schema";
import { eq, and, sql, gte } from "drizzle-orm";
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

    const [overall] = await db
      .select({
        avgScore: sql<number>`AVG(${callLogs.qualityScore})`,
        avgCsat: sql<number>`AVG(${callLogs.csatPrediction})`,
        totalCalls: sql<number>`COUNT(*)`,
        scoredCalls: sql<number>`COUNT(${callLogs.qualityScore})`,
        avgGreeting: sql<number>`AVG((${callLogs.qualityBreakdown}->>'greeting')::numeric)`,
        avgUnderstanding: sql<number>`AVG((${callLogs.qualityBreakdown}->>'understanding')::numeric)`,
        avgAccuracy: sql<number>`AVG((${callLogs.qualityBreakdown}->>'accuracy')::numeric)`,
        avgProfessionalism: sql<number>`AVG((${callLogs.qualityBreakdown}->>'professionalism')::numeric)`,
        avgResolution: sql<number>`AVG((${callLogs.qualityBreakdown}->>'resolution')::numeric)`,
        avgEfficiency: sql<number>`AVG((${callLogs.qualityBreakdown}->>'efficiency')::numeric)`,
      })
      .from(callLogs)
      .where(and(
        eq(callLogs.orgId, auth.orgId),
        gte(callLogs.createdAt, thirtyDaysAgo)
      ));

    const qualityDistribution = await db
      .select({
        range: sql<string>`CASE
          WHEN ${callLogs.qualityScore} >= 90 THEN 'excellent'
          WHEN ${callLogs.qualityScore} >= 75 THEN 'good'
          WHEN ${callLogs.qualityScore} >= 60 THEN 'average'
          WHEN ${callLogs.qualityScore} >= 40 THEN 'below_average'
          ELSE 'poor'
        END`,
        count: sql<number>`COUNT(*)`,
      })
      .from(callLogs)
      .where(and(
        eq(callLogs.orgId, auth.orgId),
        gte(callLogs.createdAt, thirtyDaysAgo),
        sql`${callLogs.qualityScore} IS NOT NULL`
      ))
      .groupBy(sql`CASE
        WHEN ${callLogs.qualityScore} >= 90 THEN 'excellent'
        WHEN ${callLogs.qualityScore} >= 75 THEN 'good'
        WHEN ${callLogs.qualityScore} >= 60 THEN 'average'
        WHEN ${callLogs.qualityScore} >= 40 THEN 'below_average'
        ELSE 'poor'
      END`);

    const resolutionDistribution = await db
      .select({
        status: callLogs.resolutionStatus,
        count: sql<number>`COUNT(*)`,
      })
      .from(callLogs)
      .where(and(
        eq(callLogs.orgId, auth.orgId),
        gte(callLogs.createdAt, thirtyDaysAgo),
        sql`${callLogs.resolutionStatus} IS NOT NULL`
      ))
      .groupBy(callLogs.resolutionStatus);

    const trend = await db
      .select({
        day: sql<string>`TO_CHAR(${callLogs.createdAt}, 'YYYY-MM-DD')`,
        avgScore: sql<number>`AVG(${callLogs.qualityScore})`,
        avgCsat: sql<number>`AVG(${callLogs.csatPrediction})`,
        callCount: sql<number>`COUNT(*)`,
      })
      .from(callLogs)
      .where(and(
        eq(callLogs.orgId, auth.orgId),
        gte(callLogs.createdAt, thirtyDaysAgo),
        sql`${callLogs.qualityScore} IS NOT NULL`
      ))
      .groupBy(sql`TO_CHAR(${callLogs.createdAt}, 'YYYY-MM-DD')`)
      .orderBy(sql`TO_CHAR(${callLogs.createdAt}, 'YYYY-MM-DD')`);

    const round = (v: number | null) => v !== null && v !== undefined ? Math.round(v * 100) / 100 : null;

    return NextResponse.json({
      overall: {
        averageScore: round(overall.avgScore),
        averageCsat: round(overall.avgCsat),
        totalCalls: overall.totalCalls,
        scoredCalls: overall.scoredCalls,
      },
      averageBreakdown: {
        greeting: round(overall.avgGreeting),
        understanding: round(overall.avgUnderstanding),
        accuracy: round(overall.avgAccuracy),
        professionalism: round(overall.avgProfessionalism),
        resolution: round(overall.avgResolution),
        efficiency: round(overall.avgEfficiency),
      },
      qualityDistribution,
      resolutionDistribution,
      trend,
    });
  } catch (error) {
    console.error("Quality analytics error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
