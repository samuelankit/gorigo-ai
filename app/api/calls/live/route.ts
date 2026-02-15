import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/get-user";
import { db } from "@/lib/db";
import { callLogs, agents } from "@/shared/schema";
import { eq, and, gte, isNull, sql, desc, not, inArray } from "drizzle-orm";
import { generalLimiter } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

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

    const terminalStatuses = ["completed", "failed", "canceled", "no-answer", "busy"];

    const activeCalls = await db
      .select({
        id: callLogs.id,
        direction: callLogs.direction,
        callerNumber: callLogs.callerNumber,
        status: callLogs.status,
        currentState: callLogs.currentState,
        startedAt: callLogs.startedAt,
        connectedAt: callLogs.connectedAt,
        agentId: callLogs.agentId,
        turnCount: callLogs.turnCount,
        sentimentScore: callLogs.sentimentScore,
        sentimentLabel: callLogs.sentimentLabel,
        twilioCallSid: callLogs.twilioCallSid,
        handoffTriggered: callLogs.handoffTriggered,
        agentName: agents.name,
        agentType: agents.agentType,
      })
      .from(callLogs)
      .leftJoin(agents, eq(callLogs.agentId, agents.id))
      .where(
        and(
          eq(callLogs.orgId, auth.orgId),
          isNull(callLogs.endedAt),
          not(inArray(callLogs.status, terminalStatuses))
        )
      )
      .orderBy(desc(callLogs.startedAt))
      .limit(50);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [todayStats] = await db
      .select({
        totalToday: sql<number>`count(*)::int`,
        completedToday: sql<number>`SUM(CASE WHEN ${callLogs.status} = 'completed' THEN 1 ELSE 0 END)::int`,
        activeNow: sql<number>`SUM(CASE WHEN ${callLogs.endedAt} IS NULL AND ${callLogs.status} NOT IN ('completed','failed','canceled','no-answer','busy') THEN 1 ELSE 0 END)::int`,
        failedToday: sql<number>`SUM(CASE WHEN ${callLogs.status} IN ('failed', 'no-answer', 'busy') THEN 1 ELSE 0 END)::int`,
        totalMinutesToday: sql<number>`COALESCE(SUM(${callLogs.duration}) / 60.0, 0)::float`,
        avgDurationToday: sql<number>`COALESCE(AVG(CASE WHEN ${callLogs.duration} > 0 THEN ${callLogs.duration} END), 0)::float`,
        avgQualityToday: sql<number>`COALESCE(AVG(CASE WHEN ${callLogs.qualityScore} IS NOT NULL THEN ${callLogs.qualityScore}::float END), 0)::float`,
        inboundToday: sql<number>`SUM(CASE WHEN ${callLogs.direction} = 'inbound' THEN 1 ELSE 0 END)::int`,
        outboundToday: sql<number>`SUM(CASE WHEN ${callLogs.direction} = 'outbound' THEN 1 ELSE 0 END)::int`,
      })
      .from(callLogs)
      .where(
        and(
          eq(callLogs.orgId, auth.orgId),
          gte(callLogs.createdAt, todayStart)
        )
      );

    const recentCompleted = await db
      .select({
        id: callLogs.id,
        direction: callLogs.direction,
        callerNumber: callLogs.callerNumber,
        status: callLogs.status,
        duration: callLogs.duration,
        finalOutcome: callLogs.finalOutcome,
        endedAt: callLogs.endedAt,
        agentName: agents.name,
        qualityScore: callLogs.qualityScore,
        sentimentLabel: callLogs.sentimentLabel,
        leadCaptured: callLogs.leadCaptured,
      })
      .from(callLogs)
      .leftJoin(agents, eq(callLogs.agentId, agents.id))
      .where(
        and(
          eq(callLogs.orgId, auth.orgId),
          gte(callLogs.createdAt, todayStart),
          inArray(callLogs.status, terminalStatuses)
        )
      )
      .orderBy(desc(callLogs.endedAt))
      .limit(10);

    const orgAgents = await db
      .select({
        id: agents.id,
        name: agents.name,
        agentType: agents.agentType,
        status: agents.status,
        activeCalls: sql<number>`COALESCE((
          SELECT COUNT(*)::int FROM call_logs cl
          WHERE cl.agent_id = ${agents.id}
            AND cl.org_id = ${auth.orgId}
            AND cl.ended_at IS NULL
            AND cl.status NOT IN ('completed','failed','canceled','no-answer','busy')
        ), 0)`,
      })
      .from(agents)
      .where(and(eq(agents.orgId, auth.orgId), not(eq(agents.status, "deleted"))));

    const agentStatus = orgAgents.map(agent => ({
      id: agent.id,
      name: agent.name,
      agentType: agent.agentType,
      status: agent.status,
      activeCalls: agent.activeCalls,
      isOnCall: agent.activeCalls > 0,
    }));

    return NextResponse.json({
      activeCalls,
      recentCompleted,
      todayStats: {
        totalToday: todayStats?.totalToday ?? 0,
        completedToday: todayStats?.completedToday ?? 0,
        activeNow: todayStats?.activeNow ?? 0,
        failedToday: todayStats?.failedToday ?? 0,
        totalMinutesToday: Math.round((todayStats?.totalMinutesToday ?? 0) * 10) / 10,
        avgDurationToday: Math.round(todayStats?.avgDurationToday ?? 0),
        avgQualityToday: Math.round(todayStats?.avgQualityToday ?? 0),
        inboundToday: todayStats?.inboundToday ?? 0,
        outboundToday: todayStats?.outboundToday ?? 0,
      },
      agentStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Live calls error:", error);
    return NextResponse.json({ error: "Failed to load live data" }, { status: 500 });
  }
}
