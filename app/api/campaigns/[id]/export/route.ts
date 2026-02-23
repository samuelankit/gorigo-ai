import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { campaigns, campaignContacts } from "@/shared/schema";
import { eq, and } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";
import { handleRouteError } from "@/lib/api-error";
import { exportLimiter } from "@/lib/rate-limit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rl = await exportLimiter(request);
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

    const contacts = await db
      .select()
      .from(campaignContacts)
      .where(and(eq(campaignContacts.campaignId, campaignId), eq(campaignContacts.orgId, auth.orgId)));

    const csvHeader = "Contact Name,Phone Number,Status,Attempt Count,Last Disposition,Completed At\n";
    const csvRows = contacts.map(c => {
      const name = (c.contactName || "").replace(/,/g, " ");
      const phone = c.phoneNumberE164 || c.phoneNumber;
      const status = c.status;
      const attempts = c.attemptCount || 0;
      const disposition = (c.lastCallDisposition || "").replace(/,/g, " ");
      const completedAt = c.completedAt ? new Date(c.completedAt).toISOString() : "";
      return `${name},${phone},${status},${attempts},${disposition},${completedAt}`;
    }).join("\n");

    const csv = csvHeader + csvRows;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="campaign-${campaignId}-results.csv"`,
      },
    });
  } catch (error) {
    return handleRouteError(error, "CampaignExport");
  }
}
