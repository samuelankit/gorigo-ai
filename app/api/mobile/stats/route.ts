import { db } from "@/lib/db";
import { callLogs, agents, billingLedger, wallets } from "@/shared/schema";
import { sql, eq, and, gte, count } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";
import { NextRequest, NextResponse } from "next/server";
import { settingsLimiter } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const rl = await settingsLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgId = auth.orgId;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [callStats, agentStats, walletData, revenueData] = await Promise.all([
      db
        .select({
          totalCalls: count(),
          todayCalls: sql<number>`count(*) FILTER (WHERE ${callLogs.createdAt} >= ${todayStart})::int`,
          totalDuration: sql<number>`COALESCE(SUM(${callLogs.duration}), 0)::int`,
        })
        .from(callLogs)
        .where(eq(callLogs.orgId, orgId)),

      db
        .select({
          total: count(),
          active: sql<number>`count(*) FILTER (WHERE ${agents.status} = 'active')::int`,
        })
        .from(agents)
        .where(eq(agents.orgId, orgId)),

      db
        .select({
          balance: wallets.balance,
          currency: wallets.currency,
        })
        .from(wallets)
        .where(eq(wallets.orgId, orgId))
        .limit(1),

      db
        .select({
          totalRevenue: sql<number>`COALESCE(SUM(${billingLedger.cost}), 0)`,
          monthRevenue: sql<number>`COALESCE(SUM(CASE WHEN ${billingLedger.createdAt} >= date_trunc('month', CURRENT_DATE) THEN ${billingLedger.cost} ELSE 0 END), 0)`,
        })
        .from(billingLedger)
        .where(eq(billingLedger.orgId, orgId)),
    ]);

    return NextResponse.json({
      calls: {
        total: callStats[0]?.totalCalls ?? 0,
        today: callStats[0]?.todayCalls ?? 0,
        totalDuration: callStats[0]?.totalDuration ?? 0,
      },
      agents: {
        total: agentStats[0]?.total ?? 0,
        active: agentStats[0]?.active ?? 0,
      },
      wallet: {
        balance: Number(walletData[0]?.balance ?? 0),
        currency: walletData[0]?.currency ?? "GBP",
      },
      revenue: {
        total: Number(revenueData[0]?.totalRevenue ?? 0),
        thisMonth: Number(revenueData[0]?.monthRevenue ?? 0),
      },
    }, {
      headers: { "Cache-Control": "private, max-age=15" },
    });
  } catch (error) {
    return handleRouteError(error, "MobileStats");
  }
}
