import { db } from "@/lib/db";
import { partners, orgs, callLogs, billingLedger } from "@/shared/schema";
import { sql, count, sum } from "drizzle-orm";
import { getAuthenticatedUser, requireSuperAdmin } from "@/lib/get-user";
import { NextRequest, NextResponse } from "next/server";
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
    }, {
      headers: { "Cache-Control": "private, max-age=30" },
    });
  } catch (error) {
    return handleRouteError(error, "AdminStats");
  }
}
