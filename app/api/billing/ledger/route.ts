import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { billingLedger } from "@/shared/schema";
import { eq, desc, sql } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";
import { billingLimiter } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/api-error";

export async function GET(request: NextRequest) {
  try {
    const rl = await billingLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const auth = await getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (!auth.orgId) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 });
    }

    const entries = await db
      .select()
      .from(billingLedger)
      .where(eq(billingLedger.orgId, auth.orgId))
      .orderBy(desc(billingLedger.createdAt))
      .limit(100);

    const [totals] = await db
      .select({
        totalCost: sql<number>`COALESCE(SUM(${billingLedger.cost}), 0)`,
        totalSeconds: sql<number>`COALESCE(SUM(${billingLedger.billableSeconds}), 0)`,
        totalEntries: sql<number>`COUNT(*)`,
      })
      .from(billingLedger)
      .where(eq(billingLedger.orgId, auth.orgId));

    return NextResponse.json({
      entries,
      summary: {
        totalCost: Number(totals.totalCost),
        totalSeconds: Number(totals.totalSeconds),
        totalMinutes: Math.ceil(Number(totals.totalSeconds) / 60),
        totalEntries: Number(totals.totalEntries),
      },
    }, { status: 200 });
  } catch (error) {
    return handleRouteError(error, "BillingLedger");
  }
}
