import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, requireEmailVerified } from "@/lib/get-user";
import { billingLimiter } from "@/lib/rate-limit";
import crypto from "crypto";
import { z } from "zod";
import { handleRouteError } from "@/lib/api-error";
import { createLogger } from "@/lib/logger";
import { getUncachableStripeClient, isStripeConnectorConfigured } from "@/lib/stripe-client";

const logger = createLogger("BillingTopup");

const topupSchema = z.object({
  amount: z.number().positive().min(5).max(10000),
}).strict();

export async function POST(request: NextRequest) {
  try {
    const rl = await billingLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (auth.isDemo) {
      return NextResponse.json({ error: "Demo accounts cannot top up wallet" }, { status: 403 });
    }

    const emailCheck = requireEmailVerified(auth);
    if (!emailCheck.allowed) {
      return NextResponse.json({ error: emailCheck.error }, { status: emailCheck.status || 403 });
    }

    const body = await request.json();
    const { amount } = topupSchema.parse(body);

    const hasEnvKey = !!process.env.STRIPE_SECRET_KEY;
    const hasConnector = await isStripeConnectorConfigured();

    if (!hasEnvKey && !hasConnector) {
      return NextResponse.json({
        error: "Payment processing is not configured. Please contact support.",
        configured: false,
      }, { status: 503 });
    }

    try {
      let stripe: any;
      if (hasConnector) {
        stripe = await getUncachableStripeClient();
      } else {
        const Stripe = (await import("stripe")).default;
        stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-12-18.acacia" as any });
      }

      const idempotencyKey = crypto
        .createHash("sha256")
        .update(`topup_${auth.orgId}_${auth.user.id}_${amount}_${Math.floor(Date.now() / 30000)}`)
        .digest("hex");

      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "https://gorigo.ai");

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [{
          price_data: {
            currency: "gbp",
            product_data: {
              name: "GoRigo Wallet Top-Up",
              description: `Add \u00a3${amount.toFixed(2)} to your GoRigo wallet`,
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        }],
        mode: "payment",
        success_url: `${baseUrl}/dashboard/wallet?topup=success&amount=${amount}`,
        cancel_url: `${baseUrl}/dashboard/wallet?topup=cancelled`,
        metadata: {
          orgId: auth.orgId.toString(),
          userId: auth.user.id.toString(),
          type: "wallet_topup",
          amount: amount.toString(),
        },
      }, {
        idempotencyKey,
      });

      return NextResponse.json({ url: session.url, sessionId: session.id });
    } catch (stripeErr: any) {
      logger.error("Stripe session creation failed", stripeErr);
      return NextResponse.json({ error: "Payment service error. Please try again later." }, { status: 502 });
    }
  } catch (error) {
    return handleRouteError(error, "BillingTopup");
  }
}
