import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orgs, countries, twilioSubAccounts } from "@/shared/schema";
import { eq, and } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";
import { logAudit } from "@/lib/audit";

export async function GET(request: NextRequest) {
  try {
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

    const [subAccount] = await db
      .select()
      .from(twilioSubAccounts)
      .where(eq(twilioSubAccounts.orgId, auth.orgId))
      .limit(1);

    const readiness = {
      hasDeploymentModel: !!org?.deploymentModel,
      hasSubAccount: !!subAccount,
      subAccountActive: subAccount?.status === "active",
      steps: [
        { id: "deployment", label: "Select Deployment Model", completed: !!org?.deploymentModel },
        { id: "country", label: "Configure Target Countries", completed: true },
        { id: "telephony", label: "Telephony Setup", completed: !!subAccount },
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
      subAccount: subAccount ? {
        id: subAccount.id,
        status: subAccount.status,
        friendlyName: subAccount.friendlyName,
      } : null,
      readiness,
    });
  } catch (error) {
    console.error("International onboarding error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
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
      const { countryCode } = body;

      const [existingSub] = await db
        .select()
        .from(twilioSubAccounts)
        .where(eq(twilioSubAccounts.orgId, auth.orgId))
        .limit(1);

      if (existingSub) {
        return NextResponse.json({
          message: "Sub-account already exists",
          subAccount: { id: existingSub.id, status: existingSub.status },
        });
      }

      const [newSub] = await db
        .insert(twilioSubAccounts)
        .values({
          orgId: auth.orgId,
          friendlyName: `GoRigo-${auth.orgId}-${countryCode || "INT"}`,
          status: "pending",
          concurrentCallLimit: 10,
        })
        .returning();

      await logAudit({
        actorId: auth.user.id,
        actorEmail: auth.user.email,
        action: "onboarding.provisioning_requested",
        entityType: "twilio_sub_account",
        entityId: newSub.id,
        details: { countryCode },
      });

      return NextResponse.json({
        success: true,
        subAccount: { id: newSub.id, status: newSub.status, friendlyName: newSub.friendlyName },
      }, { status: 201 });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("International onboarding action error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
