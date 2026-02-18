import { db } from "@/lib/db";
import { biometricConfig } from "@/shared/schema";
import { eq } from "drizzle-orm";
import { getAuthenticatedUser, requireSuperAdmin } from "@/lib/get-user";
import { NextRequest, NextResponse } from "next/server";
import { adminLimiter } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const VALID_SPOOFING_ACTIONS = ["flag", "block", "step-up"];
const VALID_FALLBACK_METHODS = ["pin", "sms", "security-question"];

const DEFAULTS = {
  isEnabled: false,
  verificationThreshold: "0.75",
  highSecurityThreshold: "0.90",
  antiSpoofingEnabled: true,
  livenessDetection: true,
  replayDetection: true,
  syntheticDetection: true,
  deepfakeDetection: true,
  spoofingAction: "flag",
  continuousAuthEnabled: false,
  continuousAuthIntervalSeconds: 300,
  fallbackMethod: "pin",
  maxEnrollmentSamples: 5,
  reEnrollmentPromptDays: 180,
  crossAccountCheckEnabled: false,
  voiceAgeMismatchAlert: false,
  providerName: null,
  providerConfig: null,
};

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
    if (!orgId) {
      return NextResponse.json({ error: "orgId is required" }, { status: 400 });
    }

    const [config] = await db
      .select()
      .from(biometricConfig)
      .where(eq(biometricConfig.orgId, parseInt(orgId)))
      .limit(1);

    if (!config) {
      return NextResponse.json({ orgId: parseInt(orgId), ...DEFAULTS });
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error("Voice biometrics config GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
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
    const { orgId, ...configData } = body;
    if (!orgId) {
      return NextResponse.json({ error: "orgId is required" }, { status: 400 });
    }

    if (configData.spoofingAction && !VALID_SPOOFING_ACTIONS.includes(configData.spoofingAction)) {
      return NextResponse.json({ error: "Invalid spoofingAction. Must be: flag, block, or step-up" }, { status: 400 });
    }
    if (configData.fallbackMethod && !VALID_FALLBACK_METHODS.includes(configData.fallbackMethod)) {
      return NextResponse.json({ error: "Invalid fallbackMethod. Must be: pin, sms, or security-question" }, { status: 400 });
    }
    const threshold = parseFloat(configData.verificationThreshold);
    if (configData.verificationThreshold !== undefined && (isNaN(threshold) || threshold < 0 || threshold > 1)) {
      return NextResponse.json({ error: "verificationThreshold must be between 0 and 1" }, { status: 400 });
    }
    const highThreshold = parseFloat(configData.highSecurityThreshold);
    if (configData.highSecurityThreshold !== undefined && (isNaN(highThreshold) || highThreshold < 0 || highThreshold > 1)) {
      return NextResponse.json({ error: "highSecurityThreshold must be between 0 and 1" }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(biometricConfig)
      .where(eq(biometricConfig.orgId, parseInt(orgId)))
      .limit(1);

    if (existing) {
      const [updated] = await db
        .update(biometricConfig)
        .set(configData)
        .where(eq(biometricConfig.orgId, parseInt(orgId)))
        .returning();
      return NextResponse.json(updated);
    } else {
      const [created] = await db
        .insert(biometricConfig)
        .values({ orgId: parseInt(orgId), ...configData })
        .returning();
      return NextResponse.json(created, { status: 201 });
    }
  } catch (error) {
    console.error("Voice biometrics config PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
