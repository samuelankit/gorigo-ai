import { db } from "@/lib/db";
import { platformSettings } from "@/shared/schema";
import { NextRequest, NextResponse } from "next/server";
import { inArray } from "drizzle-orm";
import { publicLimiter } from "@/lib/rate-limit";

const PACKAGE_KEYS = [
  "deployment_package_managed_enabled",
  "deployment_package_byok_enabled",
  "deployment_package_self_hosted_enabled",
];

const DEFAULTS: Record<string, boolean> = {
  deployment_package_managed_enabled: true,
  deployment_package_byok_enabled: true,
  deployment_package_self_hosted_enabled: false,
};

export async function GET(request: NextRequest) {
  try {
    const rl = await publicLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const rows = await db
      .select()
      .from(platformSettings)
      .where(inArray(platformSettings.key, PACKAGE_KEYS));

    const result: Record<string, boolean> = { ...DEFAULTS };
    for (const row of rows) {
      result[row.key] = row.value === "true";
    }

    return NextResponse.json({
      managed: result.deployment_package_managed_enabled,
      byok: result.deployment_package_byok_enabled,
      selfHosted: result.deployment_package_self_hosted_enabled,
    }, {
      headers: { "Cache-Control": "public, max-age=300, s-maxage=300" },
    });
  } catch (error) {
    return NextResponse.json({
      managed: true,
      byok: true,
      selfHosted: false,
    });
  }
}
