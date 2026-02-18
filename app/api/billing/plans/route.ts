import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { billingPlans } from "@/shared/schema";
import { billingLimiter } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/api-error";

export async function GET(request: NextRequest) {
  try {
    const rl = await billingLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    const plans = await db.select().from(billingPlans);
    return NextResponse.json({ plans }, { status: 200 });
  } catch (error) {
    return handleRouteError(error, "Plans");
  }
}
