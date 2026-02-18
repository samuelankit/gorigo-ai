import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { drafts } from "@/shared/schema";
import { eq, and } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";
import { aiLimiter } from "@/lib/rate-limit";
import { checkBodySize, BODY_LIMITS } from "@/lib/body-limit";
import { z } from "zod";
import { handleRouteError } from "@/lib/api-error";

const duplicateSchema = z.object({
  id: z.number().int().positive(),
}).strict();

export async function POST(request: NextRequest) {
  try {
    const rl = await aiLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const sizeError = checkBodySize(request, BODY_LIMITS.chat);
    if (sizeError) return sizeError;

    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = duplicateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Draft ID required" }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(drafts)
      .where(and(eq(drafts.id, parsed.data.id), eq(drafts.orgId, auth.orgId)))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }

    const [duplicate] = await db.insert(drafts).values({
      orgId: auth.orgId,
      userId: auth.user.id,
      type: existing.type,
      title: `${existing.title} (Copy)`,
      content: existing.content,
      prompt: existing.prompt,
      tone: existing.tone,
      language: existing.language,
      qualityScore: existing.qualityScore,
      metadata: existing.metadata,
      status: "draft",
      version: 1,
    }).returning();

    return NextResponse.json({ draft: duplicate }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "DraftsDuplicate");
  }
}
