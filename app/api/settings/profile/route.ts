import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/shared/schema";
import { eq } from "drizzle-orm";
import { getAuthenticatedUser, requireWriteAccess } from "@/lib/get-user";
import { settingsLimiter } from "@/lib/rate-limit";
import { checkBodySize, BODY_LIMITS } from "@/lib/body-limit";
import { logAudit } from "@/lib/audit";

export async function PUT(request: NextRequest) {
  try {
    const rl = await settingsLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const sizeError = checkBodySize(request, BODY_LIMITS.settings);
    if (sizeError) return sizeError;

    const auth = await getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const writeCheck = requireWriteAccess(auth);
    if (!writeCheck.allowed) {
      return NextResponse.json({ error: writeCheck.error }, { status: 403 });
    }

    const body = await request.json();
    const { businessName } = body;

    if (!businessName || typeof businessName !== "string" || !businessName.trim()) {
      return NextResponse.json({ error: "Business name is required" }, { status: 400 });
    }

    const updateData = { businessName: businessName.trim() };
    await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, auth.user.id));

    try {
      await logAudit({
        actorId: auth.user.id,
        actorEmail: auth.user.email,
        action: "profile_update",
        entityType: "user",
        entityId: auth.user.id,
        details: { fieldsUpdated: Object.keys(updateData) },
      });
    } catch (auditErr) {
      console.error("Audit log error:", auditErr);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Update profile error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
