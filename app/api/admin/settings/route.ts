import { db } from "@/lib/db";
import { platformSettings } from "@/shared/schema";
import { eq } from "drizzle-orm";
import { getAuthenticatedUser, requireSuperAdmin } from "@/lib/get-user";
import { logAudit } from "@/lib/audit";
import { NextRequest, NextResponse } from "next/server";
import { adminLimiter } from "@/lib/rate-limit";
import { checkBodySize, BODY_LIMITS } from "@/lib/body-limit";

export async function GET() {
  try {
    const auth = await getAuthenticatedUser();
    const access = requireSuperAdmin(auth);
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const allSettings = await db.select().from(platformSettings);
    const settingsObj: Record<string, string> = {};
    for (const s of allSettings) {
      settingsObj[s.key] = s.value;
    }

    return NextResponse.json({ settings: settingsObj });
  } catch (error) {
    console.error("Admin get settings error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const rl = await adminLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const sizeError = checkBodySize(request, BODY_LIMITS.admin);
    if (sizeError) return sizeError;

    const auth = await getAuthenticatedUser();
    const access = requireSuperAdmin(auth);
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const body = await request.json();
    const { settings } = body;

    if (!settings || typeof settings !== "object") {
      return NextResponse.json({ error: "settings object is required" }, { status: 400 });
    }

    for (const [key, value] of Object.entries(settings)) {
      const [existing] = await db
        .select()
        .from(platformSettings)
        .where(eq(platformSettings.key, key))
        .limit(1);

      if (existing) {
        await db
          .update(platformSettings)
          .set({ value: String(value), updatedAt: new Date() })
          .where(eq(platformSettings.key, key));
      } else {
        await db.insert(platformSettings).values({
          key,
          value: String(value),
        });
      }
    }

    await logAudit({
      actorId: auth!.user.id,
      actorEmail: auth!.user.email,
      action: "settings.update",
      entityType: "platform_settings",
      details: settings,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin update settings error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
