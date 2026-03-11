import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, sessions } from "@/shared/schema";
import { eq, and, ne } from "drizzle-orm";
import { verifyPassword, hashPassword, getSessionCookie, createSession, setSessionCookie, hashToken } from "@/lib/auth";
import { getAuthenticatedUser, requireWriteAccess, requireEmailVerified } from "@/lib/get-user";
import { settingsLimiter } from "@/lib/rate-limit";
import { checkBodySize, BODY_LIMITS } from "@/lib/body-limit";
import { logAudit } from "@/lib/audit";
import { z } from "zod";
import { handleRouteError } from "@/lib/api-error";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(8).max(128),
}).strict();

export async function PUT(request: NextRequest) {
  try {
    const rl = await settingsLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const sizeError = checkBodySize(request, BODY_LIMITS.settings);
    if (sizeError) return sizeError;

    const auth = await getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const writeCheck = requireWriteAccess(auth);
    if (!writeCheck.allowed) {
      return NextResponse.json({ error: writeCheck.error }, { status: 403 });
    }

    if (!auth.user.mustChangePassword) {
      const emailCheck = requireEmailVerified(auth);
      if (!emailCheck.allowed) {
        return NextResponse.json({ error: emailCheck.error }, { status: emailCheck.status || 403 });
      }
    }

    const body = await request.json();
    const { currentPassword, newPassword } = changePasswordSchema.parse(body);

    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return NextResponse.json({ error: "Password must contain at least one uppercase letter, one lowercase letter, and one number" }, { status: 400 });
    }

    const valid = await verifyPassword(currentPassword, auth.user.password);
    if (!valid) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    }

    const hashedPassword = await hashPassword(newPassword);
    await db
      .update(users)
      .set({ password: hashedPassword, mustChangePassword: false })
      .where(eq(users.id, auth.user.id));

    const currentToken = await getSessionCookie();
    const currentTokenHash = currentToken ? hashToken(currentToken) : null;
    await db
      .delete(sessions)
      .where(
        currentTokenHash
          ? and(eq(sessions.userId, auth.user.id), ne(sessions.token, currentTokenHash))
          : eq(sessions.userId, auth.user.id)
      );

    const newToken = createSession(auth.user.id);
    const newTokenHash = hashToken(newToken);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await db.insert(sessions).values({ userId: auth.user.id, token: newTokenHash, expiresAt });
    await setSessionCookie(newToken);

    if (currentTokenHash) {
      await db.delete(sessions).where(eq(sessions.token, currentTokenHash));
    }

    try {
      await logAudit({
        actorId: auth.user.id,
        actorEmail: auth.user.email,
        action: "password_change",
        entityType: "user",
        entityId: auth.user.id,
      });
    } catch (auditErr) {
      console.error("Audit log error:", auditErr);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return handleRouteError(error, "ChangePassword");
  }
}
