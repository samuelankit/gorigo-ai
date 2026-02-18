import { db } from "@/lib/db";
import { supervisorSessions } from "@/shared/schema";
import { eq } from "drizzle-orm";
import { getAuthenticatedUser, requireSuperAdmin } from "@/lib/get-user";
import { NextRequest, NextResponse } from "next/server";
import { adminLimiter } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rl = await adminLimiter(request);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    const auth = await getAuthenticatedUser();
    const access = requireSuperAdmin(auth);
    if (!access.allowed) return NextResponse.json({ error: access.error }, { status: 403 });
    const { id } = await params;
    const sessionId = parseInt(id, 10);
    const [updated] = await db
      .update(supervisorSessions)
      .set({ endedAt: new Date() })
      .where(eq(supervisorSessions.id, sessionId))
      .returning();
    if (!updated) return NextResponse.json({ error: "Session not found" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Error ending supervisor session:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
