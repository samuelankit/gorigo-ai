import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sessions } from "@/shared/schema";
import { eq, and, ne } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";
import { getSessionCookie, hashToken, clearSessionCookie } from "@/lib/auth";
import { logSessionEvent } from "@/lib/audit";
import { settingsLimiter } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  try {
    const rl = await settingsLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const auth = await getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userSessions = await db
      .select({
        id: sessions.id,
        ipAddress: sessions.ipAddress,
        userAgent: sessions.userAgent,
        lastSeenAt: sessions.lastSeenAt,
        createdAt: sessions.createdAt,
        expiresAt: sessions.expiresAt,
      })
      .from(sessions)
      .where(eq(sessions.userId, auth.user.id));

    const currentToken = await getSessionCookie();
    const currentHash = currentToken ? hashToken(currentToken) : null;

    const allSessions = await db
      .select({ id: sessions.id, token: sessions.token })
      .from(sessions)
      .where(eq(sessions.userId, auth.user.id));

    const currentSessionId = allSessions.find(s => s.token === currentHash)?.id;

    const result = userSessions.map(s => ({
      ...s,
      isCurrent: s.id === currentSessionId,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("List sessions error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const rl = await settingsLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const auth = await getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const sessionId = searchParams.get("id");

    if (action === "all") {
      const currentToken = await getSessionCookie();
      const currentHash = currentToken ? hashToken(currentToken) : null;

      if (currentHash) {
        await db.delete(sessions).where(
          and(eq(sessions.userId, auth.user.id), ne(sessions.token, currentHash))
        );
      } else {
        await db.delete(sessions).where(eq(sessions.userId, auth.user.id));
        await clearSessionCookie();
      }

      logSessionEvent("sessions.invalidate_all", auth.user.id).catch(() => {});

      return NextResponse.json({ message: "All other sessions have been invalidated" });
    }

    if (sessionId) {
      const id = parseInt(sessionId, 10);
      if (isNaN(id)) {
        return NextResponse.json({ error: "Invalid session ID" }, { status: 400 });
      }

      const currentToken = await getSessionCookie();
      const currentHash = currentToken ? hashToken(currentToken) : null;

      const [targetSession] = await db
        .select({ id: sessions.id, token: sessions.token })
        .from(sessions)
        .where(and(eq(sessions.id, id), eq(sessions.userId, auth.user.id)))
        .limit(1);

      if (!targetSession) {
        return NextResponse.json({ error: "Session not found" }, { status: 404 });
      }

      if (targetSession.token === currentHash) {
        return NextResponse.json({ error: "Cannot revoke current session. Use logout instead." }, { status: 400 });
      }

      await db.delete(sessions).where(eq(sessions.id, id));

      logSessionEvent("session.revoked", auth.user.id, { sessionId: id }).catch(() => {});

      return NextResponse.json({ message: "Session revoked" });
    }

    return NextResponse.json({ error: "Specify action=all or id=<sessionId>" }, { status: 400 });
  } catch (error) {
    console.error("Delete session error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
