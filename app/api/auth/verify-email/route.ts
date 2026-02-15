import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/shared/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { authLimiter } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  try {
    const rl = await authLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    const token = request.nextUrl.searchParams.get("token");
    if (!token || typeof token !== "string" || token.length < 32) {
      return NextResponse.json({ error: "Invalid or missing verification token" }, { status: 400 });
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.emailVerificationToken, tokenHash))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: "Invalid verification token. It may have already been used." }, { status: 400 });
    }

    if (user.emailVerified) {
      return NextResponse.json({ message: "Email already verified" });
    }

    if (user.emailVerificationExpiresAt && new Date(user.emailVerificationExpiresAt) < new Date()) {
      return NextResponse.json({ error: "Verification token has expired. Please request a new one." }, { status: 400 });
    }

    await db
      .update(users)
      .set({
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpiresAt: null,
      })
      .where(eq(users.id, user.id));

    const baseUrl = request.nextUrl.origin;
    return NextResponse.redirect(`${baseUrl}/login?verified=true`);
  } catch (error) {
    console.error("Email verification error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
