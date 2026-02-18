import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { countryHolidays, insertCountryHolidaySchema } from "@/shared/schema";
import { eq, and, like } from "drizzle-orm";
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

    const { searchParams } = new URL(request.url);
    const year = searchParams.get("year");

    let query;
    if (year) {
      query = db
        .select()
        .from(countryHolidays)
        .where(
          and(
            eq(countryHolidays.countryId, countryId),
            like(countryHolidays.date, `${year}-%`)
          )
        );
    } else {
      query = db
        .select()
        .from(countryHolidays)
        .where(eq(countryHolidays.countryId, countryId));
    }

    const holidays = await query;
    return NextResponse.json(holidays);
  } catch (error) {
    return handleRouteError(error, "CountryHolidays");
  }
}

export async function POST(
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
    const data = insertCountryHolidaySchema.parse({
      ...body,
      countryId,
    });

    const [holiday] = await db
      .insert(countryHolidays)
      .values(data)
      .returning();

    return NextResponse.json(holiday, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "CountryHolidays");
  }
}
