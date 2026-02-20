import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withdrawalRequests, commissionLedger, partners, distributionLedger } from "@/shared/schema";
import { eq, and, sql, lte, desc } from "drizzle-orm";
import { getAuthenticatedUser, requireWriteAccess } from "@/lib/get-user";
import { z } from "zod";
import { handleRouteError } from "@/lib/api-error";
import { isStripeConfigured, createTransfer } from "@/lib/stripe-connect";

const MINIMUM_WITHDRAWAL = 50;
const AUTO_APPROVE_THRESHOLD = 500;
const HOLDING_PERIOD_DAYS = 30;

const withdrawalSchema = z.object({
  amount: z.number().min(MINIMUM_WITHDRAWAL, `Minimum withdrawal is £${MINIMUM_WITHDRAWAL}`),
  currency: z.string().default("GBP"),
});

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const partner = await db.select().from(partners).where(eq(partners.orgId, auth.orgId!)).limit(1);
    if (!partner.length) {
      return NextResponse.json({ error: "Partner account not found" }, { status: 404 });
    }

    const now = new Date();
    const holdingCutoff = new Date(now.getTime() - HOLDING_PERIOD_DAYS * 24 * 60 * 60 * 1000);

    await db
      .update(commissionLedger)
      .set({ status: "available", availableAt: now })
      .where(and(
        eq(commissionLedger.partnerId, partner[0].id),
        eq(commissionLedger.status, "holding"),
        lte(commissionLedger.holdingUntil, now)
      ));

    const [totalEarned] = await db
      .select({ total: sql<string>`COALESCE(SUM(${distributionLedger.partnerAmount}), 0)` })
      .from(distributionLedger)
      .where(eq(distributionLedger.partnerId, partner[0].id));

    const [commissionHolding] = await db
      .select({ total: sql<string>`COALESCE(SUM(${commissionLedger.amount}), 0)` })
      .from(commissionLedger)
      .where(and(
        eq(commissionLedger.partnerId, partner[0].id),
        eq(commissionLedger.status, "holding")
      ));

    const [commissionAvailable] = await db
      .select({ total: sql<string>`COALESCE(SUM(${commissionLedger.amount}), 0)` })
      .from(commissionLedger)
      .where(and(
        eq(commissionLedger.partnerId, partner[0].id),
        eq(commissionLedger.status, "available")
      ));

    const [totalWithdrawn] = await db
      .select({ total: sql<string>`COALESCE(SUM(${withdrawalRequests.amount}), 0)` })
      .from(withdrawalRequests)
      .where(and(
        eq(withdrawalRequests.partnerId, partner[0].id),
        eq(withdrawalRequests.status, "paid")
      ));

    const [pendingWithdrawals] = await db
      .select({ total: sql<string>`COALESCE(SUM(${withdrawalRequests.amount}), 0)` })
      .from(withdrawalRequests)
      .where(and(
        eq(withdrawalRequests.partnerId, partner[0].id),
        sql`${withdrawalRequests.status} IN ('pending', 'approved')`
      ));

    const withdrawals = await db
      .select()
      .from(withdrawalRequests)
      .where(eq(withdrawalRequests.partnerId, partner[0].id))
      .orderBy(desc(withdrawalRequests.createdAt))
      .limit(50);

    const lastWithdrawal = await db
      .select()
      .from(withdrawalRequests)
      .where(eq(withdrawalRequests.partnerId, partner[0].id))
      .orderBy(desc(withdrawalRequests.requestedAt))
      .limit(1);

    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const canWithdraw = !lastWithdrawal.length || 
      (lastWithdrawal[0].requestedAt && lastWithdrawal[0].requestedAt < sevenDaysAgo);

    const nextWithdrawalDate = lastWithdrawal.length && lastWithdrawal[0].requestedAt
      ? new Date(lastWithdrawal[0].requestedAt.getTime() + 7 * 24 * 60 * 60 * 1000)
      : null;

    return NextResponse.json({
      partnerId: partner[0].id,
      partnerName: partner[0].name,
      stripeConnectAccountId: partner[0].stripeConnectAccountId,
      stripeConnectOnboardingComplete: partner[0].stripeConnectOnboardingComplete,
      balance: {
        totalEarned: parseFloat(totalEarned?.total || "0"),
        holding: parseFloat(commissionHolding?.total || "0"),
        available: parseFloat(commissionAvailable?.total || "0"),
        withdrawn: parseFloat(totalWithdrawn?.total || "0"),
        pendingWithdrawal: parseFloat(pendingWithdrawals?.total || "0"),
      },
      canWithdraw,
      nextWithdrawalDate,
      minimumWithdrawal: MINIMUM_WITHDRAWAL,
      autoApproveThreshold: AUTO_APPROVE_THRESHOLD,
      holdingPeriodDays: HOLDING_PERIOD_DAYS,
      withdrawals,
      stripeConfigured: isStripeConfigured(),
    });
  } catch (error) {
    return handleRouteError(error, "Withdrawals");
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const writeCheck = requireWriteAccess(auth);
    if (!writeCheck.allowed) {
      return NextResponse.json({ error: writeCheck.error }, { status: 403 });
    }

    const partner = await db.select().from(partners).where(eq(partners.orgId, auth.orgId!)).limit(1);
    if (!partner.length) {
      return NextResponse.json({ error: "Partner account not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = withdrawalSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 });
    }

    const now = new Date();

    await db
      .update(commissionLedger)
      .set({ status: "available", availableAt: now })
      .where(and(
        eq(commissionLedger.partnerId, partner[0].id),
        eq(commissionLedger.status, "holding"),
        lte(commissionLedger.holdingUntil, now)
      ));

    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastWithdrawal = await db
      .select()
      .from(withdrawalRequests)
      .where(eq(withdrawalRequests.partnerId, partner[0].id))
      .orderBy(desc(withdrawalRequests.requestedAt))
      .limit(1);

    if (lastWithdrawal.length && lastWithdrawal[0].requestedAt && lastWithdrawal[0].requestedAt > sevenDaysAgo) {
      const nextDate = new Date(lastWithdrawal[0].requestedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
      return NextResponse.json({
        error: `You can only withdraw once per week. Next withdrawal available on ${nextDate.toLocaleDateString("en-GB")}.`,
      }, { status: 429 });
    }

    const [commissionAvailable] = await db
      .select({ total: sql<string>`COALESCE(SUM(${commissionLedger.amount}), 0)` })
      .from(commissionLedger)
      .where(and(
        eq(commissionLedger.partnerId, partner[0].id),
        eq(commissionLedger.status, "available")
      ));

    const availableBalance = parseFloat(commissionAvailable?.total || "0");
    if (parsed.data.amount > availableBalance) {
      return NextResponse.json({
        error: `Insufficient available balance. You have £${availableBalance.toFixed(2)} available.`,
      }, { status: 400 });
    }

    const autoApprove = parsed.data.amount <= AUTO_APPROVE_THRESHOLD;
    const initialStatus = autoApprove ? "approved" : "pending";

    const [withdrawal] = await db.insert(withdrawalRequests).values({
      partnerId: partner[0].id,
      orgId: auth.orgId,
      amount: parsed.data.amount.toFixed(2),
      currency: parsed.data.currency,
      status: initialStatus,
    }).returning();

    await db
      .update(commissionLedger)
      .set({
        status: "withdrawn",
        withdrawalId: withdrawal.id,
      })
      .where(and(
        eq(commissionLedger.partnerId, partner[0].id),
        eq(commissionLedger.status, "available")
      ));

    if (autoApprove && partner[0].stripeConnectAccountId && partner[0].stripeConnectOnboardingComplete) {
      try {
        const amountInPence = Math.round(parsed.data.amount * 100);
        const result = await createTransfer(
          partner[0].stripeConnectAccountId,
          amountInPence,
          parsed.data.currency.toLowerCase(),
          `Commission payout - Withdrawal #${withdrawal.id}`
        );

        if (result) {
          await db.update(withdrawalRequests).set({
            status: "paid",
            stripeTransferId: result.transferId,
            paidAt: new Date(),
          }).where(eq(withdrawalRequests.id, withdrawal.id));
        }
      } catch (stripeError) {
        console.error("Stripe transfer failed:", stripeError);
      }
    }

    return NextResponse.json({
      success: true,
      withdrawal,
      message: autoApprove
        ? "Withdrawal approved and processing."
        : "Withdrawal request submitted for review.",
    }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "Withdrawal Request");
  }
}
