import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orgs } from "@/shared/schema";
import { eq } from "drizzle-orm";
import { getAuthenticatedUser, requireApiKeyScope } from "@/lib/get-user";
import { apiKeyLimiter } from "@/lib/rate-limit";
import { withCors, corsOptionsResponse } from "@/lib/v1-cors";

export async function OPTIONS() {
  return corsOptionsResponse();
}

export async function GET(request: NextRequest) {
  try {
    const rl = await apiKeyLimiter(request);
    if (!rl.allowed) {
      return withCors(NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 }));
    }

    const auth = await getAuthenticatedUser();
    if (!auth) return withCors(NextResponse.json({ error: "Not authenticated. Provide a valid API key via X-Api-Key header." }, { status: 401 }));
    if (!auth.orgId) return withCors(NextResponse.json({ error: "No organization found" }, { status: 404 }));
    const scopeCheck = requireApiKeyScope(auth, "analytics:read");
    if (!scopeCheck.allowed) return withCors(NextResponse.json({ error: scopeCheck.error }, { status: scopeCheck.status || 403 }));

    const [org] = await db
      .select({
        orgId: orgs.id,
        orgName: orgs.name,
        timezone: orgs.timezone,
        currency: orgs.currency,
        maxConcurrentCalls: orgs.maxConcurrentCalls,
        businessHours: orgs.businessHours,
      })
      .from(orgs)
      .where(eq(orgs.id, auth.orgId))
      .limit(1);

    if (!org) {
      return withCors(NextResponse.json({ error: "Organization not found" }, { status: 404 }));
    }

    return withCors(NextResponse.json({ account: org }, { status: 200 }));
  } catch (error) {
    console.error("V1 account error:", error);
    return withCors(NextResponse.json({ error: "Internal server error" }, { status: 500 }));
  }
}
