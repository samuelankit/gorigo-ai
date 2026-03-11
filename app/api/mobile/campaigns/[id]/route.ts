import { db } from "@/lib/db";
import { campaigns, agents, campaignContacts } from "@/shared/schema";
import { eq, and, sql, count } from "drizzle-orm";
import { getAuthenticatedUser, requirePasswordChanged, requireOrgActive } from "@/lib/get-user";
import { NextRequest, NextResponse } from "next/server";
import { generalLimiter } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/api-error";
import { z } from "zod";

export const dynamic = "force-dynamic";

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

    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(and(eq(campaigns.id, campaignId), eq(campaigns.orgId, auth.orgId)))
      .limit(1);

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const [agentData] = campaign.agentId
      ? await db
          .select({ name: agents.name })
          .from(agents)
          .where(eq(agents.id, campaign.agentId))
          .limit(1)
      : [null];

    const contactCounts = await db
      .select({
        totalContacts: count(),
        pendingCount: count(sql`CASE WHEN ${campaignContacts.status} = 'pending' THEN 1 END`),
        completedCount: count(sql`CASE WHEN ${campaignContacts.status} = 'completed' THEN 1 END`),
        failedCount: count(sql`CASE WHEN ${campaignContacts.status} = 'failed' THEN 1 END`),
        validCount: count(sql`CASE WHEN ${campaignContacts.status} = 'valid' THEN 1 END`),
      })
      .from(campaignContacts)
      .where(and(eq(campaignContacts.campaignId, campaignId), eq(campaignContacts.orgId, auth.orgId)));

    return NextResponse.json({
      ...campaign,
      agentName: agentData?.name || null,
      contactsSummary: {
        total: contactCounts[0]?.totalContacts ?? campaign.totalContacts ?? 0,
        pending: contactCounts[0]?.pendingCount ?? 0,
        completed: contactCounts[0]?.completedCount ?? 0,
        failed: contactCounts[0]?.failedCount ?? 0,
        valid: contactCounts[0]?.validCount ?? 0,
      },
      progress: {
        totalContacts: campaign.totalContacts ?? 0,
        completedCount: campaign.completedCount ?? 0,
        failedCount: campaign.failedCount ?? 0,
        answeredCount: campaign.answeredCount ?? 0,
        budgetCap: campaign.budgetCap ? Number(campaign.budgetCap) : null,
        budgetSpent: campaign.budgetSpent ? Number(campaign.budgetSpent) : 0,
      },
    });
  } catch (error) {
    return handleRouteError(error, "MobileCampaignDetail");
  }
}

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  agentId: z.number().int().positive().optional(),
  callingHoursStart: z.string().max(10).optional(),
  callingHoursEnd: z.string().max(10).optional(),
  callingTimezone: z.string().max(100).optional(),
}).strict();

export async function PATCH(
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
    const validated = updateSchema.parse(body);

    if (validated.agentId) {
      const [agent] = await db
        .select({ id: agents.id })
        .from(agents)
        .where(and(eq(agents.id, validated.agentId), eq(agents.orgId, auth.orgId)))
        .limit(1);

      if (!agent) {
        return NextResponse.json({ error: "Agent not found" }, { status: 404 });
      }
    }

    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (validated.name) updateData.name = validated.name.trim();
    if (validated.agentId) updateData.agentId = validated.agentId;
    if (validated.callingHoursStart !== undefined) updateData.callingHoursStart = validated.callingHoursStart;
    if (validated.callingHoursEnd !== undefined) updateData.callingHoursEnd = validated.callingHoursEnd;
    if (validated.callingTimezone !== undefined) updateData.callingTimezone = validated.callingTimezone;

    const [updated] = await db
      .update(campaigns)
      .set(updateData)
      .where(and(eq(campaigns.id, campaignId), eq(campaigns.orgId, auth.orgId)))
      .returning();

    return NextResponse.json({ campaign: updated });
  } catch (error) {
    return handleRouteError(error, "MobileCampaignUpdate");
  }
}
