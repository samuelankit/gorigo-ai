import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { callLogs, agents } from "@/shared/schema";
import { eq, and, sql, gte } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";
import { settingsLimiter } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/api-error";

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

    const orgAgents = await db
      .select({ id: agents.id, name: agents.name })
      .from(agents)
      .where(eq(agents.orgId, auth.orgId));

    const agentMetrics = await db
      .select({
        agentId: callLogs.agentId,
        totalCalls: sql<number>`COUNT(*)`,
        avgDuration: sql<number>`AVG(${callLogs.duration})`,
        avgQuality: sql<number>`AVG(${callLogs.qualityScore})`,
        avgSentiment: sql<number>`AVG(${callLogs.sentimentScore})`,
        avgCsat: sql<number>`AVG(${callLogs.csatPrediction})`,
        avgTurns: sql<number>`AVG(${callLogs.turnCount})`,
        resolvedCalls: sql<number>`SUM(CASE WHEN ${callLogs.resolutionStatus} = 'resolved' THEN 1 ELSE 0 END)`,
        escalatedCalls: sql<number>`SUM(CASE WHEN ${callLogs.handoffTriggered} = true THEN 1 ELSE 0 END)`,
      })
      .from(callLogs)
      .where(and(
        eq(callLogs.orgId, auth.orgId),
        gte(callLogs.createdAt, thirtyDaysAgo)
      ))
      .groupBy(callLogs.agentId);

    const performance = orgAgents.map(agent => {
      const metrics = agentMetrics.find(m => m.agentId === agent.id);
      return {
        agentId: agent.id,
        agentName: agent.name,
        totalCalls: metrics?.totalCalls || 0,
        avgHandleTime: metrics?.avgDuration ? Math.round(metrics.avgDuration) : 0,
        avgQualityScore: metrics?.avgQuality ? Math.round(metrics.avgQuality) : 0,
        avgSentimentScore: metrics?.avgSentiment ? Math.round((metrics.avgSentiment || 0) * 100) / 100 : 0,
        avgCsatPrediction: metrics?.avgCsat ? Math.round((metrics.avgCsat || 0) * 10) / 10 : 0,
        avgTurns: metrics?.avgTurns ? Math.round((metrics.avgTurns || 0) * 10) / 10 : 0,
        resolutionRate: metrics?.totalCalls && metrics.totalCalls > 0 ? Math.round(((metrics.resolvedCalls || 0) / metrics.totalCalls) * 100) : 0,
        escalationRate: metrics?.totalCalls && metrics.totalCalls > 0 ? Math.round(((metrics.escalatedCalls || 0) / metrics.totalCalls) * 100) : 0,
      };
    });

    const [orgTotals] = await db
      .select({
        totalCalls: sql<number>`COUNT(*)`,
        avgDuration: sql<number>`AVG(${callLogs.duration})`,
        avgQuality: sql<number>`AVG(${callLogs.qualityScore})`,
        avgSentiment: sql<number>`AVG(${callLogs.sentimentScore})`,
      })
      .from(callLogs)
      .where(and(
        eq(callLogs.orgId, auth.orgId),
        gte(callLogs.createdAt, thirtyDaysAgo)
      ));

    return NextResponse.json({
      agents: performance,
      orgSummary: {
        totalCalls: orgTotals.totalCalls || 0,
        avgHandleTime: orgTotals.avgDuration ? Math.round(orgTotals.avgDuration) : 0,
        avgQualityScore: orgTotals.avgQuality ? Math.round(orgTotals.avgQuality) : 0,
        avgSentimentScore: orgTotals.avgSentiment ? Math.round((orgTotals.avgSentiment || 0) * 100) / 100 : 0,
      },
    });
  } catch (error) {
    return handleRouteError(error, "AnalyticsAgentPerf");
  }
}
