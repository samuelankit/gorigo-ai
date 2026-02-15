import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { campaigns, campaignContacts } from "@/shared/schema";
import { eq, and, count } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";
import { z } from "zod";
import { handleRouteError } from "@/lib/api-error";

const campaignStatusSchema = z.object({
  status: z.enum(["draft", "active", "paused", "completed", "cancelled"]),
  reason: z.string().max(500).optional(),
}).strict();

const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ["active", "cancelled"],
  active: ["paused", "completed"],
  paused: ["active", "cancelled"],
};

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

    const body = await request.json();
    const { status: newStatus, reason } = campaignStatusSchema.parse(body);

    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(and(eq(campaigns.id, campaignId), eq(campaigns.orgId, auth.orgId)))
      .limit(1);

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const currentStatus = campaign.status || "draft";
    const allowedTransitions = VALID_TRANSITIONS[currentStatus];
    if (!allowedTransitions || !allowedTransitions.includes(newStatus)) {
      return NextResponse.json(
        { error: `Invalid status transition from '${currentStatus}' to '${newStatus}'` },
        { status: 400 }
      );
    }

    if (currentStatus === "draft" && newStatus === "active") {
      const [validContactCount] = await db
        .select({ cnt: count() })
        .from(campaignContacts)
        .where(
          and(
            eq(campaignContacts.campaignId, campaignId),
            eq(campaignContacts.orgId, auth.orgId),
            eq(campaignContacts.status, "valid")
          )
        );

      if (!validContactCount || validContactCount.cnt === 0) {
        return NextResponse.json(
          { error: "Campaign must have at least 1 valid contact to activate" },
          { status: 400 }
        );
      }
    }

    const updateData: Record<string, any> = {
      status: newStatus,
      updatedAt: new Date(),
    };

    if (newStatus === "paused") {
      updateData.pausedAt = new Date();
      updateData.pausedReason = reason || null;
    }

    if (currentStatus === "paused" && newStatus === "active") {
      updateData.pausedAt = null;
      updateData.pausedReason = null;
    }

    if (newStatus === "completed") {
      updateData.completedAt = new Date();
    }

    const [updated] = await db
      .update(campaigns)
      .set(updateData)
      .where(and(eq(campaigns.id, campaignId), eq(campaigns.orgId, auth.orgId)))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    return handleRouteError(error, "CampaignStatus");
  }
}
