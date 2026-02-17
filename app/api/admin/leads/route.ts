import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chatLeads, chatMessages, leadActivities } from "@/shared/schema";
import { eq, desc, sql, ilike, and, or } from "drizzle-orm";
import { getAuthenticatedUser, requireReadAccess, requireWriteAccess } from "@/lib/get-user";
import { adminLimiter } from "@/lib/rate-limit";
import { checkBodySize, BODY_LIMITS } from "@/lib/body-limit";
import { handleRouteError } from "@/lib/api-error";
import { z } from "zod";
import { enrichLead } from "@/lib/enrichment-engine";

const updateLeadSchema = z.object({
  leadId: z.number().int().positive(),
  pipelineStage: z.enum(["new", "contacted", "qualified", "proposal", "won", "lost"]).optional(),
  assignedTo: z.number().int().positive().nullable().optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  phone: z.string().max(20).optional(),
  company: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
}).strict();

export async function GET(request: NextRequest) {
  try {
    const rl = await adminLimiter(request);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const auth = await getAuthenticatedUser();
    if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const readCheck = requireReadAccess(auth);
    if (!readCheck.allowed) return NextResponse.json({ error: readCheck.error }, { status: 403 });

    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get("pageSize") || "25")));
    const search = url.searchParams.get("search") || "";
    const stage = url.searchParams.get("stage") || "all";
    const sortBy = url.searchParams.get("sortBy") || "createdAt";
    const sortDir = url.searchParams.get("sortDir") || "desc";

    const conditions: any[] = [];
    if (auth.orgId) {
      conditions.push(eq(chatLeads.orgId, auth.orgId));
    }
    if (stage && stage !== "all") {
      conditions.push(eq(chatLeads.pipelineStage, stage));
    }
    if (search.trim()) {
      const s = `%${search.trim()}%`;
      conditions.push(or(
        ilike(chatLeads.name, s),
        ilike(chatLeads.email, s),
        ilike(chatLeads.company, s),
        ilike(chatLeads.phone, s)
      ));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(chatLeads)
      .where(whereClause);

    const total = countResult?.count || 0;
    const totalPages = Math.ceil(total / pageSize);

    const orderColumn = sortBy === "leadScore" ? chatLeads.leadScore
      : sortBy === "name" ? chatLeads.name
      : sortBy === "lastMessageAt" ? chatLeads.lastMessageAt
      : chatLeads.createdAt;

    const leads = await db
      .select()
      .from(chatLeads)
      .where(whereClause)
      .orderBy(sortDir === "asc" ? orderColumn : desc(orderColumn))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const stageCounts = await db
      .select({
        stage: chatLeads.pipelineStage,
        count: sql<number>`count(*)::int`,
      })
      .from(chatLeads)
      .where(auth.orgId ? eq(chatLeads.orgId, auth.orgId) : undefined)
      .groupBy(chatLeads.pipelineStage);

    const stageMap: Record<string, number> = {};
    for (const s of stageCounts) {
      stageMap[s.stage || "new"] = s.count;
    }

    return NextResponse.json({
      leads,
      total,
      totalPages,
      page,
      stageCounts: stageMap,
    });
  } catch (error) {
    return handleRouteError(error, "AdminLeads");
  }
}

export async function PUT(request: NextRequest) {
  try {
    const rl = await adminLimiter(request);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const sizeError = checkBodySize(request, BODY_LIMITS.settings);
    if (sizeError) return sizeError;

    const auth = await getAuthenticatedUser();
    if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const writeCheck = requireWriteAccess(auth);
    if (!writeCheck.allowed) return NextResponse.json({ error: writeCheck.error }, { status: 403 });

    const body = await request.json();
    const parsed = updateLeadSchema.parse(body);

    const updateData: Record<string, unknown> = {};
    if (parsed.pipelineStage !== undefined) updateData.pipelineStage = parsed.pipelineStage;
    if (parsed.assignedTo !== undefined) updateData.assignedTo = parsed.assignedTo;
    if (parsed.tags !== undefined) updateData.tags = parsed.tags;
    if (parsed.phone !== undefined) updateData.phone = parsed.phone;
    if (parsed.company !== undefined) updateData.company = parsed.company;

    if (Object.keys(updateData).length === 0 && !parsed.notes) {
      return NextResponse.json({ error: "No update fields provided" }, { status: 400 });
    }

    const updateConditions = auth.orgId
      ? and(eq(chatLeads.id, parsed.leadId), eq(chatLeads.orgId, auth.orgId))
      : eq(chatLeads.id, parsed.leadId);

    const [existingLead] = await db
      .select({ id: chatLeads.id })
      .from(chatLeads)
      .where(updateConditions)
      .limit(1);

    if (!existingLead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    if (Object.keys(updateData).length > 0) {
      await db
        .update(chatLeads)
        .set(updateData)
        .where(updateConditions);
    }

    const activityParts: string[] = [];
    if (parsed.pipelineStage) activityParts.push(`Stage changed to "${parsed.pipelineStage}"`);
    if (parsed.assignedTo !== undefined) activityParts.push(parsed.assignedTo ? `Assigned to user #${parsed.assignedTo}` : "Unassigned");
    if (parsed.tags) activityParts.push(`Tags updated`);
    if (parsed.phone) activityParts.push(`Phone updated`);
    if (parsed.company) activityParts.push(`Company updated`);
    if (parsed.notes) activityParts.push(`Note added`);

    if (activityParts.length > 0) {
      await db.insert(leadActivities).values({
        leadId: parsed.leadId,
        type: parsed.notes ? "note" : "update",
        description: parsed.notes || activityParts.join(". "),
        performedBy: auth.user.id,
        metadata: { changes: updateData, note: parsed.notes },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError(error, "AdminLeads");
  }
}
