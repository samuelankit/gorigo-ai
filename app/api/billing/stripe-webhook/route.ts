import { NextRequest, NextResponse } from "next/server";
import { topUpWallet } from "@/lib/wallet";
import { logAudit } from "@/lib/audit";

export async function POST(request: NextRequest) {
  try {
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
      console.error("Stripe webhook signature verification failed:", err.message);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const orgId = parseInt(session.metadata?.orgId || "0");
      const amount = parseFloat(session.metadata?.amount || "0");
      const userId = parseInt(session.metadata?.userId || "0");
      const type = session.metadata?.type;

      if (type === "wallet_topup" && orgId > 0 && amount > 0) {
        const result = await topUpWallet(
          orgId,
          amount,
          `Wallet top-up via Stripe ($${amount.toFixed(2)})`,
          "manual",
          session.payment_intent
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
            paymentIntent: session.payment_intent,
          },
        });

        console.log(`[Stripe] Wallet credited: org=${orgId}, amount=$${amount}`);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
