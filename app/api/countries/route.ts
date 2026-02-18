import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { countries, insertCountrySchema } from "@/shared/schema";
import { asc } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";
import { settingsLimiter } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/api-error";

export async function GET(request: NextRequest) {
  try {
    const rl = await settingsLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const result = await db
      .select()
      .from(countries)
      .orderBy(asc(countries.name));

    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, max-age=300" },
    });
  } catch (error) {
    return handleRouteError(error, "Countries");
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const data = insertCountrySchema.parse(body);

    const [country] = await db.insert(countries).values(data).returning();
    return NextResponse.json(country, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "Countries");
  }
}
