import { db } from "@/lib/db";
import { knowledgeDocuments, knowledgeChunks, orgs } from "@/shared/schema";
import { eq, sql, ilike, and, or, desc } from "drizzle-orm";
import { getAuthenticatedUser, requireSuperAdmin } from "@/lib/get-user";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser();
    const access = requireSuperAdmin(auth);
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim();
    const statusFilter = searchParams.get("status");
    const sourceFilter = searchParams.get("source");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10) || 50, 200);
    const offset = Math.max(parseInt(searchParams.get("offset") ?? "0", 10) || 0, 0);

    const conditions: any[] = [];

    if (search) {
      conditions.push(
        or(
          ilike(knowledgeDocuments.title, `%${search}%`),
          ilike(orgs.name, `%${search}%`)
        )
      );
    }

    if (statusFilter && statusFilter !== "all") {
      conditions.push(eq(knowledgeDocuments.status, statusFilter));
    }

    if (sourceFilter && sourceFilter !== "all") {
      conditions.push(eq(knowledgeDocuments.sourceType, sourceFilter));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const chunkStatsSubquery = db
      .select({
        documentId: knowledgeChunks.documentId,
        totalChunks: sql<number>`count(*)::int`.as("total_chunks"),
        totalTokens: sql<number>`COALESCE(sum(${knowledgeChunks.tokenCount}), 0)::int`.as("total_tokens"),
        embeddedChunks: sql<number>`count(*) FILTER (WHERE ${knowledgeChunks.embedding} IS NOT NULL)::int`.as("embedded_chunks"),
      })
      .from(knowledgeChunks)
      .groupBy(knowledgeChunks.documentId)
      .as("chunk_stats");

    const [docsResult, countResult, statsResult] = await Promise.all([
      db
        .select({
          id: knowledgeDocuments.id,
          orgId: knowledgeDocuments.orgId,
          title: knowledgeDocuments.title,
          sourceType: knowledgeDocuments.sourceType,
          sourceUrl: knowledgeDocuments.sourceUrl,
          status: knowledgeDocuments.status,
          chunkCount: knowledgeDocuments.chunkCount,
          createdAt: knowledgeDocuments.createdAt,
          updatedAt: knowledgeDocuments.updatedAt,
          orgName: orgs.name,
          totalChunks: chunkStatsSubquery.totalChunks,
          totalTokens: chunkStatsSubquery.totalTokens,
          embeddedChunks: chunkStatsSubquery.embeddedChunks,
        })
        .from(knowledgeDocuments)
        .leftJoin(orgs, eq(knowledgeDocuments.orgId, orgs.id))
        .leftJoin(chunkStatsSubquery, eq(knowledgeDocuments.id, chunkStatsSubquery.documentId))
        .where(whereClause)
        .orderBy(desc(knowledgeDocuments.createdAt))
        .limit(limit)
        .offset(offset),

      db
        .select({ count: sql<number>`count(*)::int` })
        .from(knowledgeDocuments)
        .leftJoin(orgs, eq(knowledgeDocuments.orgId, orgs.id))
        .where(whereClause),

      db
        .select({
          totalDocs: sql<number>`count(*)::int`,
          processed: sql<number>`count(*) FILTER (WHERE ${knowledgeDocuments.status} = 'processed')::int`,
          pending: sql<number>`count(*) FILTER (WHERE ${knowledgeDocuments.status} = 'pending')::int`,
          failed: sql<number>`count(*) FILTER (WHERE ${knowledgeDocuments.status} = 'failed')::int`,
          totalChunks: sql<number>`COALESCE(sum(${knowledgeDocuments.chunkCount}), 0)::int`,
          uniqueOrgs: sql<number>`count(DISTINCT ${knowledgeDocuments.orgId})::int`,
          manualDocs: sql<number>`count(*) FILTER (WHERE ${knowledgeDocuments.sourceType} = 'manual')::int`,
          uploadDocs: sql<number>`count(*) FILTER (WHERE ${knowledgeDocuments.sourceType} = 'upload')::int`,
          urlDocs: sql<number>`count(*) FILTER (WHERE ${knowledgeDocuments.sourceType} = 'url')::int`,
          audioDocs: sql<number>`count(*) FILTER (WHERE ${knowledgeDocuments.sourceType} = 'audio')::int`,
        })
        .from(knowledgeDocuments),
    ]);

    return NextResponse.json({
      documents: docsResult,
      total: countResult[0]?.count ?? 0,
      stats: statsResult[0] ?? {
        totalDocs: 0, processed: 0, pending: 0, failed: 0, totalChunks: 0,
        uniqueOrgs: 0, manualDocs: 0, uploadDocs: 0, urlDocs: 0, audioDocs: 0,
      },
    });
  } catch (error: any) {
    console.error("Admin knowledge error:", error);
    return NextResponse.json({ error: "Failed to fetch knowledge documents" }, { status: 500 });
  }
}
