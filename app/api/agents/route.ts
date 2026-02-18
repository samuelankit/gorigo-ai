import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agents } from "@/shared/schema";
import { eq } from "drizzle-orm";
import { getAuthenticatedUser, requireWriteAccess, requireEmailVerified } from "@/lib/get-user";
import { generalLimiter } from "@/lib/rate-limit";
import { checkBodySize, BODY_LIMITS } from "@/lib/body-limit";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const agentUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  greeting: z.string().max(2000).optional(),
  businessDescription: z.string().max(5000).optional(),
  inboundEnabled: z.boolean().optional(),
  outboundEnabled: z.boolean().optional(),
  roles: z.string().max(500).optional(),
  faqEntries: z.array(z.object({
    question: z.string().max(500),
    answer: z.string().max(2000),
  })).max(100).optional(),
  handoffNumber: z.string().max(20).regex(/^\+?[0-9\s\-()]*$/).optional().nullable(),
  handoffTrigger: z.string().max(100).optional(),
  voicePreference: z.string().max(50).optional(),
  negotiationEnabled: z.boolean().optional(),
  negotiationGuardrails: z.record(z.unknown()).optional().nullable(),
  complianceDisclosure: z.boolean().optional(),
}).strict();

export async function GET() {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (!auth.orgId) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 });
    }

    let [agent] = await db
      .select()
      .from(agents)
      .where(eq(agents.orgId, auth.orgId))
      .limit(1);

    if (!agent) {
      [agent] = await db
        .insert(agents)
        .values({
          userId: auth.user.id,
          orgId: auth.orgId,
          name: "AI Assistant",
          greeting: "Hello! How can I help you today?",
          businessDescription: "",
          inboundEnabled: true,
          outboundEnabled: false,
          roles: "receptionist",
          faqEntries: [],
          complianceDisclosure: true,
        })
        .returning();
    }

    return NextResponse.json({ agent }, { status: 200 });
  } catch (error) {
    console.error("Get agent error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const rl = await generalLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
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

    const emailCheck = requireEmailVerified(auth);
    if (!emailCheck.allowed) {
      return NextResponse.json({ error: emailCheck.error }, { status: emailCheck.status || 403 });
    }

    const body = await request.json();

    const parsed = agentUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.errors }, { status: 400 });
    }

    const [existingAgent] = await db
      .select()
      .from(agents)
      .where(eq(agents.orgId, auth.orgId))
      .limit(1);

    if (!existingAgent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const [updatedAgent] = await db
      .update(agents)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(agents.id, existingAgent.id))
      .returning();

    try {
      await logAudit({
        actorId: auth.user.id,
        actorEmail: auth.user.email,
        action: "agent_update",
        entityType: "agent",
        entityId: updatedAgent.id,
        details: { name: body.name },
      });
    } catch (auditErr) {
      console.error("Audit log error:", auditErr);
    }

    return NextResponse.json({ agent: updatedAgent }, { status: 200 });
  } catch (error) {
    console.error("Update agent error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
