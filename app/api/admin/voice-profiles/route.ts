import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/get-user";
import { handleRouteError } from "@/lib/api-error";
import { adminLimiter } from "@/lib/rate-limit";
import { db } from "@/lib/db";
import { voiceProfiles } from "@/shared/schema";
import { eq, asc, and, or, isNull } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const rl = await adminLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const userOrgId = (user as any).orgId || null;

    const profiles = await db
      .select()
      .from(voiceProfiles)
      .where(
        and(
          eq(voiceProfiles.isActive, true),
          or(
            eq(voiceProfiles.isSystem, true),
            userOrgId ? eq(voiceProfiles.orgId, userOrgId) : isNull(voiceProfiles.orgId)
          )
        )
      )
      .orderBy(asc(voiceProfiles.name));

    return NextResponse.json({ voiceProfiles: profiles });
  } catch (error: any) {
    return handleRouteError(error, "Voice Profiles");
  }
}
