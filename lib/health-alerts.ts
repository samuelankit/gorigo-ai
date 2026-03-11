import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { sendEmail } from "@/lib/email";
import { createLogger } from "@/lib/logger";
import { getActiveCallCount } from "@/lib/mid-call-billing";

const logger = createLogger("HealthAlerts");

const CHECK_INTERVAL_MS = 5 * 60 * 1000;
const ALERT_COOLDOWN_MS = 30 * 60 * 1000;
const MEMORY_THRESHOLD_PERCENT = 80;
const ALERT_EMAIL = process.env.HEALTH_ALERT_EMAIL || process.env.SENDGRID_FROM_EMAIL || "hello@gorigo.ai";

type AlertType = "db_down" | "high_memory" | "error_spike";

interface AlertState {
  lastAlertedAt: number;
  isHealthy: boolean;
}

const alertStates = new Map<AlertType, AlertState>();

function getAlertState(type: AlertType): AlertState {
  if (!alertStates.has(type)) {
    alertStates.set(type, { lastAlertedAt: 0, isHealthy: true });
  }
  return alertStates.get(type)!;
}

function shouldAlert(type: AlertType): boolean {
  const state = getAlertState(type);
  const now = Date.now();
  if (state.isHealthy) return false;
  if (now - state.lastAlertedAt < ALERT_COOLDOWN_MS) return false;
  return true;
}

function markUnhealthy(type: AlertType): void {
  const state = getAlertState(type);
  state.isHealthy = false;
}

function markHealthy(type: AlertType): void {
  const state = getAlertState(type);
  const wasUnhealthy = !state.isHealthy;
  state.isHealthy = true;
  if (wasUnhealthy) {
    sendRecoveryAlert(type).catch(() => {});
  }
}

function markAlerted(type: AlertType): void {
  const state = getAlertState(type);
  state.lastAlertedAt = Date.now();
}

async function checkDatabase(): Promise<boolean> {
  try {
    await db.execute(sql`SELECT 1`);
    markHealthy("db_down");
    return true;
  } catch (err) {
    markUnhealthy("db_down");
    logger.error("Database health check failed", err instanceof Error ? err : undefined);
    return false;
  }
}

function checkMemory(): { healthy: boolean; usedPercent: number } {
  const mem = process.memoryUsage();
  const heapUsedMB = Math.round(mem.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(mem.heapTotal / 1024 / 1024);
  const usedPercent = heapTotalMB > 0 ? Math.round((heapUsedMB / heapTotalMB) * 100) : 0;

  if (usedPercent >= MEMORY_THRESHOLD_PERCENT) {
    markUnhealthy("high_memory");
    return { healthy: false, usedPercent };
  }

  markHealthy("high_memory");
  return { healthy: true, usedPercent };
}

async function sendHealthAlert(type: AlertType, details: string): Promise<void> {
  if (!shouldAlert(type)) return;

  const subject = `[GoRigo ALERT] ${type.replace(/_/g, " ").toUpperCase()} - Action Required`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #DC2626; color: white; padding: 16px 24px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0;">Health Alert: ${type.replace(/_/g, " ").toUpperCase()}</h2>
      </div>
      <div style="background: #FEF2F2; padding: 24px; border: 1px solid #FECACA; border-radius: 0 0 8px 8px;">
        <p style="margin: 0 0 12px 0; color: #991B1B; font-weight: 600;">Issue Detected</p>
        <p style="margin: 0 0 16px 0; color: #7F1D1D;">${details}</p>
        <p style="margin: 0; color: #9CA3AF; font-size: 12px;">
          Time: ${new Date().toISOString()}<br>
          Active calls: ${getActiveCallCount()}<br>
          Uptime: ${Math.round(process.uptime() / 60)} minutes
        </p>
      </div>
    </div>
  `;

  try {
    await sendEmail(ALERT_EMAIL, subject, html);
    markAlerted(type);
    logger.info("Health alert sent", { type, to: ALERT_EMAIL });
  } catch (err) {
    logger.error("Failed to send health alert email", err instanceof Error ? err : undefined);
  }
}

async function sendRecoveryAlert(type: AlertType): Promise<void> {
  const subject = `[GoRigo RECOVERED] ${type.replace(/_/g, " ").toUpperCase()} - Issue Resolved`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #059669; color: white; padding: 16px 24px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0;">Recovered: ${type.replace(/_/g, " ").toUpperCase()}</h2>
      </div>
      <div style="background: #ECFDF5; padding: 24px; border: 1px solid #A7F3D0; border-radius: 0 0 8px 8px;">
        <p style="margin: 0 0 12px 0; color: #065F46; font-weight: 600;">Service Restored</p>
        <p style="margin: 0 0 16px 0; color: #064E3B;">The previously reported issue has been automatically resolved.</p>
        <p style="margin: 0; color: #9CA3AF; font-size: 12px;">
          Time: ${new Date().toISOString()}<br>
          Uptime: ${Math.round(process.uptime() / 60)} minutes
        </p>
      </div>
    </div>
  `;

  try {
    await sendEmail(ALERT_EMAIL, subject, html);
    logger.info("Recovery alert sent", { type, to: ALERT_EMAIL });
  } catch {}
}

async function runHealthCheck(): Promise<void> {
  const dbHealthy = await checkDatabase();
  if (!dbHealthy) {
    await sendHealthAlert("db_down", "PostgreSQL database connection failed. All data operations are affected. Active calls may lose billing accuracy.");
  }

  const memCheck = checkMemory();
  if (!memCheck.healthy) {
    await sendHealthAlert("high_memory", `Memory usage at ${memCheck.usedPercent}% of heap. Server may become unresponsive. Consider restarting the application.`);
  }
}

let healthCheckInterval: ReturnType<typeof setInterval> | null = null;

export function startHealthAlerts(): void {
  if (healthCheckInterval) return;

  runHealthCheck().catch((err) => {
    logger.error("Initial health check failed", err instanceof Error ? err : undefined);
  });

  healthCheckInterval = setInterval(() => {
    runHealthCheck().catch((err) => {
      logger.error("Health check cycle failed", err instanceof Error ? err : undefined);
    });
  }, CHECK_INTERVAL_MS);

  (healthCheckInterval as unknown as { unref?: () => void })?.unref?.();
  logger.info("Health alert system started", { intervalMs: CHECK_INTERVAL_MS, alertEmail: ALERT_EMAIL });
}

export function stopHealthAlerts(): void {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
  }
}
