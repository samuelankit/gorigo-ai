import { db } from "@/lib/db";
import { orgs, auditLog } from "@/shared/schema";
import { eq } from "drizzle-orm";
import { getAuthenticatedUser, requireSuperAdmin } from "@/lib/get-user";
import { NextRequest, NextResponse } from "next/server";
import { adminLimiter } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const orgId = parseInt(id, 10);
    if (isNaN(orgId) || orgId < 1) {
      return NextResponse.json({ error: "Invalid client ID" }, { status: 400 });
    }

    const body = await request.json();
    const { action, reason } = body;

    if (!action || !["suspend", "activate", "flag"].includes(action)) {
      return NextResponse.json({ error: "Invalid action. Must be suspend, activate, or flag" }, { status: 400 });
    }

    const [org] = await db.select().from(orgs).where(eq(orgs.id, orgId)).limit(1);
    if (!org) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    let message = "";

    if (action === "suspend") {
      await db.update(orgs).set({ channelType: "suspended" }).where(eq(orgs.id, orgId));
      message = "Client has been suspended";
    } else if (action === "activate") {
      const originalType = org.channelType === "suspended" ? "d2c" : org.channelType;
      await db.update(orgs).set({ channelType: originalType ?? "d2c" }).where(eq(orgs.id, orgId));
      message = "Client has been activated";
    } else if (action === "flag") {
      message = "Client has been flagged for review";
    }

    await db.insert(auditLog).values({
      actorId: auth!.user.id,
      action: `admin_${action}_client`,
      entityType: "org",
      entityId: orgId,
      details: { reason: reason || null },
      ipAddress: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null,
    });

    return NextResponse.json({ success: true, message });
  } catch (error) {
    console.error("Admin client status error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
