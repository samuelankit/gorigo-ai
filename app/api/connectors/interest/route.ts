import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/get-user";
import { db } from "@/lib/db";
import { connectorInterest, connectorTypeEnum } from "@/shared/schema";
import { settingsLimiter } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/api-error";
import { z } from "zod";

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
    const schema = z.object({
      connectorType: connectorTypeEnum,
    });
    const parsed = schema.parse(body);

    const [interest] = await db
      .insert(connectorInterest)
      .values({
        orgId: auth.orgId,
        userId: auth.user.id,
        connectorType: parsed.connectorType,
      })
      .returning();

    return NextResponse.json(interest, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "POST /api/connectors/interest");
  }
}
