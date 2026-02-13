import { db } from "@/lib/db";
import { campaigns, agents, orgs } from "@/shared/schema";
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
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10) || 50, 200);
    const offset = Math.max(parseInt(searchParams.get("offset") ?? "0", 10) || 0, 0);

    const conditions: any[] = [];

    if (search) {
      conditions.push(
        or(
          ilike(campaigns.name, `%${search}%`),
          ilike(campaigns.description, `%${search}%`),
          ilike(orgs.name, `%${search}%`)
        )
      );
    }

    if (statusFilter && statusFilter !== "all") {
      conditions.push(eq(campaigns.status, statusFilter));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [campaignsResult, countResult] = await Promise.all([
      db
        .select({
          id: campaigns.id,
          orgId: campaigns.orgId,
          name: campaigns.name,
          description: campaigns.description,
          agentId: campaigns.agentId,
          status: campaigns.status,
          totalContacts: campaigns.totalContacts,
          completedCount: campaigns.completedCount,
          failedCount: campaigns.failedCount,
          callInterval: campaigns.callInterval,
          maxRetries: campaigns.maxRetries,
          scheduledAt: campaigns.scheduledAt,
          startedAt: campaigns.startedAt,
          completedAt: campaigns.completedAt,
          createdAt: campaigns.createdAt,
          orgName: orgs.name,
          agentName: agents.name,
        })
        .from(campaigns)
        .leftJoin(orgs, eq(campaigns.orgId, orgs.id))
        .leftJoin(agents, eq(campaigns.agentId, agents.id))
        .where(whereClause)
        .orderBy(desc(campaigns.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(campaigns)
        .leftJoin(orgs, eq(campaigns.orgId, orgs.id))
        .where(whereClause),
    ]);

    const [statsResult] = await db
      .select({
        totalCampaigns: sql<number>`count(*)::int`,
        activeCampaigns: sql<number>`count(*) filter (where ${campaigns.status} = 'active')::int`,
        draftCampaigns: sql<number>`count(*) filter (where ${campaigns.status} = 'draft')::int`,
        completedCampaigns: sql<number>`count(*) filter (where ${campaigns.status} = 'completed')::int`,
        pausedCampaigns: sql<number>`count(*) filter (where ${campaigns.status} = 'paused')::int`,
        totalContacts: sql<number>`coalesce(sum(${campaigns.totalContacts}), 0)::int`,
        completedContacts: sql<number>`coalesce(sum(${campaigns.completedCount}), 0)::int`,
        failedContacts: sql<number>`coalesce(sum(${campaigns.failedCount}), 0)::int`,
        uniqueOrgs: sql<number>`count(distinct ${campaigns.orgId})::int`,
      })
      .from(campaigns);

    return NextResponse.json({
      campaigns: campaignsResult,
      total: countResult[0]?.count ?? 0,
      stats: statsResult,
    });
  } catch (error: any) {
    console.error("Admin campaigns error:", error);
    return NextResponse.json({ error: "Failed to fetch campaigns" }, { status: 500 });
  }
}
