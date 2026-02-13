import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { affiliates, affiliateClicks } from "@/shared/schema";
import { eq, sql } from "drizzle-orm";
import crypto from "crypto";

function hashIp(ip: string): string {
  const salt = process.env.SESSION_SECRET || "gorigo-ip-salt";
  return crypto.createHash("sha256").update(ip + salt).digest("hex").substring(0, 16);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("ref") || searchParams.get("code");

    if (!code) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    const [affiliate] = await db
      .select()
      .from(affiliates)
      .where(eq(affiliates.code, code))
      .limit(1);

    if (!affiliate || affiliate.status !== "active") {
      return NextResponse.redirect(new URL("/", request.url));
    }

    const rawIp = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const ip = rawIp.split(",")[0].trim();
    const hashedIp = hashIp(ip);
    const userAgent = request.headers.get("user-agent") || "";
    const referrer = request.headers.get("referer") || "";

    await db.insert(affiliateClicks).values({
      affiliateId: affiliate.id,
      ipAddress: hashedIp,
      userAgent: userAgent.substring(0, 500),
      referrerUrl: referrer.substring(0, 1000),
      landingPage: "/register",
    });

    await db
      .update(affiliates)
      .set({ totalClicks: sql`${affiliates.totalClicks} + 1` })
      .where(eq(affiliates.id, affiliate.id));

    const response = NextResponse.redirect(new URL(`/register?ref=${code}`, request.url));
    const cookieDays = affiliate.cookieDurationDays ?? 30;
    response.cookies.set("gorigo_ref", code, {
      maxAge: cookieDays * 24 * 60 * 60,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Affiliate track error:", error);
    return NextResponse.redirect(new URL("/", request.url));
  }
}
