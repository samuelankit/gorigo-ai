import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";

const isProduction = process.env.NODE_ENV === "production";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: isProduction ? 20 : 10,
  min: isProduction ? 5 : 2,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  statement_timeout: 30_000,
  query_timeout: 30_000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10_000,
  allowExitOnIdle: false,
});

pool.on("error", (err) => {
  console.error("[DB] Unexpected pool error:", err.message);
});

pool.on("connect", (client) => {
  client.on("error", (err) => {
    console.error("[DB] Client connection error:", err.message);
  });
});

let healthCheckInterval: ReturnType<typeof setInterval> | null = null;

function startHealthCheck() {
  if (healthCheckInterval) return;
  healthCheckInterval = setInterval(async () => {
    try {
      const client = await pool.connect();
      await client.query("SELECT 1");
      client.release();
    } catch (err) {
      console.error("[DB] Health check failed:", err instanceof Error ? err.message : err);
    }
  }, 60_000);
  if (typeof healthCheckInterval === "object" && healthCheckInterval && "unref" in healthCheckInterval) {
    (healthCheckInterval as { unref: () => void }).unref();
  }
}

startHealthCheck();

export async function getPoolStats() {
  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
  };
}

export async function checkDatabaseHealth(): Promise<{ healthy: boolean; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    const client = await pool.connect();
    await client.query("SELECT 1");
    client.release();
    return { healthy: true, latencyMs: Date.now() - start };
  } catch (err) {
    return {
      healthy: false,
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

export const db = drizzle(pool);
