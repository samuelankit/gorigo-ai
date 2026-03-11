import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, requireSuperAdmin } from "@/lib/get-user";
import { db } from "@/lib/db";
import { callLogs, auditLog, costEvents, analyticsEvents, publicConversations } from "@/shared/schema";
import { sql, lt, and, eq } from "drizzle-orm";
import { runAllCleanupJobs } from "@/lib/cleanup";
import { handleRouteError } from "@/lib/api-error";

const RETENTION_DAYS: Record<string, { days: number; description: string }> = {
  callTranscripts: { days: 365, description: "Call transcripts and conversation messages" },
  callConversationMessages: { days: 90, description: "Detailed conversation message history" },
  analyticsEvents: { days: 180, description: "Web and platform analytics events" },
  auditLogs: { days: 730, description: "Security and admin audit logs" },
  costEvents: { days: 365, description: "Cost tracking and unit economics events" },
  publicConversations: { days: 30, description: "Public chat widget conversations" },
};

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const adminCheck = requireSuperAdmin(auth);
    if (!adminCheck.allowed) return NextResponse.json({ error: adminCheck.error }, { status: 403 });

    const now = Date.now();

    const [transcriptCount] = await db.select({ count: sql<number>`count(*)` }).from(callLogs).where(
      and(lt(callLogs.createdAt, new Date(now - 365 * 24 * 60 * 60 * 1000)), sql`${callLogs.transcript} IS NOT NULL`)
    );

    const [convMsgCount] = await db.select({ count: sql<number>`count(*)` }).from(callLogs).where(
      and(lt(callLogs.createdAt, new Date(now - 90 * 24 * 60 * 60 * 1000)), sql`${callLogs.conversationMessages}::text != '[]'`)
    );

    const [analyticsCount] = await db.select({ count: sql<number>`count(*)` }).from(analyticsEvents).where(
      lt(analyticsEvents.createdAt, new Date(now - 180 * 24 * 60 * 60 * 1000))
    );

    const [auditCount] = await db.select({ count: sql<number>`count(*)` }).from(auditLog).where(
      lt(auditLog.createdAt, new Date(now - 730 * 24 * 60 * 60 * 1000))
    );

    const [costCount] = await db.select({ count: sql<number>`count(*)` }).from(costEvents).where(
      lt(costEvents.createdAt, new Date(now - 365 * 24 * 60 * 60 * 1000))
    );

    const [pubConvCount] = await db.select({ count: sql<number>`count(*)` }).from(publicConversations).where(
      and(eq(publicConversations.status, "ended"), lt(publicConversations.startedAt, new Date(now - 30 * 24 * 60 * 60 * 1000)))
    );

    const pendingDeletion = {
      callTranscripts: Number(transcriptCount?.count ?? 0),
      callConversationMessages: Number(convMsgCount?.count ?? 0),
      analyticsEvents: Number(analyticsCount?.count ?? 0),
      auditLogs: Number(auditCount?.count ?? 0),
      costEvents: Number(costCount?.count ?? 0),
      publicConversations: Number(pubConvCount?.count ?? 0),
    };

    const [totalCalls] = await db.select({ count: sql<number>`count(*)` }).from(callLogs);
    const [totalAudit] = await db.select({ count: sql<number>`count(*)` }).from(auditLog);
    const [totalCost] = await db.select({ count: sql<number>`count(*)` }).from(costEvents);
    const [totalAnalytics] = await db.select({ count: sql<number>`count(*)` }).from(analyticsEvents);

    return NextResponse.json({
      policies: RETENTION_DAYS,
      pendingDeletion,
      totalRecords: {
        callLogs: Number(totalCalls?.count ?? 0),
        auditLogs: Number(totalAudit?.count ?? 0),
        costEvents: Number(totalCost?.count ?? 0),
        analyticsEvents: Number(totalAnalytics?.count ?? 0),
      },
    });
  } catch (error) {
    return handleRouteError(error, "DataRetention");
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const adminCheck = requireSuperAdmin(auth);
    if (!adminCheck.allowed) return NextResponse.json({ error: adminCheck.error }, { status: 403 });

    const result = await runAllCleanupJobs();
    return NextResponse.json({ success: true, result });
  } catch (error) {
    return handleRouteError(error, "DataRetentionCleanup");
  }
}
