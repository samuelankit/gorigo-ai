import { db } from "@/lib/db";
import { humanAgents } from "@/shared/schema";
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
    const conditions = orgId ? eq(humanAgents.orgId, parseInt(orgId, 10)) : undefined;
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");
    const result = await db.select().from(humanAgents).where(conditions).orderBy(desc(humanAgents.createdAt)).limit(limit).offset(offset);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error fetching human agents:", error);
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
    if (!body.orgId || !body.displayName) {
      return NextResponse.json({ error: "orgId and displayName are required" }, { status: 400 });
    }
    const [agent] = await db.insert(humanAgents).values({
      userId: body.userId,
      orgId: body.orgId,
      displayName: body.displayName,
      status: body.status ?? "offline",
      skills: body.skills ?? [],
      maxConcurrentCalls: body.maxConcurrentCalls ?? 3,
      currentCallCount: 0,
      shiftStart: body.shiftStart ? new Date(body.shiftStart) : undefined,
      shiftEnd: body.shiftEnd ? new Date(body.shiftEnd) : undefined,
    }).returning();
    return NextResponse.json(agent, { status: 201 });
  } catch (error: any) {
    console.error("Error creating human agent:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
