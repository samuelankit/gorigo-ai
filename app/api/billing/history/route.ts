import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { billingLedger, wallets, walletTransactions } from "@/shared/schema";
import { eq, desc, sql } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";
import { getWalletBalance } from "@/lib/wallet";
import { billingLimiter } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/api-error";

export async function GET(request: NextRequest) {
  try {
    const rl = await billingLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const balance = await getWalletBalance(auth.orgId);

    const ledger = await db
      .select()
      .from(billingLedger)
      .where(eq(billingLedger.orgId, auth.orgId))
      .orderBy(desc(billingLedger.createdAt))
      .limit(100);

    const transactions = await db
      .select()
      .from(walletTransactions)
      .where(eq(walletTransactions.orgId, auth.orgId))
      .orderBy(desc(walletTransactions.createdAt))
      .limit(100);

    return NextResponse.json({
      walletBalance: balance,
      billingEntries: ledger,
      transactions,
    });
  } catch (error) {
    return handleRouteError(error, "BillingHistory");
  }
}
