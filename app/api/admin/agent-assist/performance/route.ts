import { db } from "@/lib/db";
import { agentAssistSessions, humanAgents } from "@/shared/schema";
import { eq, and, gte, lte, sql, count, avg } from "drizzle-orm";
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
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("orgId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const conditions: any[] = [];
    if (orgId) conditions.push(eq(agentAssistSessions.orgId, parseInt(orgId, 10)));
    if (from) conditions.push(gte(agentAssistSessions.startedAt, new Date(from)));
    if (to) conditions.push(lte(agentAssistSessions.startedAt, new Date(to)));
    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const result = await db
      .select({
        humanAgentId: agentAssistSessions.humanAgentId,
        agentName: humanAgents.displayName,
        totalSessions: count(),
        avgSuggestionsShown: avg(agentAssistSessions.suggestionsShown),
        avgSuggestionsUsed: avg(agentAssistSessions.suggestionsUsed),
        avgOutcomeRating: avg(agentAssistSessions.outcomeRating),
        avgCoachingAlerts: avg(agentAssistSessions.coachingAlertsTriggered),
        totalCoachingAlerts: sql<number>`SUM(${agentAssistSessions.coachingAlertsTriggered})::int`,
      })
      .from(agentAssistSessions)
      .innerJoin(humanAgents, eq(agentAssistSessions.humanAgentId, humanAgents.id))
      .where(where)
      .groupBy(agentAssistSessions.humanAgentId, humanAgents.displayName);
    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error, "AgentPerformance");
  }
}
