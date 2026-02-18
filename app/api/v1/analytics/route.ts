import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { callLogs } from "@/shared/schema";
import { eq, sql } from "drizzle-orm";
import { getAuthenticatedUser, requireApiKeyScope } from "@/lib/get-user";
import { apiKeyLimiter } from "@/lib/rate-limit";
import { withCors, corsOptionsResponse } from "@/lib/v1-cors";
import { handleRouteError } from "@/lib/api-error";

export async function OPTIONS(request: NextRequest) {
  return corsOptionsResponse(request);
}

export async function GET(request: NextRequest) {
  try {
    const rl = await apiKeyLimiter(request);
    if (!rl.allowed) {
      return withCors(NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 }), request);
    }

    const auth = await getAuthenticatedUser();
    if (!auth) return withCors(NextResponse.json({ error: "Not authenticated. Provide a valid API key via X-Api-Key header." }, { status: 401 }), request);
    if (!auth.orgId) return withCors(NextResponse.json({ error: "No organization found" }, { status: 404 }), request);
    const scopeCheck = requireApiKeyScope(auth, "analytics:read");
    if (!scopeCheck.allowed) return withCors(NextResponse.json({ error: scopeCheck.error }, { status: scopeCheck.status || 403 }), request);

    const [summary] = await db
      .select({
        totalCalls: sql<number>`count(*)::int`,
        totalMinutes: sql<number>`COALESCE(SUM(${callLogs.duration}) / 60.0, 0)::float`,
        avgCallDuration: sql<number>`COALESCE(AVG(${callLogs.duration}), 0)::float`,
        avgQualityScore: sql<number>`COALESCE(AVG(${callLogs.qualityScore}), 0)::float`,
        avgSentimentScore: sql<number>`COALESCE(AVG(${callLogs.sentimentScore}), 0)::float`,
      })
      .from(callLogs)
      .where(eq(callLogs.orgId, auth.orgId));

    const callsByDirection = await db
      .select({
        direction: callLogs.direction,
        count: sql<number>`count(*)::int`,
      })
      .from(callLogs)
      .where(eq(callLogs.orgId, auth.orgId))
      .groupBy(callLogs.direction);

    const callsByOutcome = await db
      .select({
        outcome: sql<string>`COALESCE(${callLogs.finalOutcome}, ${callLogs.status}, 'unknown')`,
        count: sql<number>`count(*)::int`,
      })
      .from(callLogs)
      .where(eq(callLogs.orgId, auth.orgId))
      .groupBy(sql`COALESCE(${callLogs.finalOutcome}, ${callLogs.status}, 'unknown')`);

    return withCors(NextResponse.json({
      totalCalls: summary.totalCalls,
      totalMinutes: summary.totalMinutes,
      avgCallDuration: summary.avgCallDuration,
      avgQualityScore: summary.avgQualityScore,
      avgSentimentScore: summary.avgSentimentScore,
      callsByDirection,
      callsByOutcome,
      period: "all_time",
    }, { status: 200 }), request);
  } catch (error) {
    return handleRouteError(error, "V1Analytics");
  }
}
