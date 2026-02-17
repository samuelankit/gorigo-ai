import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, sessions, agents, usageRecords, orgs, orgMembers, wallets, affiliates, affiliateClicks, insertUserSchema } from "@/shared/schema";
import { eq, sql, and, desc } from "drizzle-orm";
import { hashPassword, createSession, setSessionCookie, hashToken } from "@/lib/auth";
import { authLimiter } from "@/lib/rate-limit";
import { checkBodySize, BODY_LIMITS } from "@/lib/body-limit";
import crypto from "crypto";
import { logAuthEvent } from "@/lib/audit";

export async function POST(request: NextRequest) {
  try {
    const rl = await authLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const sizeError = checkBodySize(request, BODY_LIMITS.auth);
    if (sizeError) return sizeError;

    const body = await request.json();
    const parsed = insertUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.errors }, { status: 400 });
    }

    const { email, password, businessName } = parsed.data;
    const affiliateCode = body.affiliateCode || null;

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }
    if (password.length > 128) {
      return NextResponse.json({ error: "Password too long (max 128 characters)" }, { status: 400 });
    }
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      return NextResponse.json({ error: "Password must contain at least one uppercase letter, one lowercase letter, and one number" }, { status: 400 });
    }

    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0) {
      return NextResponse.json({ error: "Registration could not be completed. Please try a different email or sign in." }, { status: 400 });
    }

    const hashedPassword = await hashPassword(password);

    const result = await db.transaction(async (tx) => {
      const verificationToken = crypto.randomBytes(32).toString("hex");
      const verificationTokenHash = crypto.createHash("sha256").update(verificationToken).digest("hex");
      const verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const [newUser] = await tx.insert(users).values({
        email,
        password: hashedPassword,
        businessName,
        emailVerified: false,
        emailVerificationToken: verificationTokenHash,
        emailVerificationExpiresAt: verificationExpiresAt,
      }).returning();

      let referredByAffiliateId: number | null = null;
      let channelType = "d2c";

      const refCookie = request.cookies.get("gorigo_ref")?.value;
      const refCode = affiliateCode || refCookie;

      if (refCode) {
        const [affiliate] = await tx
          .select()
          .from(affiliates)
          .where(and(eq(affiliates.code, refCode), eq(affiliates.status, "active")))
          .limit(1);

        if (affiliate) {
          referredByAffiliateId = affiliate.id;
          channelType = affiliate.ownerType === "partner" ? "partner" : "affiliate";

          await tx
            .update(affiliates)
            .set({ totalSignups: sql`${affiliates.totalSignups} + 1` })
            .where(eq(affiliates.id, affiliate.id));
        }
      }

      const [newOrg] = await tx.insert(orgs).values({
        name: businessName,
        channelType,
        referredByAffiliateId,
      }).returning();

      if (referredByAffiliateId) {
        const [recentClick] = await tx
          .select()
          .from(affiliateClicks)
          .where(and(
            eq(affiliateClicks.affiliateId, referredByAffiliateId),
            eq(affiliateClicks.convertedToSignup, false)
          ))
          .orderBy(desc(affiliateClicks.createdAt))
          .limit(1);

        if (recentClick) {
          await tx
            .update(affiliateClicks)
            .set({ convertedToSignup: true, convertedOrgId: newOrg.id })
            .where(eq(affiliateClicks.id, recentClick.id));
        }
      }

      await tx.insert(orgMembers).values({
        orgId: newOrg.id,
        userId: newUser.id,
        role: "OWNER",
      });

      await tx.insert(agents).values({
        userId: newUser.id,
        orgId: newOrg.id,
      });

      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      await tx.insert(usageRecords).values({
        userId: newUser.id,
        orgId: newOrg.id,
        month,
      });

      await tx.insert(wallets).values({
        orgId: newOrg.id,
        balance: "0",
      });

      const token = createSession(newUser.id);
      const tokenHash = hashToken(token);
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const forwarded = request.headers.get("x-forwarded-for");
      const ip = forwarded?.split(",")[0]?.trim() || "unknown";
      const userAgent = request.headers.get("user-agent") || "unknown";
      await tx.insert(sessions).values({
        userId: newUser.id,
        token: tokenHash,
        expiresAt,
        ipAddress: ip,
        userAgent,
        activeOrgId: newOrg.id,
      });

      return { newUser, token, verificationToken };
    });

    await setSessionCookie(result.token);

    logAuthEvent("register.success", result.newUser.id, result.newUser.email, { businessName }).catch((error) => { console.error("Log register event failed:", error); });

    const { password: _, emailVerificationToken: __, emailVerificationExpiresAt: _evea, failedLoginAttempts: _fla, lockedUntil: _lu, ...userWithoutSensitive } = result.newUser;
    return NextResponse.json({
      user: userWithoutSensitive,
      message: "Account created. Please check your email to verify your address.",
    }, { status: 201 });
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
