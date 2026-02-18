import { db } from "@/lib/db";
import { humanAgents, agentAssistSessions } from "@/shared/schema";
import { eq, and, sql, asc, lt } from "drizzle-orm";
import { getAuthenticatedUser, requireSuperAdmin } from "@/lib/get-user";
import { NextRequest, NextResponse } from "next/server";
import { adminLimiter } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const rl = await adminLimiter(request);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    const auth = await getAuthenticatedUser();
    const access = requireSuperAdmin(auth);
    if (!access.allowed) return NextResponse.json({ error: access.error }, { status: 403 });
    const { callLogId, orgId, transferType, skills } = await request.json();
    if (!callLogId || !orgId) {
      return NextResponse.json({ error: "callLogId and orgId are required" }, { status: 400 });
    }
    const availableAgents = await db
      .select()
      .from(humanAgents)
      .where(
        and(
          eq(humanAgents.orgId, orgId),
          eq(humanAgents.status, "online"),
          sql`${humanAgents.currentCallCount} < ${humanAgents.maxConcurrentCalls}`
        )
      )
      .orderBy(asc(humanAgents.currentCallCount));
    let matchedAgent = null;
    if (skills && Array.isArray(skills) && skills.length > 0) {
      matchedAgent = availableAgents.find((agent) => {
        if (!agent.skills || !Array.isArray(agent.skills)) return false;
        return skills.some((skill: string) => agent.skills!.includes(skill));
      });
    }
    if (!matchedAgent && availableAgents.length > 0) {
      matchedAgent = availableAgents[0];
    }
    if (!matchedAgent) {
      return NextResponse.json({ error: "No available agents found" }, { status: 404 });
    }
    const [session] = await db.insert(agentAssistSessions).values({
      callLogId,
      humanAgentId: matchedAgent.id,
      orgId,
      transferType: transferType ?? "handoff",
    }).returning();
    await db
      .update(humanAgents)
      .set({
        currentCallCount: sql`${humanAgents.currentCallCount} + 1`,
        lastActiveAt: new Date(),
        status: "busy",
      })
      .where(eq(humanAgents.id, matchedAgent.id));
    return NextResponse.json({ agent: matchedAgent, session }, { status: 201 });
  } catch (error: any) {
    console.error("Error initiating handoff:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
