import { NextRequest, NextResponse } from "next/server";
import { validateState, exchangeCodeForTokens } from "@/lib/oauth-google";
import { encrypt } from "@/lib/encryption";
import { db } from "@/lib/db";
import { dataConnectors } from "@/shared/schema";
import { handleRouteError } from "@/lib/api-error";

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get("code");
    const stateParam = request.nextUrl.searchParams.get("state");
    const errorParam = request.nextUrl.searchParams.get("error");

    const baseUrl = request.nextUrl.origin;

    if (errorParam) {
      const returnUrl = new URL("/dashboard/data-sources", baseUrl);
      returnUrl.searchParams.set("error", `Google OAuth denied: ${errorParam}`);
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
    });

    const [connector] = await db
      .insert(dataConnectors)
      .values({
        orgId: state.orgId,
        userId: state.userId,
        connectorType: "google_sheets",
        name: `Google Sheets (${tokens.email || "Connected"})`,
        authType: "oauth",
        encryptedCredentials: encrypt(credentialsPayload),
        oauthAccessToken: encrypt(tokens.accessToken),
        oauthRefreshToken: tokens.refreshToken ? encrypt(tokens.refreshToken) : null,
        oauthExpiresAt: tokens.expiresAt,
        oauthEmail: tokens.email,
        oauthScopes: "spreadsheets.readonly,drive.metadata.readonly,userinfo.email",
        status: "active",
      })
      .returning();

    const redirectUrl = new URL(state.returnUrl || "/dashboard/data-sources", baseUrl);
    redirectUrl.searchParams.set("success", "google_sheets");
    redirectUrl.searchParams.set("connectorId", String(connector.id));

    return NextResponse.redirect(redirectUrl.toString());
  } catch (error) {
    const baseUrl = request.nextUrl.origin;
    const returnUrl = new URL("/dashboard/data-sources", baseUrl);
    returnUrl.searchParams.set("error", "Failed to connect Google Sheets");
    console.error("Google OAuth callback error:", error);
    return NextResponse.redirect(returnUrl.toString());
  }
}
