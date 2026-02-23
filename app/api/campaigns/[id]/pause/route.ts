import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { campaigns } from "@/shared/schema";
import { eq, and } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";
import { handleRouteError } from "@/lib/api-error";
import { settingsLimiter } from "@/lib/rate-limit";
import { z } from "zod";

const pauseSchema = z.object({
  reason: z.string().max(500).optional(),
}).strict().optional();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rl = await settingsLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const campaignId = parseInt(id, 10);
    if (isNaN(campaignId)) {
      return NextResponse.json({ error: "Invalid campaign ID" }, { status: 400 });
    }

    let body: { reason?: string } = {};
    try {
      const raw = await request.json();
      const parsed = pauseSchema.parse(raw);
      if (parsed) body = parsed;
    } catch (e) {
      if (e instanceof z.ZodError) {
        return NextResponse.json({ error: "Validation failed", details: e.errors }, { status: 400 });
      }
    }

    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(and(eq(campaigns.id, campaignId), eq(campaigns.orgId, auth.orgId)))
      .limit(1);

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    if (campaign.status !== "running" && campaign.status !== "approved" && campaign.status !== "active") {
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
        pausedReason: body.reason || "Manually paused",
        updatedAt: new Date(),
      })
      .where(and(eq(campaigns.id, campaignId), eq(campaigns.orgId, auth.orgId)))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    return handleRouteError(error, "CampaignPause");
  }
}
