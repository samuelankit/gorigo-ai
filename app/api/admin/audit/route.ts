import { db } from "@/lib/db";
import { auditLog, users } from "@/shared/schema";
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
    const actionFilter = searchParams.get("action");
    const entityTypeFilter = searchParams.get("entityType");
    const searchQuery = searchParams.get("search")?.trim();
    const daysParam = searchParams.get("days");

    const conditions: any[] = [];

    if (actionFilter && actionFilter !== "all") {
      conditions.push(ilike(auditLog.action, `%${actionFilter}%`));
    }
    if (entityTypeFilter && entityTypeFilter !== "all") {
      conditions.push(eq(auditLog.entityType, entityTypeFilter));
    }
    if (daysParam) {
      const days = parseInt(daysParam, 10);
      if (!isNaN(days) && days > 0) {
        const since = new Date();
        since.setDate(since.getDate() - days);
        conditions.push(gte(auditLog.createdAt, since));
      }
    }
    if (searchQuery) {
      conditions.push(
        or(
          ilike(auditLog.action, `%${searchQuery}%`),
          ilike(auditLog.entityType, `%${searchQuery}%`),
          sql`EXISTS (SELECT 1 FROM users WHERE users.id = ${auditLog.actorId} AND users.email ILIKE ${`%${searchQuery}%`})`
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult] = await db
      .select({ total: sql<number>`count(*)` })
      .from(auditLog)
      .where(whereClause);

    const rawEntries = await db
      .select({
        id: auditLog.id,
        actorId: auditLog.actorId,
        action: auditLog.action,
        entityType: auditLog.entityType,
        entityId: auditLog.entityId,
        details: auditLog.details,
        ipAddress: auditLog.ipAddress,
        createdAt: auditLog.createdAt,
        actorEmail: sql<string | null>`(SELECT email FROM users WHERE users.id = ${auditLog.actorId} LIMIT 1)`,
      })
      .from(auditLog)
      .where(whereClause)
      .orderBy(desc(auditLog.createdAt))
      .limit(limit)
      .offset(offset);

    const [summaryResult] = await db
      .select({
        totalEntries: sql<number>`count(*)`,
        todayEntries: sql<number>`count(*) FILTER (WHERE ${auditLog.createdAt} >= CURRENT_DATE)`,
        uniqueActors: sql<number>`count(DISTINCT ${auditLog.actorId})`,
      })
      .from(auditLog);

    return NextResponse.json({
      entries: rawEntries,
      total: Number(totalResult.total),
      summary: {
        totalEntries: Number(summaryResult.totalEntries),
        todayEntries: Number(summaryResult.todayEntries),
        uniqueActors: Number(summaryResult.uniqueActors),
      },
    });
  } catch (error) {
    console.error("Admin audit log error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
