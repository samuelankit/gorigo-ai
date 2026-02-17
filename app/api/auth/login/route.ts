import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, sessions } from "@/shared/schema";
import { eq, and, lt, asc } from "drizzle-orm";
import { verifyPassword, createSession, setSessionCookie, hashToken } from "@/lib/auth";
import { authLimiter } from "@/lib/rate-limit";
import { checkBodySize, BODY_LIMITS } from "@/lib/body-limit";
import { logAuthEvent } from "@/lib/audit";
import { z } from "zod";
import { handleRouteError } from "@/lib/api-error";

const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(128),
}).strict();

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;
const MAX_SESSIONS_PER_USER = 5;

function getClientInfo(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";
  const userAgent = request.headers.get("user-agent") || "unknown";
  return { ip, userAgent };
}

export async function POST(request: NextRequest) {
  try {
    const rl = await authLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const sizeError = checkBodySize(request, BODY_LIMITS.auth);
    if (sizeError) return sizeError;

    const body = await request.json();
    const { email, password } = loginSchema.parse(body);

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      const remaining = Math.ceil((new Date(user.lockedUntil).getTime() - Date.now()) / 60000);
      return NextResponse.json(
        { error: `Account locked. Try again in ${remaining} minute(s).` },
        { status: 429 }
      );
    }

    const valid = await verifyPassword(password, user.password);
    if (!valid) {
      const attempts = (user.failedLoginAttempts ?? 0) + 1;
      const updates: Record<string, unknown> = { failedLoginAttempts: attempts };

      if (attempts >= MAX_FAILED_ATTEMPTS) {
        updates.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
      }

      await db.update(users).set(updates).where(eq(users.id, user.id));

      logAuthEvent("login.failed", user.id, user.email, { attempts, locked: attempts >= MAX_FAILED_ATTEMPTS }).catch((error) => { console.error("Log login failed event failed:", error); });

      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    await db
      .update(users)
      .set({ failedLoginAttempts: 0, lockedUntil: null })
      .where(eq(users.id, user.id));

    await db
      .delete(sessions)
      .where(and(eq(sessions.userId, user.id), lt(sessions.expiresAt, new Date())));

    const activeSessions = await db
      .select({ id: sessions.id })
      .from(sessions)
      .where(eq(sessions.userId, user.id))
      .orderBy(asc(sessions.createdAt));

    if (activeSessions.length >= MAX_SESSIONS_PER_USER) {
      const sessionsToRemove = activeSessions.slice(0, activeSessions.length - MAX_SESSIONS_PER_USER + 1);
      for (const s of sessionsToRemove) {
        await db.delete(sessions).where(eq(sessions.id, s.id));
      }
    }

    const { ip, userAgent } = getClientInfo(request);
    const token = createSession(user.id);
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await db.insert(sessions).values({
      userId: user.id,
      token: tokenHash,
      expiresAt,
      ipAddress: ip,
      userAgent,
    });

    await setSessionCookie(token);

    logAuthEvent("login.success", user.id, user.email).catch((error) => { console.error("Log login success event failed:", error); });

    const { password: _, emailVerificationToken: _evt, emailVerificationExpiresAt: _evea, failedLoginAttempts: _fla, lockedUntil: _lu, ...userWithoutPassword } = user;
    const isMobile = request.headers.get("x-client-type") === "mobile";
    return NextResponse.json({ user: userWithoutPassword, ...(isMobile ? { token } : {}) }, { status: 200 });
  } catch (error) {
    return handleRouteError(error, "Login");
  }
}
