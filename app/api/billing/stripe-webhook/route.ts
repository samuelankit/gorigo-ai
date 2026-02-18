import { NextRequest, NextResponse } from "next/server";
import { topUpWallet } from "@/lib/wallet";
import { logAudit } from "@/lib/audit";
import { billingLimiter } from "@/lib/rate-limit";
import { db } from "@/lib/db";
import { walletTransactions } from "@/shared/schema";
import { eq, and } from "drizzle-orm";
import { handleRouteError } from "@/lib/api-error";
import { createLogger } from "@/lib/logger";

const logger = createLogger("StripeWebhook");

export async function POST(request: NextRequest) {
  try {
    const rl = await billingLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
    }

    const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json({ error: "No signature" }, { status: 400 });
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err: any) {
      logger.error("Stripe webhook signature verification failed", err);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const orgId = parseInt(session.metadata?.orgId || "0");
      const amount = parseFloat(session.metadata?.amount || "0");
      const userId = parseInt(session.metadata?.userId || "0");
      const type = session.metadata?.type;
      const paymentIntent = session.payment_intent;

      if (type === "wallet_topup" && orgId > 0 && amount > 0) {
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
          console.info(`[Stripe] Duplicate webhook ignored: org=${orgId}, pi=${paymentIntent}`);
          return NextResponse.json({ received: true, duplicate: true });
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

        console.info(`[Stripe] Wallet credited: org=${orgId}, amount=\u00a3${amount}`);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    return handleRouteError(error, "StripeWebhook");
  }
}
