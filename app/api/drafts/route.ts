import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { drafts } from "@/shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";
import { aiLimiter } from "@/lib/rate-limit";
import { z } from "zod";

function escapeSearchPattern(input: string): string {
  return input.replace(/%/g, "\\%").replace(/_/g, "\\_");
}

const createDraftSchema = z.object({
  type: z.enum(["call_script", "email_template", "sms_template", "faq_answer"]),
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(10000),
  prompt: z.string().max(2000).optional(),
  tone: z.enum(["professional", "friendly", "concise", "detailed", "empathetic"]).default("professional"),
  language: z.string().max(10).default("en"),
  qualityScore: z.number().min(0).max(1).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const TYPE_CHAR_LIMITS: Record<string, number> = {
  call_script: 1000,
  email_template: 3000,
  sms_template: 320,
  faq_answer: 700,
};

const updateDraftSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(10000).optional(),
  tone: z.string().optional(),
  language: z.string().max(10).optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const parentId = searchParams.get("parentId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
    const offset = (page - 1) * limit;

    const conditions = [
      eq(drafts.orgId, auth.orgId),
    ];

    if (parentId) {
      const pid = parseInt(parentId);
      if (pid > 0) {
        conditions.push(eq(drafts.parentDraftId, pid));
      }
    } else {
      if (type && ["call_script", "email_template", "sms_template", "faq_answer"].includes(type)) {
        conditions.push(eq(drafts.type, type));
      }
      if (status && ["draft", "published", "archived"].includes(status)) {
        conditions.push(eq(drafts.status, status));
      }
      if (search) {
        const escaped = escapeSearchPattern(search);
        conditions.push(
          sql`(${drafts.title} ILIKE ${'%' + escaped + '%'} ESCAPE '\\' OR ${drafts.content} ILIKE ${'%' + escaped + '%'} ESCAPE '\\')`
        );
      }
      conditions.push(sql`${drafts.parentDraftId} IS NULL`);
    }

    const whereClause = and(...conditions);

    const [totalResult] = await db
      .select({ total: sql<number>`count(*)` })
      .from(drafts)
      .where(whereClause);

    const results = await db
      .select()
      .from(drafts)
      .where(whereClause)
      .orderBy(desc(drafts.updatedAt))
      .limit(limit)
      .offset(offset);

    const total = Number(totalResult?.total || 0);

    return NextResponse.json({
      drafts: results,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[Drafts] List error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createDraftSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
    }

    const [draft] = await db.insert(drafts).values({
      orgId: auth.orgId,
      userId: auth.user.id,
      type: parsed.data.type,
      title: parsed.data.title,
      content: parsed.data.content,
      prompt: parsed.data.prompt || null,
      tone: parsed.data.tone,
      language: parsed.data.language,
      qualityScore: parsed.data.qualityScore || null,
      metadata: parsed.data.metadata || null,
      status: "draft",
      version: 1,
    }).returning();

    return NextResponse.json({ draft }, { status: 201 });
  } catch (error) {
    console.error("[Drafts] Create error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = updateDraftSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
    }

    const { id, ...updates } = parsed.data;

    const [existing] = await db
      .select()
      .from(drafts)
      .where(and(eq(drafts.id, id), eq(drafts.orgId, auth.orgId)))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }

    if (updates.content) {
      const charLimit = TYPE_CHAR_LIMITS[existing.type] || 10000;
      if (updates.content.length > charLimit) {
        return NextResponse.json({
          error: `Content exceeds the ${charLimit} character limit for ${existing.type.replace("_", " ")}s. Current: ${updates.content.length} characters.`,
        }, { status: 400 });
      }
    }

    if (updates.content && updates.content !== existing.content) {
      await db.insert(drafts).values({
        orgId: existing.orgId,
        userId: existing.userId,
        type: existing.type,
        title: existing.title,
        content: existing.content,
        prompt: existing.prompt,
        tone: existing.tone,
        language: existing.language,
        qualityScore: existing.qualityScore,
        metadata: existing.metadata,
        status: "archived",
        version: existing.version,
        parentDraftId: existing.id,
      });
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };
    if (updates.title) updateData.title = updates.title;
    if (updates.content) {
      updateData.content = updates.content;
      updateData.version = existing.version + 1;
    }
    if (updates.tone) updateData.tone = updates.tone;
    if (updates.language) updateData.language = updates.language;
    if (updates.status) updateData.status = updates.status;
    if (updates.metadata) updateData.metadata = updates.metadata;

    const [updated] = await db
      .update(drafts)
      .set(updateData)
      .where(eq(drafts.id, id))
      .returning();

    return NextResponse.json({ draft: updated });
  } catch (error) {
    console.error("[Drafts] Update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const rl = await aiLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = parseInt(searchParams.get("id") || "0");
    if (!id) {
      return NextResponse.json({ error: "Draft ID required" }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(drafts)
      .where(and(eq(drafts.id, id), eq(drafts.orgId, auth.orgId)))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }

    await db.delete(drafts).where(eq(drafts.parentDraftId, id));
    await db.delete(drafts).where(eq(drafts.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Drafts] Delete error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
