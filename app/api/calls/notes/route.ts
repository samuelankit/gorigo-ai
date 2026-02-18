import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { callLogs } from "@/shared/schema";
import { eq, and } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";
import { generalLimiter } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/api-error";

export async function PUT(request: NextRequest) {
  try {
    const rl = await generalLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { callId, notes, tags } = body;

    if (!callId) {
      return NextResponse.json({ error: "Call ID is required" }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(callLogs)
      .where(and(eq(callLogs.id, callId), eq(callLogs.orgId, auth.orgId)))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Call not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (notes !== undefined) updateData.notes = notes;
    if (tags !== undefined) {
      if (!Array.isArray(tags)) {
        return NextResponse.json({ error: "Tags must be an array" }, { status: 400 });
      }
      updateData.tags = tags;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const [updated] = await db
      .update(callLogs)
      .set(updateData)
      .where(and(eq(callLogs.id, callId), eq(callLogs.orgId, auth.orgId)))
      .returning();

    return NextResponse.json({ call: updated });
  } catch (error) {
    return handleRouteError(error, "CallNotes");
  }
}
