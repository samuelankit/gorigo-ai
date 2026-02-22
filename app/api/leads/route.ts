import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chatLeads } from "@/shared/schema";
import { eq, desc, sql, ilike, and, or } from "drizzle-orm";
import { getAuthenticatedUser, requireEmailVerified } from "@/lib/get-user";
import { settingsLimiter } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/api-error";
import { z } from "zod";

const updateLeadSchema = z.object({
  leadId: z.number().int().positive(),
  pipelineStage: z.enum(["new", "contacted", "qualified", "proposal", "won", "lost"]).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  phone: z.string().max(20).optional(),
  company: z.string().max(200).optional(),
}).strict();

export async function GET(request: NextRequest) {
  try {
    const rl = await settingsLimiter(request);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const pageSize = Math.min(50, Math.max(1, parseInt(url.searchParams.get("pageSize") || "25")));
    const search = url.searchParams.get("search") || "";
    const stage = url.searchParams.get("stage") || "all";

    const conditions: any[] = [eq(chatLeads.orgId, auth.orgId)];

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

    const whereClause = and(...conditions);

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(chatLeads)
      .where(whereClause);

    const total = countResult?.count || 0;
    const totalPages = Math.ceil(total / pageSize);

    const leads = await db
      .select()
      .from(chatLeads)
      .where(whereClause)
      .orderBy(desc(chatLeads.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    const stageCounts = await db
      .select({
        stage: chatLeads.pipelineStage,
        count: sql<number>`count(*)::int`,
      })
      .from(chatLeads)
      .where(eq(chatLeads.orgId, auth.orgId))
      .groupBy(chatLeads.pipelineStage);

    const stageMap: Record<string, number> = {};
    for (const row of stageCounts) {
      stageMap[row.stage || "new"] = row.count;
    }

    return NextResponse.json({ leads, total, totalPages, page, stageCounts: stageMap });
  } catch (error) {
    return handleRouteError(error, "GET /api/leads");
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const rl = await settingsLimiter(request);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const emailCheck = requireEmailVerified(auth);
    if (!emailCheck.allowed) return NextResponse.json({ error: emailCheck.error }, { status: emailCheck.status || 403 });

    const body = await request.json();
    const parsed = updateLeadSchema.parse(body);

    const [existing] = await db
      .select({ id: chatLeads.id })
      .from(chatLeads)
      .where(and(eq(chatLeads.id, parsed.leadId), eq(chatLeads.orgId, auth.orgId)))
      .limit(1);

    if (!existing) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (parsed.pipelineStage) updates.pipelineStage = parsed.pipelineStage;
    if (parsed.tags) updates.tags = parsed.tags;
    if (parsed.phone !== undefined) updates.phone = parsed.phone;
    if (parsed.company !== undefined) updates.company = parsed.company;

    await db.update(chatLeads).set(updates).where(eq(chatLeads.id, parsed.leadId));

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError(error, "PATCH /api/leads");
  }
}
