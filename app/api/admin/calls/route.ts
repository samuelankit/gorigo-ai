import { db } from "@/lib/db";
import { callLogs, agents, orgs, departmentMembers } from "@/shared/schema";
import { eq, sql, ilike, and, or, desc, gte, lte, inArray } from "drizzle-orm";
import { getAuthenticatedUser, requireSuperAdmin } from "@/lib/get-user";
import { NextRequest, NextResponse } from "next/server";
import { adminLimiter } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const rl = await adminLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    const auth = await getAuthenticatedUser();
    const access = requireSuperAdmin(auth);
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim();
    const statusFilter = searchParams.get("status");
    const directionFilter = searchParams.get("direction");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const departmentId = searchParams.get("departmentId");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10) || 50, 200);
    const offset = Math.max(parseInt(searchParams.get("offset") ?? "0", 10) || 0, 0);

    const conditions: any[] = [];

    if (departmentId && departmentId !== "all") {
      const deptId = parseInt(departmentId, 10);
      if (!isNaN(deptId)) {
        const deptUserIds = await db
          .select({ userId: departmentMembers.userId })
          .from(departmentMembers)
          .where(eq(departmentMembers.departmentId, deptId));
        const userIds = deptUserIds.map(d => d.userId);
        if (userIds.length > 0) {
          conditions.push(inArray(agents.userId, userIds));
        } else {
          return NextResponse.json({ calls: [], total: 0, stats: {} });
        }
      }
    }

    if (search) {
      conditions.push(
        or(
          ilike(callLogs.callerNumber, `%${search}%`),
          ilike(callLogs.summary, `%${search}%`),
          ilike(agents.name, `%${search}%`),
          ilike(orgs.name, `%${search}%`)
        )
      );
    }

    if (statusFilter && statusFilter !== "all") {
      conditions.push(eq(callLogs.status, statusFilter));
    }

    if (directionFilter && directionFilter !== "all") {
      conditions.push(eq(callLogs.direction, directionFilter));
    }

    if (dateFrom) {
      conditions.push(gte(callLogs.createdAt, new Date(dateFrom)));
    }

    if (dateTo) {
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);
      conditions.push(lte(callLogs.createdAt, endDate));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [callsResult, countResult] = await Promise.all([
      db
        .select({
          id: callLogs.id,
          agentId: callLogs.agentId,
          orgId: callLogs.orgId,
          direction: callLogs.direction,
          callerNumber: callLogs.callerNumber,
          duration: callLogs.duration,
          status: callLogs.status,
          summary: callLogs.summary,
          leadCaptured: callLogs.leadCaptured,
          leadName: callLogs.leadName,
          leadEmail: callLogs.leadEmail,
          leadPhone: callLogs.leadPhone,
          appointmentBooked: callLogs.appointmentBooked,
          handoffTriggered: callLogs.handoffTriggered,
          currentState: callLogs.currentState,
          turnCount: callLogs.turnCount,
          sentimentScore: callLogs.sentimentScore,
          sentimentLabel: callLogs.sentimentLabel,
          qualityScore: callLogs.qualityScore,
          finalOutcome: callLogs.finalOutcome,
          callCost: callLogs.callCost,
          createdAt: callLogs.createdAt,
          startedAt: callLogs.startedAt,
          endedAt: callLogs.endedAt,
          aiDisclosurePlayed: callLogs.aiDisclosurePlayed,
          recordingUrl: callLogs.recordingUrl,
          billedDeploymentModel: callLogs.billedDeploymentModel,
          billedRatePerMinute: callLogs.billedRatePerMinute,
          agentName: agents.name,
          orgName: orgs.name,
        })
        .from(callLogs)
        .leftJoin(agents, eq(callLogs.agentId, agents.id))
        .leftJoin(orgs, eq(callLogs.orgId, orgs.id))
        .where(whereClause)
        .orderBy(desc(callLogs.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(callLogs)
        .leftJoin(agents, eq(callLogs.agentId, agents.id))
        .leftJoin(orgs, eq(callLogs.orgId, orgs.id))
        .where(whereClause),
    ]);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [statsResult] = await db
      .select({
        totalCalls: sql<number>`count(*)::int`,
        totalDuration: sql<number>`coalesce(sum(${callLogs.duration}), 0)::int`,
        avgDuration: sql<number>`coalesce(avg(${callLogs.duration}), 0)::int`,
        completedCalls: sql<number>`count(*) filter (where ${callLogs.status} = 'completed')::int`,
        activeCalls: sql<number>`count(*) filter (where ${callLogs.status} = 'in-progress')::int`,
        failedCalls: sql<number>`count(*) filter (where ${callLogs.status} = 'failed')::int`,
        inboundCalls: sql<number>`count(*) filter (where ${callLogs.direction} = 'inbound')::int`,
        outboundCalls: sql<number>`count(*) filter (where ${callLogs.direction} = 'outbound')::int`,
        leadsCount: sql<number>`count(*) filter (where ${callLogs.leadCaptured} = true)::int`,
        handoffsCount: sql<number>`count(*) filter (where ${callLogs.handoffTriggered} = true)::int`,
        avgSentiment: sql<string>`coalesce(avg(${callLogs.sentimentScore}), 0)::numeric(5,2)`,
        avgQuality: sql<string>`coalesce(avg(${callLogs.qualityScore}), 0)::numeric(5,2)`,
        totalRevenue: sql<string>`coalesce(sum(${callLogs.callCost}), 0)::numeric(12,2)`,
        uniqueOrgs: sql<number>`count(distinct ${callLogs.orgId})::int`,
      })
      .from(callLogs);

    const [todayStats] = await db
      .select({
        todayCalls: sql<number>`count(*)::int`,
        todayDuration: sql<number>`coalesce(sum(${callLogs.duration}), 0)::int`,
        todayRevenue: sql<string>`coalesce(sum(${callLogs.callCost}), 0)::numeric(12,2)`,
        todayLeads: sql<number>`count(*) filter (where ${callLogs.leadCaptured} = true)::int`,
      })
      .from(callLogs)
      .where(gte(callLogs.createdAt, todayStart));

    return NextResponse.json({
      calls: callsResult,
      total: countResult[0]?.count ?? 0,
      stats: {
        ...statsResult,
        ...todayStats,
      },
    });
  } catch (error: any) {
    return handleRouteError(error, "AdminCalls");
  }
}
