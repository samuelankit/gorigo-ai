import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notifications } from "@/shared/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";
import { notificationLimiter } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  try {
    const rl = await notificationLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const auth = await getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
    const offset = parseInt(searchParams.get("offset") || "0");
    const unreadOnly = searchParams.get("unread") === "true";

    const conditions = [eq(notifications.userId, auth.user.id)];
    if (auth.orgId) {
      conditions.push(eq(notifications.orgId, auth.orgId));
    }
    if (unreadOnly) {
      conditions.push(eq(notifications.isRead, false));
    }

    const items = await db
      .select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset);

    const countConditions = [eq(notifications.userId, auth.user.id), eq(notifications.isRead, false)];
    if (auth.orgId) {
      countConditions.push(eq(notifications.orgId, auth.orgId));
    }
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(...countConditions));

    return NextResponse.json({
      notifications: items,
      unreadCount: countResult?.count ?? 0,
    });
  } catch (error) {
    console.error("Notifications list error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
