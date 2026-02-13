import { db } from "@/lib/db";
import { wallets, orgs, orgMembers, platformSettings, walletTransactions, usageRecords, notifications } from "@/shared/schema";
import { eq, sql, and, lte, gte } from "drizzle-orm";
import { createNotification } from "@/lib/notifications";
import { logAudit } from "@/lib/audit";

interface AutomationSettings {
  autoSuspendEnabled: boolean;
  autoSuspendDaysOverdue: number;
  spendingCapAlerts: boolean;
  spendingCapThreshold: number;
  autoApprovePartners: boolean;
}

async function loadSettings(): Promise<AutomationSettings> {
  const allSettings = await db.select().from(platformSettings);
  const map: Record<string, string> = {};
  for (const s of allSettings) {
    map[s.key] = s.value;
  }
  return {
    autoSuspendEnabled: map.auto_suspend_enabled === "true",
    autoSuspendDaysOverdue: parseInt(map.auto_suspend_days_overdue || "30", 10) || 30,
    spendingCapAlerts: map.spending_cap_alerts === "true",
    spendingCapThreshold: parseInt(map.spending_cap_threshold || "80", 10) || 80,
    autoApprovePartners: map.auto_approve_partners === "true",
  };
}

async function hasRecentNotification(orgId: number, type: string, hoursBack: number = 24): Promise<boolean> {
  const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(
      and(
        eq(notifications.orgId, orgId),
        eq(notifications.type, type),
        gte(notifications.createdAt, since)
      )
    );
  return Number(result?.count || 0) > 0;
}

interface AutoSuspendResult {
  checked: number;
  suspended: number;
  notified: number;
}

async function runAutoSuspension(settings: AutomationSettings): Promise<AutoSuspendResult> {
  if (!settings.autoSuspendEnabled) {
    return { checked: 0, suspended: 0, notified: 0 };
  }

  const zeroBalanceWallets = await db
    .select({
      orgId: wallets.orgId,
      balance: wallets.balance,
      updatedAt: wallets.updatedAt,
      orgName: orgs.name,
      channelType: orgs.channelType,
    })
    .from(wallets)
    .innerJoin(orgs, eq(orgs.id, wallets.orgId))
    .where(
      and(
        lte(wallets.balance, sql`0`),
        eq(wallets.isActive, true),
        sql`${orgs.channelType} IS DISTINCT FROM 'suspended'`
      )
    );

  let suspended = 0;
  let notified = 0;
  const gracePeriodMs = settings.autoSuspendDaysOverdue * 24 * 60 * 60 * 1000;
  const now = Date.now();

  for (const w of zeroBalanceWallets) {
    const lastTopUp = await db
      .select({ createdAt: walletTransactions.createdAt })
      .from(walletTransactions)
      .where(
        and(
          eq(walletTransactions.orgId, w.orgId),
          eq(walletTransactions.type, "top_up")
        )
      )
      .orderBy(sql`${walletTransactions.createdAt} DESC`)
      .limit(1);

    const referenceDate = lastTopUp[0]?.createdAt
      ? new Date(lastTopUp[0].createdAt).getTime()
      : (w.updatedAt ? new Date(w.updatedAt).getTime() : now);

    const daysSinceReference = Math.floor((now - referenceDate) / (24 * 60 * 60 * 1000));

    if (now - referenceDate >= gracePeriodMs) {
      await db
        .update(orgs)
        .set({ channelType: "suspended" })
        .where(eq(orgs.id, w.orgId));

      await logAudit({
        actorId: null,
        actorEmail: "system@gorigo.ai",
        action: "org.auto_suspended",
        entityType: "org",
        entityId: w.orgId,
        details: {
          reason: "zero_balance_exceeded_grace_period",
          daysSinceLastTopUp: daysSinceReference,
          gracePeriodDays: settings.autoSuspendDaysOverdue,
          orgName: w.orgName,
        },
      });

      const members = await db
        .select({ userId: orgMembers.userId })
        .from(orgMembers)
        .where(eq(orgMembers.orgId, w.orgId));

      for (const member of members) {
        await createNotification({
          userId: member.userId,
          orgId: w.orgId,
          type: "system",
          title: "Account suspended",
          message: `Your account has been automatically suspended due to zero balance for ${daysSinceReference} days. Top up your wallet to reactivate.`,
          actionUrl: "/dashboard/wallet",
        });
        notified++;
      }

      suspended++;
    }
  }

  return { checked: zeroBalanceWallets.length, suspended, notified };
}

interface SpendingCapResult {
  checked: number;
  alerted: number;
}

async function runSpendingCapAlerts(settings: AutomationSettings): Promise<SpendingCapResult> {
  if (!settings.spendingCapAlerts) {
    return { checked: 0, alerted: 0 };
  }

  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const orgsWithCaps = await db
    .select({
      orgId: usageRecords.orgId,
      spendingCap: usageRecords.spendingCap,
      orgName: orgs.name,
    })
    .from(usageRecords)
    .innerJoin(orgs, eq(orgs.id, usageRecords.orgId))
    .where(
      and(
        eq(usageRecords.month, month),
        sql`${usageRecords.spendingCap} IS NOT NULL AND CAST(${usageRecords.spendingCap} AS numeric) > 0`
      )
    );

  let alerted = 0;
  const thresholdPct = settings.spendingCapThreshold / 100;

  for (const org of orgsWithCaps) {
    const cap = parseFloat(String(org.spendingCap));
    if (isNaN(cap) || cap <= 0) continue;

    const alreadyNotified = await hasRecentNotification(org.orgId, "spending_cap", 24);
    if (alreadyNotified) continue;

    const [spendResult] = await db
      .select({ total: sql<number>`COALESCE(SUM(ABS(CAST(amount AS numeric))), 0)` })
      .from(walletTransactions)
      .where(
        and(
          eq(walletTransactions.orgId, org.orgId),
          eq(walletTransactions.type, "deduction"),
          sql`${walletTransactions.createdAt} >= date_trunc('month', CURRENT_DATE)`
        )
      );

    const currentSpend = Math.round(parseFloat(String(spendResult?.total || 0)) * 100) / 100;
    const usageRatio = currentSpend / cap;

    if (usageRatio >= thresholdPct) {
      const pctUsed = Math.round(usageRatio * 100);

      const members = await db
        .select({ userId: orgMembers.userId })
        .from(orgMembers)
        .where(eq(orgMembers.orgId, org.orgId));

      for (const member of members) {
        await createNotification({
          userId: member.userId,
          orgId: org.orgId,
          type: "spending_cap",
          title: "Spending cap warning",
          message: `You have used ${pctUsed}% of your ${String.fromCharCode(163)}${cap.toFixed(2)} monthly spending cap (${String.fromCharCode(163)}${currentSpend.toFixed(2)} spent). ${pctUsed >= 100 ? "Cap reached \u2014 further calls will be blocked." : "Consider increasing your cap or reducing usage."}`,
          actionUrl: "/dashboard/billing",
          metadata: { pctUsed, currentSpend, cap },
        });
      }

      alerted++;
    }
  }

  return { checked: orgsWithCaps.length, alerted };
}

export interface AutomationRunResult {
  timestamp: string;
  autoSuspend: AutoSuspendResult;
  spendingCap: SpendingCapResult;
  durationMs: number;
}

let lastRunResult: AutomationRunResult | null = null;
let isRunning = false;

export async function runAutomationCycle(): Promise<AutomationRunResult> {
  if (isRunning) {
    return lastRunResult || {
      timestamp: new Date().toISOString(),
      autoSuspend: { checked: 0, suspended: 0, notified: 0 },
      spendingCap: { checked: 0, alerted: 0 },
      durationMs: 0,
    };
  }

  isRunning = true;
  const start = Date.now();

  try {
    const settings = await loadSettings();

    const [autoSuspend, spendingCap] = await Promise.allSettled([
      runAutoSuspension(settings),
      runSpendingCapAlerts(settings),
    ]);

    const result: AutomationRunResult = {
      timestamp: new Date().toISOString(),
      autoSuspend: autoSuspend.status === "fulfilled" ? autoSuspend.value : { checked: 0, suspended: 0, notified: 0 },
      spendingCap: spendingCap.status === "fulfilled" ? spendingCap.value : { checked: 0, alerted: 0 },
      durationMs: Date.now() - start,
    };

    lastRunResult = result;

    const hasActions = result.autoSuspend.suspended > 0 || result.spendingCap.alerted > 0;
    if (hasActions) {
      console.log("[Automation]", JSON.stringify(result));
    }

    return result;
  } catch (err) {
    console.error("[Automation] Cycle error:", err);
    const fallback: AutomationRunResult = {
      timestamp: new Date().toISOString(),
      autoSuspend: { checked: 0, suspended: 0, notified: 0 },
      spendingCap: { checked: 0, alerted: 0 },
      durationMs: Date.now() - start,
    };
    lastRunResult = fallback;
    return fallback;
  } finally {
    isRunning = false;
  }
}

export function getLastAutomationResult(): AutomationRunResult | null {
  return lastRunResult;
}

export function isAutomationRunning(): boolean {
  return isRunning;
}

const _global = globalThis as any;

export function startAutomationEngine(intervalMs: number = 10 * 60 * 1000): void {
  if (_global.__automationEngineStarted) return;
  _global.__automationEngineStarted = true;

  console.log("[Automation] Engine started (interval: " + (intervalMs / 1000) + "s)");

  const interval = setInterval(async () => {
    try {
      await runAutomationCycle();
    } catch (err) {
      console.error("[Automation] Engine error:", err);
    }
  }, intervalMs);

  if (interval.unref) interval.unref();

  setTimeout(() => {
    runAutomationCycle().catch(() => {});
  }, 30_000);
}

export function stopAutomationEngine(): void {
  _global.__automationEngineStarted = false;
  console.log("[Automation] Engine stopped");
}
