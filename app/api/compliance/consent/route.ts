import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { consentRecords } from "@/shared/schema";
import { eq, and, desc, like, isNull } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";
import { generalLimiter } from "@/lib/rate-limit";
import { checkBodySize, BODY_LIMITS } from "@/lib/body-limit";
import { recordConsent, revokeConsent, normalizePhoneNumber } from "@/lib/dnc";

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 200);
    const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10), 0);
    const search = searchParams.get("search");

    const conditions = [eq(consentRecords.orgId, auth.orgId)];

    if (search) {
      const normalized = normalizePhoneNumber(search);
      const escaped = normalized.replace(/[%_\\]/g, "\\$&");
      conditions.push(like(consentRecords.phoneNumber, `%${escaped}%`));
    }

    const records = await db
      .select()
      .from(consentRecords)
      .where(and(...conditions))
      .orderBy(desc(consentRecords.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({ records });
  } catch (error) {
    console.error("Get consent records error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const rl = await generalLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const sizeError = checkBodySize(request, BODY_LIMITS.settings);
    if (sizeError) return sizeError;

    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (auth.isDemo) {
      return NextResponse.json({ error: "Demo accounts cannot record consent" }, { status: 403 });
    }

    const body = await request.json();
    const { phoneNumber, consentType, consentGiven, method, consentText } = body;

    if (!phoneNumber || typeof phoneNumber !== "string") {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }

    if (!consentType || typeof consentType !== "string") {
      return NextResponse.json({ error: "Consent type is required" }, { status: 400 });
    }

    if (typeof consentGiven !== "boolean") {
      return NextResponse.json({ error: "consentGiven must be a boolean" }, { status: 400 });
    }

    await recordConsent(
      auth.orgId,
      phoneNumber,
      consentType,
      consentGiven,
      method || "web_form",
      consentText
    );

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Record consent error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const rl = await generalLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (auth.isDemo) {
      return NextResponse.json({ error: "Demo accounts cannot revoke consent" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const phoneNumber = searchParams.get("phoneNumber");
    const consentType = searchParams.get("consentType");

    if (!phoneNumber) {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }

    if (!consentType) {
      return NextResponse.json({ error: "Consent type is required" }, { status: 400 });
    }

    const reason = searchParams.get("reason") || undefined;

    await revokeConsent(auth.orgId, phoneNumber, consentType, reason);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Revoke consent error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
