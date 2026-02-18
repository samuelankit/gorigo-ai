import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { callLogs } from "@/shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
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
    const scopeCheck = requireApiKeyScope(auth, "calls:read");
    if (!scopeCheck.allowed) return withCors(NextResponse.json({ error: scopeCheck.error }, { status: scopeCheck.status || 403 }), request);

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "20", 10), 1), 100);
    const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10), 0);
    const direction = searchParams.get("direction");
    const status = searchParams.get("status");

    const conditions = [eq(callLogs.orgId, auth.orgId)];
    if (direction) {
      conditions.push(eq(callLogs.direction, direction));
    }
    if (status) {
      conditions.push(eq(callLogs.status, status));
    }

    const whereClause = and(...conditions);

    const [countResult] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(callLogs)
      .where(whereClause);

    const calls = await db
      .select({
        id: callLogs.id,
        direction: callLogs.direction,
        status: callLogs.status,
        callerNumber: callLogs.callerNumber,
        duration: callLogs.duration,
        summary: callLogs.summary,
        sentimentLabel: callLogs.sentimentLabel,
        qualityScore: callLogs.qualityScore,
        createdAt: callLogs.createdAt,
      })
      .from(callLogs)
      .where(whereClause)
      .orderBy(desc(callLogs.createdAt))
      .limit(limit)
      .offset(offset);

    return withCors(NextResponse.json({ calls, total: countResult.total, limit, offset }, { status: 200 }), request);
  } catch (error) {
    return handleRouteError(error, "V1Calls");
  }
}
