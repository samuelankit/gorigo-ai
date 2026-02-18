import { db } from "@/lib/db";
import { voiceBiometricAttempts, voiceprints, biometricFraudAlerts } from "@/shared/schema";
import { eq, sql } from "drizzle-orm";
import { getAuthenticatedUser, requireSuperAdmin } from "@/lib/get-user";
import { NextRequest, NextResponse } from "next/server";
import { adminLimiter } from "@/lib/rate-limit";

import { handleRouteError } from "@/lib/api-error";

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
    const {
      callLogId,
      voiceprintId,
      orgId,
      result,
      confidenceScore,
      verificationMode,
      durationMs,
      spoofingDetected,
      spoofingType,
      spoofingConfidence,
    } = body;

    if (!voiceprintId || !orgId || !result) {
      return NextResponse.json({ error: "voiceprintId, orgId, and result are required" }, { status: 400 });
    }

    const [vp] = await db
      .select({ id: voiceprints.id, status: voiceprints.status })
      .from(voiceprints)
      .where(eq(voiceprints.id, parseInt(voiceprintId)))
      .limit(1);
    if (!vp) {
      return NextResponse.json({ error: "Voiceprint not found" }, { status: 404 });
    }
    if (vp.status === "deleted") {
      return NextResponse.json({ error: "Voiceprint has been deleted" }, { status: 410 });
    }

    const [attempt] = await db
      .insert(voiceBiometricAttempts)
      .values({
        callLogId: callLogId ? parseInt(callLogId) : null,
        voiceprintId: parseInt(voiceprintId),
        orgId: parseInt(orgId),
        result,
        confidenceScore: confidenceScore?.toString(),
        verificationMode,
        durationMs: durationMs ? parseInt(durationMs) : null,
        spoofingDetected: spoofingDetected ?? false,
        spoofingType: spoofingType || "none",
        spoofingConfidence: spoofingConfidence?.toString(),
      })
      .returning();

    await db
      .update(voiceprints)
      .set({
        totalVerifications: sql`${voiceprints.totalVerifications} + 1`,
        lastVerifiedAt: new Date(),
        lastUpdatedAt: new Date(),
      })
      .where(eq(voiceprints.id, parseInt(voiceprintId)));

    let fraudAlert = null;
    if (spoofingDetected === true) {
      [fraudAlert] = await db
        .insert(biometricFraudAlerts)
        .values({
          orgId: parseInt(orgId),
          voiceprintId: parseInt(voiceprintId),
          alertType: spoofingType || "spoofing_detected",
          severity: "high",
          description: `Spoofing detected during verification. Type: ${spoofingType || "unknown"}, Confidence: ${spoofingConfidence || "N/A"}`,
          callLogId: callLogId ? parseInt(callLogId) : null,
          metadata: { attemptId: attempt.id, confidenceScore, spoofingConfidence },
        })
        .returning();
    }

    return NextResponse.json({ attempt, fraudAlert }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "BiometricVerify");
  }
}
