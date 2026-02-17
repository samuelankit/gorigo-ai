import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/get-user";
import { topUpWallet } from "@/lib/wallet";
import { knowledgeLimiter } from "@/lib/rate-limit";
import { checkBodySize, BODY_LIMITS } from "@/lib/body-limit";
import { logAudit } from "@/lib/audit";
import { z } from "zod";

const topupSchema = z.object({
  amount: z.number().positive("Amount must be positive").finite().max(10000, "Maximum top-up amount is 10,000"),
});

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

    if (auth.user.globalRole !== "superadmin") {
      return NextResponse.json({ error: "Direct wallet top-up is restricted to administrators. Use Stripe checkout at /api/billing/topup instead." }, { status: 403 });
    }

    const body = await request.json();
    const parsed = topupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message || "Invalid input" }, { status: 400 });
    }

    const { amount } = parsed.data;

    const result = await topUpWallet(auth.orgId, amount, "Admin manual top-up", "manual");

    await logAudit({
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: "wallet.admin_topup",
      entityType: "wallet",
      entityId: auth.orgId,
      details: { amount, newBalance: result.newBalance, method: "admin_manual" },
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
