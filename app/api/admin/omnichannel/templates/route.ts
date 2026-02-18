import { db } from "@/lib/db";
import { messageTemplates } from "@/shared/schema";
import { eq, and, desc } from "drizzle-orm";
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

    const url = request.nextUrl;
    const orgId = url.searchParams.get("orgId");
    const channelType = url.searchParams.get("channelType");
    const approvalStatus = url.searchParams.get("approvalStatus");

    const conditions = [];
    if (orgId) conditions.push(eq(messageTemplates.orgId, parseInt(orgId)));
    if (channelType) conditions.push(eq(messageTemplates.channelType, channelType));
    if (approvalStatus) conditions.push(eq(messageTemplates.approvalStatus, approvalStatus));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const templates = await db
      .select()
      .from(messageTemplates)
      .where(where)
      .orderBy(desc(messageTemplates.createdAt));

    return NextResponse.json({ templates });
  } catch (error) {
    console.error("Message templates list error:", error);
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
    const [template] = await db.insert(messageTemplates).values(body).returning();
    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error("Message template create error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
