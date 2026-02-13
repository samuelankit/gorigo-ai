import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { billingPlans } from "@/shared/schema";

export async function GET() {
  try {
    const plans = await db.select().from(billingPlans);
    return NextResponse.json({ plans }, { status: 200 });
  } catch (error) {
    console.error("Get plans error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
