import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { campaigns, campaignContacts } from "@/shared/schema";
import { eq, and, count } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";
import { handleRouteError } from "@/lib/api-error";
import { settingsLimiter } from "@/lib/rate-limit";

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

    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(and(eq(campaigns.id, campaignId), eq(campaigns.orgId, auth.orgId)))
      .limit(1);

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const [contactCountResult] = await db
      .select({ cnt: count() })
      .from(campaignContacts)
      .where(and(eq(campaignContacts.campaignId, campaignId), eq(campaignContacts.orgId, auth.orgId)));

    const contactCount = contactCountResult?.cnt ?? 0;

    const avgCallCostPerContact = 0.30;
    const tpsCheckCostPerContact = 0.02;

    let orchestrationFee = 0;
    if (contactCount >= 1 && contactCount <= 10) {
      orchestrationFee = 0;
    } else if (contactCount >= 11 && contactCount <= 50) {
      orchestrationFee = 0.50;
    } else if (contactCount >= 51 && contactCount <= 200) {
      orchestrationFee = 1.00;
    } else if (contactCount > 200) {
      orchestrationFee = 2.50;
    }

    const callCosts = contactCount * avgCallCostPerContact;
    const tpsCosts = contactCount * tpsCheckCostPerContact;
    const totalEstimate = callCosts + tpsCosts + orchestrationFee;

    await db
      .update(campaigns)
      .set({ estimatedCost: totalEstimate.toFixed(2), updatedAt: new Date() })
      .where(and(eq(campaigns.id, campaignId), eq(campaigns.orgId, auth.orgId)));

    return NextResponse.json({
      contactCount,
      breakdown: {
        callCosts: callCosts.toFixed(2),
        avgCallCostPerContact: avgCallCostPerContact.toFixed(2),
        tpsCosts: tpsCosts.toFixed(2),
        tpsCheckCostPerContact: tpsCheckCostPerContact.toFixed(2),
        orchestrationFee: orchestrationFee.toFixed(2),
      },
      totalEstimate: totalEstimate.toFixed(2),
      currency: "GBP",
    });
  } catch (error) {
    return handleRouteError(error, "CampaignEstimate");
  }
}
