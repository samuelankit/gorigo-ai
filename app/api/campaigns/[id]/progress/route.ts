import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { campaigns, campaignContacts } from "@/shared/schema";
import { eq, and, sql, count } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";
import { handleRouteError } from "@/lib/api-error";
import { generalLimiter } from "@/lib/rate-limit";

export async function GET(
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

    const statusCounts = await db
      .select({
        status: campaignContacts.status,
        cnt: count(),
      })
      .from(campaignContacts)
      .where(and(eq(campaignContacts.campaignId, campaignId), eq(campaignContacts.orgId, auth.orgId)))
      .groupBy(campaignContacts.status);

    const countMap: Record<string, number> = {};
    for (const row of statusCounts) {
      countMap[row.status] = Number(row.cnt);
    }

    const completed = countMap["completed"] || 0;
    const failed = countMap["failed"] || 0;
    const skipped = (countMap["skipped"] || 0) + (countMap["dnc_blocked"] || 0);
    const pending = (countMap["pending"] || 0) + (countMap["queued"] || 0);
    const inProgress = (countMap["in_progress"] || 0) + (countMap["calling"] || 0);
    const valid = countMap["valid"] || 0;
    const invalid = countMap["invalid"] || 0;

    const totalContacts = Object.values(countMap).reduce((a, b) => a + b, 0);
    const processedCount = completed + failed + skipped;
    const progressPercent = totalContacts > 0 ? Math.round((processedCount / totalContacts) * 100) : 0;

    const budgetSpent = parseFloat(campaign.budgetSpent || "0");
    const estimatedCost = parseFloat(campaign.estimatedCost || "0");
    const lockedAmount = parseFloat(campaign.lockedAmount || "0");

    let estimatedTimeRemainingMinutes: number | null = null;
    if (processedCount > 0 && campaign.startedAt) {
      const elapsedMs = Date.now() - new Date(campaign.startedAt).getTime();
      const msPerContact = elapsedMs / processedCount;
      estimatedTimeRemainingMinutes = Math.round((pending * msPerContact) / 60000);
    }

    return NextResponse.json({
      campaignId,
      status: campaign.status,
      totalContacts,
      completed,
      failed,
      skipped,
      pending,
      inProgress,
      valid,
      progressPercent,
      budgetSpent: budgetSpent.toFixed(2),
      estimatedCost: estimatedCost.toFixed(2),
      lockedAmount: lockedAmount.toFixed(2),
      costCapReached: campaign.costCapReached || false,
      estimatedTimeRemainingMinutes,
    });
  } catch (error) {
    return handleRouteError(error, "CampaignProgress");
  }
}
