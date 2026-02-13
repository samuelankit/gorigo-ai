import { db } from "@/lib/db";
import { callLogs } from "@/shared/schema";
import { eq, desc } from "drizzle-orm";
import { getAuthenticatedUser, requireSuperAdmin } from "@/lib/get-user";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthenticatedUser();
    const access = requireSuperAdmin(auth);
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const { id } = await params;
    const orgId = parseInt(id, 10);
    if (isNaN(orgId) || orgId < 1) {
      return NextResponse.json({ error: "Invalid client ID" }, { status: 400 });
    }

    const calls = await db
      .select({
        id: callLogs.id,
        direction: callLogs.direction,
        status: callLogs.status,
        duration: callLogs.duration,
        callCost: callLogs.callCost,
        createdAt: callLogs.createdAt,
      })
      .from(callLogs)
      .where(eq(callLogs.orgId, orgId))
      .orderBy(desc(callLogs.createdAt))
      .limit(50);

    return NextResponse.json({ calls });
  } catch (error) {
    console.error("Admin client calls error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
