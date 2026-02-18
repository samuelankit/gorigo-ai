import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, requireSuperAdmin } from "@/lib/get-user";
import { db } from "@/lib/db";
import { billingLedger, walletTransactions, distributionLedger, orgs, wallets, callLogs } from "@/shared/schema";
import { sql, eq, and, gte, desc } from "drizzle-orm";
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
    const days = parseInt(searchParams.get("days") || "30", 10) || 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [
      kpiResults,
      packageBreakdown,
      monthlyTrends,
      topClients,
      recentTransactions,
      commissionSummary,
      mrrData,
    ] = await Promise.all([
      db.select({
        totalRevenue: sql<number>`COALESCE(SUM(CAST(${billingLedger.cost} AS numeric)), 0)`,
        totalCalls: sql<number>`COUNT(*)`,
        totalMinutes: sql<number>`COALESCE(SUM(${billingLedger.billableSeconds}), 0) / 60.0`,
        avgRevenuePerCall: sql<number>`CASE WHEN COUNT(*) > 0 THEN COALESCE(SUM(CAST(${billingLedger.cost} AS numeric)), 0) / COUNT(*) ELSE 0 END`,
      }).from(billingLedger)
        .where(and(
          gte(billingLedger.createdAt, since),
          sql`${billingLedger.status} IN ('completed', 'billed', 'settled')`
        )),

      db.select({
        deploymentModel: sql<string>`COALESCE(${callLogs.billedDeploymentModel}, ${orgs.deploymentModel}, 'managed')`,
        revenue: sql<number>`COALESCE(SUM(CAST(${billingLedger.cost} AS numeric)), 0)`,
        calls: sql<number>`COUNT(*)`,
        minutes: sql<number>`COALESCE(SUM(${billingLedger.billableSeconds}), 0) / 60.0`,
      }).from(billingLedger)
        .leftJoin(callLogs, eq(callLogs.id, billingLedger.callLogId))
        .leftJoin(orgs, eq(orgs.id, billingLedger.orgId))
        .where(and(
          gte(billingLedger.createdAt, since),
          sql`${billingLedger.status} IN ('completed', 'billed', 'settled')`
        ))
        .groupBy(sql`COALESCE(${callLogs.billedDeploymentModel}, ${orgs.deploymentModel}, 'managed')`),

      db.select({
        month: sql<string>`to_char(${billingLedger.createdAt}, 'YYYY-MM')`,
        revenue: sql<number>`COALESCE(SUM(CAST(${billingLedger.cost} AS numeric)), 0)`,
        calls: sql<number>`COUNT(*)`,
        minutes: sql<number>`COALESCE(SUM(${billingLedger.billableSeconds}), 0) / 60.0`,
      }).from(billingLedger)
        .where(and(
          gte(billingLedger.createdAt, new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)),
          sql`${billingLedger.status} IN ('completed', 'billed', 'settled')`
        ))
        .groupBy(sql`to_char(${billingLedger.createdAt}, 'YYYY-MM')`)
        .orderBy(sql`to_char(${billingLedger.createdAt}, 'YYYY-MM')`),

      db.select({
        orgId: billingLedger.orgId,
        orgName: orgs.name,
        deploymentModel: orgs.deploymentModel,
        revenue: sql<number>`COALESCE(SUM(CAST(${billingLedger.cost} AS numeric)), 0)`,
        calls: sql<number>`COUNT(*)`,
        minutes: sql<number>`COALESCE(SUM(${billingLedger.billableSeconds}), 0) / 60.0`,
      }).from(billingLedger)
        .innerJoin(orgs, eq(orgs.id, billingLedger.orgId))
        .where(and(
          gte(billingLedger.createdAt, since),
          sql`${billingLedger.status} IN ('completed', 'billed', 'settled')`
        ))
        .groupBy(billingLedger.orgId, orgs.name, orgs.deploymentModel)
        .orderBy(sql`COALESCE(SUM(CAST(${billingLedger.cost} AS numeric)), 0) DESC`)
        .limit(15),

      db.select({
        id: walletTransactions.id,
        orgId: walletTransactions.orgId,
        orgName: orgs.name,
        type: walletTransactions.type,
        amount: walletTransactions.amount,
        description: walletTransactions.description,
        createdAt: walletTransactions.createdAt,
      }).from(walletTransactions)
        .innerJoin(orgs, eq(orgs.id, walletTransactions.orgId))
        .where(gte(walletTransactions.createdAt, since))
        .orderBy(desc(walletTransactions.createdAt))
        .limit(50),

      db.select({
        channel: distributionLedger.channel,
        totalAmount: sql<number>`COALESCE(SUM(CAST(${distributionLedger.totalAmount} AS numeric)), 0)`,
        platformAmount: sql<number>`COALESCE(SUM(CAST(${distributionLedger.platformAmount} AS numeric)), 0)`,
        partnerAmount: sql<number>`COALESCE(SUM(CAST(${distributionLedger.partnerAmount} AS numeric)), 0)`,
        resellerAmount: sql<number>`COALESCE(SUM(CAST(${distributionLedger.resellerAmount} AS numeric)), 0)`,
        affiliateAmount: sql<number>`COALESCE(SUM(CAST(${distributionLedger.affiliateAmount} AS numeric)), 0)`,
        count: sql<number>`COUNT(*)`,
      }).from(distributionLedger)
        .where(gte(distributionLedger.createdAt, since))
        .groupBy(distributionLedger.channel),

      db.select({
        month: sql<string>`to_char(${billingLedger.createdAt}, 'YYYY-MM')`,
        activeClients: sql<number>`COUNT(DISTINCT ${billingLedger.orgId})`,
        revenue: sql<number>`COALESCE(SUM(CAST(${billingLedger.cost} AS numeric)), 0)`,
      }).from(billingLedger)
        .where(and(
          gte(billingLedger.createdAt, new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)),
          sql`${billingLedger.status} IN ('completed', 'billed', 'settled')`
        ))
        .groupBy(sql`to_char(${billingLedger.createdAt}, 'YYYY-MM')`)
        .orderBy(sql`to_char(${billingLedger.createdAt}, 'YYYY-MM') DESC`)
        .limit(3),
    ]);

    const kpi = kpiResults[0] || { totalRevenue: 0, totalCalls: 0, totalMinutes: 0, avgRevenuePerCall: 0 };

    const totalTopUps = await db
      .select({
        total: sql<number>`COALESCE(SUM(CAST(${walletTransactions.amount} AS numeric)), 0)`,
      })
      .from(walletTransactions)
      .where(
        and(
          eq(walletTransactions.type, "top_up"),
          gte(walletTransactions.createdAt, since)
        )
      );

    const currentMrr = mrrData.length > 0 ? parseFloat(String(mrrData[0].revenue)) : 0;
    const previousMrr = mrrData.length > 1 ? parseFloat(String(mrrData[1].revenue)) : 0;
    const mrrGrowth = previousMrr > 0 ? ((currentMrr - previousMrr) / previousMrr * 100) : 0;

    return NextResponse.json({
      kpi: {
        totalRevenue: parseFloat(String(kpi.totalRevenue)),
        totalCalls: Number(kpi.totalCalls),
        totalMinutes: Math.round(parseFloat(String(kpi.totalMinutes)) * 10) / 10,
        avgRevenuePerCall: Math.round(parseFloat(String(kpi.avgRevenuePerCall)) * 100) / 100,
        totalTopUps: parseFloat(String(totalTopUps[0]?.total || 0)),
        mrr: Math.round(currentMrr * 100) / 100,
        mrrGrowth: Math.round(mrrGrowth * 10) / 10,
      },
      packageBreakdown: packageBreakdown.map(p => ({
        deploymentModel: p.deploymentModel || "managed",
        revenue: Math.round(parseFloat(String(p.revenue)) * 100) / 100,
        calls: Number(p.calls),
        minutes: Math.round(parseFloat(String(p.minutes)) * 10) / 10,
      })),
      monthlyTrends: monthlyTrends.map(m => ({
        month: m.month,
        revenue: Math.round(parseFloat(String(m.revenue)) * 100) / 100,
        calls: Number(m.calls),
        minutes: Math.round(parseFloat(String(m.minutes)) * 10) / 10,
      })),
      topClients: topClients.map(c => ({
        orgId: c.orgId,
        orgName: c.orgName || "Unknown",
        deploymentModel: c.deploymentModel || "managed",
        revenue: Math.round(parseFloat(String(c.revenue)) * 100) / 100,
        calls: Number(c.calls),
        minutes: Math.round(parseFloat(String(c.minutes)) * 10) / 10,
      })),
      recentTransactions: recentTransactions.map(t => ({
        id: t.id,
        orgId: t.orgId,
        orgName: t.orgName || "Unknown",
        type: t.type,
        amount: parseFloat(String(t.amount)),
        description: t.description,
        createdAt: t.createdAt,
      })),
      commissionSummary: commissionSummary.map(c => ({
        channel: c.channel,
        totalAmount: Math.round(parseFloat(String(c.totalAmount)) * 100) / 100,
        platformAmount: Math.round(parseFloat(String(c.platformAmount)) * 100) / 100,
        partnerAmount: Math.round(parseFloat(String(c.partnerAmount)) * 100) / 100,
        resellerAmount: Math.round(parseFloat(String(c.resellerAmount)) * 100) / 100,
        affiliateAmount: Math.round(parseFloat(String(c.affiliateAmount)) * 100) / 100,
        count: Number(c.count),
      })),
      days,
    });
  } catch (error) {
    return handleRouteError(error, "AdminRevenue");
  }
}
