import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orgs } from "@/shared/schema";
import { eq } from "drizzle-orm";
import { getAuthenticatedUser, requireWriteAccess } from "@/lib/get-user";
import { settingsLimiter } from "@/lib/rate-limit";
import { checkBodySize, BODY_LIMITS } from "@/lib/body-limit";
import { logAudit } from "@/lib/audit";

const VALID_DEPLOYMENT_MODELS = ["managed", "byok", "self_hosted"] as const;

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

    if (!auth.orgId) {
      return NextResponse.json({ error: "No organization found" }, { status: 400 });
    }

    const body = await request.json();
    const { deploymentModel } = body;

    if (!deploymentModel || !VALID_DEPLOYMENT_MODELS.includes(deploymentModel)) {
      return NextResponse.json({ error: "Invalid deployment model. Must be one of: managed, byok, self_hosted" }, { status: 400 });
    }

    const byokMode = deploymentModel === "byok" ? "byok" : "platform";

    await db
      .update(orgs)
      .set({ deploymentModel, byokMode })
      .where(eq(orgs.id, auth.orgId));

    try {
      await logAudit({
        actorId: auth.user.id,
        actorEmail: auth.user.email,
        action: "deployment_model_update",
        entityType: "org",
        entityId: auth.orgId,
        details: { deploymentModel, byokMode },
      });
    } catch (auditErr) {
      console.error("Audit log error:", auditErr);
    }

    return NextResponse.json({ success: true, deploymentModel }, { status: 200 });
  } catch (error) {
    console.error("Update deployment model error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
