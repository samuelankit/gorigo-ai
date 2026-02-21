import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withdrawalRequests, commissionLedger, partners } from "@/shared/schema";
import { eq, and, sql, desc, or } from "drizzle-orm";
import { getAuthenticatedUser, requireSuperAdmin } from "@/lib/get-user";
import { handleRouteError } from "@/lib/api-error";
import { isStripeConfigured, createTransfer } from "@/lib/stripe-connect";
import { z } from "zod";

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const adminCheck = requireSuperAdmin(auth);
    if (!adminCheck.allowed) {
      return NextResponse.json({ error: adminCheck.error }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50");

    const conditions = [];
    if (status && status !== "all") {
      conditions.push(eq(withdrawalRequests.status, status));
    }

    const withdrawals = await db
      .select({
        id: withdrawalRequests.id,
        partnerId: withdrawalRequests.partnerId,
        partnerName: partners.name,
        partnerEmail: partners.contactEmail,
        amount: withdrawalRequests.amount,
        currency: withdrawalRequests.currency,
        status: withdrawalRequests.status,
        stripeTransferId: withdrawalRequests.stripeTransferId,
        adminNote: withdrawalRequests.adminNote,
        rejectionReason: withdrawalRequests.rejectionReason,
        requestedAt: withdrawalRequests.requestedAt,
        reviewedAt: withdrawalRequests.reviewedAt,
        paidAt: withdrawalRequests.paidAt,
        stripeConnectAccountId: partners.stripeConnectAccountId,
        stripeConnectOnboardingComplete: partners.stripeConnectOnboardingComplete,
      })
      .from(withdrawalRequests)
      .innerJoin(partners, eq(withdrawalRequests.partnerId, partners.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(withdrawalRequests.requestedAt))
      .limit(limit);

    const [stats] = await db.select({
      total: sql<number>`COUNT(*)`,
      pending: sql<number>`COUNT(*) FILTER (WHERE ${withdrawalRequests.status} = 'pending')`,
      approved: sql<number>`COUNT(*) FILTER (WHERE ${withdrawalRequests.status} = 'approved')`,
      paid: sql<number>`COUNT(*) FILTER (WHERE ${withdrawalRequests.status} = 'paid')`,
      rejected: sql<number>`COUNT(*) FILTER (WHERE ${withdrawalRequests.status} = 'rejected')`,
      totalPaidAmount: sql<string>`COALESCE(SUM(CASE WHEN ${withdrawalRequests.status} = 'paid' THEN ${withdrawalRequests.amount}::numeric ELSE 0 END), 0)`,
      totalPendingAmount: sql<string>`COALESCE(SUM(CASE WHEN ${withdrawalRequests.status} IN ('pending', 'approved') THEN ${withdrawalRequests.amount}::numeric ELSE 0 END), 0)`,
    }).from(withdrawalRequests);

    return NextResponse.json({
      withdrawals,
      stats: {
        total: Number(stats.total),
        pending: Number(stats.pending),
        approved: Number(stats.approved),
        paid: Number(stats.paid),
        rejected: Number(stats.rejected),
        totalPaidAmount: parseFloat(stats.totalPaidAmount),
        totalPendingAmount: parseFloat(stats.totalPendingAmount),
      },
      stripeConfigured: await isStripeConfigured(),
    });
  } catch (error) {
    return handleRouteError(error, "Admin Withdrawals");
  }
}

const reviewSchema = z.object({
  withdrawalId: z.number(),
  action: z.enum(["approve", "reject", "pay"]),
  adminNote: z.string().optional(),
  rejectionReason: z.string().optional(),
});

export async function PUT(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const adminCheck = requireSuperAdmin(auth);
    if (!adminCheck.allowed) {
      return NextResponse.json({ error: adminCheck.error }, { status: 403 });
    }

    const body = await request.json();
    const parsed = reviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message }, { status: 400 });
    }

    const [withdrawal] = await db
      .select()
      .from(withdrawalRequests)
      .where(eq(withdrawalRequests.id, parsed.data.withdrawalId));

    if (!withdrawal) {
      return NextResponse.json({ error: "Withdrawal request not found" }, { status: 404 });
    }

    if (parsed.data.action === "approve") {
      if (withdrawal.status !== "pending") {
        return NextResponse.json({ error: "Can only approve pending withdrawals" }, { status: 400 });
      }

      await db.update(withdrawalRequests).set({
        status: "approved",
        reviewedAt: new Date(),
        reviewedBy: auth.user.id,
        adminNote: parsed.data.adminNote || null,
      }).where(eq(withdrawalRequests.id, withdrawal.id));

      return NextResponse.json({ success: true, message: "Withdrawal approved" });
    }

    if (parsed.data.action === "reject") {
      if (!["pending", "approved"].includes(withdrawal.status)) {
        return NextResponse.json({ error: "Can only reject pending or approved withdrawals" }, { status: 400 });
      }

      await db.update(withdrawalRequests).set({
        status: "rejected",
        reviewedAt: new Date(),
        reviewedBy: auth.user.id,
        rejectionReason: parsed.data.rejectionReason || "Request rejected by admin",
        adminNote: parsed.data.adminNote || null,
      }).where(eq(withdrawalRequests.id, withdrawal.id));

      await db.update(commissionLedger).set({
        status: "available",
        withdrawalId: null,
      }).where(eq(commissionLedger.withdrawalId, withdrawal.id));

      return NextResponse.json({ success: true, message: "Withdrawal rejected. Funds returned to available balance." });
    }

    if (parsed.data.action === "pay") {
      if (withdrawal.status !== "approved") {
        return NextResponse.json({ error: "Can only pay approved withdrawals" }, { status: 400 });
      }

      const [partner] = await db.select().from(partners).where(eq(partners.id, withdrawal.partnerId));

      if (partner?.stripeConnectAccountId && partner?.stripeConnectOnboardingComplete && await isStripeConfigured()) {
        try {
          const amountInPence = Math.round(parseFloat(withdrawal.amount) * 100);
          const result = await createTransfer(
            partner.stripeConnectAccountId,
            amountInPence,
            withdrawal.currency.toLowerCase(),
            `Commission payout - Withdrawal #${withdrawal.id}`
          );

          if (result) {
            await db.update(withdrawalRequests).set({
              status: "paid",
              stripeTransferId: result.transferId,
              paidAt: new Date(),
              adminNote: parsed.data.adminNote || null,
            }).where(eq(withdrawalRequests.id, withdrawal.id));

            return NextResponse.json({ success: true, message: "Payment sent via Stripe Connect", transferId: result.transferId });
          }
        } catch (stripeError: any) {
          return NextResponse.json({ error: `Stripe transfer failed: ${stripeError.message}` }, { status: 500 });
        }
      }

      await db.update(withdrawalRequests).set({
        status: "paid",
        paidAt: new Date(),
        reviewedBy: auth.user.id,
        adminNote: parsed.data.adminNote || "Manual payment processed",
      }).where(eq(withdrawalRequests.id, withdrawal.id));

      return NextResponse.json({ success: true, message: "Withdrawal marked as paid" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return handleRouteError(error, "Admin Withdrawal Review");
  }
}
