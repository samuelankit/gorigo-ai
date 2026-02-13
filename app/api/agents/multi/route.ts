import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agents } from "@/shared/schema";
import { eq, and, asc } from "drizzle-orm";
import { getAuthenticatedUser, requireWriteAccess } from "@/lib/get-user";
import { generalLimiter } from "@/lib/rate-limit";
import { checkBodySize, BODY_LIMITS } from "@/lib/body-limit";

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
      .where(eq(agents.orgId, auth.orgId))
      .orderBy(asc(agents.displayOrder), asc(agents.id));

    const routerAgent = orgAgents.find((a) => a.isRouter);
    const specialistAgents = orgAgents.filter((a) => !a.isRouter);

    return NextResponse.json({
      agents: orgAgents,
      routerAgent: routerAgent || null,
      specialistAgents,
      totalAgents: orgAgents.length,
    });
  } catch (error) {
    console.error("Get multi-agents error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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
    const { name, agentType, departmentName, isRouter, systemPrompt, greeting, businessDescription, roles, language, voiceName, speechModel } = body;

    if (!name || typeof name !== "string" || name.trim().length < 1) {
      return NextResponse.json({ error: "Agent name is required" }, { status: 400 });
    }

    const existing = await db
      .select()
      .from(agents)
      .where(eq(agents.orgId, auth.orgId));

    if (isRouter) {
      const existingRouter = existing.find((a) => a.isRouter);
      if (existingRouter) {
        return NextResponse.json({ error: "Only one router agent allowed per organization" }, { status: 400 });
      }
    }

    const maxOrder = existing.reduce((max, a) => Math.max(max, a.displayOrder ?? 0), 0);

    const [newAgent] = await db
      .insert(agents)
      .values({
        userId: auth.user.id,
        orgId: auth.orgId,
        name: name.trim(),
        agentType: agentType || "general",
        departmentName: departmentName || null,
        isRouter: isRouter || false,
        systemPrompt: systemPrompt || null,
        greeting: greeting || "Hello! How can I help you today?",
        businessDescription: businessDescription || "",
        roles: roles || "specialist",
        faqEntries: [],
        complianceDisclosure: true,
        displayOrder: maxOrder + 1,
        status: "active",
        language: language || "en-GB",
        voiceName: voiceName || "Polly.Amy",
        speechModel: speechModel || "default",
      })
      .returning();

    return NextResponse.json({ agent: newAgent }, { status: 201 });
  } catch (error) {
    console.error("Create agent error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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
    const { id, ...updates } = body;

    if (!id || typeof id !== "number") {
      return NextResponse.json({ error: "Agent ID is required" }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(agents)
      .where(and(eq(agents.id, id), eq(agents.orgId, auth.orgId)))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    if (updates.isRouter && !existing.isRouter) {
      const orgAgents = await db
        .select()
        .from(agents)
        .where(eq(agents.orgId, auth.orgId));
      const otherRouter = orgAgents.find((a) => a.isRouter && a.id !== id);
      if (otherRouter) {
        return NextResponse.json({ error: "Only one router agent allowed" }, { status: 400 });
      }
    }

    const allowedFields = [
      "name", "greeting", "businessDescription", "inboundEnabled", "outboundEnabled",
      "roles", "faqEntries", "handoffNumber", "handoffTrigger", "voicePreference",
      "negotiationEnabled", "negotiationGuardrails", "complianceDisclosure",
      "agentType", "departmentName", "displayOrder", "isRouter", "routingConfig",
      "parentAgentId", "systemPrompt", "escalationRules", "status",
      "handoffEnabled", "handoffTargetType", "handoffTargetValue", "handoffConditions",
      "maxTurns", "confidenceThreshold",
      "language", "voiceName", "speechModel",
    ];

    const sanitized: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in updates) {
        sanitized[key] = updates[key];
      }
    }

    const [updatedAgent] = await db
      .update(agents)
      .set({ ...sanitized, updatedAt: new Date() })
      .where(eq(agents.id, id))
      .returning();

    return NextResponse.json({ agent: updatedAgent });
  } catch (error) {
    console.error("Update agent error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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
      return NextResponse.json({ error: "Agent ID is required" }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(agents)
      .where(and(eq(agents.id, id), eq(agents.orgId, auth.orgId)))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const orgAgents = await db
      .select()
      .from(agents)
      .where(eq(agents.orgId, auth.orgId));

    if (orgAgents.length <= 1) {
      return NextResponse.json({ error: "Cannot delete the last agent" }, { status: 400 });
    }

    await db
      .update(agents)
      .set({ status: "deleted", updatedAt: new Date() })
      .where(eq(agents.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete agent error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
