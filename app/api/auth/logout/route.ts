import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sessions } from "@/shared/schema";
import { eq } from "drizzle-orm";
import { getSessionCookie, clearSessionCookie, hashToken } from "@/lib/auth";

export async function POST() {
  try {
    const token = await getSessionCookie();
    if (token) {
      await db.delete(sessions).where(eq(sessions.token, hashToken(token)));
    }
    await clearSessionCookie();
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
