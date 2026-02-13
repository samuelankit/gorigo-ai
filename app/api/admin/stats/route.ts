import { db } from "@/lib/db";
import { partners, orgs, callLogs, billingLedger } from "@/shared/schema";
import { sql, count, sum } from "drizzle-orm";
import { getAuthenticatedUser, requireSuperAdmin } from "@/lib/get-user";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const auth = await getAuthenticatedUser();
    const access = requireSuperAdmin(auth);
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const [partnerCount] = await db.select({ total: count() }).from(partners);
    const [clientCount] = await db.select({ total: count() }).from(orgs);
    const [callCount] = await db.select({ total: count() }).from(callLogs);
    const [revenueResult] = await db.select({ total: sum(billingLedger.cost) }).from(billingLedger);
    const [minutesResult] = await db.select({ total: sql<number>`COALESCE(SUM(${callLogs.duration}::numeric / 60), 0)` }).from(callLogs);

    return NextResponse.json({
      totalPartners: partnerCount.total,
      totalClients: clientCount.total,
      totalCalls: callCount.total,
      totalRevenue: Number(revenueResult.total ?? 0),
      totalMinutes: Number(minutesResult.total ?? 0),
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
