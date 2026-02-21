import { db } from "@/lib/db";
import { callLogs, agents, orgs } from "@/shared/schema";
import { eq, sql, and, desc, gte, lte, isNotNull } from "drizzle-orm";
import { getAuthenticatedUser, requireSuperAdmin } from "@/lib/get-user";
import { NextRequest, NextResponse } from "next/server";
import { adminLimiter } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

function sanitizeHighlight(html: string): string {
  return html
    .replace(/<(?!\/?mark>)[^>]*>/gi, "")
    .replace(/&(?!amp;|lt;|gt;|quot;|#39;)/g, "&amp;");
}

export async function GET(request: NextRequest) {
  try {
    const rl = await adminLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    const auth = await getAuthenticatedUser();
    const access = requireSuperAdmin(auth);
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim();
    const directionFilter = searchParams.get("direction");
    const agentFilter = searchParams.get("agentId");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const callId = searchParams.get("callId");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "25", 10) || 25, 100);
    const offset = Math.max(parseInt(searchParams.get("offset") ?? "0", 10) || 0, 0);

    if (callId) {
      const id = parseInt(callId, 10);
      if (isNaN(id)) {
        return NextResponse.json({ error: "Invalid call ID" }, { status: 400 });
      }
      const [result] = await db
        .select({
          id: callLogs.id,
          direction: callLogs.direction,
          callerNumber: callLogs.callerNumber,
          duration: callLogs.duration,
          status: callLogs.status,
          summary: callLogs.summary,
          transcript: callLogs.transcript,
          sentimentLabel: callLogs.sentimentLabel,
          qualityScore: callLogs.qualityScore,
          createdAt: callLogs.createdAt,
          startedAt: callLogs.startedAt,
          endedAt: callLogs.endedAt,
          agentName: agents.name,
          orgName: orgs.name,
          languageUsed: callLogs.languageUsed,
          finalOutcome: callLogs.finalOutcome,
        })
        .from(callLogs)
        .leftJoin(agents, eq(callLogs.agentId, agents.id))
        .leftJoin(orgs, eq(callLogs.orgId, orgs.id))
        .where(eq(callLogs.id, id))
        .limit(1);

      if (!result) {
        return NextResponse.json({ error: "Call not found" }, { status: 404 });
      }

      return NextResponse.json({ call: result });
    }

    const conditions: any[] = [isNotNull(callLogs.transcript)];

    if (query) {
      conditions.push(
        sql`to_tsvector('english', COALESCE(${callLogs.transcript}, '')) @@ plainto_tsquery('english', ${query})`
      );
    }

    if (directionFilter && directionFilter !== "all") {
      conditions.push(eq(callLogs.direction, directionFilter));
    }

    if (agentFilter && agentFilter !== "all") {
      const agentId = parseInt(agentFilter, 10);
      if (!isNaN(agentId)) {
        conditions.push(eq(callLogs.agentId, agentId));
      }
    }

    if (dateFrom) {
      conditions.push(gte(callLogs.createdAt, new Date(dateFrom)));
    }

    if (dateTo) {
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);
      conditions.push(lte(callLogs.createdAt, endDate));
    }

    const whereClause = and(...conditions);

    const highlightSelect = query
      ? sql<string>`ts_headline('english', COALESCE(${callLogs.transcript}, ''), plainto_tsquery('english', ${query}), 'StartSel=<mark>, StopSel=</mark>, MaxWords=40, MinWords=20, MaxFragments=3, FragmentDelimiter= ... ')`
      : sql<string>`substring(${callLogs.transcript} from 1 for 200)`;

    const rankSelect = query
      ? sql<number>`ts_rank(to_tsvector('english', COALESCE(${callLogs.transcript}, '')), plainto_tsquery('english', ${query}))`
      : sql<number>`0`;

    const orderBy = query
      ? [sql`ts_rank(to_tsvector('english', COALESCE(${callLogs.transcript}, '')), plainto_tsquery('english', ${query})) DESC`, desc(callLogs.createdAt)]
      : [desc(callLogs.createdAt)];

    const [results, countResult, agentsList] = await Promise.all([
      db
        .select({
          id: callLogs.id,
          direction: callLogs.direction,
          callerNumber: callLogs.callerNumber,
          duration: callLogs.duration,
          status: callLogs.status,
          summary: callLogs.summary,
          sentimentLabel: callLogs.sentimentLabel,
          qualityScore: callLogs.qualityScore,
          createdAt: callLogs.createdAt,
          agentName: agents.name,
          orgName: orgs.name,
          highlight: highlightSelect,
          rank: rankSelect,
        })
        .from(callLogs)
        .leftJoin(agents, eq(callLogs.agentId, agents.id))
        .leftJoin(orgs, eq(callLogs.orgId, orgs.id))
        .where(whereClause)
        .orderBy(...orderBy)
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(callLogs)
        .leftJoin(agents, eq(callLogs.agentId, agents.id))
        .where(whereClause),
      db
        .selectDistinct({ id: agents.id, name: agents.name })
        .from(agents)
        .orderBy(agents.name),
    ]);

    const sanitizedResults = results.map((r) => ({
      ...r,
      highlight: sanitizeHighlight(r.highlight || ""),
    }));

    return NextResponse.json({
      transcripts: sanitizedResults,
      total: countResult[0]?.count ?? 0,
      agents: agentsList,
    });
  } catch (error: any) {
    return handleRouteError(error, "AdminTranscripts");
  }
}
