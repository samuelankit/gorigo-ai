import { db } from "@/lib/db";
import { campaigns, agents, campaignContacts } from "@/shared/schema";
import { eq, and, sql, desc, ilike } from "drizzle-orm";
import { getAuthenticatedUser, requirePasswordChanged, requireOrgActive } from "@/lib/get-user";
import { NextRequest, NextResponse } from "next/server";
import { generalLimiter } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/api-error";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10) || 20, 100);
    const offset = Math.max(parseInt(searchParams.get("offset") ?? "0", 10) || 0, 0);
    const search = searchParams.get("search")?.trim() || "";
    const statusFilter = searchParams.get("status")?.trim() || "";

    const conditions: any[] = [eq(campaigns.orgId, auth.orgId)];

    if (search) {
      conditions.push(ilike(campaigns.name, `%${search}%`));
    }

    if (statusFilter && statusFilter !== "all") {
      conditions.push(eq(campaigns.status, statusFilter));
    }

    const whereClause = and(...conditions);

    const [campaignsList, countResult] = await Promise.all([
      db
        .select({
          id: campaigns.id,
          name: campaigns.name,
          status: campaigns.status,
          totalContacts: campaigns.totalContacts,
          completedCount: campaigns.completedCount,
          failedCount: campaigns.failedCount,
          answeredCount: campaigns.answeredCount,
          budgetCap: campaigns.budgetCap,
          budgetSpent: campaigns.budgetSpent,
          agentName: agents.name,
          agentId: campaigns.agentId,
          createdAt: campaigns.createdAt,
        })
        .from(campaigns)
        .leftJoin(agents, eq(campaigns.agentId, agents.id))
        .where(whereClause)
        .orderBy(desc(campaigns.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(campaigns)
        .where(whereClause),
    ]);

    return NextResponse.json({
      campaigns: campaignsList,
      total: countResult[0]?.count ?? 0,
    });
  } catch (error) {
    return handleRouteError(error, "MobileCampaigns");
  }
}

const e164Regex = /^\+[1-9]\d{6,14}$/;

const createCampaignSchema = z.object({
  name: z.string().min(1).max(200),
  agentId: z.number().int().positive(),
  contacts: z.array(z.object({
    phone: z.string().regex(e164Regex, "Phone number must be in E.164 format (e.g. +447700900000)"),
    name: z.string().optional(),
  })).min(1).max(10000),
  callingHoursStart: z.string().max(10).optional(),
  callingHoursEnd: z.string().max(10).optional(),
  callingTimezone: z.string().max(100).optional(),
  budgetCap: z.number().min(0).optional(),
});

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const validated = createCampaignSchema.parse(body);

    const [agent] = await db
      .select({ id: agents.id })
      .from(agents)
      .where(and(eq(agents.id, validated.agentId), eq(agents.orgId, auth.orgId)))
      .limit(1);

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const uniquePhones = new Map<string, { phone: string; name: string }>();
    for (const c of validated.contacts) {
      const normalized = c.phone.trim();
      if (!uniquePhones.has(normalized)) {
        uniquePhones.set(normalized, { phone: normalized, name: c.name || "" });
      }
    }
    const contactList = Array.from(uniquePhones.values());

    const campaign = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(campaigns)
        .values({
          orgId: auth.orgId,
          name: validated.name.trim(),
          agentId: validated.agentId,
          contactList,
          totalContacts: contactList.length,
          callingHoursStart: validated.callingHoursStart || null,
          callingHoursEnd: validated.callingHoursEnd || null,
          callingTimezone: validated.callingTimezone || null,
          budgetCap: validated.budgetCap != null ? String(validated.budgetCap) : null,
          status: "draft",
        })
        .returning();

      if (contactList.length > 0) {
        await tx.insert(campaignContacts).values(
          contactList.map((c) => ({
            campaignId: created.id,
            orgId: auth.orgId,
            phoneNumber: c.phone,
            phoneNumberE164: c.phone,
            contactName: c.name || null,
            status: "pending" as const,
          }))
        );
      }

      return created;
    });

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "MobileCampaignCreate");
  }
}
