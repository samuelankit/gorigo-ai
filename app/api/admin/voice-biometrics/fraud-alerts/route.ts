import { db } from "@/lib/db";
import { biometricFraudAlerts } from "@/shared/schema";
import { eq, and, desc } from "drizzle-orm";
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
    const isResolved = searchParams.get("isResolved");
    const severity = searchParams.get("severity");

    const conditions = [];
    if (orgId) conditions.push(eq(biometricFraudAlerts.orgId, parseInt(orgId)));
    if (isResolved !== null && isResolved !== undefined && isResolved !== "") {
      conditions.push(eq(biometricFraudAlerts.isResolved, isResolved === "true"));
    }
    if (severity) conditions.push(eq(biometricFraudAlerts.severity, severity));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const alerts = await db
      .select()
      .from(biometricFraudAlerts)
      .where(whereClause)
      .orderBy(desc(biometricFraudAlerts.createdAt));

    return NextResponse.json(alerts);
  } catch (error) {
    console.error("Fraud alerts list error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
