import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/get-user";
import { db } from "@/lib/db";
import { dataConnectors } from "@/shared/schema";
import { eq, and, isNull } from "drizzle-orm";
import { decrypt, encrypt } from "@/lib/encryption";
import { listSpreadsheets, refreshAccessToken, isTokenExpiringSoon } from "@/lib/oauth-google";
import { settingsLimiter } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/api-error";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rl = await settingsLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const connectorId = parseInt(id, 10);
    if (isNaN(connectorId)) {
      return NextResponse.json({ error: "Invalid connector ID" }, { status: 400 });
    }

    const [connector] = await db
      .select()
      .from(dataConnectors)
      .where(
        and(
          eq(dataConnectors.id, connectorId),
          eq(dataConnectors.orgId, auth.orgId),
          eq(dataConnectors.connectorType, "google_sheets"),
          isNull(dataConnectors.deletedAt)
        )
      )
      .limit(1);

    if (!connector) {
      return NextResponse.json({ error: "Connector not found" }, { status: 404 });
    }

    let accessToken = connector.oauthAccessToken ? decrypt(connector.oauthAccessToken) : null;
    if (!accessToken) {
      return NextResponse.json({ error: "No access token available" }, { status: 400 });
    }

    if (isTokenExpiringSoon(connector.oauthExpiresAt)) {
      const refreshToken = connector.oauthRefreshToken ? decrypt(connector.oauthRefreshToken) : null;
      if (!refreshToken) {
        await db
          .update(dataConnectors)
          .set({ status: "expired", lastErrorMessage: "Refresh token missing" })
          .where(eq(dataConnectors.id, connectorId));
        return NextResponse.json({ error: "Token expired and no refresh token available. Please reconnect." }, { status: 401 });
      }

      try {
        const refreshed = await refreshAccessToken(refreshToken);
        accessToken = refreshed.accessToken;
        await db
          .update(dataConnectors)
          .set({
            oauthAccessToken: encrypt(refreshed.accessToken),
            oauthExpiresAt: refreshed.expiresAt,
            status: "active",
            lastErrorMessage: null,
          })
          .where(eq(dataConnectors.id, connectorId));
      } catch (refreshError: any) {
        if (refreshError.message === "REVOKED") {
          await db
            .update(dataConnectors)
            .set({ status: "disconnected", lastErrorMessage: "Access revoked by user" })
            .where(eq(dataConnectors.id, connectorId));
          return NextResponse.json({ error: "Google access has been revoked. Please reconnect." }, { status: 401 });
        }
        throw refreshError;
      }
    }

    const spreadsheets = await listSpreadsheets(accessToken);

    return NextResponse.json({ spreadsheets });
  } catch (error) {
    return handleRouteError(error, "Google Sheets List");
  }
}
