import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, sessions, passwordResetTokens } from "@/shared/schema";
import { eq, and, isNull } from "drizzle-orm";
import { hashPassword, hashToken } from "@/lib/auth";
import { logAuthEvent } from "@/lib/audit";
import { authLimiter } from "@/lib/rate-limit";
import { checkBodySize, BODY_LIMITS } from "@/lib/body-limit";
import { z } from "zod";
import { handleRouteError } from "@/lib/api-error";

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8).max(128),
}).strict();

export async function POST(request: NextRequest) {
  try {
    const rl = await authLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const sizeError = checkBodySize(request, BODY_LIMITS.auth);
    if (sizeError) return sizeError;

    const body = await request.json();
    const { token, newPassword } = resetPasswordSchema.parse(body);

    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return NextResponse.json({ error: "Password must contain at least one uppercase letter, one lowercase letter, and one number" }, { status: 400 });
    }

    const tokenHash = hashToken(token);
    const [resetRecord] = await db
      .select()
      .from(passwordResetTokens)
      .where(and(
        eq(passwordResetTokens.token, tokenHash),
        isNull(passwordResetTokens.usedAt)
      ))
      .limit(1);

    if (!resetRecord) {
      return NextResponse.json({ error: "Invalid or expired reset token" }, { status: 400 });
    }

    if (new Date(resetRecord.expiresAt) < new Date()) {
      return NextResponse.json({ error: "Reset token has expired. Please request a new one." }, { status: 400 });
    }

    const hashedPassword = await hashPassword(newPassword);

    await db
      .update(users)
      .set({ password: hashedPassword, failedLoginAttempts: 0, lockedUntil: null })
      .where(eq(users.id, resetRecord.userId));

    await db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, resetRecord.id));

    await db
      .delete(sessions)
      .where(eq(sessions.userId, resetRecord.userId));

    logAuthEvent("password_reset.completed", resetRecord.userId, "").catch(() => {});

    return NextResponse.json({ message: "Password has been reset successfully. Please log in." }, { status: 200 });
  } catch (error) {
    return handleRouteError(error, "ResetPassword");
  }
}
