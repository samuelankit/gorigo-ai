import { db } from "@/lib/db";
import { callLogs, agents } from "@/shared/schema";
import { eq, and, sql, gte, lte, count, avg } from "drizzle-orm";
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

    if (!orgId) return NextResponse.json({ error: "orgId is required" }, { status: 400 });

    const conditions: any[] = [eq(callLogs.orgId, parseInt(orgId))];
    if (from) conditions.push(gte(callLogs.createdAt, new Date(from)));
    if (to) conditions.push(lte(callLogs.createdAt, new Date(to)));

    const scorecards = await db
      .select({
        agentId: callLogs.agentId,
        agentName: agents.name,
        agentStatus: agents.status,
        totalCalls: count(),
        avgHandleTime: avg(callLogs.duration),
        avgQuality: avg(callLogs.qualityScore),
        avgSentiment: avg(callLogs.sentimentScore),
        avgCsat: avg(callLogs.csatPrediction),
        completedCalls: sql<number>`count(*) FILTER (WHERE ${callLogs.status} = 'completed')::int`,
        handoffCalls: sql<number>`count(*) FILTER (WHERE ${callLogs.handoffTriggered} = true)::int`,
        resolvedCalls: sql<number>`count(*) FILTER (WHERE ${callLogs.resolutionStatus} = 'resolved')::int`,
      })
      .from(callLogs)
      .innerJoin(agents, eq(callLogs.agentId, agents.id))
      .where(and(...conditions))
      .groupBy(callLogs.agentId, agents.name, agents.status)
      .orderBy(sql`count(*) DESC`);

    return NextResponse.json({
      scorecards: scorecards.map((s) => ({
        agentId: s.agentId,
        agentName: s.agentName,
        agentStatus: s.agentStatus,
        totalCalls: Number(s.totalCalls),
        avgHandleTime: s.avgHandleTime ? Math.round(Number(s.avgHandleTime)) : null,
        avgQuality: s.avgQuality ? Math.round(Number(s.avgQuality) * 100) / 100 : null,
        avgSentiment: s.avgSentiment ? Math.round(Number(s.avgSentiment) * 100) / 100 : null,
        avgCsat: s.avgCsat ? Math.round(Number(s.avgCsat) * 100) / 100 : null,
        completedCalls: s.completedCalls,
        handoffCalls: s.handoffCalls,
        resolvedCalls: s.resolvedCalls,
        handoffRate: s.totalCalls > 0 ? Math.round((s.handoffCalls / Number(s.totalCalls)) * 10000) / 100 : 0,
        resolutionRate: s.totalCalls > 0 ? Math.round((s.resolvedCalls / Number(s.totalCalls)) * 10000) / 100 : 0,
      })),
    });
  } catch (error) {
    return handleRouteError(error, "AgentScorecards");
  }
}
