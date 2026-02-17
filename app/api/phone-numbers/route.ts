import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { twilioPhoneNumbers } from "@/shared/schema";
import { eq } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";
import { settingsLimiter } from "@/lib/rate-limit";

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
        id: twilioPhoneNumbers.id,
        phoneNumber: twilioPhoneNumbers.phoneNumber,
        friendlyName: twilioPhoneNumbers.friendlyName,
        capabilities: twilioPhoneNumbers.capabilities,
        isActive: twilioPhoneNumbers.isActive,
        createdAt: twilioPhoneNumbers.createdAt,
      })
      .from(twilioPhoneNumbers)
      .where(eq(twilioPhoneNumbers.orgId, auth.orgId));

    return NextResponse.json({ phoneNumbers: numbers });
  } catch (error) {
    console.error("Phone numbers list error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
