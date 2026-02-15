import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  orgs, partners, partnerClients, affiliates, affiliateCommissions,
  wallets, walletTransactions, affiliatePayouts
} from "@/shared/schema";
import { eq, desc, sql, and, gte } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";
import { adminLimiter } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  try {
    const rl = await adminLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    const auth = await getAuthenticatedUser();
    if (!auth || auth.globalRole !== "SUPERADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const [channelBreakdown] = await db.select({
      totalOrgs: sql<number>`COUNT(*)`,
      d2cCount: sql<number>`COUNT(*) FILTER (WHERE ${orgs.channelType} = 'd2c' OR ${orgs.channelType} IS NULL)`,
      partnerCount: sql<number>`COUNT(*) FILTER (WHERE ${orgs.channelType} = 'partner')`,
      affiliateCount: sql<number>`COUNT(*) FILTER (WHERE ${orgs.channelType} = 'affiliate')`,
    }).from(orgs);

    const [partnerStats] = await db.select({
      totalPartners: sql<number>`COUNT(*)`,
      activePartners: sql<number>`COUNT(*) FILTER (WHERE ${partners.status} = 'active')`,
      totalClients: sql<number>`COALESCE(SUM(${partners.maxClients}), 0)`,
    }).from(partners);

    const actualPartnerClients = await db.select({
      count: sql<number>`COUNT(*)`,
    }).from(partnerClients).where(eq(partnerClients.status, "active"));

    const [affiliateStats] = await db.select({
      totalAffiliates: sql<number>`COUNT(*)`,
      activeAffiliates: sql<number>`COUNT(*) FILTER (WHERE ${affiliates.status} = 'active')`,
      platformAffiliates: sql<number>`COUNT(*) FILTER (WHERE ${affiliates.ownerType} = 'platform')`,
      partnerAffiliates: sql<number>`COUNT(*) FILTER (WHERE ${affiliates.ownerType} = 'partner')`,
      totalClicks: sql<number>`COALESCE(SUM(${affiliates.totalClicks}), 0)`,
      totalSignups: sql<number>`COALESCE(SUM(${affiliates.totalSignups}), 0)`,
      totalCommissions: sql<number>`COALESCE(SUM(${affiliates.totalEarnings}), 0)`,
      pendingPayouts: sql<number>`COALESCE(SUM(${affiliates.pendingPayout}), 0)`,
    }).from(affiliates);

    const [revenueStats] = await db.select({
      totalWalletBalance: sql<number>`COALESCE(SUM(${wallets.balance}), 0)`,
      totalWallets: sql<number>`COUNT(*)`,
    }).from(wallets);

    const [recentRevenue] = await db.select({
      totalDeductions: sql<number>`COALESCE(SUM(ABS(${walletTransactions.amount})), 0)`,
      totalTopUps: sql<number>`COALESCE(SUM(CASE WHEN ${walletTransactions.type} = 'top_up' THEN ${walletTransactions.amount} ELSE 0 END), 0)`,
      totalSpend: sql<number>`COALESCE(SUM(CASE WHEN ${walletTransactions.type} = 'deduction' THEN ABS(${walletTransactions.amount}) ELSE 0 END), 0)`,
    }).from(walletTransactions)
      .where(gte(walletTransactions.createdAt, sixMonthsAgo));

    const [commissionStats] = await db.select({
      totalCommissionsAccrued: sql<number>`COALESCE(SUM(${affiliateCommissions.commissionAmount}), 0)`,
      pendingCommissions: sql<number>`COALESCE(SUM(CASE WHEN ${affiliateCommissions.status} = 'pending' THEN ${affiliateCommissions.commissionAmount} ELSE 0 END), 0)`,
    }).from(affiliateCommissions);

    const revenueByMonth = await db.select({
      month: sql<string>`TO_CHAR(${walletTransactions.createdAt}, 'YYYY-MM')`,
      topUps: sql<number>`COALESCE(SUM(CASE WHEN ${walletTransactions.type} = 'top_up' THEN ${walletTransactions.amount} ELSE 0 END), 0)`,
      spend: sql<number>`COALESCE(SUM(CASE WHEN ${walletTransactions.type} = 'deduction' THEN ABS(${walletTransactions.amount}) ELSE 0 END), 0)`,
      commissions: sql<number>`COALESCE(SUM(CASE WHEN ${walletTransactions.referenceType} = 'affiliate_commission' THEN ${walletTransactions.amount} ELSE 0 END), 0)`,
      revenueShare: sql<number>`COALESCE(SUM(CASE WHEN ${walletTransactions.referenceType} = 'partner_revenue_share' THEN ${walletTransactions.amount} ELSE 0 END), 0)`,
    })
      .from(walletTransactions)
      .where(gte(walletTransactions.createdAt, sixMonthsAgo))
      .groupBy(sql`TO_CHAR(${walletTransactions.createdAt}, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(${walletTransactions.createdAt}, 'YYYY-MM')`);

    const topPartners = await db
      .select({
        id: partners.id,
        name: partners.name,
        tier: partners.tier,
        status: partners.status,
        revenueSharePercent: partners.revenueSharePercent,
        clientCount: sql<number>`(SELECT COUNT(*) FROM partner_clients WHERE partner_id = ${partners.id} AND status = 'active')`,
      })
      .from(partners)
      .where(eq(partners.status, "active"))
      .orderBy(desc(partners.createdAt))
      .limit(10);

    const topAffiliates = await db
      .select()
      .from(affiliates)
      .where(eq(affiliates.status, "active"))
      .orderBy(desc(affiliates.totalEarnings))
      .limit(10);

    const waterfall = {
      grossRevenue: Number(recentRevenue?.totalSpend ?? 0),
      partnerRevenueShare: Number(commissionStats?.pendingCommissions ?? 0) * 0.3,
      affiliateCommissions: Number(commissionStats?.totalCommissionsAccrued ?? 0),
      netRevenue: Number(recentRevenue?.totalSpend ?? 0) - Number(commissionStats?.totalCommissionsAccrued ?? 0),
    };

    return NextResponse.json({
      channelBreakdown,
      partnerStats: {
        ...partnerStats,
        actualActiveClients: actualPartnerClients[0]?.count ?? 0,
      },
      affiliateStats,
      revenueStats,
      recentRevenue,
      commissionStats,
      revenueByMonth,
      topPartners,
      topAffiliates,
      waterfall,
    });
  } catch (error) {
    console.error("Distribution overview error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
