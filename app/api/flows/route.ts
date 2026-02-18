import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agentFlows, agents } from "@/shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { getAuthenticatedUser, requireWriteAccess } from "@/lib/get-user";
import { generalLimiter } from "@/lib/rate-limit";
import { checkBodySize, BODY_LIMITS } from "@/lib/body-limit";
import { handleRouteError } from "@/lib/api-error";

export async function GET() {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (!auth.orgId) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 });
    }

    const flows = await db
      .select()
      .from(agentFlows)
      .where(eq(agentFlows.orgId, auth.orgId))
      .orderBy(desc(agentFlows.updatedAt));

    const orgAgents = await db
      .select()
      .from(agents)
      .where(eq(agents.orgId, auth.orgId));

    const activeFlow = flows.find((f) => f.isActive) || null;

    return NextResponse.json({
      flows,
      activeFlow,
      agents: orgAgents.filter((a) => a.status !== "deleted"),
    });
  } catch (error) {
    return handleRouteError(error, "Flows");
  }
}

export async function POST(request: NextRequest) {
  try {
    const rl = await generalLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    const sizeError = checkBodySize(request, BODY_LIMITS.admin);
    if (sizeError) return sizeError;

    const auth = await getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (!auth.orgId) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 });
    }
    const writeCheck = requireWriteAccess(auth);
    if (!writeCheck.allowed) {
      return NextResponse.json({ error: writeCheck.error }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, nodes, edges, entryAgentId, isActive } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Flow name is required" }, { status: 400 });
    }

    if (!Array.isArray(nodes)) {
      return NextResponse.json({ error: "Nodes must be an array" }, { status: 400 });
    }

    if (isActive) {
      await db
        .update(agentFlows)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(agentFlows.orgId, auth.orgId));
    }

    const [flow] = await db
      .insert(agentFlows)
      .values({
        orgId: auth.orgId,
        name: name.trim(),
        description: description || null,
        nodes: nodes || [],
        edges: edges || [],
        entryAgentId: entryAgentId || null,
        isActive: isActive ?? true,
      })
      .returning();

    return NextResponse.json({ flow }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "Flows");
  }
}

export async function PUT(request: NextRequest) {
  try {
    const rl = await generalLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    const sizeError = checkBodySize(request, BODY_LIMITS.admin);
    if (sizeError) return sizeError;

    const auth = await getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (!auth.orgId) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 });
    }
    const writeCheck = requireWriteAccess(auth);
    if (!writeCheck.allowed) {
      return NextResponse.json({ error: writeCheck.error }, { status: 403 });
    }

    const body = await request.json();
    const { id, name, description, nodes, edges, entryAgentId, isActive } = body;

    if (!id || typeof id !== "number") {
      return NextResponse.json({ error: "Flow ID is required" }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(agentFlows)
      .where(and(eq(agentFlows.id, id), eq(agentFlows.orgId, auth.orgId)))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Flow not found" }, { status: 404 });
    }

    if (isActive) {
      await db
        .update(agentFlows)
        .set({ isActive: false, updatedAt: new Date() })
        .where(and(eq(agentFlows.orgId, auth.orgId)));
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date(), version: (existing.version ?? 1) + 1 };
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (nodes !== undefined) updateData.nodes = nodes;
    if (edges !== undefined) updateData.edges = edges;
    if (entryAgentId !== undefined) updateData.entryAgentId = entryAgentId;
    if (isActive !== undefined) updateData.isActive = isActive;

    const [updatedFlow] = await db
      .update(agentFlows)
      .set(updateData)
      .where(eq(agentFlows.id, id))
      .returning();

    return NextResponse.json({ flow: updatedFlow });
  } catch (error) {
    return handleRouteError(error, "Flows");
  }
}

export async function DELETE(request: NextRequest) {
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
      return NextResponse.json({ error: "No organization found" }, { status: 404 });
    }
    const writeCheck = requireWriteAccess(auth);
    if (!writeCheck.allowed) {
      return NextResponse.json({ error: writeCheck.error }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get("id") || "", 10);

    if (!id || isNaN(id)) {
      return NextResponse.json({ error: "Flow ID is required" }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(agentFlows)
      .where(and(eq(agentFlows.id, id), eq(agentFlows.orgId, auth.orgId)))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Flow not found" }, { status: 404 });
    }

    await db.delete(agentFlows).where(eq(agentFlows.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError(error, "Flows");
  }
}
