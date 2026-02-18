import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auditLog } from "@/shared/schema";
import { eq, desc } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";
import { settingsLimiter } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/api-error";

export async function GET(request: NextRequest) {
  try {
    const rl = await settingsLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

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
    return handleRouteError(error, "AuditClient");
  }
}
