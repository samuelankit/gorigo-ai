import { db } from "@/lib/db";
import { apiKeys, orgs, users } from "@/shared/schema";
import { eq, sql, ilike, and, or, desc } from "drizzle-orm";
import { getAuthenticatedUser, requireSuperAdmin } from "@/lib/get-user";
import { NextRequest, NextResponse } from "next/server";
import { adminLimiter } from "@/lib/rate-limit";

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
    const status = searchParams.get("status");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10) || 50, 200);
    const offset = Math.max(parseInt(searchParams.get("offset") ?? "0", 10) || 0, 0);

    const conditions: any[] = [];

    if (search) {
      conditions.push(
        or(
          ilike(apiKeys.name, `%${search}%`),
          ilike(apiKeys.keyPrefix, `%${search}%`),
          ilike(orgs.name, `%${search}%`),
          ilike(users.email, `%${search}%`)
        )
      );
    }

    if (status === "active") {
      conditions.push(eq(apiKeys.isRevoked, false));
      conditions.push(sql`(${apiKeys.expiresAt} IS NULL OR ${apiKeys.expiresAt} > NOW())`);
    } else if (status === "revoked") {
      conditions.push(eq(apiKeys.isRevoked, true));
    } else if (status === "expired") {
      conditions.push(eq(apiKeys.isRevoked, false));
      conditions.push(sql`${apiKeys.expiresAt} IS NOT NULL AND ${apiKeys.expiresAt} <= NOW()`);
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [keysResult, countResult, statsResult] = await Promise.all([
      db
        .select({
          id: apiKeys.id,
          orgId: apiKeys.orgId,
          userId: apiKeys.userId,
          name: apiKeys.name,
          keyPrefix: apiKeys.keyPrefix,
          scopes: apiKeys.scopes,
          lastUsedAt: apiKeys.lastUsedAt,
          expiresAt: apiKeys.expiresAt,
          isRevoked: apiKeys.isRevoked,
          revokedAt: apiKeys.revokedAt,
          createdAt: apiKeys.createdAt,
          orgName: orgs.name,
          userEmail: users.email,
        })
        .from(apiKeys)
        .leftJoin(orgs, eq(apiKeys.orgId, orgs.id))
        .leftJoin(users, eq(apiKeys.userId, users.id))
        .where(whereClause)
        .orderBy(desc(apiKeys.createdAt))
        .limit(limit)
        .offset(offset),

      db
        .select({ count: sql<number>`count(*)::int` })
        .from(apiKeys)
        .leftJoin(orgs, eq(apiKeys.orgId, orgs.id))
        .leftJoin(users, eq(apiKeys.userId, users.id))
        .where(whereClause),

      db
        .select({
          total: sql<number>`count(*)::int`,
          active: sql<number>`count(*) FILTER (WHERE ${apiKeys.isRevoked} = false AND (${apiKeys.expiresAt} IS NULL OR ${apiKeys.expiresAt} > NOW()))::int`,
          revoked: sql<number>`count(*) FILTER (WHERE ${apiKeys.isRevoked} = true)::int`,
          expired: sql<number>`count(*) FILTER (WHERE ${apiKeys.isRevoked} = false AND ${apiKeys.expiresAt} IS NOT NULL AND ${apiKeys.expiresAt} <= NOW())::int`,
          recentlyUsed: sql<number>`count(*) FILTER (WHERE ${apiKeys.lastUsedAt} IS NOT NULL AND ${apiKeys.lastUsedAt} > NOW() - INTERVAL '7 days')::int`,
          uniqueOrgs: sql<number>`count(DISTINCT ${apiKeys.orgId})::int`,
        })
        .from(apiKeys),
    ]);

    return NextResponse.json({
      keys: keysResult,
      total: countResult[0]?.count ?? 0,
      stats: statsResult[0] ?? { total: 0, active: 0, revoked: 0, expired: 0, recentlyUsed: 0, uniqueOrgs: 0 },
    });
  } catch (error: any) {
    console.error("Admin API keys error:", error);
    return NextResponse.json({ error: "Failed to fetch API keys" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
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
    const id = parseInt(searchParams.get("id") ?? "", 10);
    if (isNaN(id) || id < 1) {
      return NextResponse.json({ error: "Invalid API key ID" }, { status: 400 });
    }

    const existing = await db.select().from(apiKeys).where(eq(apiKeys.id, id)).limit(1);
    if (existing.length === 0) {
      return NextResponse.json({ error: "API key not found" }, { status: 404 });
    }

    if (existing[0].isRevoked) {
      return NextResponse.json({ error: "API key is already revoked" }, { status: 400 });
    }

    await db.update(apiKeys).set({ isRevoked: true, revokedAt: new Date() }).where(eq(apiKeys.id, id));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Admin API key revoke error:", error);
    return NextResponse.json({ error: "Failed to revoke API key" }, { status: 500 });
  }
}
