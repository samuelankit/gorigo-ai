import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/get-user";
import { getAuthorizationUrl } from "@/lib/oauth-hubspot";
import { settingsLimiter } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/api-error";

export async function GET(request: NextRequest) {
  try {
    const rl = await settingsLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const returnUrl = request.nextUrl.searchParams.get("returnUrl") || "/dashboard/data-sources";
    const url = getAuthorizationUrl(auth.orgId, auth.user.id, returnUrl);

    return NextResponse.redirect(url);
  } catch (error) {
    return handleRouteError(error, "OAuth HubSpot Authorize");
  }
}
