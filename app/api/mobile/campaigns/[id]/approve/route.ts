import { db } from "@/lib/db";
import { campaigns, wallets, walletTransactions } from "@/shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { getAuthenticatedUser, requirePasswordChanged, requireOrgActive } from "@/lib/get-user";
import { NextRequest, NextResponse } from "next/server";
import { generalLimiter } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/api-error";
import { z } from "zod";

export const dynamic = "force-dynamic";

const approveSchema = z.object({
  consentConfirmed: z.literal(true, { errorMap: () => ({ message: "You must confirm consent before approving" }) }),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rl = await generalLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pwCheck = requirePasswordChanged(auth);
    if (!pwCheck.allowed) {
      return NextResponse.json({ error: pwCheck.error }, { status: pwCheck.status || 403 });
    }

    const orgCheck = await requireOrgActive(auth.orgId);
    if (!orgCheck.allowed) {
      return NextResponse.json({ error: orgCheck.error }, { status: orgCheck.status || 403 });
    }

    const body = await request.json();
    const validated = approveSchema.parse(body);

    const { id } = await params;
    const campaignId = parseInt(id, 10);
    if (isNaN(campaignId)) {
      return NextResponse.json({ error: "Invalid campaign ID" }, { status: 400 });
    }

    const orgId = auth.orgId;
    const userId = auth.user.id;

    const result = await db.transaction(async (tx) => {
      const campaignRows = await tx.execute(
        sql`SELECT * FROM campaigns WHERE id = ${campaignId} AND org_id = ${orgId} FOR UPDATE`
      );
      const campaign = (campaignRows.rows as Record<string, unknown>[])[0];

      if (!campaign) {
        throw new Error("NOT_FOUND");
      }

      if (campaign.status !== "draft") {
        throw new Error("INVALID_STATUS");
      }

      if (campaign.approved_at) {
        const [existing] = await tx.select().from(campaigns).where(eq(campaigns.id, campaignId));
        return existing;
      }

      const totalContacts = Number(campaign.total_contacts || 0);
      const budgetCap = parseFloat((campaign.budget_cap as string) || "0");
      const estimatedCost = budgetCap > 0 ? budgetCap : totalContacts * 0.15;

      if (estimatedCost <= 0) {
        throw new Error("NO_ESTIMATE");
      }

      const walletRows = await tx.execute(
        sql`SELECT id, balance, locked_balance FROM wallets WHERE org_id = ${orgId} FOR UPDATE`
      );
      const wallet = (walletRows.rows as Record<string, unknown>[])[0];

      if (!wallet) {
        throw new Error("WALLET_NOT_FOUND");
      }

      const balance = parseFloat(wallet.balance as string);
      const lockedBalance = parseFloat((wallet.locked_balance as string) || "0");
      const availableBalance = balance - lockedBalance;
      const minimumReserve = 5;

      if (availableBalance < estimatedCost + minimumReserve) {
        throw new Error(
          `Insufficient balance. Available: £${availableBalance.toFixed(2)}, Required: £${(estimatedCost + minimumReserve).toFixed(2)}`
        );
      }

      const newLockedBalance = lockedBalance + estimatedCost;

      await tx.execute(
        sql`UPDATE wallets SET locked_balance = ${newLockedBalance.toFixed(2)}, updated_at = NOW() WHERE id = ${wallet.id}`
      );

      await tx.insert(walletTransactions).values({
        orgId,
        type: "fund_lock",
        amount: estimatedCost.toFixed(2),
        balanceBefore: balance.toFixed(2),
        balanceAfter: balance.toFixed(2),
        description: `Funds locked for campaign #${campaignId} approval`,
        referenceType: "campaign",
        referenceId: String(campaignId),
        idempotencyKey: `fund_lock_approve_${orgId}_${campaignId}_${Date.now()}`,
      });

      const [approved] = await tx
        .update(campaigns)
        .set({
          lockedAmount: estimatedCost.toFixed(2),
          estimatedCost: estimatedCost.toFixed(2),
          approvedAt: new Date(),
          approvedBy: userId,
          status: "running",
          consentConfirmed: true,
          consentConfirmedAt: new Date(),
          startedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(campaigns.id, campaignId))
        .returning();

      return approved;
    });

    return NextResponse.json({
      campaign: result,
      message: "Campaign approved and started",
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "NOT_FOUND") {
        return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
      }
      if (error.message === "INVALID_STATUS") {
        return NextResponse.json({ error: "Only draft campaigns can be approved" }, { status: 400 });
      }
      if (error.message === "NO_ESTIMATE") {
        return NextResponse.json({ error: "Campaign must have contacts or a budget cap" }, { status: 400 });
      }
      if (error.message === "WALLET_NOT_FOUND") {
        return NextResponse.json({ error: "Wallet not found for this organisation" }, { status: 400 });
      }
      if (error.message.includes("Insufficient")) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }
    return handleRouteError(error, "MobileCampaignApprove");
  }
}
