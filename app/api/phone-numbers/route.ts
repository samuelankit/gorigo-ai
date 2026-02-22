import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { phoneNumbers } from "@/shared/schema";
import { eq } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";
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

    const numbers = await db
      .select({
        id: phoneNumbers.id,
        phoneNumber: phoneNumbers.phoneNumber,
        friendlyName: phoneNumbers.friendlyName,
        capabilities: phoneNumbers.capabilities,
        isActive: phoneNumbers.isActive,
        createdAt: phoneNumbers.createdAt,
      })
      .from(phoneNumbers)
      .where(eq(phoneNumbers.orgId, auth.orgId));

    return NextResponse.json({ phoneNumbers: numbers });
  } catch (error) {
    return handleRouteError(error, "PhoneNumbers");
  }
}
