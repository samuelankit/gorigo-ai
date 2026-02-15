import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orgs } from "@/shared/schema";
import { eq } from "drizzle-orm";
import { getAuthenticatedUser, requireWriteAccess } from "@/lib/get-user";
import { settingsLimiter } from "@/lib/rate-limit";
import { checkBodySize, BODY_LIMITS } from "@/lib/body-limit";
import { logAudit } from "@/lib/audit";
import { z } from "zod";
import { handleRouteError } from "@/lib/api-error";

const deploymentModelSchema = z.object({
  deploymentModel: z.enum(["managed", "byok", "self_hosted", "custom"]),
}).strict();

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
    const { deploymentModel } = deploymentModelSchema.parse(body);

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
    return handleRouteError(error, "DeploymentModel");
  }
}
