import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/get-user";
import { settingsLimiter } from "@/lib/rate-limit";
import { TIER_ENTRY_BARRIERS, checkEntryBarrier, type DeploymentTier } from "@/lib/entry-barriers";
import { handleRouteError } from "@/lib/api-error";

export async function GET(request: NextRequest) {
  try {
    const rl = await settingsLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const tiers = await Promise.all(
      Object.entries(TIER_ENTRY_BARRIERS).map(async ([key, config]) => {
        const check = await checkEntryBarrier(auth.orgId!, key as DeploymentTier);
        return {
          tier: key,
          ...config,
          ...check,
        };
      })
    );

    return NextResponse.json({ tiers });
  } catch (error) {
    return handleRouteError(error, "EntryBarriers");
  }
}
