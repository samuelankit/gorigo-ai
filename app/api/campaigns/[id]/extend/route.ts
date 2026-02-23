import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { campaigns, wallets, walletTransactions } from "@/shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";
import { handleRouteError } from "@/lib/api-error";
import { settingsLimiter } from "@/lib/rate-limit";
import { z } from "zod";

const extendSchema = z.object({
  additionalAmount: z.number().positive(),
}).strict();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rl = await settingsLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const campaignId = parseInt(id, 10);
    if (isNaN(campaignId)) {
      return NextResponse.json({ error: "Invalid campaign ID" }, { status: 400 });
    }

    const body = await request.json();
    const { additionalAmount } = extendSchema.parse(body);

    const orgId = auth.orgId;

    const result = await db.transaction(async (tx) => {
      const walletRows = await tx.execute(
        sql`SELECT id, balance, locked_balance FROM wallets WHERE org_id = ${orgId} FOR UPDATE`
      );
      const wallet = (walletRows.rows as Record<string, unknown>[])[0];

      if (!wallet) {
        throw new Error("WALLET_NOT_FOUND");
      }

      const balance = parseFloat(wallet.balance as string);
      const lockedBalance = parseFloat(wallet.locked_balance as string);
      const availableBalance = balance - lockedBalance;
      const minimumReserve = 5;

      if (availableBalance < additionalAmount + minimumReserve) {
        throw new Error(
          `Insufficient available balance. Available: £${availableBalance.toFixed(2)}, Required: £${(additionalAmount + minimumReserve).toFixed(2)} (including £${minimumReserve.toFixed(2)} minimum reserve)`
        );
      }

      const newLockedBalance = lockedBalance + additionalAmount;

      await tx.execute(
        sql`UPDATE wallets SET locked_balance = ${newLockedBalance.toFixed(2)}, updated_at = NOW() WHERE id = ${wallet.id}`
      );

      const [txn] = await tx.insert(walletTransactions).values({
        orgId,
        type: "fund_lock",
        amount: additionalAmount.toFixed(2),
        balanceBefore: balance.toFixed(2),
        balanceAfter: balance.toFixed(2),
        description: `Additional funds locked for campaign #${campaignId}`,
        referenceType: "campaign",
        referenceId: String(campaignId),
        idempotencyKey: `fund_lock_${orgId}_${campaignId}_${Date.now()}`,
      }).returning();

      const [campaign] = await tx
        .select()
        .from(campaigns)
        .where(and(eq(campaigns.id, campaignId), eq(campaigns.orgId, orgId)))
        .limit(1);

      if (!campaign) {
        throw new Error("NOT_FOUND");
      }

      const currentLocked = parseFloat(campaign.lockedAmount || "0");
      const updateData: Record<string, unknown> = {
        lockedAmount: (currentLocked + additionalAmount).toFixed(2),
        costCapReached: false,
        updatedAt: new Date(),
      };

      if (campaign.status === "paused") {
        updateData.status = "running";
        updateData.pausedAt = null;
        updateData.pausedReason = null;
      }

      const [updated] = await tx
        .update(campaigns)
        .set(updateData)
        .where(and(eq(campaigns.id, campaignId), eq(campaigns.orgId, orgId)))
        .returning();

      return { campaign: updated, transaction: txn };
    });

    return NextResponse.json({
      message: "Additional funds locked",
      additionalAmount,
      transaction: result.transaction,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "NOT_FOUND") {
        return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
      }
      if (error.message === "WALLET_NOT_FOUND") {
        return NextResponse.json({ error: "Wallet not found for this organisation" }, { status: 400 });
      }
      if (error.message.includes("Insufficient")) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }
    return handleRouteError(error, "CampaignExtend");
  }
}
