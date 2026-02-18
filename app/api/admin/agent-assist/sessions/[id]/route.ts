import { db } from "@/lib/db";
import { agentAssistSessions, humanAgents } from "@/shared/schema";
import { eq, sql } from "drizzle-orm";
import { getAuthenticatedUser, requireSuperAdmin } from "@/lib/get-user";
import { NextRequest, NextResponse } from "next/server";
import { adminLimiter } from "@/lib/rate-limit";

import { handleRouteError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rl = await adminLimiter(request);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    const auth = await getAuthenticatedUser();
    const access = requireSuperAdmin(auth);
    if (!access.allowed) return NextResponse.json({ error: access.error }, { status: 403 });
    const { id } = await params;
    const sessionId = parseInt(id, 10);
    const body = await request.json();
    const [existing] = await db.select().from(agentAssistSessions).where(eq(agentAssistSessions.id, sessionId));
    if (!existing) return NextResponse.json({ error: "Session not found" }, { status: 404 });
    const ALLOWED = ["endedAt", "suggestionsShown", "suggestionsUsed", "outcomeRating", "notes"];
    const updateData: Record<string, any> = {};
    for (const key of ALLOWED) {
      if (body[key] !== undefined) {
        updateData[key] = key === "endedAt" && body[key] ? new Date(body[key]) : body[key];
      }
    }
    const [updated] = await db.update(agentAssistSessions).set(updateData).where(eq(agentAssistSessions.id, sessionId)).returning();
    if (body.endedAt && !existing.endedAt) {
      await db
        .update(humanAgents)
        .set({
          currentCallCount: sql`GREATEST(${humanAgents.currentCallCount} - 1, 0)`,
          totalCallsHandled: sql`${humanAgents.totalCallsHandled} + 1`,
        })
        .where(eq(humanAgents.id, existing.humanAgentId));
    }
    return NextResponse.json(updated);
  } catch (error) {
    return handleRouteError(error, "AssistSession");
  }
}
