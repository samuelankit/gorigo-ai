import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/get-user";
import { db } from "@/lib/db";
import { dataConnectors, insertDataConnectorSchema } from "@/shared/schema";
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

    const connectors = await db
      .select()
      .from(dataConnectors)
      .where(and(eq(dataConnectors.orgId, auth.orgId), isNull(dataConnectors.deletedAt)));

    return NextResponse.json(connectors.map(maskConnector));
  } catch (error) {
    return handleRouteError(error, "GET /api/connectors");
  }
}

export async function POST(request: NextRequest) {
  try {
    const rl = await settingsLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    if (body.encryptedCredentials && typeof body.encryptedCredentials === "string") {
      body.encryptedCredentials = encrypt(body.encryptedCredentials);
    }

    const parsed = insertDataConnectorSchema.parse({
      ...body,
      orgId: auth.orgId,
      userId: auth.user.id,
    });

    const [connector] = await db.insert(dataConnectors).values(parsed).returning();
    return NextResponse.json(maskConnector(connector), { status: 201 });
  } catch (error) {
    return handleRouteError(error, "POST /api/connectors");
  }
}
