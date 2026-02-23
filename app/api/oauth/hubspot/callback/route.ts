import { NextRequest, NextResponse } from "next/server";
import { validateState, exchangeCodeForTokens } from "@/lib/oauth-hubspot";
import { encrypt } from "@/lib/encryption";
import { db } from "@/lib/db";
import { dataConnectors } from "@/shared/schema";

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get("code");
    const stateParam = request.nextUrl.searchParams.get("state");
    const errorParam = request.nextUrl.searchParams.get("error");

    const baseUrl = request.nextUrl.origin;

    if (errorParam) {
      const returnUrl = new URL("/dashboard/data-sources", baseUrl);
      returnUrl.searchParams.set("error", `HubSpot OAuth denied: ${errorParam}`);
      return NextResponse.redirect(returnUrl.toString());
    }

    if (!code || !stateParam) {
      const returnUrl = new URL("/dashboard/data-sources", baseUrl);
      returnUrl.searchParams.set("error", "Missing authorization code or state");
      return NextResponse.redirect(returnUrl.toString());
    }

    const state = validateState(stateParam);
    if (!state) {
      const returnUrl = new URL("/dashboard/data-sources", baseUrl);
      returnUrl.searchParams.set("error", "Invalid or expired OAuth state");
      return NextResponse.redirect(returnUrl.toString());
    }

    const tokens = await exchangeCodeForTokens(code);

    const credentialsPayload = JSON.stringify({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      hubId: tokens.hubId,
    });

    const [connector] = await db
      .insert(dataConnectors)
      .values({
        orgId: state.orgId,
        userId: state.userId,
        connectorType: "hubspot",
        name: `HubSpot (${tokens.userEmail || tokens.hubId || "Connected"})`,
        authType: "oauth",
        encryptedCredentials: encrypt(credentialsPayload),
        oauthAccessToken: encrypt(tokens.accessToken),
        oauthRefreshToken: encrypt(tokens.refreshToken),
        oauthExpiresAt: tokens.expiresAt,
        oauthEmail: tokens.userEmail,
        oauthScopes: "crm.objects.contacts.read",
        config: { hubId: tokens.hubId },
        status: "active",
      })
      .returning();

    const redirectUrl = new URL(state.returnUrl || "/dashboard/data-sources", baseUrl);
    redirectUrl.searchParams.set("success", "hubspot");
    redirectUrl.searchParams.set("connectorId", String(connector.id));

    return NextResponse.redirect(redirectUrl.toString());
  } catch (error) {
    const baseUrl = request.nextUrl.origin;
    const returnUrl = new URL("/dashboard/data-sources", baseUrl);
    returnUrl.searchParams.set("error", "Failed to connect HubSpot");
    console.error("HubSpot OAuth callback error:", error);
    return NextResponse.redirect(returnUrl.toString());
  }
}
