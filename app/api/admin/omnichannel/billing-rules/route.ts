import { db } from "@/lib/db";
import { channelBillingRules } from "@/shared/schema";
import { eq, desc } from "drizzle-orm";
import { getAuthenticatedUser, requireSuperAdmin } from "@/lib/get-user";
import { NextRequest, NextResponse } from "next/server";
import { adminLimiter } from "@/lib/rate-limit";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const rl = await adminLimiter(request);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    const auth = await getAuthenticatedUser();
    const access = requireSuperAdmin(auth);
    if (!access.allowed) return NextResponse.json({ error: access.error }, { status: 403 });

    const rules = await db
      .select()
      .from(channelBillingRules)
      .orderBy(desc(channelBillingRules.createdAt));

    return NextResponse.json({ rules });
  } catch (error) {
    console.error("Channel billing rules list error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const rl = await adminLimiter(request);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    const auth = await getAuthenticatedUser();
    const access = requireSuperAdmin(auth);
    if (!access.allowed) return NextResponse.json({ error: access.error }, { status: 403 });

    const body = await request.json();
    if (!body.channelType) {
      return NextResponse.json({ error: "channelType is required" }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(channelBillingRules)
      .where(eq(channelBillingRules.channelType, body.channelType))
      .limit(1);

    let rule;
    if (existing) {
      [rule] = await db
        .update(channelBillingRules)
        .set(body)
        .where(eq(channelBillingRules.id, existing.id))
        .returning();
    } else {
      [rule] = await db.insert(channelBillingRules).values(body).returning();
    }

    return NextResponse.json(rule);
  } catch (error) {
    console.error("Channel billing rule upsert error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
