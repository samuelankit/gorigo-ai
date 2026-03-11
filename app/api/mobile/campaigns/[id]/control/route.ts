import { db } from "@/lib/db";
import { campaigns } from "@/shared/schema";
import { eq, and } from "drizzle-orm";
import { getAuthenticatedUser, requirePasswordChanged, requireOrgActive } from "@/lib/get-user";
import { NextRequest, NextResponse } from "next/server";
import { generalLimiter } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/api-error";
import { z } from "zod";

export const dynamic = "force-dynamic";

const controlSchema = z.object({
  action: z.enum(["pause", "resume", "cancel"]),
  reason: z.string().max(500).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rl = await generalLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pwCheck = requirePasswordChanged(auth);
    if (!pwCheck.allowed) {
      return NextResponse.json({ error: pwCheck.error }, { status: pwCheck.status || 403 });
    }

    const orgCheck = await requireOrgActive(auth.orgId);
    if (!orgCheck.allowed) {
      return NextResponse.json({ error: orgCheck.error }, { status: orgCheck.status || 403 });
    }

    const { id } = await params;
    const campaignId = parseInt(id, 10);
    if (isNaN(campaignId)) {
      return NextResponse.json({ error: "Invalid campaign ID" }, { status: 400 });
    }

    const body = await request.json();
    const validated = controlSchema.parse(body);

    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(and(eq(campaigns.id, campaignId), eq(campaigns.orgId, auth.orgId)))
      .limit(1);

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const { action, reason } = validated;

    if (action === "pause") {
      if (campaign.status !== "running" && campaign.status !== "approved") {
        return NextResponse.json(
          { error: `Cannot pause a campaign with status "${campaign.status}". Only running or approved campaigns can be paused.` },
          { status: 400 }
        );
      }

      const [updated] = await db
        .update(campaigns)
        .set({
          status: "paused",
          pausedAt: new Date(),
          pausedReason: reason || "Manually paused via mobile",
          updatedAt: new Date(),
        })
        .where(and(eq(campaigns.id, campaignId), eq(campaigns.orgId, auth.orgId)))
        .returning();

      return NextResponse.json({ campaign: updated, message: "Campaign paused" });
    }

    if (action === "resume") {
      if (campaign.status !== "paused") {
        return NextResponse.json(
          { error: `Cannot resume a campaign with status "${campaign.status}". Only paused campaigns can be resumed.` },
          { status: 400 }
        );
      }

      const [updated] = await db
        .update(campaigns)
        .set({
          status: "running",
          pausedAt: null,
          pausedReason: null,
          updatedAt: new Date(),
        })
        .where(and(eq(campaigns.id, campaignId), eq(campaigns.orgId, auth.orgId)))
        .returning();

      return NextResponse.json({ campaign: updated, message: "Campaign resumed" });
    }

    if (action === "cancel") {
      if (campaign.status === "completed" || campaign.status === "cancelled") {
        return NextResponse.json(
          { error: `Cannot cancel a campaign with status "${campaign.status}".` },
          { status: 400 }
        );
      }

      const [updated] = await db
        .update(campaigns)
        .set({
          status: "cancelled",
          archivedAt: new Date(),
          pausedReason: reason || "Cancelled via mobile",
          updatedAt: new Date(),
        })
        .where(and(eq(campaigns.id, campaignId), eq(campaigns.orgId, auth.orgId)))
        .returning();

      return NextResponse.json({ campaign: updated, message: "Campaign cancelled" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return handleRouteError(error, "MobileCampaignControl");
  }
}
