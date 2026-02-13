import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/get-user";
import { isOnDNCList } from "@/lib/dnc";
import { generalLimiter } from "@/lib/rate-limit";
import { checkBodySize, BODY_LIMITS } from "@/lib/body-limit";

export async function POST(request: NextRequest) {
  try {
    const rl = await generalLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const sizeError = checkBodySize(request, BODY_LIMITS.settings);
    if (sizeError) return sizeError;

    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { phoneNumber } = await request.json();
    if (!phoneNumber || typeof phoneNumber !== "string") {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }

    const blocked = await isOnDNCList(auth.orgId, phoneNumber);

    return NextResponse.json({ phoneNumber, blocked });
  } catch (error) {
    console.error("DNC check error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
