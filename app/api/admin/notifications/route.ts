import { db } from "@/lib/db";
import { notifications, orgs, users } from "@/shared/schema";
import { eq, desc, sql, and, gte, ilike, or } from "drizzle-orm";
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
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10) || 50, 200);
    const offset = Math.max(parseInt(searchParams.get("offset") ?? "0", 10) || 0, 0);
    const typeFilter = searchParams.get("type");
    const readFilter = searchParams.get("read");
    const orgFilter = searchParams.get("orgId");
    const searchQuery = searchParams.get("search")?.trim();
    const daysParam = searchParams.get("days");

    const conditions: any[] = [];

    if (typeFilter && typeFilter !== "all") {
      conditions.push(eq(notifications.type, typeFilter));
    }
    if (readFilter === "true") {
      conditions.push(eq(notifications.isRead, true));
    } else if (readFilter === "false") {
      conditions.push(eq(notifications.isRead, false));
    }
    if (orgFilter) {
      const orgId = parseInt(orgFilter, 10);
      if (!isNaN(orgId)) {
        conditions.push(eq(notifications.orgId, orgId));
      }
    }
    if (daysParam) {
      const days = parseInt(daysParam, 10);
      if (!isNaN(days) && days > 0) {
        const since = new Date();
        since.setDate(since.getDate() - days);
        conditions.push(gte(notifications.createdAt, since));
      }
    }
    if (searchQuery) {
      conditions.push(
        or(
          ilike(notifications.title, `%${searchQuery}%`),
          ilike(notifications.message, `%${searchQuery}%`),
          sql`EXISTS (SELECT 1 FROM orgs WHERE orgs.id = ${notifications.orgId} AND orgs.name ILIKE ${`%${searchQuery}%`})`
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult, summaryResult, items] = await Promise.all([
      db.select({ total: sql<number>`count(*)::int` }).from(notifications).where(whereClause),

      db.select({
        totalAll: sql<number>`count(*)::int`,
        unreadCount: sql<number>`count(*) FILTER (WHERE ${notifications.isRead} = false)::int`,
        last24h: sql<number>`count(*) FILTER (WHERE ${notifications.createdAt} >= NOW() - INTERVAL '24 hours')::int`,
        lowBalance: sql<number>`count(*) FILTER (WHERE ${notifications.type} = 'low_balance')::int`,
        callFailure: sql<number>`count(*) FILTER (WHERE ${notifications.type} = 'call_failure')::int`,
        spendingCap: sql<number>`count(*) FILTER (WHERE ${notifications.type} = 'spending_cap')::int`,
        security: sql<number>`count(*) FILTER (WHERE ${notifications.type} = 'security')::int`,
        system: sql<number>`count(*) FILTER (WHERE ${notifications.type} = 'system')::int`,
        webhookFailure: sql<number>`count(*) FILTER (WHERE ${notifications.type} = 'webhook_failure')::int`,
        campaignComplete: sql<number>`count(*) FILTER (WHERE ${notifications.type} = 'campaign_complete')::int`,
      }).from(notifications).where(whereClause),

      db.select({
        id: notifications.id,
        userId: notifications.userId,
        orgId: notifications.orgId,
        type: notifications.type,
        title: notifications.title,
        message: notifications.message,
        isRead: notifications.isRead,
        actionUrl: notifications.actionUrl,
        metadata: notifications.metadata,
        createdAt: notifications.createdAt,
        orgName: sql<string | null>`(SELECT name FROM orgs WHERE orgs.id = ${notifications.orgId} LIMIT 1)`,
        userEmail: sql<string | null>`(SELECT email FROM users WHERE users.id = ${notifications.userId} LIMIT 1)`,
      })
        .from(notifications)
        .where(whereClause)
        .orderBy(desc(notifications.createdAt))
        .limit(limit)
        .offset(offset),
    ]);

    const total = totalResult[0]?.total ?? 0;
    const summary = summaryResult[0] ?? {};

    return NextResponse.json({
      notifications: items,
      total,
      limit,
      offset,
      pages: Math.ceil(total / limit),
      summary: {
        total: summary.totalAll ?? 0,
        unread: summary.unreadCount ?? 0,
        last24h: summary.last24h ?? 0,
        byType: {
          low_balance: summary.lowBalance ?? 0,
          call_failure: summary.callFailure ?? 0,
          spending_cap: summary.spendingCap ?? 0,
          security: summary.security ?? 0,
          system: summary.system ?? 0,
          webhook_failure: summary.webhookFailure ?? 0,
          campaign_complete: summary.campaignComplete ?? 0,
        },
      },
    });
  } catch (error) {
    console.error("[Admin Notifications] List error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser();
    const access = requireSuperAdmin(auth);
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const body = await request.json();
    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "ids array required" }, { status: 400 });
    }

    const validIds = ids.filter((id: any) => typeof id === "number" && id > 0);
    if (validIds.length === 0) {
      return NextResponse.json({ error: "No valid IDs provided" }, { status: 400 });
    }

    await db
      .update(notifications)
      .set({ isRead: true })
      .where(sql`${notifications.id} = ANY(${validIds}::int[])`);

    return NextResponse.json({ success: true, marked: validIds.length });
  } catch (error) {
    console.error("[Admin Notifications] Bulk mark read error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
