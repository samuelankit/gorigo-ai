import { db } from "@/lib/db";
import { humanAgents } from "@/shared/schema";
import { eq } from "drizzle-orm";
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
    const agentId = parseInt(id, 10);
    const { status } = await request.json();
    if (!["online", "away", "busy", "break", "offline"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    const [updated] = await db
      .update(humanAgents)
      .set({ status, lastActiveAt: new Date() })
      .where(eq(humanAgents.id, agentId))
      .returning();
    if (!updated) return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (error) {
    return handleRouteError(error, "AgentAssistAgentStatus");
  }
}
