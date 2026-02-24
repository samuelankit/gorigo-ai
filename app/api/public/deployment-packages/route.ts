import { db } from "@/lib/db";
import { platformSettings } from "@/shared/schema";
import { NextRequest, NextResponse } from "next/server";
import { inArray } from "drizzle-orm";
import { publicLimiter } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/api-error";
import { cache, CACHE_TTL } from "@/lib/cache";

const PACKAGE_KEYS = [
  "deployment_package_individual_enabled",
  "deployment_package_team_enabled",
];

const DEFAULTS: Record<string, boolean> = {
  deployment_package_individual_enabled: true,
  deployment_package_team_enabled: true,
};

const CACHE_KEY = "public:deployment-packages";

export async function GET(request: NextRequest) {
  try {
    const rl = await publicLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const cached = cache.get<{ individual: boolean; team: boolean }>(CACHE_KEY);
    if (cached) {
      return NextResponse.json(cached, {
        headers: { "Cache-Control": "public, max-age=300, s-maxage=300" },
      });
    }

    const rows = await db
      .select()
      .from(platformSettings)
      .where(inArray(platformSettings.key, PACKAGE_KEYS));

    const result: Record<string, boolean> = { ...DEFAULTS };
    for (const row of rows) {
      result[row.key] = row.value === "true";
    }

    const data = {
      individual: result.deployment_package_individual_enabled,
      team: result.deployment_package_team_enabled,
    };

    cache.set(CACHE_KEY, data, CACHE_TTL.PUBLIC_DATA);

    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, max-age=300, s-maxage=300" },
    });
  } catch (error) {
    return handleRouteError(error, "GET /api/public/deployment-packages");
  }
}
