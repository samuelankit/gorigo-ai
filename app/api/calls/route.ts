import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { callLogs } from "@/shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";
import { generalLimiter } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  try {
    const rl = await generalLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const auth = await getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (!auth.orgId) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 200);
    const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10), 0);
    const direction = searchParams.get("direction");

    const conditions = [eq(callLogs.orgId, auth.orgId)];
    if (direction) {
      conditions.push(eq(callLogs.direction, direction));
    }
    const status = searchParams.get("status");
    if (status) {
      conditions.push(eq(callLogs.status, status));
    }

    const calls = await db
      .select()
      .from(callLogs)
      .where(and(...conditions))
      .orderBy(desc(callLogs.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({ calls }, { status: 200 });
  } catch (error) {
    console.error("Get calls error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
