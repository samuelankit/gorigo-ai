import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, passwordResetTokens } from "@/shared/schema";
import { eq, and, isNull } from "drizzle-orm";
import { authLimiter } from "@/lib/rate-limit";
import { checkBodySize, BODY_LIMITS } from "@/lib/body-limit";
import crypto from "crypto";
import { hashToken } from "@/lib/auth";
import { logAuthEvent } from "@/lib/audit";
import { z } from "zod";
import { handleRouteError } from "@/lib/api-error";
import { createLogger } from "@/lib/logger";

const logger = createLogger("Auth");

const forgotPasswordSchema = z.object({
  email: z.string().email().max(255),
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
    const { email } = forgotPasswordSchema.parse(body);

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (!user) {
      return NextResponse.json({
        message: "If an account with that email exists, a reset link has been generated.",
      }, { status: 200 });
    }

    await db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(and(eq(passwordResetTokens.userId, user.id), isNull(passwordResetTokens.usedAt)));

    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await db.insert(passwordResetTokens).values({
      userId: user.id,
      token: tokenHash,
      expiresAt,
    });

    logAuthEvent("password_reset.requested", user.id, user.email).catch((err) => { logger.error("Log password reset request event failed", err); });

    return NextResponse.json({
      message: "If an account with that email exists, a reset link has been generated.",
    }, { status: 200 });
  } catch (error) {
    return handleRouteError(error, "ForgotPassword");
  }
}
