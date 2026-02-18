import { db } from "@/lib/db";
import { coachingRules } from "@/shared/schema";
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
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get("orgId");
    const conditions = orgId ? eq(coachingRules.orgId, parseInt(orgId, 10)) : undefined;
    const result = await db.select().from(coachingRules).where(conditions).orderBy(desc(coachingRules.priority));
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error fetching coaching rules:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const rl = await adminLimiter(request);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    const auth = await getAuthenticatedUser();
    const access = requireSuperAdmin(auth);
    if (!access.allowed) return NextResponse.json({ error: access.error }, { status: 403 });
    const body = await request.json();
    const [rule] = await db.insert(coachingRules).values({
      orgId: body.orgId,
      name: body.name,
      triggerType: body.triggerType,
      triggerCondition: body.triggerCondition,
      coachingMessage: body.coachingMessage,
      priority: body.priority ?? 0,
      isActive: body.isActive ?? true,
    }).returning();
    return NextResponse.json(rule, { status: 201 });
  } catch (error: any) {
    console.error("Error creating coaching rule:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
