import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sessions } from "@/shared/schema";
import { eq } from "drizzle-orm";
import { getSessionCookie, clearSessionCookie, hashToken } from "@/lib/auth";
import { logAuthEvent } from "@/lib/audit";
import { authLimiter } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/api-error";
import { createLogger } from "@/lib/logger";

const logger = createLogger("Auth");

export async function POST(request: NextRequest) {
  try {
    const rl = await authLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    let token = await getSessionCookie();
    if (!token) {
      const authHeader = request.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.slice(7);
      }
    }
    let userId: number | null = null;
    if (token) {
      const tokenHash = hashToken(token);
      const [session] = await db.select().from(sessions).where(eq(sessions.token, tokenHash)).limit(1);
      if (session) {
        userId = session.userId;
        await db.delete(sessions).where(eq(sessions.token, tokenHash));
      }
    }
    await clearSessionCookie();

    if (userId) {
      logAuthEvent("logout", userId, "").catch((err) => { logger.error("Log logout event failed", err); });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return handleRouteError(error, "Logout");
  }
}
