import { db } from "@/lib/db";
import { voiceprints } from "@/shared/schema";
import { eq, and, ne, isNull } from "drizzle-orm";
import { getAuthenticatedUser, requireSuperAdmin } from "@/lib/get-user";
import { NextRequest, NextResponse } from "next/server";
import { adminLimiter } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const rl = await adminLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    const auth = await getAuthenticatedUser();
    const access = requireSuperAdmin(auth);
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const body = await request.json();
    const { orgId, contactPhone } = body;

    if (!orgId || !contactPhone) {
      return NextResponse.json({ error: "orgId and contactPhone are required" }, { status: 400 });
    }

    const crossAccountMatches = await db
      .select()
      .from(voiceprints)
      .where(
        and(
          eq(voiceprints.contactPhone, contactPhone),
          ne(voiceprints.orgId, parseInt(orgId)),
          isNull(voiceprints.deletedAt)
        )
      );

    return NextResponse.json({
      contactPhone,
      orgId: parseInt(orgId),
      crossAccountMatches: crossAccountMatches.length,
      matches: crossAccountMatches,
    });
  } catch (error) {
    console.error("Fraud check error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
