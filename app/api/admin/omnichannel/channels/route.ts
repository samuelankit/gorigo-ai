import { db } from "@/lib/db";
import { channelConfigurations } from "@/shared/schema";
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

    const orgId = request.nextUrl.searchParams.get("orgId");
    const where = orgId ? eq(channelConfigurations.orgId, parseInt(orgId)) : undefined;

    const channels = await db
      .select()
      .from(channelConfigurations)
      .where(where)
      .orderBy(desc(channelConfigurations.createdAt));

    return NextResponse.json({ channels });
  } catch (error) {
    console.error("Channel configurations list error:", error);
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
    const [channel] = await db.insert(channelConfigurations).values(body).returning();
    return NextResponse.json(channel, { status: 201 });
  } catch (error) {
    console.error("Channel configuration create error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
