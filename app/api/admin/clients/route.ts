import { db } from "@/lib/db";
import { orgs, partnerClients, partners, callLogs, billingLedger, orgMembers, users, wallets, agents } from "@/shared/schema";
import { eq, sql, and, ilike, inArray } from "drizzle-orm";
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
    const partnerIdParam = searchParams.get("partnerId");
    const searchQuery = searchParams.get("search")?.trim();
    const statusFilter = searchParams.get("status");
    const packageFilter = searchParams.get("package");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10) || 50, 200);
    const offset = Math.max(parseInt(searchParams.get("offset") ?? "0", 10) || 0, 0);

    const conditions: any[] = [];

    if (searchQuery) {
      conditions.push(ilike(orgs.name, `%${searchQuery}%`));
    }
    if (statusFilter && statusFilter !== "all") {
      if (statusFilter === "suspended") {
        conditions.push(eq(orgs.channelType, "suspended"));
      } else if (statusFilter === "active") {
        conditions.push(sql`${orgs.channelType} != 'suspended'`);
      }
    }
    if (packageFilter && packageFilter !== "all") {
      conditions.push(eq(orgs.deploymentModel, packageFilter));
    }

    if (partnerIdParam && partnerIdParam !== "all") {
      if (partnerIdParam === "d2c") {
        const linkedOrgIds = await db
          .select({ orgId: partnerClients.orgId })
          .from(partnerClients);
        const linkedSet = new Set(linkedOrgIds.map((r) => r.orgId));
        if (linkedSet.size > 0) {
          conditions.push(sql`${orgs.id} NOT IN (${sql.join(Array.from(linkedSet).map(id => sql`${id}`), sql`, `)})`);
        }
      } else {
        const partnerId = parseInt(partnerIdParam, 10);
        if (isNaN(partnerId) || partnerId < 1) {
          return NextResponse.json({ error: "Invalid partner ID" }, { status: 400 });
        }
        const linkedOrgs = await db
          .select({ orgId: partnerClients.orgId })
          .from(partnerClients)
          .where(eq(partnerClients.partnerId, partnerId));
        const orgIds = linkedOrgs.map((r) => r.orgId);
        if (orgIds.length === 0) {
          return NextResponse.json({ clients: [], pagination: { total: 0, limit, offset } });
        }
        conditions.push(sql`${orgs.id} IN (${sql.join(orgIds.map(id => sql`${id}`), sql`, `)})`);
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const orgList = await db.select().from(orgs).where(whereClause).limit(limit).offset(offset);

    if (orgList.length === 0) {
      const [totalResult] = await db
        .select({ total: sql<number>`count(*)` })
        .from(orgs)
        .where(whereClause);
      return NextResponse.json({
        clients: [],
        pagination: { total: Number(totalResult.total), limit, offset },
      });
    }

    const orgIds = orgList.map((o) => o.id);

    const [
      partnerAssociations,
      callCountRows,
      revenueRows,
      ownerRows,
      walletRows,
      agentCountRows,
    ] = await Promise.all([
      db
        .select({
          orgId: partnerClients.orgId,
          partnerId: partnerClients.partnerId,
          partnerName: partners.name,
        })
        .from(partnerClients)
        .leftJoin(partners, eq(partnerClients.partnerId, partners.id))
        .where(inArray(partnerClients.orgId, orgIds)),

      db
        .select({
          orgId: callLogs.orgId,
          total: sql<number>`count(*)`,
        })
        .from(callLogs)
        .where(inArray(callLogs.orgId, orgIds))
        .groupBy(callLogs.orgId),

      db
        .select({
          orgId: billingLedger.orgId,
          total: sql<number>`COALESCE(SUM(${billingLedger.cost}), 0)`,
        })
        .from(billingLedger)
        .where(inArray(billingLedger.orgId, orgIds))
        .groupBy(billingLedger.orgId),

      db
        .select({
          orgId: orgMembers.orgId,
          email: users.email,
        })
        .from(orgMembers)
        .leftJoin(users, eq(orgMembers.userId, users.id))
        .where(and(inArray(orgMembers.orgId, orgIds), eq(orgMembers.role, "OWNER"))),

      db
        .select({
          orgId: wallets.orgId,
          balance: wallets.balance,
          isActive: wallets.isActive,
        })
        .from(wallets)
        .where(inArray(wallets.orgId, orgIds)),

      db
        .select({
          orgId: agents.orgId,
          count: sql<number>`count(*)`,
        })
        .from(agents)
        .where(inArray(agents.orgId, orgIds))
        .groupBy(agents.orgId),
    ]);

    const partnerMap = new Map<number, { partnerId: number; partnerName: string }>();
    for (const pa of partnerAssociations) {
      partnerMap.set(pa.orgId, {
        partnerId: pa.partnerId,
        partnerName: pa.partnerName ?? "Unknown Partner",
      });
    }

    const callCountMap = new Map<number, number>();
    for (const r of callCountRows) {
      callCountMap.set(r.orgId, Number(r.total));
    }

    const revenueMap = new Map<number, number>();
    for (const r of revenueRows) {
      revenueMap.set(r.orgId, Number(r.total));
    }

    const ownerMap = new Map<number, string>();
    for (const r of ownerRows) {
      if (r.email) ownerMap.set(r.orgId, r.email);
    }

    const walletMap = new Map<number, { balance: number; isActive: boolean }>();
    for (const r of walletRows) {
      walletMap.set(r.orgId, {
        balance: Number(r.balance),
        isActive: r.isActive ?? true,
      });
    }

    const agentCountMap = new Map<number, number>();
    for (const r of agentCountRows) {
      agentCountMap.set(r.orgId, Number(r.count));
    }

    const clients = orgList.map((org) => {
      const partner = partnerMap.get(org.id);
      const wallet = walletMap.get(org.id);
      return {
        id: org.id,
        businessName: org.name,
        ownerEmail: ownerMap.get(org.id) ?? null,
        partnerName: partner?.partnerName ?? "D2C",
        partnerId: partner?.partnerId ?? null,
        channelType: org.channelType,
        deploymentModel: org.deploymentModel ?? "individual",
        totalCalls: callCountMap.get(org.id) ?? 0,
        totalRevenue: revenueMap.get(org.id) ?? 0,
        walletBalance: wallet?.balance ?? 0,
        walletActive: wallet?.isActive ?? true,
        agentCount: agentCountMap.get(org.id) ?? 0,
        joinedAt: org.createdAt,
      };
    });

    const [totalResult] = await db
      .select({ total: sql<number>`count(*)` })
      .from(orgs)
      .where(whereClause);

    return NextResponse.json({
      clients,
      pagination: { total: Number(totalResult.total), limit, offset },
    });
  } catch (error) {
    return handleRouteError(error, "AdminClients");
  }
}
