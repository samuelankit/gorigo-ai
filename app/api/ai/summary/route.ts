import { NextRequest, NextResponse } from "next/server";
import { generateCallSummary } from "@/lib/ai";
import { getAuthenticatedUser, requireEmailVerified } from "@/lib/get-user";
import { aiLimiter } from "@/lib/rate-limit";
import { checkBodySize, BODY_LIMITS } from "@/lib/body-limit";
import { hasInsufficientBalance, deductFromWallet } from "@/lib/wallet";
import { z } from "zod";

const bodySchema = z.object({
  transcript: z.string().min(1),
}).strict();

export async function POST(request: NextRequest) {
  try {
    const rl = await aiLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const sizeError = checkBodySize(request, BODY_LIMITS.chat);
    if (sizeError) return sizeError;

    const auth = await getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const emailCheck = requireEmailVerified(auth);
    if (!emailCheck.allowed) {
      return NextResponse.json({ error: emailCheck.error }, { status: emailCheck.status || 403 });
    }

    if (!auth.orgId) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 });
    }

    if (!auth.isDemo) {
      const insufficientBalance = await hasInsufficientBalance(auth.orgId);
      if (insufficientBalance) {
        return NextResponse.json({
          error: "Insufficient wallet balance. Please top up your wallet to continue using AI services.",
          code: "INSUFFICIENT_BALANCE",
        }, { status: 402 });
      }
    }

    const body = await request.json();
    const parsed = bodySchema.parse(body);

    const summary = await generateCallSummary(parsed.transcript, auth.orgId);

    if (!auth.isDemo && auth.orgId) {
      const summaryCost = 0.005;
      try {
        await deductFromWallet(
          auth.orgId,
          summaryCost,
          "AI call summary generation",
          "ai_chat"
        );
      } catch (walletErr) {
        console.error("Wallet deduction failed for AI summary:", walletErr);
      }
    }

    return NextResponse.json({ summary });
  } catch (error) {
    console.error("Summary generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate summary" },
      { status: 500 }
    );
  }
}
