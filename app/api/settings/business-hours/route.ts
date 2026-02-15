import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orgs } from "@/shared/schema";
import { eq } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";
import { DEFAULT_SCHEDULE } from "@/lib/business-hours";
import { settingsLimiter } from "@/lib/rate-limit";
import { z } from "zod";
import { handleRouteError } from "@/lib/api-error";

const businessHoursSchema = z.object({
  businessHours: z.any().optional(),
  voicemailEnabled: z.boolean().optional(),
  voicemailGreeting: z.string().max(1000).optional(),
  timezone: z.string().min(1).max(100).optional(),
}).passthrough();

export async function GET(request: NextRequest) {
  try {
    const rl = await settingsLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [org] = await db.select().from(orgs).where(eq(orgs.id, auth.orgId)).limit(1);
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    return NextResponse.json({
      businessHours: org.businessHours || DEFAULT_SCHEDULE,
      voicemailEnabled: org.voicemailEnabled || false,
      voicemailGreeting: org.voicemailGreeting || "",
      timezone: org.timezone || "America/New_York",
    });
  } catch (error) {
    return handleRouteError(error, "BusinessHoursGet");
  }
}

export async function PUT(request: NextRequest) {
  try {
    const rl = await settingsLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = businessHoursSchema.parse(body);
    const updates: Record<string, any> = {};

    if (validated.businessHours !== undefined) updates.businessHours = validated.businessHours;
    if (validated.voicemailEnabled !== undefined) updates.voicemailEnabled = validated.voicemailEnabled;
    if (validated.voicemailGreeting !== undefined) updates.voicemailGreeting = validated.voicemailGreeting;
    if (validated.timezone !== undefined) updates.timezone = validated.timezone;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const [updated] = await db
      .update(orgs)
      .set(updates)
      .where(eq(orgs.id, auth.orgId))
      .returning();

    return NextResponse.json({
      businessHours: updated.businessHours || DEFAULT_SCHEDULE,
      voicemailEnabled: updated.voicemailEnabled || false,
      voicemailGreeting: updated.voicemailGreeting || "",
      timezone: updated.timezone || "America/New_York",
    });
  } catch (error) {
    return handleRouteError(error, "BusinessHoursPut");
  }
}
