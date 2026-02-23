import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/get-user";
import { db } from "@/lib/db";
import { campaigns } from "@/shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { settingsLimiter } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/api-error";

export async function GET(request: NextRequest) {
  try {
    const rl = await settingsLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const results = await db
      .select({
        campaignId: campaigns.id,
        campaignName: campaigns.name,
        lockedAmount: campaigns.lockedAmount,
        status: campaigns.status,
      })
      .from(campaigns)
      .where(
        and(
          eq(campaigns.orgId, auth.orgId),
          sql`${campaigns.lockedAmount} IS NOT NULL AND CAST(${campaigns.lockedAmount} AS numeric) > 0`,
          sql`${campaigns.status} IN ('approved', 'running', 'paused')`
        )
      )
      .orderBy(desc(campaigns.createdAt));

    return NextResponse.json(results);
  } catch (error) {
    return handleRouteError(error, "Wallet Locks");
  }
}
