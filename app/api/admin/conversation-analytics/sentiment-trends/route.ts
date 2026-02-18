import { db } from "@/lib/db";
import { callLogs } from "@/shared/schema";
import { eq, and, sql, gte, lte, count, avg } from "drizzle-orm";
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

    if (!orgId) return NextResponse.json({ error: "orgId is required" }, { status: 400 });

    const conditions: any[] = [eq(callLogs.orgId, parseInt(orgId))];
    if (from) conditions.push(gte(callLogs.createdAt, new Date(from)));
    if (to) conditions.push(lte(callLogs.createdAt, new Date(to)));

    const trends = await db
      .select({
        date: sql<string>`TO_CHAR(${callLogs.createdAt}, 'YYYY-MM-DD')`,
        avgSentiment: avg(callLogs.sentimentScore),
        callCount: count(),
        positive: sql<number>`count(*) FILTER (WHERE ${callLogs.sentimentLabel} = 'positive')::int`,
        neutral: sql<number>`count(*) FILTER (WHERE ${callLogs.sentimentLabel} = 'neutral')::int`,
        negative: sql<number>`count(*) FILTER (WHERE ${callLogs.sentimentLabel} = 'negative')::int`,
      })
      .from(callLogs)
      .where(and(...conditions))
      .groupBy(sql`TO_CHAR(${callLogs.createdAt}, 'YYYY-MM-DD')`)
      .orderBy(sql`TO_CHAR(${callLogs.createdAt}, 'YYYY-MM-DD')`);

    return NextResponse.json({
      trends: trends.map((t) => ({
        date: t.date,
        avgSentiment: t.avgSentiment ? Math.round(Number(t.avgSentiment) * 100) / 100 : null,
        callCount: Number(t.callCount),
        positive: t.positive,
        neutral: t.neutral,
        negative: t.negative,
      })),
    });
  } catch (error: any) {
    console.error("Sentiment trends error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
