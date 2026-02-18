import { db } from "@/lib/db";
import { analyticsAlerts } from "@/shared/schema";
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
    const body = await request.json();

    const updateData: Record<string, any> = {};
    if (body.isRead !== undefined) updateData.isRead = body.isRead;
    if (body.dismissed) updateData.dismissedAt = new Date();

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No update fields provided" }, { status: 400 });
    }

    const [updated] = await db
      .update(analyticsAlerts)
      .set(updateData)
      .where(eq(analyticsAlerts.id, parseInt(id)))
      .returning();

    if (!updated) return NextResponse.json({ error: "Alert not found" }, { status: 404 });

    return NextResponse.json({ alert: updated });
  } catch (error: any) {
    console.error("Update analytics alert error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
