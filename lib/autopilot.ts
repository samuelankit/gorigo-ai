import { checkDatabaseHealth, getPoolStats } from "@/lib/db";
import { getLLMHealthStatus, getLLMRouterStats } from "@/lib/llm-router";
import { getRecentErrors } from "@/lib/error-handler";

export interface SystemHealthReport {
  timestamp: string;
  overall: "healthy" | "degraded" | "critical";
  uptime: number;
  memory: { rss: number; heapUsed: number; heapTotal: number; external: number };
  database: { healthy: boolean; latencyMs: number; pool: { totalCount: number; idleCount: number; waitingCount: number }; error?: string };
  llm: Record<string, { status: string; latencyMs: number; successRate: number; totalRequests: number; totalFailures: number }>;
  errors: { recentCount: number; last5: Array<{ timestamp: string; code: string; error: string }> };
  services: { twilio: ServiceStatus; stripe: ServiceStatus };
}

interface ServiceStatus {
  configured: boolean;
  status: "healthy" | "unknown" | "unconfigured";
}

interface HealthEvent {
  timestamp: string;
  type: "info" | "warning" | "critical" | "recovery";
  component: string;
  message: string;
}

const healthHistory: HealthEvent[] = [];
const MAX_HISTORY = 200;

export interface MetricsSnapshot {
  timestamp: string;
  heapUsedMB: number;
  heapTotalMB: number;
  rssMB: number;
  dbLatencyMs: number;
  dbHealthy: boolean;
  poolTotal: number;
  poolIdle: number;
  poolWaiting: number;
  errorCount: number;
  overall: "healthy" | "degraded" | "critical";
}

const metricsHistory: MetricsSnapshot[] = [];
const MAX_METRICS = 60;

function addEvent(type: HealthEvent["type"], component: string, message: string): void {
  const event: HealthEvent = { timestamp: new Date().toISOString(), type, component, message };
  healthHistory.push(event);
  if (healthHistory.length > MAX_HISTORY) healthHistory.shift();

  const logPrefix = `[Autopilot] [${type.toUpperCase()}] [${component}]`;
  if (type === "critical") console.error(`${logPrefix} ${message}`);
  else if (type === "warning") console.warn(`${logPrefix} ${message}`);
  else console.info(`${logPrefix} ${message}`);
}

let lastDbStatus = true;
let lastLLMStatus: Record<string, string> = {};
let consecutiveDbFailures = 0;
const MAX_DB_RETRIES = 3;

async function checkAndHealDatabase(): Promise<{ healthy: boolean; latencyMs: number; error?: string }> {
  const result = await checkDatabaseHealth();

  if (!result.healthy) {
    consecutiveDbFailures++;
    addEvent("warning", "database", `Health check failed (${consecutiveDbFailures}/${MAX_DB_RETRIES}): ${result.error}`);

    if (consecutiveDbFailures >= MAX_DB_RETRIES) {
      addEvent("critical", "database", `Database unreachable after ${MAX_DB_RETRIES} attempts. Connections may need manual intervention.`);
    }

    if (lastDbStatus) {
      addEvent("critical", "database", "Database went DOWN");
      lastDbStatus = false;
    }
  } else {
    if (!lastDbStatus) {
      addEvent("recovery", "database", `Database recovered after ${consecutiveDbFailures} failures (latency: ${result.latencyMs}ms)`);
    }
    consecutiveDbFailures = 0;
    lastDbStatus = true;

    if (result.latencyMs > 1000) {
      addEvent("warning", "database", `High latency detected: ${result.latencyMs}ms`);
    }
  }

  return result;
}

function checkLLMHealth(): void {
  const health = getLLMHealthStatus();

  for (const [provider, status] of Object.entries(health)) {
    const prevStatus = lastLLMStatus[provider];

    if (status.status === "down" && prevStatus !== "down") {
      addEvent("critical", "llm", `${provider} is DOWN. Circuit breaker triggered.`);
    } else if (status.status === "degraded" && prevStatus !== "degraded") {
      addEvent("warning", "llm", `${provider} is DEGRADED. Success rate: ${status.successRate}%`);
    } else if (status.status === "healthy" && prevStatus && prevStatus !== "healthy") {
      addEvent("recovery", "llm", `${provider} recovered to HEALTHY`);
    }

    lastLLMStatus[provider] = status.status;
  }
}

function checkMemory(): void {
  const mem = process.memoryUsage();
  const heapUsedMB = Math.round(mem.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(mem.heapTotal / 1024 / 1024);
  const heapPercent = Math.round((mem.heapUsed / mem.heapTotal) * 100);

  if (heapPercent > 90) {
    addEvent("critical", "memory", `Heap usage at ${heapPercent}% (${heapUsedMB}/${heapTotalMB}MB). Memory pressure detected.`);
  } else if (heapPercent > 75) {
    addEvent("warning", "memory", `Heap usage at ${heapPercent}% (${heapUsedMB}/${heapTotalMB}MB)`);
  }
}

export async function runHealthCheck(): Promise<SystemHealthReport> {
  const dbResult = await checkAndHealDatabase();
  checkLLMHealth();
  checkMemory();

  const poolStats = await getPoolStats();
  const llmHealth = getLLMHealthStatus();
  const errors = getRecentErrors();
  const mem = process.memoryUsage();

  const twilioConfigured = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
  const stripeConfigured = !!process.env.STRIPE_SECRET_KEY;

  let overall: "healthy" | "degraded" | "critical" = "healthy";

  if (!dbResult.healthy) {
    overall = "critical";
  } else {
    const llmStatuses = Object.values(llmHealth);
    const allDown = llmStatuses.length > 0 && llmStatuses.every(s => s.status === "down");
    const someDown = llmStatuses.some(s => s.status === "down" || s.status === "degraded");

    if (allDown) overall = "critical";
    else if (someDown) overall = "degraded";
    else if (dbResult.latencyMs > 2000) overall = "degraded";
  }

  const memorySnapshot = {
    rss: Math.round(mem.rss / 1024 / 1024),
    heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
    heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
    external: Math.round(mem.external / 1024 / 1024),
  };

  const snapshot: MetricsSnapshot = {
    timestamp: new Date().toISOString(),
    heapUsedMB: memorySnapshot.heapUsed,
    heapTotalMB: memorySnapshot.heapTotal,
    rssMB: memorySnapshot.rss,
    dbLatencyMs: dbResult.latencyMs,
    dbHealthy: dbResult.healthy,
    poolTotal: poolStats.totalCount,
    poolIdle: poolStats.idleCount,
    poolWaiting: poolStats.waitingCount,
    errorCount: errors.length,
    overall,
  };
  metricsHistory.push(snapshot);
  if (metricsHistory.length > MAX_METRICS) metricsHistory.shift();

  return {
    timestamp: new Date().toISOString(),
    overall,
    uptime: process.uptime(),
    memory: memorySnapshot,
    database: {
      healthy: dbResult.healthy,
      latencyMs: dbResult.latencyMs,
      pool: poolStats,
      error: dbResult.error,
    },
    llm: llmHealth as any,
    errors: {
      recentCount: errors.length,
      last5: errors.slice(-5).map(e => ({ timestamp: e.timestamp, code: e.code, error: e.error })),
    },
    services: {
      twilio: { configured: twilioConfigured, status: twilioConfigured ? "healthy" : "unconfigured" },
      stripe: { configured: stripeConfigured, status: stripeConfigured ? "healthy" : "unconfigured" },
    },
  };
}

export function getMetricsHistory(limit: number = 60): MetricsSnapshot[] {
  return metricsHistory.slice(-limit);
}

export function getHealthHistory(limit: number = 50): HealthEvent[] {
  return healthHistory.slice(-limit);
}

let lastHealthReport: SystemHealthReport | null = null;

export function getLastHealthReport(): SystemHealthReport | null {
  return lastHealthReport;
}

const _global = globalThis as any;

export function startAutopilotMonitor(intervalMs: number = 60_000): void {
  if (_global.__autopilotMonitorStarted) return;
  _global.__autopilotMonitorStarted = true;

  addEvent("info", "autopilot", "Autopilot monitor started");

  const interval = setInterval(async () => {
    try {
      lastHealthReport = await runHealthCheck();
    } catch (err) {
      addEvent("critical", "autopilot", `Monitor cycle failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, intervalMs);

  if (interval.unref) interval.unref();

  runHealthCheck().then(r => { lastHealthReport = r; }).catch((error) => { console.error("Autopilot health check failed:", error); });
}

export function stopAutopilotMonitor(): void {
  _global.__autopilotMonitorStarted = false;
  addEvent("info", "autopilot", "Autopilot monitor stopped");
}
