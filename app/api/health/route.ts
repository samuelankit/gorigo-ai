import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/get-user";
import { generalLimiter } from "@/lib/rate-limit";

const startTime = Date.now();

export async function GET(request: NextRequest) {
  const checkStart = Date.now();
  try {
    const rl = await generalLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    let dbOk = false;
    let dbLatency = 0;
    try {
      await db.execute(sql`SELECT 1`);
      dbLatency = Date.now() - checkStart;
      dbOk = true;
    } catch (error) {
      dbOk = false;
    }

    const response: Record<string, unknown> = {
      status: dbOk ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "1.0.0",
    };

    if (!dbOk) {
      response.checks = { database: "unreachable" };
      return NextResponse.json(response, { status: 503 });
    }

    let isSuperAdmin = false;
    try {
      const auth = await getAuthenticatedUser();
      isSuperAdmin = auth?.globalRole === "SUPERADMIN";
    } catch (error) {
      console.error("Health check auth lookup failed:", error);
    }

    if (isSuperAdmin) {
      const mem = process.memoryUsage();
      response.db = { status: "connected", latencyMs: dbLatency };
      response.uptime = Math.round(process.uptime());
      response.processAge = Math.round((Date.now() - startTime) / 1000);
      response.memory = {
        rssMb: Math.round(mem.rss / 1024 / 1024),
        heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
        externalMb: Math.round(mem.external / 1024 / 1024),
      };
      response.node = process.version;
    }

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
