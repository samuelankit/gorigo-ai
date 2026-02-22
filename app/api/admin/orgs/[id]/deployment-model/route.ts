import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orgs, callLogs, deploymentModelChanges } from "@/shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";
import { getAllRatesForModel } from "@/lib/rate-resolver";
import { logAudit } from "@/lib/audit";
import { getOrgByokStatus, validateOpenAIKey } from "@/lib/byok";
import { adminLimiter } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/api-error";
import { isDeploymentPackageEnabled } from "@/lib/feature-flags";

type DeploymentModel = "managed" | "byok" | "self_hosted" | "custom";

const VALID_MODELS: DeploymentModel[] = ["managed", "byok", "self_hosted", "custom"];

async function getActiveCalls(orgId: number): Promise<number> {
  const [result] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(callLogs)
    .where(
      and(
        eq(callLogs.orgId, orgId),
        sql`${callLogs.status} IN ('ringing', 'in_progress', 'queued')`
      )
    );
  return Number(result?.count ?? 0);
}

async function checkByokPrerequisites(orgId: number): Promise<{
  met: boolean;
  details: Record<string, { ready: boolean; message: string }>;
}> {
  const { getOrgKeys } = await import("@/lib/byok");
  const keys = await getOrgKeys(orgId);
  const byokStatus = await getOrgByokStatus(orgId);
  const details: Record<string, { ready: boolean; message: string }> = {};

  if (byokStatus.openai.source === "org" && byokStatus.openai.configured) {
    try {
      const validation = await validateOpenAIKey(keys.openai.apiKey, keys.openai.baseUrl);
      if (validation.valid) {
        details.openai = { ready: true, message: `OpenAI API key configured and validated (${(validation.models || []).length} models available)` };
      } else {
        details.openai = { ready: false, message: `OpenAI API key configured but validation failed: ${validation.error}` };
      }
    } catch (error) {
      details.openai = { ready: false, message: "OpenAI API key configured but could not be validated (network error)" };
    }
  } else {
    details.openai = { ready: false, message: "OpenAI API key not configured. Client must provide their own API key before switching to BYOK." };
  }

  const allMet = Object.values(details).every((d) => d.ready);
  return { met: allMet, details };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rl = await adminLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    const auth = await getAuthenticatedUser();
    if (!auth || auth.globalRole !== "SUPERADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const orgId = parseInt(id, 10);

    if (isNaN(orgId)) {
      return NextResponse.json({ error: "Invalid org ID" }, { status: 400 });
    }

    const [org] = await db
      .select()
      .from(orgs)
      .where(eq(orgs.id, orgId))
      .limit(1);

    if (!org) {
      return NextResponse.json({ error: "Org not found" }, { status: 404 });
    }

    const currentModel = (org.deploymentModel || "managed") as DeploymentModel;
    const rateCards = await getAllRatesForModel(currentModel);
    const activeCalls = await getActiveCalls(orgId);
    const byokStatus = await getOrgByokStatus(orgId);

    const changeHistory = await db
      .select()
      .from(deploymentModelChanges)
      .where(eq(deploymentModelChanges.orgId, orgId))
      .orderBy(sql`${deploymentModelChanges.createdAt} DESC`)
      .limit(20);

    const availableModels: Record<string, { rates: Awaited<ReturnType<typeof getAllRatesForModel>>; prerequisites?: Awaited<ReturnType<typeof checkByokPrerequisites>> }> = {};
    for (const model of VALID_MODELS) {
      if (model === currentModel) continue;
      const rates = await getAllRatesForModel(model);
      const entry: typeof availableModels[string] = { rates };
      if (model === "byok") {
        entry.prerequisites = await checkByokPrerequisites(orgId);
      }
      availableModels[model] = entry;
    }

    return NextResponse.json({
      org: {
        id: org.id,
        name: org.name,
        deploymentModel: currentModel,
        byokMode: org.byokMode,
      },
      rates: rateCards,
      activeCalls,
      byokStatus: {
        openai: byokStatus.openai,
      },
      availableModels,
      changeHistory,
    });
  } catch (error) {
    return handleRouteError(error, "OrgDeploymentModel");
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rl = await adminLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    const auth = await getAuthenticatedUser();
    if (!auth || auth.globalRole !== "SUPERADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const orgId = parseInt(id, 10);

    if (isNaN(orgId)) {
      return NextResponse.json({ error: "Invalid org ID" }, { status: 400 });
    }

    const body = await request.json();
    const { deploymentModel, reason, forceSwitch } = body;

    if (!deploymentModel) {
      return NextResponse.json(
        { error: "deploymentModel is required" },
        { status: 400 }
      );
    }

    if (!VALID_MODELS.includes(deploymentModel)) {
      return NextResponse.json(
        { error: 'deploymentModel must be "managed", "byok", "self_hosted", or "custom"' },
        { status: 400 }
      );
    }

    const [existingOrg] = await db
      .select()
      .from(orgs)
      .where(eq(orgs.id, orgId))
      .limit(1);

    if (!existingOrg) {
      return NextResponse.json({ error: "Org not found" }, { status: 404 });
    }

    const oldModel = (existingOrg.deploymentModel || "managed") as DeploymentModel;

    if (oldModel === deploymentModel) {
      return NextResponse.json(
        { error: `Organisation is already on ${deploymentModel} model` },
        { status: 400 }
      );
    }

    const packageEnabled = await isDeploymentPackageEnabled(deploymentModel);
    if (!packageEnabled && !forceSwitch) {
      return NextResponse.json({
        error: `The ${deploymentModel.toUpperCase()} deployment package is currently disabled in platform settings.`,
        message: `Enable it in Settings > Deployment Packages first, or set forceSwitch=true to override.`,
        requiresForce: true,
      }, { status: 400 });
    }

    const activeCalls = await getActiveCalls(orgId);

    if (activeCalls > 0 && !forceSwitch) {
      return NextResponse.json({
        error: "Active calls in progress",
        activeCalls,
        message: `This organisation has ${activeCalls} active call(s). In-progress calls will continue billing at the current rate (${oldModel}). New calls will use the new rate (${deploymentModel}). Set forceSwitch=true to proceed.`,
        requiresForce: true,
      }, { status: 409 });
    }

    let prerequisitesMet: Record<string, any> = { allMet: true };

    if (deploymentModel === "byok") {
      const prereqs = await checkByokPrerequisites(orgId);
      prerequisitesMet = { allMet: prereqs.met, ...prereqs.details };

      if (!prereqs.met && !forceSwitch) {
        return NextResponse.json({
          error: "BYOK prerequisites not met",
          prerequisites: prereqs.details,
          message: "Client must configure their own API keys before switching to BYOK. Set forceSwitch=true to override (not recommended - calls may fail).",
          requiresForce: true,
        }, { status: 422 });
      }
    }

    let byokMode: string;
    if (deploymentModel === "byok") {
      byokMode = "byok";
    } else {
      byokMode = "platform";
    }

    const now = new Date();

    const [updated] = await db
      .update(orgs)
      .set({
        deploymentModel,
        byokMode,
      })
      .where(eq(orgs.id, orgId))
      .returning();

    const [changeLog] = await db
      .insert(deploymentModelChanges)
      .values({
        orgId,
        oldModel,
        newModel: deploymentModel,
        status: "completed",
        reason: reason || null,
        prerequisitesMet,
        activeCallsAtSwitch: activeCalls,
        initiatedBy: auth.user.id,
        initiatedByEmail: auth.user.email,
        effectiveAt: now,
        completedAt: now,
      })
      .returning();

    await logAudit({
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: "org.deployment_model.switched",
      entityType: "org",
      entityId: orgId,
      details: {
        oldModel,
        newModel: deploymentModel,
        byokMode,
        reason: reason || null,
        activeCallsAtSwitch: activeCalls,
        forceSwitch: !!forceSwitch,
        prerequisitesMet,
      },
    });

    const newRates = await getAllRatesForModel(deploymentModel as DeploymentModel);

    return NextResponse.json({
      org: {
        id: updated.id,
        name: updated.name,
        deploymentModel: updated.deploymentModel,
        byokMode: updated.byokMode,
      },
      changeLog,
      newRates,
      activeCallsAtSwitch: activeCalls,
      message: activeCalls > 0
        ? `Deployment model switched from ${oldModel} to ${deploymentModel}. ${activeCalls} active call(s) will finish billing at the ${oldModel} rate.`
        : `Deployment model switched from ${oldModel} to ${deploymentModel}. All new calls will use the new rate.`,
    });
  } catch (error) {
    return handleRouteError(error, "OrgDeploymentModel");
  }
}
