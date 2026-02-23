import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/get-user";
import { db } from "@/lib/db";
import { dataConnectors } from "@/shared/schema";
import { eq, and, isNull } from "drizzle-orm";
import { settingsLimiter } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/api-error";
import { decrypt } from "@/lib/encryption";

export async function POST(
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

    const [connector] = await db
      .select()
      .from(dataConnectors)
      .where(
        and(
          eq(dataConnectors.id, connectorId),
          eq(dataConnectors.orgId, auth.orgId),
          isNull(dataConnectors.deletedAt)
        )
      )
      .limit(1);

    if (!connector) {
      return NextResponse.json({ error: "Connector not found" }, { status: 404 });
    }

    let testResult = { success: true, message: "Connection successful" };

    if (connector.encryptedCredentials) {
      const decrypted = decrypt(connector.encryptedCredentials);
      if (!decrypted) {
        testResult = { success: false, message: "Failed to decrypt credentials. Please re-enter your API key." };
      }
    }

    await db
      .update(dataConnectors)
      .set({
        lastTestedAt: new Date(),
        status: testResult.success ? "active" : "error",
        lastErrorMessage: testResult.success ? null : testResult.message,
      })
      .where(eq(dataConnectors.id, connectorId));

    return NextResponse.json(testResult);
  } catch (error) {
    return handleRouteError(error, "POST /api/connectors/:id/test");
  }
}
