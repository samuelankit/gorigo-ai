import { db } from "@/lib/db";
import { humanAgents, agentAssistSessions } from "@/shared/schema";
import { eq, sql, count, avg } from "drizzle-orm";
import { getAuthenticatedUser, requireSuperAdmin } from "@/lib/get-user";
import { NextRequest, NextResponse } from "next/server";
import { adminLimiter } from "@/lib/rate-limit";

import { handleRouteError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rl = await adminLimiter(request);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    const auth = await getAuthenticatedUser();
    const access = requireSuperAdmin(auth);
    if (!access.allowed) return NextResponse.json({ error: access.error }, { status: 403 });
    const { id } = await params;
    const agentId = parseInt(id, 10);
    const [agent] = await db.select().from(humanAgents).where(eq(humanAgents.id, agentId));
    if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    const [stats] = await db
      .select({
        totalSessions: count(),
        avgSuggestionsShown: avg(agentAssistSessions.suggestionsShown),
        avgSuggestionsUsed: avg(agentAssistSessions.suggestionsUsed),
        avgOutcomeRating: avg(agentAssistSessions.outcomeRating),
      })
      .from(agentAssistSessions)
      .where(eq(agentAssistSessions.humanAgentId, agentId));
    return NextResponse.json({ ...agent, stats });
  } catch (error) {
    return handleRouteError(error, "AgentAssistAgent");
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rl = await adminLimiter(request);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    const auth = await getAuthenticatedUser();
    const access = requireSuperAdmin(auth);
    if (!access.allowed) return NextResponse.json({ error: access.error }, { status: 403 });
    const { id } = await params;
    const agentId = parseInt(id, 10);
    const body = await request.json();
    const ALLOWED = ["displayName", "status", "skills", "maxConcurrentCalls", "shiftStart", "shiftEnd"];
    const updateData: Record<string, any> = {};
    for (const key of ALLOWED) {
      if (body[key] !== undefined) {
        updateData[key] = (key === "shiftStart" || key === "shiftEnd") && body[key] ? new Date(body[key]) : body[key];
      }
    }
    const [updated] = await db.update(humanAgents).set(updateData).where(eq(humanAgents.id, agentId)).returning();
    if (!updated) return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (error) {
    return handleRouteError(error, "AgentAssistAgent");
  }
}
