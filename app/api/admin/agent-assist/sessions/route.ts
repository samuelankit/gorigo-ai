import { db } from "@/lib/db";
import { agentAssistSessions, humanAgents } from "@/shared/schema";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";
import { getAuthenticatedUser, requireSuperAdmin } from "@/lib/get-user";
import { NextRequest, NextResponse } from "next/server";
import { adminLimiter } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const rl = await adminLimiter(request);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    const auth = await getAuthenticatedUser();
    const access = requireSuperAdmin(auth);
    if (!access.allowed) return NextResponse.json({ error: access.error }, { status: 403 });
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("orgId");
    const agentId = searchParams.get("agentId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const conditions: any[] = [];
    if (orgId) conditions.push(eq(agentAssistSessions.orgId, parseInt(orgId, 10)));
    if (agentId) conditions.push(eq(agentAssistSessions.humanAgentId, parseInt(agentId, 10)));
    if (from) conditions.push(gte(agentAssistSessions.startedAt, new Date(from)));
    if (to) conditions.push(lte(agentAssistSessions.startedAt, new Date(to)));
    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const result = await db.select().from(agentAssistSessions).where(where).orderBy(desc(agentAssistSessions.startedAt));
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error fetching assist sessions:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const rl = await adminLimiter(request);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    const auth = await getAuthenticatedUser();
    const access = requireSuperAdmin(auth);
    if (!access.allowed) return NextResponse.json({ error: access.error }, { status: 403 });
    const body = await request.json();
    const [session] = await db.insert(agentAssistSessions).values({
      callLogId: body.callLogId,
      humanAgentId: body.humanAgentId,
      orgId: body.orgId,
      transferType: body.transferType,
    }).returning();
    await db
      .update(humanAgents)
      .set({ currentCallCount: sql`${humanAgents.currentCallCount} + 1`, lastActiveAt: new Date() })
      .where(eq(humanAgents.id, body.humanAgentId));
    return NextResponse.json(session, { status: 201 });
  } catch (error: any) {
    console.error("Error creating assist session:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
