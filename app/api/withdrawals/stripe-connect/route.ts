import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { partners } from "@/shared/schema";
import { eq } from "drizzle-orm";
import { getAuthenticatedUser, requireWriteAccess } from "@/lib/get-user";
import { handleRouteError } from "@/lib/api-error";
import {
  isStripeConfigured,
  createConnectedAccount,
  createOnboardingLink,
  checkAccountStatus,
  createLoginLink,
} from "@/lib/stripe-connect";

export async function POST(request: NextRequest) {
  try {
    if (!(await isStripeConfigured())) {
      return NextResponse.json({ error: "Stripe is not configured. Please contact support." }, { status: 503 });
    }

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
    const { action } = body;

    if (action === "create_account") {
      if (partner[0].stripeConnectAccountId) {
        return NextResponse.json({ error: "Stripe Connect account already exists" }, { status: 400 });
      }

      const accountId = await createConnectedAccount(
        partner[0].contactEmail,
        partner[0].name,
        "GB"
      );

      if (!accountId) {
        return NextResponse.json({ error: "Failed to create Stripe account" }, { status: 500 });
      }

      await db.update(partners).set({
        stripeConnectAccountId: accountId,
      }).where(eq(partners.id, partner[0].id));

      const origin = request.headers.get("origin") || "https://gorigo.ai";
      const onboardingUrl = await createOnboardingLink(
        accountId,
        `${origin}/dashboard/wallet?stripe_connect=complete`,
        `${origin}/dashboard/wallet?stripe_connect=refresh`
      );

      return NextResponse.json({ accountId, onboardingUrl });
    }

    if (action === "get_onboarding_link") {
      if (!partner[0].stripeConnectAccountId) {
        return NextResponse.json({ error: "No Stripe Connect account found. Create one first." }, { status: 400 });
      }

      const origin = request.headers.get("origin") || "https://gorigo.ai";
      const onboardingUrl = await createOnboardingLink(
        partner[0].stripeConnectAccountId,
        `${origin}/dashboard/wallet?stripe_connect=complete`,
        `${origin}/dashboard/wallet?stripe_connect=refresh`
      );

      return NextResponse.json({ onboardingUrl });
    }

    if (action === "check_status") {
      if (!partner[0].stripeConnectAccountId) {
        return NextResponse.json({ connected: false, accountId: null });
      }

      const status = await checkAccountStatus(partner[0].stripeConnectAccountId);
      if (status?.detailsSubmitted && status?.payoutsEnabled) {
        await db.update(partners).set({
          stripeConnectOnboardingComplete: true,
        }).where(eq(partners.id, partner[0].id));
      }

      return NextResponse.json({
        connected: true,
        accountId: partner[0].stripeConnectAccountId,
        onboardingComplete: partner[0].stripeConnectOnboardingComplete || (status?.detailsSubmitted && status?.payoutsEnabled),
        ...status,
      });
    }

    if (action === "dashboard_link") {
      if (!partner[0].stripeConnectAccountId || !partner[0].stripeConnectOnboardingComplete) {
        return NextResponse.json({ error: "Complete Stripe Connect onboarding first" }, { status: 400 });
      }

      const dashboardUrl = await createLoginLink(partner[0].stripeConnectAccountId);
      return NextResponse.json({ dashboardUrl });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return handleRouteError(error, "Stripe Connect");
  }
}
