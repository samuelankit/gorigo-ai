import { db } from "@/lib/db";
import { assistSuggestions } from "@/shared/schema";
import { getAuthenticatedUser, requireSuperAdmin } from "@/lib/get-user";
import { NextRequest, NextResponse } from "next/server";
import { adminLimiter } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const rl = await adminLimiter(request);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    const auth = await getAuthenticatedUser();
    const access = requireSuperAdmin(auth);
    if (!access.allowed) return NextResponse.json({ error: access.error }, { status: 403 });
    const body = await request.json();
    const [suggestion] = await db.insert(assistSuggestions).values({
      sessionId: body.sessionId,
      sourceType: body.sourceType,
      sourceId: body.sourceId,
      content: body.content,
      confidence: body.confidence,
      status: "shown",
      responseTimeMs: body.responseTimeMs,
      knowledgeDocId: body.knowledgeDocId,
    }).returning();
    return NextResponse.json(suggestion, { status: 201 });
  } catch (error: any) {
    console.error("Error creating suggestion:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
