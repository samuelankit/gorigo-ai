import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { countries, insertCountrySchema } from "@/shared/schema";
import { asc } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";
import { settingsLimiter } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/api-error";
import { cache, CACHE_TTL } from "@/lib/cache";

const CACHE_KEY = "public:countries";

export async function GET(request: NextRequest) {
  try {
    const rl = await settingsLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const cached = cache.get<unknown[]>(CACHE_KEY);
    if (cached) {
      return NextResponse.json(cached, {
        headers: { "Cache-Control": "private, max-age=300" },
      });
    }

    const result = await db
      .select()
      .from(countries)
      .orderBy(asc(countries.name));

    cache.set(CACHE_KEY, result, CACHE_TTL.PUBLIC_DATA);

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
    cache.invalidate(CACHE_KEY);
    return NextResponse.json(country, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "Countries");
  }
}
