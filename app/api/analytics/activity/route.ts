import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { callLogs } from "@/shared/schema";
import { eq, and, sql, gte, isNotNull } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const daysParam = parseInt(request.nextUrl.searchParams.get("days") || "30", 10);
    const days = Math.min(365, Math.max(1, isNaN(daysParam) ? 30 : daysParam));
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const directionBreakdown = await db
      .select({
        direction: callLogs.direction,
        count: sql<number>`COUNT(*)`,
        totalMinutes: sql<number>`COALESCE(SUM(${callLogs.duration}), 0) / 60.0`,
        avgDuration: sql<number>`AVG(${callLogs.duration})`,
      })
      .from(callLogs)
      .where(and(
        eq(callLogs.orgId, auth.orgId),
        gte(callLogs.createdAt, startDate)
      ))
      .groupBy(callLogs.direction);

    const formattedDirectionBreakdown = directionBreakdown.map(d => ({
      direction: d.direction,
      count: d.count || 0,
      totalMinutes: d.totalMinutes ? Math.round(d.totalMinutes * 100) / 100 : 0,
      avgDuration: d.avgDuration ? Math.round(d.avgDuration) : 0,
    }));

    const costBreakdown = await db
      .select({
        deploymentModel: callLogs.billedDeploymentModel,
        callCount: sql<number>`COUNT(*)`,
        totalCost: sql<number>`COALESCE(SUM(${callLogs.callCost}::numeric), 0)`,
        avgCostPerCall: sql<number>`AVG(${callLogs.callCost}::numeric)`,
      })
      .from(callLogs)
      .where(and(
        eq(callLogs.orgId, auth.orgId),
        gte(callLogs.createdAt, startDate),
        isNotNull(callLogs.billedDeploymentModel)
      ))
      .groupBy(callLogs.billedDeploymentModel);

    const formattedCostBreakdown = costBreakdown.map(c => ({
      deploymentModel: c.deploymentModel || "unknown",
      callCount: c.callCount || 0,
      totalCost: c.totalCost ? Math.round(c.totalCost * 100) / 100 : 0,
      avgCostPerCall: c.avgCostPerCall ? Math.round(c.avgCostPerCall * 100) / 100 : 0,
    }));

    const [leadData] = await db
      .select({
        totalCalls: sql<number>`COUNT(*)`,
        totalLeads: sql<number>`SUM(CASE WHEN ${callLogs.leadCaptured} = true THEN 1 ELSE 0 END)`,
        leadsWithEmail: sql<number>`SUM(CASE WHEN ${callLogs.leadEmail} IS NOT NULL AND ${callLogs.leadEmail} != '' THEN 1 ELSE 0 END)`,
        leadsWithPhone: sql<number>`SUM(CASE WHEN ${callLogs.leadPhone} IS NOT NULL AND ${callLogs.leadPhone} != '' THEN 1 ELSE 0 END)`,
      })
      .from(callLogs)
      .where(and(
        eq(callLogs.orgId, auth.orgId),
        gte(callLogs.createdAt, startDate)
      ));

    const totalLeads = leadData.totalLeads || 0;
    const totalCallsForLeads = leadData.totalCalls || 0;

    const leadMetrics = {
      totalLeads,
      conversionRate: totalCallsForLeads > 0 ? Math.round((totalLeads / totalCallsForLeads) * 10000) / 100 : 0,
      leadsWithEmail: leadData.leadsWithEmail || 0,
      leadsWithPhone: leadData.leadsWithPhone || 0,
    };

    const outcomeRows = await db
      .select({
        outcome: callLogs.finalOutcome,
        count: sql<number>`COUNT(*)`,
      })
      .from(callLogs)
      .where(and(
        eq(callLogs.orgId, auth.orgId),
        gte(callLogs.createdAt, startDate),
        isNotNull(callLogs.finalOutcome)
      ))
      .groupBy(callLogs.finalOutcome);

    const outcomeTotal = outcomeRows.reduce((sum, r) => sum + (r.count || 0), 0);
    const outcomeDistribution = outcomeRows.map(r => ({
      outcome: r.outcome || "unknown",
      count: r.count || 0,
      percentage: outcomeTotal > 0 ? Math.round(((r.count || 0) / outcomeTotal) * 10000) / 100 : 0,
    }));

    const [summaryData] = await db
      .select({
        totalCalls: sql<number>`COUNT(*)`,
        totalCost: sql<number>`COALESCE(SUM(${callLogs.callCost}::numeric), 0)`,
        totalLeads: sql<number>`SUM(CASE WHEN ${callLogs.leadCaptured} = true THEN 1 ELSE 0 END)`,
        totalMinutes: sql<number>`COALESCE(SUM(${callLogs.duration}), 0) / 60.0`,
      })
      .from(callLogs)
      .where(and(
        eq(callLogs.orgId, auth.orgId),
        gte(callLogs.createdAt, startDate)
      ));

    const totalMinutes = summaryData.totalMinutes || 0;

    return NextResponse.json({
      directionBreakdown: formattedDirectionBreakdown,
      costBreakdown: formattedCostBreakdown,
      leadMetrics,
      outcomeDistribution,
      summary: {
        totalCalls: summaryData.totalCalls || 0,
        totalCost: summaryData.totalCost ? Math.round(summaryData.totalCost * 100) / 100 : 0,
        totalLeads: summaryData.totalLeads || 0,
        avgCostPerMinute: totalMinutes > 0 ? Math.round(((summaryData.totalCost || 0) / totalMinutes) * 100) / 100 : 0,
      },
    });
  } catch (error) {
    console.error("Activity analytics error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
