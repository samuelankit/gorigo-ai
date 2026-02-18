import { db } from "@/lib/db";
import { callLogs, agents } from "@/shared/schema";
import { eq, and, desc } from "drizzle-orm";
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
    const phone = searchParams.get("phone");

    if (!orgId) return NextResponse.json({ error: "orgId is required" }, { status: 400 });
    if (!phone) return NextResponse.json({ error: "phone is required" }, { status: 400 });

    const calls = await db
      .select({
        id: callLogs.id,
        agentId: callLogs.agentId,
        agentName: agents.name,
        callerNumber: callLogs.callerNumber,
        direction: callLogs.direction,
        duration: callLogs.duration,
        status: callLogs.status,
        sentimentScore: callLogs.sentimentScore,
        sentimentLabel: callLogs.sentimentLabel,
        qualityScore: callLogs.qualityScore,
        csatPrediction: callLogs.csatPrediction,
        resolutionStatus: callLogs.resolutionStatus,
        handoffTriggered: callLogs.handoffTriggered,
        summary: callLogs.summary,
        tags: callLogs.tags,
        notes: callLogs.notes,
        createdAt: callLogs.createdAt,
      })
      .from(callLogs)
      .leftJoin(agents, eq(callLogs.agentId, agents.id))
      .where(and(eq(callLogs.orgId, parseInt(orgId)), eq(callLogs.callerNumber, phone)))
      .orderBy(desc(callLogs.createdAt));

    return NextResponse.json({
      phone,
      totalCalls: calls.length,
      calls,
    });
  } catch (error: any) {
    console.error("Customer journey error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
