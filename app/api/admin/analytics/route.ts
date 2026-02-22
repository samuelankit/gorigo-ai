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

    const partnerRevenueData = await db.execute(sql`
      SELECT
        p.id AS "partnerId",
        p.name AS "partnerName",
        p.tier,
        p.status,
        COALESCE(client_counts.cnt, 0)::int AS "clientCount",
        COALESCE(rev.total, 0)::numeric AS "totalRevenue",
        COALESCE(calls.total, 0)::int AS "totalCalls"
      FROM partners p
      LEFT JOIN (
        SELECT partner_id, COUNT(*)::int AS cnt
        FROM partner_clients
        GROUP BY partner_id
      ) client_counts ON client_counts.partner_id = p.id
      LEFT JOIN (
        SELECT pc.partner_id, SUM(bl.cost) AS total
        FROM partner_clients pc
        JOIN billing_ledger bl ON bl.org_id = pc.org_id
        GROUP BY pc.partner_id
      ) rev ON rev.partner_id = p.id
      LEFT JOIN (
        SELECT pc.partner_id, COUNT(*)::int AS total
        FROM partner_clients pc
        JOIN call_logs cl ON cl.org_id = pc.org_id
        GROUP BY pc.partner_id
      ) calls ON calls.partner_id = p.id
      ORDER BY client_counts.cnt DESC NULLS LAST
    `).then(res => res.rows.map((r: any) => ({
      partnerId: r.partnerId,
      partnerName: r.partnerName,
      tier: r.tier,
      status: r.status,
      clientCount: Number(r.clientCount),
      totalRevenue: Math.round(Number(r.totalRevenue ?? 0) * 100) / 100,
      totalCalls: Number(r.totalCalls),
    })));

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
