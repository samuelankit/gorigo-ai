import { db } from "@/lib/db";
import { callLogs } from "@/shared/schema";
import { eq, and, sql, gte, lte, avg, desc, asc, isNotNull } from "drizzle-orm";
import { getAuthenticatedUser, requireSuperAdmin } from "@/lib/get-user";
import { NextRequest, NextResponse } from "next/server";
import { adminLimiter } from "@/lib/rate-limit";

import { handleRouteError } from "@/lib/api-error";

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

    const whereClause = and(...conditions);

    const [avgResult] = await db
      .select({
        avgQuality: avg(callLogs.qualityScore),
        avgCsat: avg(callLogs.csatPrediction),
      })
      .from(callLogs)
      .where(whereClause);

    const scoredConditions = [...conditions, isNotNull(callLogs.qualityScore)];

    const topCalls = await db
      .select({
        id: callLogs.id,
        agentId: callLogs.agentId,
        callerNumber: callLogs.callerNumber,
        duration: callLogs.duration,
        qualityScore: callLogs.qualityScore,
        sentimentScore: callLogs.sentimentScore,
        csatPrediction: callLogs.csatPrediction,
        status: callLogs.status,
        createdAt: callLogs.createdAt,
      })
      .from(callLogs)
      .where(and(...scoredConditions))
      .orderBy(desc(callLogs.qualityScore))
      .limit(10);

    const bottomCalls = await db
      .select({
        id: callLogs.id,
        agentId: callLogs.agentId,
        callerNumber: callLogs.callerNumber,
        duration: callLogs.duration,
        qualityScore: callLogs.qualityScore,
        sentimentScore: callLogs.sentimentScore,
        csatPrediction: callLogs.csatPrediction,
        status: callLogs.status,
        createdAt: callLogs.createdAt,
      })
      .from(callLogs)
      .where(and(...scoredConditions))
      .orderBy(asc(callLogs.qualityScore))
      .limit(10);

    return NextResponse.json({
      avgQuality: avgResult.avgQuality ? Math.round(Number(avgResult.avgQuality) * 100) / 100 : null,
      avgCsat: avgResult.avgCsat ? Math.round(Number(avgResult.avgCsat) * 100) / 100 : null,
      topCalls,
      bottomCalls,
    });
  } catch (error) {
    return handleRouteError(error, "QualityScores");
  }
}
