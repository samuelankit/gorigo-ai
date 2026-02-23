import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/get-user";
import { getOrCreateWallet, isLowBalance } from "@/lib/wallet";
import { db } from "@/lib/db";
import { walletTransactions } from "@/shared/schema";
import { eq, desc, sql } from "drizzle-orm";
import { settingsLimiter } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/api-error";

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

    const wallet = await getOrCreateWallet(auth.orgId);
    const lowBalance = await isLowBalance(auth.orgId);

    const [stats] = await db
      .select({
        totalTopUps: sql<number>`COALESCE(SUM(CASE WHEN ${walletTransactions.type} = 'top_up' THEN ${walletTransactions.amount} ELSE 0 END), 0)`,
        totalDeductions: sql<number>`COALESCE(SUM(CASE WHEN ${walletTransactions.type} = 'deduction' THEN ABS(${walletTransactions.amount}) ELSE 0 END), 0)`,
        transactionCount: sql<number>`COUNT(*)`,
      })
      .from(walletTransactions)
      .where(eq(walletTransactions.orgId, auth.orgId));

    const balance = Number(wallet.balance);
    const lockedBal = Number(wallet.lockedBalance ?? 0);
    const availableBal = balance - lockedBal;

    return NextResponse.json({
      wallet: {
        balance: wallet.balance,
        currency: wallet.currency,
        lowBalanceThreshold: wallet.lowBalanceThreshold,
        isActive: wallet.isActive,
        lowBalance,
        lockedBalance: lockedBal,
        availableBalance: availableBal,
      },
      stats: {
        totalTopUps: Number(stats.totalTopUps),
        totalDeductions: Number(stats.totalDeductions),
        transactionCount: Number(stats.transactionCount),
      },
    });
  } catch (error) {
    return handleRouteError(error, "Wallet");
  }
}
