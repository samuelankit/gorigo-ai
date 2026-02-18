import { db } from "@/lib/db";
import { voiceprints } from "@/shared/schema";
import { eq, and, isNull } from "drizzle-orm";
import { getAuthenticatedUser, requireSuperAdmin } from "@/lib/get-user";
import { NextRequest, NextResponse } from "next/server";
import { adminLimiter } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("orgId");
    const phone = searchParams.get("phone");

    if (!orgId || !phone) {
      return NextResponse.json({ error: "orgId and phone are required" }, { status: 400 });
    }

    const results = await db
      .select({
        id: voiceprints.id,
        contactPhone: voiceprints.contactPhone,
        orgId: voiceprints.orgId,
        consentTimestamp: voiceprints.consentTimestamp,
        consentMethod: voiceprints.consentMethod,
        consentText: voiceprints.consentText,
        status: voiceprints.status,
        createdAt: voiceprints.createdAt,
      })
      .from(voiceprints)
      .where(
        and(
          eq(voiceprints.orgId, parseInt(orgId)),
          eq(voiceprints.contactPhone, phone),
          isNull(voiceprints.deletedAt)
        )
      );

    if (results.length === 0) {
      return NextResponse.json({
        hasConsent: false,
        phone,
        orgId: parseInt(orgId),
        records: [],
      });
    }

    return NextResponse.json({
      hasConsent: true,
      phone,
      orgId: parseInt(orgId),
      records: results,
    });
  } catch (error) {
    console.error("Consent status error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
