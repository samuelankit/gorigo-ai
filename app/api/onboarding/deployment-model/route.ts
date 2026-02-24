import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orgs, deploymentModelChanges } from "@/shared/schema";
import { eq, and, gte } from "drizzle-orm";
import { getAuthenticatedUser, requireWriteAccess } from "@/lib/get-user";
import { settingsLimiter } from "@/lib/rate-limit";
import { checkBodySize, BODY_LIMITS } from "@/lib/body-limit";
import { logAudit } from "@/lib/audit";
import { z } from "zod";
import { handleRouteError } from "@/lib/api-error";
import { checkEntryBarrier, TIER_ENTRY_BARRIERS, type DeploymentTier } from "@/lib/entry-barriers";
import { isDeploymentPackageEnabled } from "@/lib/feature-flags";

const deploymentModelSchema = z.object({
  deploymentModel: z.enum(["individual", "custom"]),
}).strict();

const PLAN_SWITCH_COOLDOWN_HOURS = 24;

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

    const packageEnabled = await isDeploymentPackageEnabled(deploymentModel);
    if (!packageEnabled) {
      return NextResponse.json({ error: `The ${deploymentModel.toUpperCase()} deployment package is currently unavailable. Please contact support or choose a different package.` }, { status: 400 });
    }

    const [currentOrg] = await db
      .select({ deploymentModel: orgs.deploymentModel })
      .from(orgs)
      .where(eq(orgs.id, auth.orgId))
      .limit(1);

    const oldModel = currentOrg?.deploymentModel || "individual";

    if (oldModel === deploymentModel) {
      return NextResponse.json({ success: true, deploymentModel, previousModel: oldModel, unchanged: true }, { status: 200 });
    }

    const cooldownCutoff = new Date(Date.now() - PLAN_SWITCH_COOLDOWN_HOURS * 60 * 60 * 1000);
    const [recentSwitch] = await db
      .select({ id: deploymentModelChanges.id })
      .from(deploymentModelChanges)
      .where(
        and(
          eq(deploymentModelChanges.orgId, auth.orgId),
          gte(deploymentModelChanges.createdAt, cooldownCutoff)
        )
      )
      .limit(1);

    if (recentSwitch) {
      return NextResponse.json({
        error: `Plan changes are limited to once every ${PLAN_SWITCH_COOLDOWN_HOURS} hours. Please try again later.`,
        code: "PLAN_SWITCH_COOLDOWN",
      }, { status: 429 });
    }

    const barrierCheck = await checkEntryBarrier(auth.orgId, deploymentModel as DeploymentTier);
    if (!barrierCheck.met) {
      const tierConfig = TIER_ENTRY_BARRIERS[deploymentModel as DeploymentTier];
      return NextResponse.json({
        error: `Minimum wallet balance of $${barrierCheck.requiredMinimum} required for the ${tierConfig?.label || deploymentModel} plan. Your current balance is $${barrierCheck.currentBalance.toFixed(2)}. Please top up $${barrierCheck.shortfall.toFixed(2)} more.`,
        code: "MINIMUM_DEPOSIT_NOT_MET",
        currentBalance: barrierCheck.currentBalance,
        requiredMinimum: barrierCheck.requiredMinimum,
        shortfall: barrierCheck.shortfall,
      }, { status: 422 });
    }

    if (deploymentModel === "custom") {
      return NextResponse.json({
        error: "White-Label and Custom plans require admin approval. Please contact our team to discuss your requirements.",
        code: "REQUIRES_ADMIN_APPROVAL",
      }, { status: 403 });
    }

    await db
      .update(orgs)
      .set({ deploymentModel })
      .where(eq(orgs.id, auth.orgId));

    await db.insert(deploymentModelChanges).values({
      orgId: auth.orgId,
      oldModel,
      newModel: deploymentModel,
      status: "completed",
      reason: "User-initiated plan switch via onboarding",
      initiatedBy: auth.user.id,
      initiatedByEmail: auth.user.email,
      effectiveAt: new Date(),
      completedAt: new Date(),
      activeCallsAtSwitch: 0,
    });

    try {
      await logAudit({
        actorId: auth.user.id,
        actorEmail: auth.user.email,
        action: "deployment_model_update",
        entityType: "org",
        entityId: auth.orgId,
        details: { oldModel, newModel: deploymentModel, source: "onboarding" },
      });
    } catch (auditErr) {
      console.error("Audit log error:", auditErr);
    }

    return NextResponse.json({ success: true, deploymentModel, previousModel: oldModel }, { status: 200 });
  } catch (error) {
    return handleRouteError(error, "DeploymentModel");
  }
}
