import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { campaigns, campaignContacts } from "@/shared/schema";
import { eq, and, count, desc } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";
import { settingsLimiter } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/api-error";

export async function GET(
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

    const url = new URL(request.url);
    const statusFilter = url.searchParams.get("status");
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "50", 10)));
    const offset = (page - 1) * limit;

    const conditions = [
      eq(campaignContacts.campaignId, campaignId),
      eq(campaignContacts.orgId, auth.orgId),
    ];

    if (statusFilter) {
      const validStatuses = ["pending", "valid", "invalid", "dnc_blocked", "completed", "failed"];
      if (validStatuses.includes(statusFilter)) {
        conditions.push(eq(campaignContacts.status, statusFilter));
      }
    }

    const whereClause = and(...conditions);

    const [totalResult] = await db
      .select({ totalCount: count() })
      .from(campaignContacts)
      .where(whereClause);

    const totalCount = totalResult?.totalCount ?? 0;

    const contacts = await db
      .select()
      .from(campaignContacts)
      .where(whereClause)
      .orderBy(desc(campaignContacts.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      contacts,
      totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
    });
  } catch (error) {
    return handleRouteError(error, "CampaignContacts");
  }
}
