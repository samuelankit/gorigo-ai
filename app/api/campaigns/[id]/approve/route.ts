import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { campaigns, wallets, walletTransactions } from "@/shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";
import { handleRouteError } from "@/lib/api-error";
import { settingsLimiter } from "@/lib/rate-limit";

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

      if (campaign.approved_at) {
        const [existing] = await tx.select().from(campaigns).where(eq(campaigns.id, campaignId));
        return existing;
      }

      if (!campaign.consent_confirmed) {
        throw new Error("CONSENT_REQUIRED");
      }

      const estimatedCost = parseFloat((campaign.estimated_cost as string) || "0");
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
      const lockedBalance = parseFloat(wallet.locked_balance as string);
      const availableBalance = balance - lockedBalance;
      const minimumReserve = 5;

      if (availableBalance < estimatedCost + minimumReserve) {
        throw new Error(
          `Insufficient available balance. Available: £${availableBalance.toFixed(2)}, Required: £${(estimatedCost + minimumReserve).toFixed(2)} (including £${minimumReserve.toFixed(2)} minimum reserve)`
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
          approvedAt: new Date(),
          approvedBy: userId,
          status: "approved",
          updatedAt: new Date(),
        })
        .where(eq(campaigns.id, campaignId))
        .returning();

      return approved;
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "NOT_FOUND") {
        return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
      }
      if (error.message === "CONSENT_REQUIRED") {
        return NextResponse.json({ error: "Consent must be confirmed before approving a campaign. Set consentConfirmed to true." }, { status: 400 });
      }
      if (error.message === "NO_ESTIMATE") {
        return NextResponse.json({ error: "Campaign must have a valid estimated cost before approval" }, { status: 400 });
      }
      if (error.message === "WALLET_NOT_FOUND") {
        return NextResponse.json({ error: "Wallet not found for this organisation" }, { status: 400 });
      }
      if (error.message.includes("Insufficient")) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }
    return handleRouteError(error, "CampaignApprove");
  }
}
