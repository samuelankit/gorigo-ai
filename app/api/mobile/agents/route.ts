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
    const search = searchParams.get("search")?.trim() || "";

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
        greeting: agents.greeting,
        voiceName: agents.voiceName,
        inboundEnabled: agents.inboundEnabled,
        outboundEnabled: agents.outboundEnabled,
        createdAt: agents.createdAt,
        callCount: callCountSubquery.callCount,
      })
      .from(agents)
      .leftJoin(callCountSubquery, eq(agents.id, callCountSubquery.agentId))
      .where(
        search
          ? and(eq(agents.orgId, auth.orgId), sql`${agents.name} ILIKE ${"%" + search + "%"}`)
          : eq(agents.orgId, auth.orgId)
      )
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

export async function POST(request: NextRequest) {
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
    const { name, agentType, language, greeting, enabled } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Agent name is required" }, { status: 400 });
    }

    const [newAgent] = await db
      .insert(agents)
      .values({
        userId: auth.userId,
        orgId: auth.orgId,
        name: name.trim(),
        agentType: agentType || "general",
        language: language || "en-GB",
        greeting: greeting || "Hello, thank you for calling. How can I help you today?",
        status: enabled === false ? "inactive" : "active",
      })
      .returning();

    return NextResponse.json({ agent: newAgent }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "MobileAgentCreate");
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
    const { id, enabled, name, agentType, language, greeting } = body;

    if (!id) {
      return NextResponse.json({ error: "Agent ID is required" }, { status: 400 });
    }

    const [agent] = await db
      .select({ id: agents.id, orgId: agents.orgId })
      .from(agents)
      .where(and(eq(agents.id, id), eq(agents.orgId, auth.orgId)))
      .limit(1);

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const updates: Record<string, any> = {};
    if (typeof enabled === "boolean") {
      updates.status = enabled ? "active" : "inactive";
    }
    if (typeof name === "string" && name.trim().length > 0) {
      updates.name = name.trim();
    }
    if (typeof agentType === "string") {
      updates.agentType = agentType;
    }
    if (typeof language === "string") {
      updates.language = language;
    }
    if (typeof greeting === "string") {
      updates.greeting = greeting;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    await db
      .update(agents)
      .set(updates)
      .where(and(eq(agents.id, id), eq(agents.orgId, auth.orgId)));

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError(error, "MobileAgentUpdate");
  }
}
