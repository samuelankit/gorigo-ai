import { db } from "@/lib/db";
import { agents, orgs, callLogs } from "@/shared/schema";
import { eq, sql, ilike, and, or, desc } from "drizzle-orm";
import { getAuthenticatedUser, requireSuperAdmin } from "@/lib/get-user";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser();
    const access = requireSuperAdmin(auth);
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim();
    const statusFilter = searchParams.get("status");
    const typeFilter = searchParams.get("type");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10) || 50, 200);
    const offset = Math.max(parseInt(searchParams.get("offset") ?? "0", 10) || 0, 0);

    const conditions: any[] = [];

    if (search) {
      conditions.push(
        or(
          ilike(agents.name, `%${search}%`),
          ilike(orgs.name, `%${search}%`),
          ilike(agents.roles, `%${search}%`)
        )
      );
    }

    if (statusFilter && statusFilter !== "all") {
      conditions.push(eq(agents.status, statusFilter));
    }

    if (typeFilter && typeFilter !== "all") {
      conditions.push(eq(agents.agentType, typeFilter));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const callCountSubquery = db
      .select({
        agentId: callLogs.agentId,
        callCount: sql<number>`count(*)::int`.as("call_count"),
        lastCallAt: sql<string>`max(${callLogs.createdAt})`.as("last_call_at"),
      })
      .from(callLogs)
      .groupBy(callLogs.agentId)
      .as("call_stats");

    const [agentsResult, countResult, statsResult] = await Promise.all([
      db
        .select({
          id: agents.id,
          name: agents.name,
          orgId: agents.orgId,
          roles: agents.roles,
          agentType: agents.agentType,
          status: agents.status,
          language: agents.language,
          voiceName: agents.voiceName,
          inboundEnabled: agents.inboundEnabled,
          outboundEnabled: agents.outboundEnabled,
          complianceDisclosure: agents.complianceDisclosure,
          createdAt: agents.createdAt,
          orgName: orgs.name,
          callCount: callCountSubquery.callCount,
          lastCallAt: callCountSubquery.lastCallAt,
        })
        .from(agents)
        .leftJoin(orgs, eq(agents.orgId, orgs.id))
        .leftJoin(callCountSubquery, eq(agents.id, callCountSubquery.agentId))
        .where(whereClause)
        .orderBy(desc(agents.createdAt))
        .limit(limit)
        .offset(offset),

      db
        .select({ count: sql<number>`count(*)::int` })
        .from(agents)
        .leftJoin(orgs, eq(agents.orgId, orgs.id))
        .where(whereClause),

      db
        .select({
          total: sql<number>`count(*)::int`,
          active: sql<number>`count(*) FILTER (WHERE ${agents.status} = 'active')::int`,
          inactive: sql<number>`count(*) FILTER (WHERE ${agents.status} != 'active')::int`,
          inbound: sql<number>`count(*) FILTER (WHERE ${agents.inboundEnabled} = true)::int`,
          outbound: sql<number>`count(*) FILTER (WHERE ${agents.outboundEnabled} = true)::int`,
          uniqueOrgs: sql<number>`count(DISTINCT ${agents.orgId})::int`,
          withDisclosure: sql<number>`count(*) FILTER (WHERE ${agents.complianceDisclosure} = true)::int`,
        })
        .from(agents),
    ]);

    return NextResponse.json({
      agents: agentsResult,
      total: countResult[0]?.count ?? 0,
      stats: statsResult[0] ?? { total: 0, active: 0, inactive: 0, inbound: 0, outbound: 0, uniqueOrgs: 0, withDisclosure: 0 },
    });
  } catch (error: any) {
    console.error("Admin agents error:", error);
    return NextResponse.json({ error: "Failed to fetch agents" }, { status: 500 });
  }
}
