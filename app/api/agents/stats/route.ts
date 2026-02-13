import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agents, callLogs, callHops, agentFlows } from "@/shared/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";
import { calculateFlowComplexity, type FlowNode, type FlowEdge } from "@/lib/flow-engine";

export async function GET() {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (!auth.orgId) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 });
    }

    const orgAgents = await db
      .select()
      .from(agents)
      .where(eq(agents.orgId, auth.orgId));

    const activeAgents = orgAgents.filter((a) => a.status !== "deleted");

    const agentCallCounts = await db
      .select({
        agentId: callLogs.agentId,
        callCount: sql<number>`count(*)::int`,
        totalDuration: sql<number>`coalesce(sum(${callLogs.duration}), 0)::int`,
      })
      .from(callLogs)
      .where(eq(callLogs.orgId, auth.orgId))
      .groupBy(callLogs.agentId);

    const hopStats = await db
      .select({
        totalHops: sql<number>`count(*)::int`,
        totalHopCost: sql<number>`coalesce(sum(${callHops.hopCost}), 0)`,
      })
      .from(callHops)
      .where(eq(callHops.orgId, auth.orgId));

    const [activeFlow] = await db
      .select()
      .from(agentFlows)
      .where(and(eq(agentFlows.orgId, auth.orgId), eq(agentFlows.isActive, true)))
      .limit(1);

    let flowComplexity = null;
    if (activeFlow) {
      flowComplexity = calculateFlowComplexity({
        nodes: (activeFlow.nodes as FlowNode[]) || [],
        edges: (activeFlow.edges as FlowEdge[]) || [],
      });
    }

    const callCountMap = new Map(agentCallCounts.map((c) => [c.agentId, c]));

    const agentBreakdown = activeAgents.map((agent) => {
      const stats = callCountMap.get(agent.id);
      return {
        id: agent.id,
        name: agent.name,
        agentType: agent.agentType,
        departmentName: agent.departmentName,
        isRouter: agent.isRouter,
        callCount: stats?.callCount || 0,
        totalMinutes: Math.round((stats?.totalDuration || 0) / 60 * 100) / 100,
      };
    });

    return NextResponse.json({
      totalAgents: activeAgents.length,
      agentBreakdown,
      hopStats: {
        totalHops: hopStats[0]?.totalHops || 0,
        totalHopCost: hopStats[0]?.totalHopCost || 0,
      },
      flowComplexity,
      hasActiveFlow: !!activeFlow,
    });
  } catch (error) {
    console.error("Agent stats error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
