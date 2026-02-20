import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/get-user";
import { db } from "@/lib/db";
import { callLogs } from "@/shared/schema";
import { eq, and } from "drizzle-orm";
import { callLLM } from "@/lib/llm-router";
import { generateAfterCallSummary } from "@/lib/rigo-jarvis";
import { handleRouteError } from "@/lib/api-error";
import { z } from "zod";

const summarySchema = z.object({
  callId: z.number().int().positive(),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { callId } = summarySchema.parse(body);

    const [call] = await db
      .select({ id: callLogs.id, transcript: callLogs.transcript, summary: callLogs.summary })
      .from(callLogs)
      .where(and(eq(callLogs.id, callId), eq(callLogs.orgId, auth.orgId)))
      .limit(1);

    if (!call) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }

    if (call.summary) {
      return NextResponse.json({ summary: call.summary, cached: true });
    }

    if (!call.transcript) {
      return NextResponse.json({ error: "No transcript available for this call" }, { status: 422 });
    }

    const summary = await generateAfterCallSummary(callId, call.transcript, callLLM);

    return NextResponse.json({ summary, cached: false });
  } catch (error) {
    return handleRouteError(error, "CallSummary");
  }
}
