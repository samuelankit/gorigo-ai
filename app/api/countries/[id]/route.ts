import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { countries, countryComplianceProfiles, countryRateCards, countryHolidays, insertCountrySchema } from "@/shared/schema";
import { eq } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";
import { settingsLimiter } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/api-error";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rl = await settingsLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { id } = await params;
    const countryId = parseInt(id, 10);
    if (isNaN(countryId)) {
      return NextResponse.json({ error: "Invalid country ID" }, { status: 400 });
    }

    const [country] = await db
      .select()
      .from(countries)
      .where(eq(countries.id, countryId))
      .limit(1);

    if (!country) {
      return NextResponse.json({ error: "Country not found" }, { status: 404 });
    }

    const compliance = await db
      .select()
      .from(countryComplianceProfiles)
      .where(eq(countryComplianceProfiles.countryId, countryId));

    const rateCards = await db
      .select()
      .from(countryRateCards)
      .where(eq(countryRateCards.countryId, countryId));

    const holidays = await db
      .select()
      .from(countryHolidays)
      .where(eq(countryHolidays.countryId, countryId));

    return NextResponse.json({
      ...country,
      compliance: compliance[0] || null,
      rateCards,
      holidays,
    });
  } catch (error) {
    return handleRouteError(error, "Country");
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rl = await settingsLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

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
    const validated = insertCountrySchema.partial().parse(body);

    const [updated] = await db
      .update(countries)
      .set({ ...validated, updatedAt: new Date() })
      .where(eq(countries.id, countryId))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Country not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    return handleRouteError(error, "Country");
  }
}
