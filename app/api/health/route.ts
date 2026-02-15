import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/get-user";
import { generalLimiter } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const start = Date.now();
  try {
    const rl = await generalLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    await db.execute(sql`SELECT 1`);
    const dbLatency = Date.now() - start;

    let isSuperAdmin = false;
    try {
      const auth = await getAuthenticatedUser();
      isSuperAdmin = auth?.globalRole === "SUPERADMIN";
    } catch {}

    const response: Record<string, any> = {
      status: "healthy",
      timestamp: new Date().toISOString(),
    };

    if (isSuperAdmin) {
      response.db = { status: "connected", latencyMs: dbLatency };
      response.uptime = process.uptime();
      response.memory = {
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      };
    }

    return NextResponse.json(response);
  } catch {
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
