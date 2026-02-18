import { db } from "@/lib/db";
import { callTopics } from "@/shared/schema";
import { eq, and, sql, gte, lte, count, avg, sum, desc } from "drizzle-orm";
import { getAuthenticatedUser, requireSuperAdmin } from "@/lib/get-user";
import { NextRequest, NextResponse } from "next/server";
import { adminLimiter } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const rl = await adminLimiter(request);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    const auth = await getAuthenticatedUser();
    const access = requireSuperAdmin(auth);
    if (!access.allowed) return NextResponse.json({ error: access.error }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("orgId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const limitParam = Math.min(parseInt(searchParams.get("limit") ?? "20", 10) || 20, 100);

    if (!orgId) return NextResponse.json({ error: "orgId is required" }, { status: 400 });

    const conditions: any[] = [eq(callTopics.orgId, parseInt(orgId))];
    if (from) conditions.push(gte(callTopics.createdAt, new Date(from)));
    if (to) conditions.push(lte(callTopics.createdAt, new Date(to)));

    const topics = await db
      .select({
        topic: callTopics.topic,
        occurrences: count(),
        totalMentions: sum(callTopics.mentions),
        avgConfidence: avg(callTopics.confidence),
        resolvedCount: sql<number>`count(*) FILTER (WHERE ${callTopics.isResolved} = true)::int`,
      })
      .from(callTopics)
      .where(and(...conditions))
      .groupBy(callTopics.topic)
      .orderBy(desc(count()))
      .limit(limitParam);

    return NextResponse.json({
      topics: topics.map((t) => ({
        topic: t.topic,
        occurrences: Number(t.occurrences),
        totalMentions: Number(t.totalMentions ?? 0),
        avgConfidence: t.avgConfidence ? Math.round(Number(t.avgConfidence) * 100) / 100 : null,
        resolvedCount: t.resolvedCount,
      })),
    });
  } catch (error: any) {
    console.error("Topics error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
