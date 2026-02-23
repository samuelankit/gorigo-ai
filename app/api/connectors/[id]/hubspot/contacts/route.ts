import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/get-user";
import { db } from "@/lib/db";
import { dataConnectors } from "@/shared/schema";
import { eq, and, isNull } from "drizzle-orm";
import { decrypt, encrypt } from "@/lib/encryption";
import { listContacts, refreshAccessToken, isTokenExpiringSoon } from "@/lib/oauth-hubspot";
import { settingsLimiter } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/api-error";
import { z } from "zod";

const listSchema = z.object({
  search: z.string().optional(),
  after: z.string().optional(),
  limit: z.number().min(1).max(100).optional(),
});

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

    const body = await request.json();
    const parsed = listSchema.parse(body);

    const [connector] = await db
      .select()
      .from(dataConnectors)
      .where(
        and(
          eq(dataConnectors.id, connectorId),
          eq(dataConnectors.orgId, auth.orgId),
          eq(dataConnectors.connectorType, "hubspot"),
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
        return NextResponse.json({ error: "Token expired. Please reconnect." }, { status: 401 });
      }
      try {
        const refreshed = await refreshAccessToken(refreshToken);
        accessToken = refreshed.accessToken;
        await db
          .update(dataConnectors)
          .set({
            oauthAccessToken: encrypt(refreshed.accessToken),
            oauthRefreshToken: encrypt(refreshed.refreshToken),
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
          return NextResponse.json({ error: "HubSpot access has been revoked. Please reconnect." }, { status: 401 });
        }
        throw refreshError;
      }
    }

    const result = await listContacts(accessToken, {
      search: parsed.search,
      after: parsed.after,
      limit: parsed.limit,
    });

    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error, "HubSpot Contacts List");
  }
}
