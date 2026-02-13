import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiKeys } from "@/shared/schema";
import { eq, and } from "drizzle-orm";
import { getAuthenticatedUser, requireWriteAccess } from "@/lib/get-user";
import { logAudit } from "@/lib/audit";
import { apiKeyLimiter } from "@/lib/rate-limit";

export async function PUT(request: NextRequest) {
  try {
    const rl = await apiKeyLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const writeCheck = requireWriteAccess(auth);
    if (!writeCheck.allowed) {
      return NextResponse.json({ error: writeCheck.error }, { status: 403 });
    }

    const body = await request.json();
    const { keyId } = body;

    if (!keyId || typeof keyId !== "number") {
      return NextResponse.json({ error: "keyId is required" }, { status: 400 });
    }

    const [key] = await db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.id, keyId), eq(apiKeys.orgId, auth.orgId)))
      .limit(1);

    if (!key) {
      return NextResponse.json({ error: "API key not found" }, { status: 404 });
    }

    if (key.isRevoked) {
      return NextResponse.json({ error: "API key is already revoked" }, { status: 400 });
    }

    await db
      .update(apiKeys)
      .set({ isRevoked: true, revokedAt: new Date() })
      .where(eq(apiKeys.id, keyId));

    try {
      await logAudit({
        actorId: auth.user.id,
        actorEmail: auth.user.email,
        action: "api_key_revoke",
        entityType: "api_key",
        entityId: keyId,
        details: { name: key.name, keyPrefix: key.keyPrefix },
      });
    } catch (auditErr) {
      console.error("Audit log error:", auditErr);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Revoke API key error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
