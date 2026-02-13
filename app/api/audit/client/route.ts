import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auditLog } from "@/shared/schema";
import { eq, desc } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200);
    const offset = parseInt(searchParams.get("offset") || "0");

    const logs = await db
      .select()
      .from(auditLog)
      .where(eq(auditLog.actorId, auth.user.id))
      .orderBy(desc(auditLog.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({ logs });
  } catch (error) {
    console.error("Client audit log error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
