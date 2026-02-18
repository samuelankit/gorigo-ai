import { db } from "@/lib/db";
import { callLogs, agents } from "@/shared/schema";
import { eq, and, sql, gte, lte, count, avg, desc } from "drizzle-orm";
import { getAuthenticatedUser, requireSuperAdmin } from "@/lib/get-user";
import { NextRequest, NextResponse } from "next/server";
import { adminLimiter } from "@/lib/rate-limit";

import { handleRouteError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  try {
    const rl = await adminLimiter(request);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    const auth = await getAuthenticatedUser();
    const access = requireSuperAdmin(auth);
    if (!access.allowed) return NextResponse.json({ error: access.error }, { status: 403 });

    const { agentId } = await params;
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("orgId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (!orgId) return NextResponse.json({ error: "orgId is required" }, { status: 400 });

    const [agent] = await db
      .select()
      .from(agents)
      .where(and(eq(agents.id, parseInt(agentId)), eq(agents.orgId, parseInt(orgId))))
      .limit(1);

    if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

    const conditions: any[] = [
      eq(callLogs.agentId, parseInt(agentId)),
      eq(callLogs.orgId, parseInt(orgId)),
    ];
    if (from) conditions.push(gte(callLogs.createdAt, new Date(from)));
    if (to) conditions.push(lte(callLogs.createdAt, new Date(to)));

    const whereClause = and(...conditions);

    const [summary] = await db
      .select({
        totalCalls: count(),
        avgHandleTime: avg(callLogs.duration),
        avgQuality: avg(callLogs.qualityScore),
        avgSentiment: avg(callLogs.sentimentScore),
        avgCsat: avg(callLogs.csatPrediction),
        completedCalls: sql<number>`count(*) FILTER (WHERE ${callLogs.status} = 'completed')::int`,
        handoffCalls: sql<number>`count(*) FILTER (WHERE ${callLogs.handoffTriggered} = true)::int`,
        resolvedCalls: sql<number>`count(*) FILTER (WHERE ${callLogs.resolutionStatus} = 'resolved')::int`,
      })
      .from(callLogs)
      .where(whereClause);

    const dailyTrends = await db
      .select({
        date: sql<string>`TO_CHAR(${callLogs.createdAt}, 'YYYY-MM-DD')`,
        callCount: count(),
        avgQuality: avg(callLogs.qualityScore),
        avgSentiment: avg(callLogs.sentimentScore),
      })
      .from(callLogs)
      .where(whereClause)
      .groupBy(sql`TO_CHAR(${callLogs.createdAt}, 'YYYY-MM-DD')`)
      .orderBy(sql`TO_CHAR(${callLogs.createdAt}, 'YYYY-MM-DD')`);

    const recentCalls = await db
      .select({
        id: callLogs.id,
        callerNumber: callLogs.callerNumber,
        direction: callLogs.direction,
        duration: callLogs.duration,
        status: callLogs.status,
        qualityScore: callLogs.qualityScore,
        sentimentScore: callLogs.sentimentScore,
        resolutionStatus: callLogs.resolutionStatus,
        createdAt: callLogs.createdAt,
      })
      .from(callLogs)
      .where(whereClause)
      .orderBy(desc(callLogs.createdAt))
      .limit(20);

    return NextResponse.json({
      agent: {
        id: agent.id,
        name: agent.name,
        status: agent.status,
        agentType: agent.agentType,
      },
      summary: {
        totalCalls: Number(summary.totalCalls),
        avgHandleTime: summary.avgHandleTime ? Math.round(Number(summary.avgHandleTime)) : null,
        avgQuality: summary.avgQuality ? Math.round(Number(summary.avgQuality) * 100) / 100 : null,
        avgSentiment: summary.avgSentiment ? Math.round(Number(summary.avgSentiment) * 100) / 100 : null,
        avgCsat: summary.avgCsat ? Math.round(Number(summary.avgCsat) * 100) / 100 : null,
        completedCalls: summary.completedCalls,
        handoffCalls: summary.handoffCalls,
        resolvedCalls: summary.resolvedCalls,
        handoffRate: summary.totalCalls > 0 ? Math.round((summary.handoffCalls / Number(summary.totalCalls)) * 10000) / 100 : 0,
        resolutionRate: summary.totalCalls > 0 ? Math.round((summary.resolvedCalls / Number(summary.totalCalls)) * 10000) / 100 : 0,
      },
      dailyTrends: dailyTrends.map((d) => ({
        date: d.date,
        callCount: Number(d.callCount),
        avgQuality: d.avgQuality ? Math.round(Number(d.avgQuality) * 100) / 100 : null,
        avgSentiment: d.avgSentiment ? Math.round(Number(d.avgSentiment) * 100) / 100 : null,
      })),
      recentCalls,
    });
  } catch (error) {
    return handleRouteError(error, "AgentScorecard");
  }
}
