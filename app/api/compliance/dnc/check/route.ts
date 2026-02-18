import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/get-user";
import { isOnDNCList } from "@/lib/dnc";
import { generalLimiter } from "@/lib/rate-limit";
import { checkBodySize, BODY_LIMITS } from "@/lib/body-limit";
import { z } from "zod";
import { handleRouteError } from "@/lib/api-error";

const bodySchema = z.object({
  phoneNumber: z.string().min(1),
}).strict();

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

    const body = await request.json();
    const parsed = bodySchema.parse(body);

    const blocked = await isOnDNCList(auth.orgId, parsed.phoneNumber);

    return NextResponse.json({ phoneNumber: parsed.phoneNumber, blocked });
  } catch (error) {
    return handleRouteError(error, "DncCheck");
  }
}
