import { db } from "@/lib/db";
import { callLogs, agents } from "@/shared/schema";
import { eq, sql, ilike, and, or, desc } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";
import { NextRequest, NextResponse } from "next/server";
import { settingsLimiter } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const rl = await settingsLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim();
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10) || 20, 100);
    const offset = Math.max(parseInt(searchParams.get("offset") ?? "0", 10) || 0, 0);

    const conditions: any[] = [eq(callLogs.orgId, auth.orgId)];

    if (search) {
      conditions.push(
        or(
          ilike(callLogs.callerNumber, `%${search}%`),
          ilike(callLogs.summary, `%${search}%`),
          ilike(agents.name, `%${search}%`)
        )
      );
    }

    const whereClause = and(...conditions);

    const [callsResult, countResult] = await Promise.all([
      db
        .select({
          id: callLogs.id,
          agentId: callLogs.agentId,
          direction: callLogs.direction,
          callerNumber: callLogs.callerNumber,
          duration: callLogs.duration,
          status: callLogs.status,
          summary: callLogs.summary,
          sentimentLabel: callLogs.sentimentLabel,
          qualityScore: callLogs.qualityScore,
          callCost: callLogs.callCost,
          createdAt: callLogs.createdAt,
          agentName: agents.name,
        })
        .from(callLogs)
        .leftJoin(agents, eq(callLogs.agentId, agents.id))
        .where(whereClause)
        .orderBy(desc(callLogs.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(callLogs)
        .leftJoin(agents, eq(callLogs.agentId, agents.id))
        .where(whereClause),
    ]);

    return NextResponse.json({
      calls: callsResult,
      total: countResult[0]?.count ?? 0,
    });
  } catch (error) {
    return handleRouteError(error, "MobileCalls");
  }
}
