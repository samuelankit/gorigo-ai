import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, sessions } from "@/shared/schema";
import { eq, and, gt } from "drizzle-orm";
import { createSession, hashToken } from "@/lib/auth";
import { handleRouteError } from "@/lib/api-error";
import { createLogger } from "@/lib/logger";

const logger = createLogger("AuthRefresh");

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 });
    }

    const oldToken = authHeader.slice(7);
    const oldTokenHash = hashToken(oldToken);

    const [session] = await db
      .select({
        id: sessions.id,
        userId: sessions.userId,
        expiresAt: sessions.expiresAt,
      })
      .from(sessions)
      .where(eq(sessions.token, oldTokenHash))
      .limit(1);

    if (!session) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const gracePeriodMs = 24 * 60 * 60 * 1000;
    const expiry = new Date(session.expiresAt).getTime();
    const now = Date.now();
    if (expiry + gracePeriodMs < now) {
      await db.delete(sessions).where(eq(sessions.id, session.id));
      return NextResponse.json({ error: "Session expired beyond refresh window" }, { status: 401 });
    }

    const [user] = await db
      .select({ id: users.id, email: users.email, lockedUntil: users.lockedUntil })
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    if (!user) {
      await db.delete(sessions).where(eq(sessions.id, session.id));
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      return NextResponse.json({ error: "Account locked" }, { status: 403 });
    }

    const newToken = createSession(user.id);
    const newTokenHash = hashToken(newToken);
    const newExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await db
      .update(sessions)
      .set({ token: newTokenHash, expiresAt: newExpiresAt })
      .where(eq(sessions.id, session.id));

    logger.info(`Token refreshed for user ${user.id}`);

    return NextResponse.json({ token: newToken }, { status: 200 });
  } catch (error) {
    return handleRouteError(error, "Token Refresh");
  }
}
