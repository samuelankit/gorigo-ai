import { db } from "@/lib/db";
import { biometricFraudAlerts } from "@/shared/schema";
import { eq, and, desc } from "drizzle-orm";
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
    const isResolved = searchParams.get("isResolved");
    const severity = searchParams.get("severity");

    const conditions = [];
    if (orgId) conditions.push(eq(biometricFraudAlerts.orgId, parseInt(orgId)));
    if (isResolved !== null && isResolved !== undefined && isResolved !== "") {
      conditions.push(eq(biometricFraudAlerts.isResolved, isResolved === "true"));
    }
    if (severity) conditions.push(eq(biometricFraudAlerts.severity, severity));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");
    const alerts = await db
      .select()
      .from(biometricFraudAlerts)
      .where(whereClause)
      .orderBy(desc(biometricFraudAlerts.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(alerts);
  } catch (error) {
    return handleRouteError(error, "BiometricFraudAlerts");
  }
}
