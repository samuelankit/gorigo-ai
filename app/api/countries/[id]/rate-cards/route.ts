import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { countryRateCards, insertCountryRateCardSchema } from "@/shared/schema";
import { eq, and } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const countryId = parseInt(id, 10);
    if (isNaN(countryId)) {
      return NextResponse.json({ error: "Invalid country ID" }, { status: 400 });
    }

    const rateCards = await db
      .select()
      .from(countryRateCards)
      .where(eq(countryRateCards.countryId, countryId));

    return NextResponse.json(rateCards);
  } catch (error) {
    console.error("Rate cards fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (auth.globalRole !== "SUPERADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { id } = await params;
    const countryId = parseInt(id, 10);
    if (isNaN(countryId)) {
      return NextResponse.json({ error: "Invalid country ID" }, { status: 400 });
    }

    const body = await request.json();
    const data = insertCountryRateCardSchema.parse({
      ...body,
      countryId,
    });

    const [existing] = await db
      .select()
      .from(countryRateCards)
      .where(
        and(
          eq(countryRateCards.countryId, countryId),
          eq(countryRateCards.deploymentModel, data.deploymentModel),
          eq(countryRateCards.direction, data.direction),
          eq(countryRateCards.numberType, data.numberType)
        )
      )
      .limit(1);

    let result;
    if (existing) {
      const [updated] = await db
        .update(countryRateCards)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(countryRateCards.id, existing.id))
        .returning();
      result = updated;
    } else {
      const [created] = await db
        .insert(countryRateCards)
        .values(data)
        .returning();
      result = created;
    }

    return NextResponse.json(result);
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid data", details: error.errors }, { status: 400 });
    }
    console.error("Rate card upsert error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
