import { db } from "@/lib/db";
import { agentAssistSessions, humanAgents, callLogs } from "@/shared/schema";
import { eq, isNull } from "drizzle-orm";
import { getAuthenticatedUser, requireSuperAdmin } from "@/lib/get-user";
import { NextRequest, NextResponse } from "next/server";
import { adminLimiter } from "@/lib/rate-limit";

import { handleRouteError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const rl = await adminLimiter(request);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    const auth = await getAuthenticatedUser();
    const access = requireSuperAdmin(auth);
    if (!access.allowed) return NextResponse.json({ error: access.error }, { status: 403 });
    const result = await db
      .select({
        sessionId: agentAssistSessions.id,
        callLogId: agentAssistSessions.callLogId,
        orgId: agentAssistSessions.orgId,
        startedAt: agentAssistSessions.startedAt,
        transferType: agentAssistSessions.transferType,
        suggestionsShown: agentAssistSessions.suggestionsShown,
        suggestionsUsed: agentAssistSessions.suggestionsUsed,
        agentId: humanAgents.id,
        agentName: humanAgents.displayName,
        agentStatus: humanAgents.status,
        agentSkills: humanAgents.skills,
        callDirection: callLogs.direction,
        callerNumber: callLogs.callerNumber,
        callStatus: callLogs.status,
        callStartedAt: callLogs.startedAt,
      })
      .from(agentAssistSessions)
      .innerJoin(humanAgents, eq(agentAssistSessions.humanAgentId, humanAgents.id))
      .innerJoin(callLogs, eq(agentAssistSessions.callLogId, callLogs.id))
      .where(isNull(agentAssistSessions.endedAt));
    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error, "SupervisorLive");
  }
}
