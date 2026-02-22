import { NextRequest, NextResponse } from "next/server";
import { topUpWallet } from "@/lib/wallet";
import { logAudit } from "@/lib/audit";
import { billingLimiter } from "@/lib/rate-limit";
import { db } from "@/lib/db";
import { walletTransactions, users, orgs, orgMembers } from "@/shared/schema";
import { eq, and } from "drizzle-orm";
import { handleRouteError } from "@/lib/api-error";
import { createLogger } from "@/lib/logger";
import { getUncachableStripeClient, isStripeConnectorConfigured, getStripeSecretKey } from "@/lib/stripe-client";
import { createNotification } from "@/lib/notifications";
import { terminateAllCallsForOrg } from "@/lib/mid-call-billing";

const logger = createLogger("StripeWebhook");

async function notifyOrgMembers(orgId: number, type: "system" | "security" | "webhook_failure", title: string, message: string, actionUrl?: string) {
  try {
    const members = await db.select({ userId: orgMembers.userId }).from(orgMembers).where(eq(orgMembers.orgId, orgId));
    for (const member of members) {
      await createNotification({ userId: member.userId, orgId, type, title, message, actionUrl });
    }
  } catch (err) {
    logger.error("Failed to notify org members", err instanceof Error ? err : undefined);
  }
}

async function notifySuperAdmins(type: "system" | "security", title: string, message: string, actionUrl?: string) {
  try {
    const admins = await db.select({ id: users.id }).from(users).where(eq(users.globalRole, "SUPER_ADMIN")).limit(10);
    for (const admin of admins) {
      await createNotification({ userId: admin.id, type, title, message, actionUrl });
    }
  } catch (err) {
    logger.error("Failed to notify super admins", err instanceof Error ? err : undefined);
  }
}

export async function POST(request: NextRequest) {
  try {
    const rl = await billingLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const hasEnvKey = !!process.env.STRIPE_SECRET_KEY;
    const hasConnector = await isStripeConnectorConfigured();

    if (!hasEnvKey && !hasConnector) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
    }

    let stripe: any;
    let webhookSecret: string | undefined;

    if (hasConnector) {
      stripe = await getUncachableStripeClient();
      webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    } else {
      const Stripe = (await import("stripe")).default;
      stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-12-18.acacia" as any });
      webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    }

    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json({ error: "No signature" }, { status: 400 });
    }

    let event;
    if (webhookSecret) {
      try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      } catch (err: any) {
        logger.error("Stripe webhook signature verification failed", err);
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
      }
    } else {
      try {
        event = JSON.parse(body);
      } catch {
        return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
      }
    }

    logger.info(`Stripe webhook received: ${event.type}`, { eventId: event.id });

    if (event.type === "checkout.session.completed") {
      await handleCheckoutCompleted(event);
    } else if (event.type === "payment_intent.payment_failed") {
      await handlePaymentFailed(event);
    } else if (event.type === "charge.dispute.created") {
      await handleDisputeCreated(event);
    } else if (event.type === "charge.refunded") {
      await handleChargeRefunded(event);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    return handleRouteError(error, "StripeWebhook");
  }
}

async function handleCheckoutCompleted(event: any) {
  const session = event.data.object;
  const orgId = parseInt(session.metadata?.orgId || "0");
  const amount = parseFloat(session.metadata?.amount || "0");
  const userId = parseInt(session.metadata?.userId || "0");
  const type = session.metadata?.type;
  const paymentIntent = session.payment_intent;

  if (type === "wallet_topup" && orgId > 0 && amount > 0 && session.payment_status === "paid") {
    const idempotencyRef = `stripe_${paymentIntent}`;
    const [existing] = await db
      .select({ id: walletTransactions.id })
      .from(walletTransactions)
      .where(
        and(
          eq(walletTransactions.orgId, orgId),
          eq(walletTransactions.referenceId, idempotencyRef)
        )
      )
      .limit(1);

    if (existing) {
      logger.info(`Duplicate webhook ignored: org=${orgId}, pi=${paymentIntent}`);
      return;
    }

    const result = await topUpWallet(
      orgId,
      amount,
      `Wallet top-up via Stripe (\u00a3${amount.toFixed(2)})`,
      "manual",
      idempotencyRef
    );

    await logAudit({
      actorId: userId > 0 ? userId : undefined,
      action: "wallet.stripe_topup",
      entityType: "wallet",
      entityId: orgId,
      details: {
        amount,
        newBalance: result.newBalance,
        stripeSessionId: session.id,
        paymentIntent,
      },
    });

    logger.info(`Wallet credited: org=${orgId}, amount=\u00a3${amount}`);
  }
}

async function handlePaymentFailed(event: any) {
  const paymentIntent = event.data.object;
  const orgId = parseInt(paymentIntent.metadata?.orgId || "0");
  const amount = parseFloat(paymentIntent.metadata?.amount || "0");
  const failureMessage = paymentIntent.last_payment_error?.message || "Payment declined";
  const failureCode = paymentIntent.last_payment_error?.code || "unknown";

  logger.warn("Payment failed", { orgId, amount, failureCode, failureMessage, piId: paymentIntent.id });

  await logAudit({
    actorId: null,
    action: "stripe.payment_failed",
    entityType: "billing",
    entityId: orgId > 0 ? orgId : undefined,
    details: {
      paymentIntentId: paymentIntent.id,
      amount,
      failureCode,
      failureMessage,
    },
  });

  if (orgId > 0) {
    await notifyOrgMembers(
      orgId,
      "system",
      "Payment failed",
      `Your payment of \u00a3${amount > 0 ? amount.toFixed(2) : "N/A"} was declined: ${failureMessage}. Please update your payment method and try again.`,
      "/dashboard/wallet"
    );
  }

  await notifySuperAdmins(
    "system",
    "Payment failure detected",
    `Payment failed for org #${orgId || "unknown"}: ${failureMessage} (${failureCode}). Amount: \u00a3${amount > 0 ? amount.toFixed(2) : "N/A"}.`,
    "/admin/billing"
  );
}

async function handleDisputeCreated(event: any) {
  const dispute = event.data.object;
  const chargeId = dispute.charge;
  const amount = (dispute.amount || 0) / 100;
  const reason = dispute.reason || "unknown";
  const status = dispute.status || "needs_response";

  logger.warn("Charge dispute created", { chargeId, amount, reason, status, disputeId: dispute.id });

  let orgId: number | null = null;
  if (dispute.metadata?.orgId) {
    orgId = parseInt(dispute.metadata.orgId);
  }
  if (!orgId && dispute.payment_intent && typeof dispute.payment_intent === "object" && dispute.payment_intent.metadata?.orgId) {
    orgId = parseInt(dispute.payment_intent.metadata.orgId);
  }
  if (!orgId && dispute.charge && typeof dispute.charge === "object" && dispute.charge.metadata?.orgId) {
    orgId = parseInt(dispute.charge.metadata.orgId);
  }

  await logAudit({
    actorId: null,
    action: "stripe.dispute_created",
    entityType: "billing",
    entityId: orgId ?? undefined,
    details: {
      disputeId: dispute.id,
      chargeId,
      amount,
      reason,
      status,
    },
  });

  if (orgId && orgId > 0) {
    await notifyOrgMembers(
      orgId,
      "security",
      "Payment dispute received",
      `A dispute of \u00a3${amount.toFixed(2)} has been filed against your account (reason: ${reason}). Your account may be restricted until the dispute is resolved. Please contact support immediately.`,
      "/dashboard/wallet"
    );

    try {
      await db.update(orgs).set({
        status: "suspended",
        updatedAt: new Date(),
      }).where(eq(orgs.id, orgId));
      logger.warn("Org suspended due to dispute", { orgId, disputeId: dispute.id });

      const terminatedCalls = await terminateAllCallsForOrg(orgId, "dispute_suspension");
      if (terminatedCalls > 0) {
        logger.warn("Active calls terminated due to dispute suspension", { orgId, terminatedCalls });
      }
    } catch (suspendErr) {
      logger.error("Failed to suspend org for dispute", suspendErr instanceof Error ? suspendErr : undefined);
    }
  }

  await notifySuperAdmins(
    "security",
    "URGENT: Payment dispute received",
    `Dispute of \u00a3${amount.toFixed(2)} filed (reason: ${reason}) for ${orgId ? `org #${orgId}` : `charge ${chargeId}`}. Status: ${status}. Respond within dispute deadline to avoid automatic loss.`,
    "/admin/billing"
  );
}

async function handleChargeRefunded(event: any) {
  const charge = event.data.object;
  const refundAmount = (charge.amount_refunded || 0) / 100;
  const chargeId = charge.id;

  let orgId: number | null = null;
  if (charge.metadata?.orgId) {
    orgId = parseInt(charge.metadata.orgId);
  }

  logger.info("Charge refunded via Stripe", { chargeId, refundAmount, orgId });

  await logAudit({
    actorId: null,
    action: "stripe.charge_refunded",
    entityType: "billing",
    entityId: orgId ?? undefined,
    details: {
      chargeId,
      refundAmount,
      paymentIntent: charge.payment_intent,
    },
  });

  await notifySuperAdmins(
    "system",
    "Stripe refund processed",
    `A refund of \u00a3${refundAmount.toFixed(2)} was processed for ${orgId ? `org #${orgId}` : `charge ${chargeId}`}.`,
    "/admin/billing"
  );
}
