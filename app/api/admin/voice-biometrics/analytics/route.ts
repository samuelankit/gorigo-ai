import { db } from "@/lib/db";
import { voiceprints, voiceBiometricAttempts, biometricFraudAlerts } from "@/shared/schema";
import { eq, and, desc, sql, gte, lte, count, avg, isNull } from "drizzle-orm";
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
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const vpConditions = [isNull(voiceprints.deletedAt)];
    if (orgId) vpConditions.push(eq(voiceprints.orgId, parseInt(orgId)));

    const [enrolledResult] = await db
      .select({ total: count() })
      .from(voiceprints)
      .where(and(...vpConditions));

    const attemptConditions = [];
    if (orgId) attemptConditions.push(eq(voiceBiometricAttempts.orgId, parseInt(orgId)));
    if (from) attemptConditions.push(gte(voiceBiometricAttempts.createdAt, new Date(from)));
    if (to) attemptConditions.push(lte(voiceBiometricAttempts.createdAt, new Date(to)));

    const attemptWhere = attemptConditions.length > 0 ? and(...attemptConditions) : undefined;

    const [totalAttemptsResult] = await db
      .select({ total: count() })
      .from(voiceBiometricAttempts)
      .where(attemptWhere);

    const [successResult] = await db
      .select({ total: count() })
      .from(voiceBiometricAttempts)
      .where(
        attemptConditions.length > 0
          ? and(...attemptConditions, eq(voiceBiometricAttempts.result, "success"))
          : eq(voiceBiometricAttempts.result, "success")
      );

    const [avgDurationResult] = await db
      .select({ avgDuration: avg(voiceBiometricAttempts.durationMs) })
      .from(voiceBiometricAttempts)
      .where(attemptWhere);

    const [spoofingResult] = await db
      .select({ total: count() })
      .from(voiceBiometricAttempts)
      .where(
        attemptConditions.length > 0
          ? and(...attemptConditions, eq(voiceBiometricAttempts.spoofingDetected, true))
          : eq(voiceBiometricAttempts.spoofingDetected, true)
      );

    const fraudConditions = [];
    if (orgId) fraudConditions.push(eq(biometricFraudAlerts.orgId, parseInt(orgId)));
    if (from) fraudConditions.push(gte(biometricFraudAlerts.createdAt, new Date(from)));
    if (to) fraudConditions.push(lte(biometricFraudAlerts.createdAt, new Date(to)));

    const fraudWhere = fraudConditions.length > 0 ? and(...fraudConditions) : undefined;

    const topFraudTypes = await db
      .select({
        alertType: biometricFraudAlerts.alertType,
        total: count(),
      })
      .from(biometricFraudAlerts)
      .where(fraudWhere)
      .groupBy(biometricFraudAlerts.alertType)
      .orderBy(desc(count()))
      .limit(10);

    const totalAttempts = Number(totalAttemptsResult.total);
    const successCount = Number(successResult.total);
    const successRate = totalAttempts > 0 ? Math.round((successCount / totalAttempts) * 10000) / 100 : 0;

    return NextResponse.json({
      totalVoiceprintsEnrolled: Number(enrolledResult.total),
      totalAttempts,
      successRate,
      avgVerificationTimeMs: Math.round(Number(avgDurationResult.avgDuration || 0)),
      spoofingCount: Number(spoofingResult.total),
      topFraudTypes: topFraudTypes.map((t) => ({
        type: t.alertType,
        count: Number(t.total),
      })),
    });
  } catch (error) {
    console.error("Voice biometrics analytics error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
