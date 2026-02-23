import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orgs, platformSettings } from "@/shared/schema";
import { eq } from "drizzle-orm";
import { getAuthenticatedUser, requireWriteAccess } from "@/lib/get-user";
import { settingsLimiter } from "@/lib/rate-limit";
import { checkBodySize, BODY_LIMITS } from "@/lib/body-limit";
import { logAudit } from "@/lib/audit";
import { z } from "zod";
import { handleRouteError } from "@/lib/api-error";

const teamSettingsSchema = z.object({
  defaultAgentVisibility: z.enum(["private", "department", "shared"]).optional(),
  budgetAlertThreshold: z.number().min(1).max(100).optional(),
  teamDescription: z.string().max(500).optional(),
});

function settingsKey(orgId: number) {
  return `org_${orgId}_team_settings`;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const [org] = await db
      .select({ deploymentModel: orgs.deploymentModel })
      .from(orgs)
      .where(eq(orgs.id, auth.orgId))
      .limit(1);

    if (!org || !["team", "custom"].includes(org.deploymentModel || "")) {
      return NextResponse.json({ error: "Team settings only available for Team or Custom packages" }, { status: 403 });
    }

    const key = settingsKey(auth.orgId);
    const [setting] = await db
      .select()
      .from(platformSettings)
      .where(eq(platformSettings.key, key))
      .limit(1);

    const defaults = {
      defaultAgentVisibility: "shared",
      budgetAlertThreshold: 80,
      teamDescription: "",
    };

    if (setting) {
      try {
        const parsed = JSON.parse(setting.value);
        return NextResponse.json({ settings: { ...defaults, ...parsed } });
      } catch {
        return NextResponse.json({ settings: defaults });
      }
    }

    return NextResponse.json({ settings: defaults });
  } catch (error) {
    return handleRouteError(error, "TeamSettingsGet");
  }
}

export async function PUT(request: NextRequest) {
  try {
    const rl = await settingsLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const sizeError = checkBodySize(request, BODY_LIMITS.settings);
    if (sizeError) return sizeError;

    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const writeCheck = requireWriteAccess(auth);
    if (!writeCheck.allowed) {
      return NextResponse.json({ error: writeCheck.error }, { status: 403 });
    }

    if (!["OWNER", "ADMIN"].includes(auth.role || "")) {
      return NextResponse.json({ error: "Only owners and admins can update team settings" }, { status: 403 });
    }

    const [org] = await db
      .select({ deploymentModel: orgs.deploymentModel })
      .from(orgs)
      .where(eq(orgs.id, auth.orgId))
      .limit(1);

    if (!org || !["team", "custom"].includes(org.deploymentModel || "")) {
      return NextResponse.json({ error: "Team settings only available for Team or Custom packages" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = teamSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0]?.message || "Invalid input" }, { status: 400 });
    }

    const key = settingsKey(auth.orgId);
    const [existing] = await db
      .select()
      .from(platformSettings)
      .where(eq(platformSettings.key, key))
      .limit(1);

    let currentSettings: Record<string, any> = {};
    if (existing) {
      try {
        currentSettings = JSON.parse(existing.value);
      } catch {}
    }

    const merged = { ...currentSettings, ...parsed.data };
    const value = JSON.stringify(merged);

    if (existing) {
      await db
        .update(platformSettings)
        .set({ value, updatedAt: new Date() })
        .where(eq(platformSettings.key, key));
    } else {
      await db.insert(platformSettings).values({
        key,
        value,
        description: `Team settings for org ${auth.orgId}`,
      });
    }

    try {
      await logAudit({
        actorId: auth.user.id,
        actorEmail: auth.user.email,
        action: "team_settings.update",
        entityType: "org",
        entityId: auth.orgId,
        details: parsed.data,
      });
    } catch (auditErr) {
      console.error("Audit log error:", auditErr);
    }

    return NextResponse.json({ success: true, settings: merged });
  } catch (error) {
    return handleRouteError(error, "TeamSettingsPut");
  }
}
