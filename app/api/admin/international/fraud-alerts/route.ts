import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { callLogs } from "@/shared/schema";
import { gte, sql, count, desc } from "drizzle-orm";
import { getAuthenticatedUser, requireSuperAdmin } from "@/lib/get-user";
import { adminLimiter } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/api-error";

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

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const highVolumeOrgs = await db
      .select({
        orgId: callLogs.orgId,
        callCount: count(),
      })
      .from(callLogs)
      .where(gte(callLogs.startedAt, oneHourAgo))
      .groupBy(callLogs.orgId)
      .having(sql`COUNT(*) > 30`)
      .orderBy(desc(count()));

    const failureRates = await db
      .select({
        orgId: callLogs.orgId,
        totalCalls: count(),
        failedCalls: sql<number>`COUNT(CASE WHEN ${callLogs.status} = 'failed' THEN 1 END)`,
      })
      .from(callLogs)
      .where(gte(callLogs.startedAt, oneHourAgo))
      .groupBy(callLogs.orgId)
      .having(sql`COUNT(CASE WHEN ${callLogs.status} = 'failed' THEN 1 END) > 10`);

    const alerts = [
      ...highVolumeOrgs.map(o => ({
        type: "high_volume",
        severity: "warning" as const,
        orgId: o.orgId,
        message: `Org ${o.orgId}: ${o.callCount} calls in last hour`,
        timestamp: new Date().toISOString(),
      })),
      ...failureRates.map(o => ({
        type: "high_failure_rate",
        severity: "critical" as const,
        orgId: o.orgId,
        message: `Org ${o.orgId}: ${o.failedCalls}/${o.totalCalls} calls failed in last hour`,
        timestamp: new Date().toISOString(),
      })),
    ];

    return NextResponse.json({ alerts, generatedAt: new Date().toISOString() });
  } catch (error) {
    return handleRouteError(error, "IntlFraudAlerts");
  }
}
