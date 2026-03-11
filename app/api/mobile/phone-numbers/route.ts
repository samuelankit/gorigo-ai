import { db } from "@/lib/db";
import { phoneNumbers } from "@/shared/schema";
import { eq, and } from "drizzle-orm";
import { getAuthenticatedUser, requirePasswordChanged, requireOrgActive } from "@/lib/get-user";
import { NextRequest, NextResponse } from "next/server";
import { generalLimiter } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const rl = await generalLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pwCheck = requirePasswordChanged(auth);
    if (!pwCheck.allowed) {
      return NextResponse.json({ error: pwCheck.error }, { status: pwCheck.status || 403 });
    }

    const orgCheck = await requireOrgActive(auth.orgId);
    if (!orgCheck.allowed) {
      return NextResponse.json({ error: orgCheck.error }, { status: orgCheck.status || 403 });
    }

    const numbers = await db
      .select({
        id: phoneNumbers.id,
        phoneNumber: phoneNumbers.phoneNumber,
        friendlyName: phoneNumbers.friendlyName,
        capabilities: phoneNumbers.capabilities,
        isActive: phoneNumbers.isActive,
        countryCode: phoneNumbers.countryCode,
        numberType: phoneNumbers.numberType,
        healthScore: phoneNumbers.healthScore,
        spamFlagged: phoneNumbers.spamFlagged,
        createdAt: phoneNumbers.createdAt,
      })
      .from(phoneNumbers)
      .where(
        and(
          eq(phoneNumbers.orgId, auth.orgId),
          eq(phoneNumbers.isActive, true)
        )
      );

    return NextResponse.json({ phoneNumbers: numbers });
  } catch (error) {
    return handleRouteError(error, "GET /api/mobile/phone-numbers");
  }
}
