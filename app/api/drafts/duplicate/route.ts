import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { drafts } from "@/shared/schema";
import { eq, and } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const id = body.id;
    if (!id || typeof id !== "number") {
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
    console.error("[Drafts] Duplicate error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
