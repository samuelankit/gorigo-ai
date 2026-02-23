import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/get-user";
import { db } from "@/lib/db";
import { dataConnectors } from "@/shared/schema";
import { eq, and, isNull } from "drizzle-orm";
import { settingsLimiter } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/api-error";
import { encrypt, decrypt, maskKey } from "@/lib/encryption";

function maskConnector(connector: any) {
  const masked = { ...connector };
  if (masked.encryptedCredentials) {
    const decrypted = decrypt(masked.encryptedCredentials);
    masked.encryptedCredentials = decrypted ? maskKey(decrypted) : "\u2022\u2022\u2022\u2022";
  }
  if (masked.oauthAccessToken) masked.oauthAccessToken = "\u2022\u2022\u2022\u2022";
  if (masked.oauthRefreshToken) masked.oauthRefreshToken = "\u2022\u2022\u2022\u2022";
  return masked;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const connectorId = parseInt(id);
    if (isNaN(connectorId)) {
      return NextResponse.json({ error: "Invalid connector ID" }, { status: 400 });
    }

    const body = await request.json();

    if (body.encryptedCredentials && typeof body.encryptedCredentials === "string") {
      body.encryptedCredentials = encrypt(body.encryptedCredentials);
    }

    const [updated] = await db
      .update(dataConnectors)
      .set(body)
      .where(
        and(
          eq(dataConnectors.id, connectorId),
          eq(dataConnectors.orgId, auth.orgId),
          isNull(dataConnectors.deletedAt)
        )
      )
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Connector not found" }, { status: 404 });
    }

    return NextResponse.json(maskConnector(updated));
  } catch (error) {
    return handleRouteError(error, "PATCH /api/connectors/:id");
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const connectorId = parseInt(id);
    if (isNaN(connectorId)) {
      return NextResponse.json({ error: "Invalid connector ID" }, { status: 400 });
    }

    const [deleted] = await db
      .update(dataConnectors)
      .set({ deletedAt: new Date(), status: "disconnected" })
      .where(
        and(
          eq(dataConnectors.id, connectorId),
          eq(dataConnectors.orgId, auth.orgId),
          isNull(dataConnectors.deletedAt)
        )
      )
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: "Connector not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Connector disconnected" });
  } catch (error) {
    return handleRouteError(error, "DELETE /api/connectors/:id");
  }
}
