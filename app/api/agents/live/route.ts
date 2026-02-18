import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/get-user";
import { db } from "@/lib/db";
import { agents, callLogs } from "@/shared/schema";
import { eq, and, not, isNull, sql, inArray, gte } from "drizzle-orm";
import { generalLimiter } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/api-error";

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

    const orgAgents = await db
      .select()
      .from(agents)
      .where(and(eq(agents.orgId, auth.orgId), not(eq(agents.status, "deleted"))));

    const activeCallsByAgent = await db
      .select({
        agentId: callLogs.agentId,
        activeCount: sql<number>`count(*)::int`,
        oldestStartedAt: sql<string>`MIN(${callLogs.startedAt})::text`,
      })
      .from(callLogs)
      .where(
        and(
          eq(callLogs.orgId, auth.orgId),
          isNull(callLogs.endedAt),
          not(inArray(callLogs.status, terminalStatuses))
        )
      )
      .groupBy(callLogs.agentId);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayStatsByAgent = await db
      .select({
        agentId: callLogs.agentId,
        callsToday: sql<number>`count(*)::int`,
        minutesToday: sql<number>`COALESCE(SUM(${callLogs.duration}) / 60.0, 0)::float`,
        avgQuality: sql<number>`COALESCE(AVG(CASE WHEN ${callLogs.qualityScore} IS NOT NULL THEN ${callLogs.qualityScore}::float END), 0)::float`,
        lastCallAt: sql<string>`MAX(${callLogs.createdAt})::text`,
      })
      .from(callLogs)
      .where(
        and(
          eq(callLogs.orgId, auth.orgId),
          gte(callLogs.createdAt, todayStart)
        )
      )
      .groupBy(callLogs.agentId);

    const activeMap = new Map(activeCallsByAgent.map(a => [a.agentId, a]));
    const todayMap = new Map(todayStatsByAgent.map(a => [a.agentId, a]));

    const agentLiveStatus = orgAgents.map(agent => {
      const active = activeMap.get(agent.id);
      const today = todayMap.get(agent.id);
      return {
        id: agent.id,
        name: agent.name,
        agentType: agent.agentType,
        departmentName: agent.departmentName,
        isRouter: agent.isRouter,
        status: agent.status,
        activeCalls: active?.activeCount ?? 0,
        isOnCall: (active?.activeCount ?? 0) > 0,
        oldestActiveCallStart: active?.oldestStartedAt ?? null,
        callsToday: today?.callsToday ?? 0,
        minutesToday: Math.round((today?.minutesToday ?? 0) * 10) / 10,
        avgQualityToday: Math.round(today?.avgQuality ?? 0),
        lastCallAt: today?.lastCallAt ?? null,
        inboundEnabled: agent.inboundEnabled,
        outboundEnabled: agent.outboundEnabled,
      };
    });

    const summary = {
      totalAgents: orgAgents.length,
      agentsOnCall: agentLiveStatus.filter(a => a.isOnCall).length,
      agentsIdle: agentLiveStatus.filter(a => !a.isOnCall && a.status === "active").length,
      agentsPaused: agentLiveStatus.filter(a => a.status === "paused").length,
      totalActiveCalls: agentLiveStatus.reduce((sum, a) => sum + a.activeCalls, 0),
    };

    return NextResponse.json({
      agents: agentLiveStatus,
      summary,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return handleRouteError(error, "AgentLive");
  }
}
