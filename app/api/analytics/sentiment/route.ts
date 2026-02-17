import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { callLogs } from "@/shared/schema";
import { eq, and, sql, gte } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";
import { settingsLimiter } from "@/lib/rate-limit";

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
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - days);

    const distribution = await db
      .select({
        label: callLogs.sentimentLabel,
        count: sql<number>`COUNT(*)`,
        avgScore: sql<number>`AVG(${callLogs.sentimentScore})`,
      })
      .from(callLogs)
      .where(and(
        eq(callLogs.orgId, auth.orgId),
        gte(callLogs.createdAt, thirtyDaysAgo),
        sql`${callLogs.sentimentLabel} IS NOT NULL`
      ))
      .groupBy(callLogs.sentimentLabel);

    const trend = await db
      .select({
        day: sql<string>`TO_CHAR(${callLogs.createdAt}, 'YYYY-MM-DD')`,
        avgScore: sql<number>`AVG(${callLogs.sentimentScore})`,
        callCount: sql<number>`COUNT(*)`,
      })
      .from(callLogs)
      .where(and(
        eq(callLogs.orgId, auth.orgId),
        gte(callLogs.createdAt, thirtyDaysAgo),
        sql`${callLogs.sentimentScore} IS NOT NULL`
      ))
      .groupBy(sql`TO_CHAR(${callLogs.createdAt}, 'YYYY-MM-DD')`)
      .orderBy(sql`TO_CHAR(${callLogs.createdAt}, 'YYYY-MM-DD')`);

    const [overall] = await db
      .select({
        avgScore: sql<number>`AVG(${callLogs.sentimentScore})`,
        totalCalls: sql<number>`COUNT(*)`,
        analyzedCalls: sql<number>`COUNT(${callLogs.sentimentScore})`,
      })
      .from(callLogs)
      .where(and(
        eq(callLogs.orgId, auth.orgId),
        gte(callLogs.createdAt, thirtyDaysAgo)
      ));

    return NextResponse.json({
      distribution,
      trend,
      overall: {
        averageScore: overall.avgScore ? Math.round(overall.avgScore * 100) / 100 : null,
        totalCalls: overall.totalCalls,
        analyzedCalls: overall.analyzedCalls,
      },
    });
  } catch (error) {
    console.error("Sentiment analytics error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
