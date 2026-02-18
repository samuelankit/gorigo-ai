import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/get-user";
import { generalLimiter } from "@/lib/rate-limit";

interface MetricDataPoint {
  timestamp: string;
  cpuUserUs: number;
  cpuSystemUs: number;
  cpuPercent: number;
  heapUsedMb: number;
  heapTotalMb: number;
  rssMb: number;
  externalMb: number;
  uptimeSeconds: number;
  dbLatencyMs: number;
}

const metricsHistory: MetricDataPoint[] = [];
const MAX_HISTORY = 60;

let lastCpuUsage = process.cpuUsage();
let lastCpuTime = Date.now();

export async function GET(request: NextRequest) {
  try {
    const rl = await generalLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const auth = await getAuthenticatedUser();
    if (!auth || auth.globalRole !== "SUPERADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const now = Date.now();
    const currentCpu = process.cpuUsage(lastCpuUsage);
    const elapsedMs = now - lastCpuTime;
    lastCpuUsage = process.cpuUsage();
    lastCpuTime = now;

    const mem = process.memoryUsage();

    let dbLatencyMs = 0;
    try {
      const dbStart = Date.now();
      await db.execute(sql`SELECT 1`);
      dbLatencyMs = Date.now() - dbStart;
    } catch {
      dbLatencyMs = -1;
    }

    const cpuPercent = elapsedMs > 0
      ? Math.round(((currentCpu.user + currentCpu.system) / 1000 / elapsedMs) * 100 * 100) / 100
      : 0;

    const dataPoint: MetricDataPoint = {
      timestamp: new Date().toISOString(),
      cpuUserUs: currentCpu.user,
      cpuSystemUs: currentCpu.system,
      cpuPercent,
      heapUsedMb: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
      heapTotalMb: Math.round((mem.heapTotal / 1024 / 1024) * 100) / 100,
      rssMb: Math.round((mem.rss / 1024 / 1024) * 100) / 100,
      externalMb: Math.round((mem.external / 1024 / 1024) * 100) / 100,
      uptimeSeconds: Math.round(process.uptime()),
      dbLatencyMs,
    };

    metricsHistory.push(dataPoint);
    if (metricsHistory.length > MAX_HISTORY) {
      metricsHistory.shift();
    }

    return NextResponse.json({
      current: dataPoint,
      history: metricsHistory,
      node: process.version,
      processAge: Math.round(process.uptime()),
    });
  } catch (error) {
    console.error("Metrics endpoint error:", error);
    return NextResponse.json(
      { error: "Failed to collect metrics" },
      { status: 500 }
    );
  }
}
