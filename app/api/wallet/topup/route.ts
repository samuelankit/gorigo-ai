import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/get-user";
import { topUpWallet } from "@/lib/wallet";
import { knowledgeLimiter } from "@/lib/rate-limit";
import { checkBodySize, BODY_LIMITS } from "@/lib/body-limit";
import { logAudit } from "@/lib/audit";

export async function POST(request: NextRequest) {
  try {
    const rl = await knowledgeLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const sizeError = checkBodySize(request, BODY_LIMITS.auth);
    if (sizeError) return sizeError;

    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (auth.isDemo) {
      return NextResponse.json({ error: "Demo accounts cannot top up wallet" }, { status: 403 });
    }

    const body = await request.json();
    const { amount } = body;

    if (!amount || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json({ error: "Valid positive amount is required" }, { status: 400 });
    }

    if (amount > 10000) {
      return NextResponse.json({ error: "Maximum top-up amount is 10,000" }, { status: 400 });
    }

    const result = await topUpWallet(auth.orgId, amount);

    await logAudit({
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: "wallet.topup",
      entityType: "wallet",
      entityId: auth.orgId,
      details: { amount, newBalance: result.newBalance },
    });

    return NextResponse.json({
      success: true,
      newBalance: result.newBalance,
      transaction: result.transaction,
    });
  } catch (error) {
    console.error("Top-up wallet error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
