import { db } from "@/lib/db";
import { voiceprints } from "@/shared/schema";
import { eq, and, desc, isNull } from "drizzle-orm";
import { getAuthenticatedUser, requireSuperAdmin } from "@/lib/get-user";
import { NextRequest, NextResponse } from "next/server";
import { adminLimiter } from "@/lib/rate-limit";

import { handleRouteError } from "@/lib/api-error";

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
    const status = searchParams.get("status");
    const phone = searchParams.get("phone");

    const conditions = [isNull(voiceprints.deletedAt)];
    if (orgId) conditions.push(eq(voiceprints.orgId, parseInt(orgId)));
    if (status) conditions.push(eq(voiceprints.status, status));
    if (phone) conditions.push(eq(voiceprints.contactPhone, phone));

    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");
    const results = await db
      .select()
      .from(voiceprints)
      .where(and(...conditions))
      .orderBy(desc(voiceprints.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(results);
  } catch (error) {
    return handleRouteError(error, "Voiceprints");
  }
}

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
    const { contactPhone, orgId, enrollmentMethod, verificationMode, passphraseText, consentMethod, consentText } = body;

    if (!contactPhone || !orgId) {
      return NextResponse.json({ error: "contactPhone and orgId are required" }, { status: 400 });
    }
    if (!consentMethod || !consentText) {
      return NextResponse.json({ error: "consentMethod and consentText are required" }, { status: 400 });
    }

    const [created] = await db
      .insert(voiceprints)
      .values({
        contactPhone,
        orgId: parseInt(orgId),
        enrollmentMethod: enrollmentMethod || "in_call",
        verificationMode: verificationMode || "passive",
        passphraseText,
        consentMethod,
        consentText,
        consentTimestamp: new Date(),
        status: "active",
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "Voiceprints");
  }
}
