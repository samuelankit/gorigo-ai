import { db } from "@/lib/db";
import { agents, callLogs } from "@/shared/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";
import { NextRequest, NextResponse } from "next/server";
import { settingsLimiter } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/api-error";

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

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10) || 50, 100);

    const callCountSubquery = db
      .select({
        agentId: callLogs.agentId,
        callCount: sql<number>`count(*)::int`.as("call_count"),
      })
      .from(callLogs)
      .where(eq(callLogs.orgId, auth.orgId))
      .groupBy(callLogs.agentId)
      .as("call_stats");

    const agentsList = await db
      .select({
        id: agents.id,
        name: agents.name,
        roles: agents.roles,
        agentType: agents.agentType,
        status: agents.status,
        language: agents.language,
        voiceName: agents.voiceName,
        inboundEnabled: agents.inboundEnabled,
        outboundEnabled: agents.outboundEnabled,
        createdAt: agents.createdAt,
        callCount: callCountSubquery.callCount,
      })
      .from(agents)
      .leftJoin(callCountSubquery, eq(agents.id, callCountSubquery.agentId))
      .where(eq(agents.orgId, auth.orgId))
      .orderBy(desc(agents.createdAt))
      .limit(limit);

    return NextResponse.json({
      agents: agentsList,
      total: agentsList.length,
    });
  } catch (error) {
    return handleRouteError(error, "MobileAgents");
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const rl = await settingsLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, enabled } = body;

    if (!id || typeof enabled !== "boolean") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const [agent] = await db
      .select({ id: agents.id, orgId: agents.orgId })
      .from(agents)
      .where(and(eq(agents.id, id), eq(agents.orgId, auth.orgId)))
      .limit(1);

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    await db
      .update(agents)
      .set({ status: enabled ? "active" : "inactive" })
      .where(and(eq(agents.id, id), eq(agents.orgId, auth.orgId)));

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError(error, "MobileAgentUpdate");
  }
}
