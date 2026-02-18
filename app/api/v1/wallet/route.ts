import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { wallets, walletTransactions } from "@/shared/schema";
import { eq, desc } from "drizzle-orm";
import { getAuthenticatedUser, requireApiKeyScope } from "@/lib/get-user";
import { apiKeyLimiter } from "@/lib/rate-limit";
import { withCors, corsOptionsResponse } from "@/lib/v1-cors";
import { handleRouteError } from "@/lib/api-error";

export async function OPTIONS(request: NextRequest) {
  return corsOptionsResponse(request);
}

export async function GET(request: NextRequest) {
  try {
    const rl = await apiKeyLimiter(request);
    if (!rl.allowed) {
      return withCors(NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 }), request);
    }

    const auth = await getAuthenticatedUser();
    if (!auth) return withCors(NextResponse.json({ error: "Not authenticated. Provide a valid API key via X-Api-Key header." }, { status: 401 }), request);
    if (!auth.orgId) return withCors(NextResponse.json({ error: "No organization found" }, { status: 404 }), request);
    const scopeCheck = requireApiKeyScope(auth, "billing:read");
    if (!scopeCheck.allowed) return withCors(NextResponse.json({ error: scopeCheck.error }, { status: scopeCheck.status || 403 }), request);

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
    }, { status: 200 }), request);
  } catch (error) {
    return handleRouteError(error, "V1Wallet");
  }
}
