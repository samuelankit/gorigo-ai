import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { usageRecords, orgs, rateCards } from "@/shared/schema";
import { eq, and } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";

export async function GET() {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (!auth.orgId) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 });
    }

    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    let [usage] = await db
      .select()
      .from(usageRecords)
      .where(and(eq(usageRecords.orgId, auth.orgId), eq(usageRecords.month, month)))
      .limit(1);

    if (!usage) {
      [usage] = await db
        .insert(usageRecords)
        .values({ userId: auth.user.id, orgId: auth.orgId, month })
        .returning();
    }

    const [org] = await db
      .select({ deploymentModel: orgs.deploymentModel })
      .from(orgs)
      .where(eq(orgs.id, auth.orgId))
      .limit(1);

    const deploymentModel = org?.deploymentModel || "managed";

    const rates = await db
      .select({
        category: rateCards.category,
        ratePerMinute: rateCards.ratePerMinute,
        includesAiCost: rateCards.includesAiCost,
        includesTelephonyCost: rateCards.includesTelephonyCost,
      })
      .from(rateCards)
      .where(and(eq(rateCards.deploymentModel, deploymentModel), eq(rateCards.isActive, true)));

    return NextResponse.json({ usage, deploymentModel, rates }, { status: 200 });
  } catch (error) {
    console.error("Get usage error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
