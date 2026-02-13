import { db } from "@/lib/db";
import { orgs, partnerClients, partners, callLogs, billingLedger, orgMembers, users, wallets, agents } from "@/shared/schema";
import { eq, sql, and, ilike, or } from "drizzle-orm";
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

    let orgList;
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

    orgList = await db.select().from(orgs).where(whereClause).limit(limit).offset(offset);

    const clients = await Promise.all(
      orgList.map(async (org) => {
        const [pc] = await db
          .select({ partnerId: partnerClients.partnerId })
          .from(partnerClients)
          .where(eq(partnerClients.orgId, org.id))
          .limit(1);

        let partnerName = "D2C";
        let partnerId: number | null = null;
        if (pc) {
          const [p] = await db
            .select({ name: partners.name })
            .from(partners)
            .where(eq(partners.id, pc.partnerId))
            .limit(1);
          if (p) partnerName = p.name;
          partnerId = pc.partnerId;
        }

        const [callStats] = await db
          .select({ total: sql<number>`count(*)` })
          .from(callLogs)
          .where(eq(callLogs.orgId, org.id));

        const [revenueStats] = await db
          .select({ total: sql<number>`COALESCE(SUM(${billingLedger.cost}), 0)` })
          .from(billingLedger)
          .where(eq(billingLedger.orgId, org.id));

        const [owner] = await db
          .select({ email: users.email })
          .from(orgMembers)
          .leftJoin(users, eq(orgMembers.userId, users.id))
          .where(and(eq(orgMembers.orgId, org.id), eq(orgMembers.role, "OWNER")))
          .limit(1);

        const [wallet] = await db
          .select({ balance: wallets.balance, isActive: wallets.isActive })
          .from(wallets)
          .where(eq(wallets.orgId, org.id))
          .limit(1);

        const [agentCount] = await db
          .select({ count: sql<number>`count(*)` })
          .from(agents)
          .where(eq(agents.orgId, org.id));

        return {
          id: org.id,
          businessName: org.name,
          ownerEmail: owner?.email ?? null,
          partnerName,
          partnerId,
          channelType: org.channelType,
          deploymentModel: org.deploymentModel ?? "managed",
          totalCalls: Number(callStats.total),
          totalRevenue: Number(revenueStats.total),
          walletBalance: wallet ? Number(wallet.balance) : 0,
          walletActive: wallet?.isActive ?? true,
          agentCount: Number(agentCount?.count ?? 0),
          joinedAt: org.createdAt,
        };
      })
    );

    const [totalResult] = await db
      .select({ total: sql<number>`count(*)` })
      .from(orgs)
      .where(whereClause);

    return NextResponse.json({
      clients,
      pagination: { total: Number(totalResult.total), limit, offset },
    });
  } catch (error) {
    console.error("Admin list clients error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
