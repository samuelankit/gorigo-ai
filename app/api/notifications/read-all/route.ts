import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notifications } from "@/shared/schema";
import { eq, and } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";
import { notificationLimiter } from "@/lib/rate-limit";

export async function PUT(request: NextRequest) {
  try {
    const rl = await notificationLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const auth = await getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.userId, auth.user.id), eq(notifications.isRead, false)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Mark all notifications read error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
