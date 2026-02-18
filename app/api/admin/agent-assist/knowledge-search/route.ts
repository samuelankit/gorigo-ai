import { db } from "@/lib/db";
import { knowledgeChunks, knowledgeDocuments } from "@/shared/schema";
import { eq, and, ilike, sql } from "drizzle-orm";
import { getAuthenticatedUser, requireSuperAdmin } from "@/lib/get-user";
import { NextRequest, NextResponse } from "next/server";
import { adminLimiter } from "@/lib/rate-limit";

import { handleRouteError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

function escapeIlike(input: string): string {
  return input.replace(/[%_\\]/g, (ch) => `\\${ch}`);
}

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
    const sanitized = escapeIlike(String(query).trim());
    if (sanitized.length < 2) {
      return NextResponse.json({ error: "Query must be at least 2 characters" }, { status: 400 });
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
          ilike(knowledgeChunks.content, `%${sanitized}%`)
        )
      )
      .limit(10);
    return NextResponse.json(results);
  } catch (error) {
    return handleRouteError(error, "KnowledgeSearch");
  }
}
