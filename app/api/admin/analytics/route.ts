import { db } from "@/lib/db";
import { partners, orgs, callLogs, billingLedger, partnerClients, users } from "@/shared/schema";
import { sql, count, sum, eq, desc, and, gte } from "drizzle-orm";
import { getAuthenticatedUser, requireSuperAdmin } from "@/lib/get-user";
import { NextRequest, NextResponse } from "next/server";
import { adminLimiter } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/api-error";

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

    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const revenueByMonth = await db
      .select({
        month: sql<string>`TO_CHAR(${billingLedger.createdAt}, 'YYYY-MM')`,
        revenue: sum(billingLedger.cost),
        count: count(),
      })
      .from(billingLedger)
      .where(gte(billingLedger.createdAt, sixMonthsAgo))
      .groupBy(sql`TO_CHAR(${billingLedger.createdAt}, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(${billingLedger.createdAt}, 'YYYY-MM')`);

    const callsByMonth = await db
      .select({
        month: sql<string>`TO_CHAR(${callLogs.createdAt}, 'YYYY-MM')`,
        total: count(),
        completed: sum(sql<number>`CASE WHEN ${callLogs.status} = 'completed' THEN 1 ELSE 0 END`),
        missed: sum(sql<number>`CASE WHEN ${callLogs.status} = 'missed' THEN 1 ELSE 0 END`),
        failed: sum(sql<number>`CASE WHEN ${callLogs.status} = 'failed' THEN 1 ELSE 0 END`),
      })
      .from(callLogs)
      .where(gte(callLogs.createdAt, sixMonthsAgo))
      .groupBy(sql`TO_CHAR(${callLogs.createdAt}, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(${callLogs.createdAt}, 'YYYY-MM')`);

    const partnerPerformance = await db
      .select({
        partnerId: partners.id,
        partnerName: partners.name,
        tier: partners.tier,
        status: partners.status,
        clientCount: count(partnerClients.id),
      })
      .from(partners)
      .leftJoin(partnerClients, eq(partners.id, partnerClients.partnerId))
      .groupBy(partners.id, partners.name, partners.tier, partners.status)
      .orderBy(desc(sql`count(${partnerClients.id})`));

    const partnerRevenueData = [];
    for (const p of partnerPerformance) {
      const clientOrgs = await db
        .select({ orgId: partnerClients.orgId })
        .from(partnerClients)
        .where(eq(partnerClients.partnerId, p.partnerId));

      let totalRevenue = 0;
      let totalCalls = 0;
      if (clientOrgs.length > 0) {
        const orgIds = clientOrgs.map((c) => c.orgId);
        const [revResult] = await db
          .select({ total: sum(billingLedger.cost) })
          .from(billingLedger)
          .where(sql`${billingLedger.orgId} IN (${sql.join(orgIds.map(id => sql`${id}`), sql`, `)})`);
        totalRevenue = Number(revResult.total ?? 0);

        const [callResult] = await db
          .select({ total: count() })
          .from(callLogs)
          .where(sql`${callLogs.orgId} IN (${sql.join(orgIds.map(id => sql`${id}`), sql`, `)})`);
        totalCalls = Number(callResult.total ?? 0);
      }

      partnerRevenueData.push({
        ...p,
        clientCount: Number(p.clientCount),
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalCalls,
      });
    }

    const clientGrowth = await db
      .select({
        month: sql<string>`TO_CHAR(${orgs.createdAt}, 'YYYY-MM')`,
        newClients: count(),
      })
      .from(orgs)
      .where(gte(orgs.createdAt, sixMonthsAgo))
      .groupBy(sql`TO_CHAR(${orgs.createdAt}, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(${orgs.createdAt}, 'YYYY-MM')`);

    const [totalOrgs] = await db.select({ total: count() }).from(orgs);
    const months: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }

    const growthMap = new Map(clientGrowth.map((g) => [g.month, Number(g.newClients)]));
    let cumulative = Math.max(Number(totalOrgs.total) - Array.from(growthMap.values()).reduce((a, b) => a + b, 0), 0);

    const clientGrowthTimeline = months.map((month) => {
      const newCount = growthMap.get(month) ?? 0;
      cumulative += newCount;
      return { month, newClients: newCount, totalClients: cumulative };
    });

    const callsByDay = await db
      .select({
        day: sql<string>`TO_CHAR(${callLogs.createdAt}, 'YYYY-MM-DD')`,
        total: count(),
      })
      .from(callLogs)
      .where(gte(callLogs.createdAt, new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)))
      .groupBy(sql`TO_CHAR(${callLogs.createdAt}, 'YYYY-MM-DD')`)
      .orderBy(sql`TO_CHAR(${callLogs.createdAt}, 'YYYY-MM-DD')`);

    const [pendingPartners] = await db
      .select({ total: count() })
      .from(partners)
      .where(eq(partners.status, "pending"));

    const [suspendedPartners] = await db
      .select({ total: count() })
      .from(partners)
      .where(eq(partners.status, "suspended"));

    return NextResponse.json({
      revenueByMonth: revenueByMonth.map((r) => ({
        month: r.month,
        revenue: Math.round(Number(r.revenue ?? 0) * 100) / 100,
        transactions: Number(r.count),
      })),
      callsByMonth: callsByMonth.map((c) => ({
        month: c.month,
        total: Number(c.total),
        completed: Number(c.completed ?? 0),
        missed: Number(c.missed ?? 0),
        failed: Number(c.failed ?? 0),
      })),
      partnerPerformance: partnerRevenueData,
      clientGrowth: clientGrowthTimeline,
      callsByDay: callsByDay.map((d) => ({
        day: d.day,
        calls: Number(d.total),
      })),
      alerts: {
        pendingApprovals: Number(pendingPartners.total),
        suspendedPartners: Number(suspendedPartners.total),
      },
    });
  } catch (error) {
    return handleRouteError(error, "AdminAnalytics");
  }
}
