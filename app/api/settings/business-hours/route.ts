import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orgs } from "@/shared/schema";
import { eq } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";
import { DEFAULT_SCHEDULE } from "@/lib/business-hours";
import { settingsLimiter } from "@/lib/rate-limit";

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
    console.error("Business hours GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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
    const updates: Record<string, any> = {};

    if (body.businessHours !== undefined) updates.businessHours = body.businessHours;
    if (body.voicemailEnabled !== undefined) updates.voicemailEnabled = body.voicemailEnabled;
    if (body.voicemailGreeting !== undefined) updates.voicemailGreeting = body.voicemailGreeting;
    if (body.timezone !== undefined) updates.timezone = body.timezone;

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
    console.error("Business hours PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
