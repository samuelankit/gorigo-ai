import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { campaigns, campaignContacts } from "@/shared/schema";
import { eq, and, count, sql } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const campaignId = parseInt(id, 10);
    if (isNaN(campaignId)) {
      return NextResponse.json({ error: "Invalid campaign ID" }, { status: 400 });
    }

    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(and(eq(campaigns.id, campaignId), eq(campaigns.orgId, auth.orgId)))
      .limit(1);

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const counts = await db
      .select({
        totalContacts: count(),
        pendingCount: count(sql`CASE WHEN ${campaignContacts.status} = 'pending' THEN 1 END`),
        validCount: count(sql`CASE WHEN ${campaignContacts.status} = 'valid' THEN 1 END`),
        invalidCount: count(sql`CASE WHEN ${campaignContacts.status} = 'invalid' THEN 1 END`),
        dncBlockedCount: count(sql`CASE WHEN ${campaignContacts.status} = 'dnc_blocked' THEN 1 END`),
      })
      .from(campaignContacts)
      .where(and(eq(campaignContacts.campaignId, campaignId), eq(campaignContacts.orgId, auth.orgId)));

    return NextResponse.json({
      ...campaign,
      totalContacts: counts[0]?.totalContacts ?? 0,
      pendingCount: counts[0]?.pendingCount ?? 0,
      validCount: counts[0]?.validCount ?? 0,
      invalidCount: counts[0]?.invalidCount ?? 0,
      dncBlockedCount: counts[0]?.dncBlockedCount ?? 0,
    });
  } catch (error) {
    console.error("Campaign GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const campaignId = parseInt(id, 10);
    if (isNaN(campaignId)) {
      return NextResponse.json({ error: "Invalid campaign ID" }, { status: 400 });
    }

    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(and(eq(campaigns.id, campaignId), eq(campaigns.orgId, auth.orgId)))
      .limit(1);

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    if (campaign.status !== "draft" && campaign.status !== "paused") {
      return NextResponse.json(
        { error: "Campaign can only be updated when in draft or paused status" },
        { status: 400 }
      );
    }

    const body = await request.json();

    const allowedFields = [
      "name", "description", "agentId", "countryCode", "language",
      "callingHoursStart", "callingHoursEnd", "callingTimezone",
      "pacingCallsPerMinute", "pacingMaxConcurrent",
      "budgetCap", "dailySpendLimit", "script", "scriptLanguage",
    ];

    const updateData: Record<string, any> = { updatedAt: new Date() };
    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field];
      }
    }

    const [updated] = await db
      .update(campaigns)
      .set(updateData)
      .where(and(eq(campaigns.id, campaignId), eq(campaigns.orgId, auth.orgId)))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Campaign PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const campaignId = parseInt(id, 10);
    if (isNaN(campaignId)) {
      return NextResponse.json({ error: "Invalid campaign ID" }, { status: 400 });
    }

    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(and(eq(campaigns.id, campaignId), eq(campaigns.orgId, auth.orgId)))
      .limit(1);

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const [archived] = await db
      .update(campaigns)
      .set({
        status: "archived",
        archivedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(campaigns.id, campaignId), eq(campaigns.orgId, auth.orgId)))
      .returning();

    return NextResponse.json(archived);
  } catch (error) {
    console.error("Campaign DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
