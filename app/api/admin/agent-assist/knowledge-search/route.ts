import { db } from "@/lib/db";
import { knowledgeChunks, knowledgeDocuments } from "@/shared/schema";
import { eq, and, ilike, sql } from "drizzle-orm";
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
    const { orgId, query } = await request.json();
    if (!orgId || !query) {
      return NextResponse.json({ error: "orgId and query are required" }, { status: 400 });
    }
    const results = await db
      .select({
        chunkId: knowledgeChunks.id,
        content: knowledgeChunks.content,
        chunkIndex: knowledgeChunks.chunkIndex,
        documentId: knowledgeDocuments.id,
        documentTitle: knowledgeDocuments.title,
        sourceType: knowledgeDocuments.sourceType,
      })
      .from(knowledgeChunks)
      .innerJoin(knowledgeDocuments, eq(knowledgeChunks.documentId, knowledgeDocuments.id))
      .where(
        and(
          eq(knowledgeChunks.orgId, parseInt(String(orgId), 10)),
          ilike(knowledgeChunks.content, `%${query}%`)
        )
      )
      .limit(5);
    return NextResponse.json(results);
  } catch (error: any) {
    console.error("Error searching knowledge base:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
