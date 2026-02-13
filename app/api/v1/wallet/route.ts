import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { wallets, walletTransactions } from "@/shared/schema";
import { eq, desc } from "drizzle-orm";
import { getAuthenticatedUser, requireApiKeyScope } from "@/lib/get-user";
import { apiKeyLimiter } from "@/lib/rate-limit";
import { withCors, corsOptionsResponse } from "@/lib/v1-cors";

export async function OPTIONS() {
  return corsOptionsResponse();
}

export async function GET(request: NextRequest) {
  try {
    const rl = await apiKeyLimiter(request);
    if (!rl.allowed) {
      return withCors(NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 }));
    }

    const auth = await getAuthenticatedUser();
    if (!auth) return withCors(NextResponse.json({ error: "Not authenticated. Provide a valid API key via X-Api-Key header." }, { status: 401 }));
    if (!auth.orgId) return withCors(NextResponse.json({ error: "No organization found" }, { status: 404 }));
    const scopeCheck = requireApiKeyScope(auth, "billing:read");
    if (!scopeCheck.allowed) return withCors(NextResponse.json({ error: scopeCheck.error }, { status: scopeCheck.status || 403 }));

    const [wallet] = await db
      .select({
        balance: wallets.balance,
        currency: wallets.currency,
        lowBalanceThreshold: wallets.lowBalanceThreshold,
        isActive: wallets.isActive,
      })
      .from(wallets)
      .where(eq(wallets.orgId, auth.orgId))
      .limit(1);

    const recentTransactions = await db
      .select()
      .from(walletTransactions)
      .where(eq(walletTransactions.orgId, auth.orgId))
      .orderBy(desc(walletTransactions.createdAt))
      .limit(10);

    return withCors(NextResponse.json({
      wallet: wallet || { balance: 0, currency: "GBP", lowBalanceThreshold: 10, isActive: false },
      recentTransactions,
    }, { status: 200 }));
  } catch (error) {
    console.error("V1 wallet error:", error);
    return withCors(NextResponse.json({ error: "Internal server error" }, { status: 500 }));
  }
}
