import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { wallets, walletTransactions, orgs } from "@/shared/schema";
import { eq, desc, sql } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";
import { topUpWallet } from "@/lib/wallet";
import { logAudit } from "@/lib/audit";
import { adminLimiter } from "@/lib/rate-limit";
import { checkBodySize, BODY_LIMITS } from "@/lib/body-limit";

async function requireSuperAdmin() {
  const auth = await getAuthenticatedUser();
  if (!auth || auth.globalRole !== "SUPERADMIN") return null;
  return auth;
}

export async function GET() {
  try {
    const auth = await requireSuperAdmin();
    if (!auth) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const allWallets = await db
      .select({
        id: wallets.id,
        orgId: wallets.orgId,
        orgName: orgs.name,
        balance: wallets.balance,
        currency: wallets.currency,
        lowBalanceThreshold: wallets.lowBalanceThreshold,
        isActive: wallets.isActive,
        updatedAt: wallets.updatedAt,
      })
      .from(wallets)
      .leftJoin(orgs, eq(wallets.orgId, orgs.id))
      .orderBy(desc(wallets.updatedAt));

    const [totals] = await db
      .select({
        totalBalance: sql<number>`COALESCE(SUM(${wallets.balance}), 0)`,
        walletCount: sql<number>`COUNT(*)`,
        lowBalanceCount: sql<number>`SUM(CASE WHEN ${wallets.balance} <= ${wallets.lowBalanceThreshold} THEN 1 ELSE 0 END)`,
      })
      .from(wallets);

    return NextResponse.json({
      wallets: allWallets,
      summary: {
        totalBalance: Number(totals.totalBalance),
        walletCount: Number(totals.walletCount),
        lowBalanceCount: Number(totals.lowBalanceCount),
      },
    });
  } catch (error) {
    console.error("Admin get wallets error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const rl = await adminLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const sizeError = checkBodySize(request, BODY_LIMITS.admin);
    if (sizeError) return sizeError;

    const auth = await requireSuperAdmin();
    if (!auth) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { orgId, amount, description } = body;

    if (!orgId || !amount || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json({ error: "orgId and positive amount required" }, { status: 400 });
    }

    const result = await topUpWallet(orgId, amount, description || "Admin top-up", "system");

    await logAudit({
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: "wallet.admin_topup",
      entityType: "wallet",
      entityId: orgId,
      details: { amount, newBalance: result.newBalance, description },
    });

    return NextResponse.json({
      success: true,
      newBalance: result.newBalance,
      transaction: result.transaction,
    });
  } catch (error) {
    console.error("Admin wallet top-up error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
