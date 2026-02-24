import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/get-user";
import { db } from "@/lib/db";
import { platformSettings } from "@/shared/schema";
import { eq } from "drizzle-orm";
import { settingsLimiter } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/api-error";
import { z } from "zod";

const wizardStateSchema = z.object({
  state: z.enum(["visible", "minimized", "dismissed"]).optional(),
  skippedSteps: z.array(z.string()).optional(),
});

function settingsKey(orgId: number): string {
  return `wizard_state_org_${orgId}`;
}

interface WizardStateData {
  state: "visible" | "minimized" | "dismissed";
  skippedSteps: string[];
}

const DEFAULT_STATE: WizardStateData = {
  state: "visible",
  skippedSteps: [],
};

export async function GET(request: NextRequest) {
  try {
    const rl = await settingsLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const auth = await getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const orgId = auth.orgId;
    if (!orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    const key = settingsKey(orgId);
    const [row] = await db
      .select()
      .from(platformSettings)
      .where(eq(platformSettings.key, key))
      .limit(1);

    if (!row) {
      return NextResponse.json(DEFAULT_STATE);
    }

    try {
      const parsed = JSON.parse(row.value) as WizardStateData;
      return NextResponse.json({
        state: parsed.state ?? DEFAULT_STATE.state,
        skippedSteps: parsed.skippedSteps ?? DEFAULT_STATE.skippedSteps,
      });
    } catch {
      return NextResponse.json(DEFAULT_STATE);
    }
  } catch (error) {
    return handleRouteError(error, "Wizard State GET");
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const rl = await settingsLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const auth = await getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (auth.isDemo) {
      return NextResponse.json({ error: "Demo accounts cannot modify data" }, { status: 403 });
    }

    const orgId = auth.orgId;
    if (!orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    const body = await request.json();
    const validated = wizardStateSchema.parse(body);

    const key = settingsKey(orgId);

    const [existing] = await db
      .select()
      .from(platformSettings)
      .where(eq(platformSettings.key, key))
      .limit(1);

    let current: WizardStateData = { ...DEFAULT_STATE };
    if (existing) {
      try {
        const parsed = JSON.parse(existing.value) as WizardStateData;
        current = {
          state: parsed.state ?? DEFAULT_STATE.state,
          skippedSteps: parsed.skippedSteps ?? DEFAULT_STATE.skippedSteps,
        };
      } catch {
        // keep default
      }
    }

    if (validated.state !== undefined) {
      current.state = validated.state;
    }
    if (validated.skippedSteps !== undefined) {
      current.skippedSteps = validated.skippedSteps;
    }

    const newValue = JSON.stringify(current);

    if (existing) {
      await db
        .update(platformSettings)
        .set({ value: newValue, updatedAt: new Date() })
        .where(eq(platformSettings.key, key));
    } else {
      await db.insert(platformSettings).values({
        key,
        value: newValue,
        description: `Onboarding wizard state for org ${orgId}`,
      });
    }

    return NextResponse.json(current);
  } catch (error) {
    return handleRouteError(error, "Wizard State PATCH");
  }
}
