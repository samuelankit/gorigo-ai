import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orgs, countries } from "@/shared/schema";
import { eq } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";
import { logAudit } from "@/lib/audit";
import { settingsLimiter } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/api-error";

export async function GET(request: NextRequest) {
  try {
    const rl = await settingsLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const availableCountries = await db
      .select({
        id: countries.id,
        name: countries.name,
        isoCode: countries.isoCode,
        callingCode: countries.callingCode,
        region: countries.region,
        tier: countries.tier,
        status: countries.status,
      })
      .from(countries)
      .where(eq(countries.status, "active"));

    const [org] = await db.select().from(orgs).where(eq(orgs.id, auth.orgId)).limit(1);

    const readiness = {
      hasDeploymentModel: !!org?.deploymentModel,
      hasSubAccount: false,
      subAccountActive: false,
      steps: [
        { id: "deployment", label: "Select Deployment Model", completed: !!org?.deploymentModel },
        { id: "country", label: "Configure Target Countries", completed: true },
        { id: "telephony", label: "Telephony Setup", completed: false },
        { id: "agent", label: "Configure AI Agent", completed: true },
        { id: "compliance", label: "Review Compliance", completed: true },
      ],
    };

    return NextResponse.json({
      availableCountries,
      currentOrg: org ? {
        id: org.id,
        name: org.name,
        deploymentModel: org.deploymentModel,
      } : null,
      subAccount: null,
      readiness,
    });
  } catch (error) {
    return handleRouteError(error, "OnboardingIntl");
  }
}

export async function POST(request: NextRequest) {
  try {
    const rl = await settingsLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    if (action === "select_countries") {
      const { targetCountries } = body;
      if (!Array.isArray(targetCountries)) {
        return NextResponse.json({ error: "targetCountries array required" }, { status: 400 });
      }

      await logAudit({
        actorId: auth.user.id,
        actorEmail: auth.user.email,
        action: "onboarding.countries_selected",
        entityType: "org",
        entityId: auth.orgId,
        details: { targetCountries },
      });

      return NextResponse.json({ success: true, countries: targetCountries });
    }

    if (action === "request_provisioning") {
      return NextResponse.json({
        success: true,
        message: "Provisioning request received. Voice provider setup will be configured by the platform.",
      }, { status: 201 });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return handleRouteError(error, "OnboardingIntl");
  }
}
