import { db } from "@/lib/db";
import { callLogs, walletTransactions, activeCallBillingState } from "@/shared/schema";
import { eq, sql, and, like } from "drizzle-orm";
import { getWalletBalance, deductFromWallet, getUsableBalance, MINIMUM_WALLET_BALANCE } from "@/lib/wallet";
import { hangupCall, speakText } from "@/lib/telnyx";
import { createLogger } from "@/lib/logger";
import { roundMoney } from "@/lib/money";
import { cleanupCallConversation } from "@/lib/voice-ai";

const logger = createLogger("MidCallBilling");

const BILLING_INTERVAL_MS = 60_000;
const LOW_BALANCE_WARNING_THRESHOLD_MINUTES = 2;
const GRACE_WINDOW_AFTER_WARNING_MS = 30_000;

interface ActiveCallBilling {
  orgId: number;
  callControlId: string;
  ratePerMinute: number;
  startTime: number;
  lastBilledSecs: number;
  lowBalanceWarned: boolean;
  lowBalanceWarnedAt: number | null;
  terminated: boolean;
}

const activeCallBilling = new Map<string, ActiveCallBilling>();
let billingRunning = false;
let billingIntervalId: ReturnType<typeof setInterval> | null = null;

export function startCallBilling(callControlId: string, orgId: number, ratePerMinute: number): void {
  const startTime = Date.now();
  activeCallBilling.set(callControlId, {
    orgId,
    callControlId,
    ratePerMinute,
    startTime,
    lastBilledSecs: 0,
    lowBalanceWarned: false,
    lowBalanceWarnedAt: null,
    terminated: false,
  });

  db.insert(activeCallBillingState)
    .values({
      callControlId,
      orgId,
      ratePerMinute: String(ratePerMinute),
      startTime: String(startTime),
      lastBilledSecs: 0,
      lowBalanceWarned: false,
      lowBalanceWarnedAt: null,
      terminated: false,
    })
    .onConflictDoUpdate({
      target: activeCallBillingState.callControlId,
      set: {
        orgId,
        ratePerMinute: String(ratePerMinute),
        startTime: String(startTime),
        lastBilledSecs: 0,
        lowBalanceWarned: false,
        terminated: false,
      },
    })
    .catch((err) => {
      logger.error("Failed to persist billing state", err instanceof Error ? err : undefined);
    });

  if (!billingIntervalId) {
    billingIntervalId = setInterval(guardedBillingCycle, BILLING_INTERVAL_MS);
  }

  logger.info("Call billing started", { callControlId, orgId, ratePerMinute });
}

export function stopCallBilling(callControlId: string): void {
  const billing = activeCallBilling.get(callControlId);
  if (billing && !billing.terminated) {
    const totalSecs = Math.floor((Date.now() - billing.startTime) / 1000);
    const unbilledSecs = totalSecs - billing.lastBilledSecs;
    if (unbilledSecs > 0) {
      const unbilledMinutes = unbilledSecs / 60;
      const finalCharge = roundMoney(unbilledMinutes * billing.ratePerMinute);
      if (finalCharge > 0) {
        getWalletBalance(billing.orgId).then(rawBalance => {
          const usable = getUsableBalance(rawBalance);
          const cappedCharge = roundMoney(Math.min(finalCharge, usable));
          if (cappedCharge > 0) {
            return deductFromWallet(
              billing.orgId,
              cappedCharge,
              `Call billing: final ${unbilledSecs}s at £${billing.ratePerMinute}/min`,
              "call",
              `call_billing_final_${callControlId}`
            );
          }
        }).catch(err => {
          logger.error("Final billing deduction failed", err instanceof Error ? err : undefined);
        });
      }
    }
  }
  activeCallBilling.delete(callControlId);

  db.delete(activeCallBillingState)
    .where(eq(activeCallBillingState.callControlId, callControlId))
    .catch((err) => {
      logger.error("Failed to remove persisted billing state", err instanceof Error ? err : undefined);
    });

  if (activeCallBilling.size === 0 && billingIntervalId) {
    clearInterval(billingIntervalId);
    billingIntervalId = null;
  }
}

export async function reconcileCallBilling(
  callControlId: string,
  providerDurationSecs: number,
  orgId: number
): Promise<void> {
  try {
    const [walletTxnTotal] = await db
      .select({ total: sql<number>`COALESCE(SUM(ABS(${walletTransactions.amount})), 0)` })
      .from(walletTransactions)
      .where(
        and(
          eq(walletTransactions.orgId, orgId),
          eq(walletTransactions.referenceType, "call"),
          like(walletTransactions.referenceId, `call_billing_%${callControlId}%`)
        )
      );

    const alreadyBilled = Number(walletTxnTotal?.total ?? 0);

    const [callLog] = await db
      .select({
        billedRate: callLogs.billedRatePerMinute,
      })
      .from(callLogs)
      .where(eq(callLogs.providerCallId, callControlId))
      .limit(1);

    const ratePerMinute = callLog?.billedRate ? parseFloat(String(callLog.billedRate)) : 0;
    if (ratePerMinute <= 0 || providerDurationSecs <= 0) return;

    const expectedCharge = roundMoney((providerDurationSecs / 60) * ratePerMinute);
    const deficit = roundMoney(expectedCharge - alreadyBilled);

    if (deficit > 0.01) {
      logger.warn("Billing reconciliation deficit detected", {
        callControlId,
        orgId,
        providerDurationSecs,
        expectedCharge,
        alreadyBilled,
        deficit,
      });

      const idempotencyKey = `call_billing_reconcile_${callControlId}`;

      const [existing] = await db
        .select({ id: walletTransactions.id })
        .from(walletTransactions)
        .where(eq(walletTransactions.referenceId, idempotencyKey))
        .limit(1);

      if (existing) {
        logger.info("Reconciliation already applied, skipping", { callControlId });
        return;
      }

      try {
        const rawBalance = await getWalletBalance(orgId);
        const usable = getUsableBalance(rawBalance);
        const cappedDeficit = roundMoney(Math.min(deficit, usable));
        if (cappedDeficit > 0) {
          await deductFromWallet(
            orgId,
            cappedDeficit,
            `Call billing reconciliation: ${deficit.toFixed(2)} deficit for ${providerDurationSecs}s call`,
            "call",
            idempotencyKey
          );
          logger.info("Billing reconciliation charge applied", { callControlId, orgId, cappedDeficit });
        }
      } catch (deductErr) {
        logger.error("Billing reconciliation deduction failed", deductErr instanceof Error ? deductErr : undefined);
      }
    }
  } catch (err) {
    logger.error("Billing reconciliation check failed", err instanceof Error ? err : undefined);
  }
}

function guardedBillingCycle(): void {
  if (billingRunning) return;
  billingRunning = true;
  processBillingCycle().finally(() => {
    billingRunning = false;
  });
}

async function processBillingCycle(): Promise<void> {
  const entries = Array.from(activeCallBilling.entries());

  for (const [callControlId, billing] of entries) {
    if (billing.terminated) continue;
    if (!activeCallBilling.has(callControlId)) continue;

    try {
      const now = Date.now();
      const totalSecs = Math.floor((now - billing.startTime) / 1000);
      const unbilledSecs = totalSecs - billing.lastBilledSecs;

      if (unbilledSecs <= 0) continue;

      const unbilledMinutes = unbilledSecs / 60;
      const charge = roundMoney(unbilledMinutes * billing.ratePerMinute);
      const rawBalance = await getWalletBalance(billing.orgId);
      const usableBalance = getUsableBalance(rawBalance);
      const remainingMinutes = billing.ratePerMinute > 0 ? usableBalance / billing.ratePerMinute : Infinity;

      if (remainingMinutes <= LOW_BALANCE_WARNING_THRESHOLD_MINUTES && !billing.lowBalanceWarned) {
        billing.lowBalanceWarned = true;
        billing.lowBalanceWarnedAt = now;
        try {
          await speakText(callControlId, "Please note: your account balance is running low. This call may end shortly.");
        } catch {
          logger.warn("Failed to send low balance warning", { callControlId });
        }
      }

      if (usableBalance <= 0 || (charge > 0 && usableBalance < charge)) {
        if (billing.lowBalanceWarned && billing.lowBalanceWarnedAt) {
          const elapsed = now - billing.lowBalanceWarnedAt;
          if (elapsed >= GRACE_WINDOW_AFTER_WARNING_MS) {
            await terminateCallForBilling(callControlId, billing, "depleted");
            continue;
          }
        } else {
          billing.lowBalanceWarned = true;
          billing.lowBalanceWarnedAt = now;
          try {
            await speakText(callControlId, "Please note: your account balance is running low. This call may end shortly.");
          } catch {
            logger.warn("Failed to send low balance warning", { callControlId });
          }
        }
        continue;
      }

      if (charge > 0 && usableBalance >= charge) {
        try {
          await deductFromWallet(
            billing.orgId,
            charge,
            `Call billing: ${unbilledSecs}s at £${billing.ratePerMinute}/min`,
            "call",
            `call_billing_${callControlId}_${totalSecs}`
          );
          billing.lastBilledSecs = totalSecs;
          db.update(activeCallBillingState)
            .set({ lastBilledSecs: totalSecs })
            .where(eq(activeCallBillingState.callControlId, callControlId))
            .catch(() => {});
        } catch (deductErr) {
          if (deductErr instanceof Error && deductErr.message.includes("Insufficient balance")) {
            await terminateCallForBilling(callControlId, billing, "insufficient");
            continue;
          }
          logger.error("Billing deduction error", deductErr instanceof Error ? deductErr : undefined);
        }
      }
    } catch (err) {
      logger.error("Billing cycle error for call", err instanceof Error ? err : undefined);
    }
  }
}

async function terminateCallForBilling(
  callControlId: string,
  billing: ActiveCallBilling,
  reason: "depleted" | "insufficient"
): Promise<void> {
  billing.terminated = true;

  db.delete(activeCallBillingState)
    .where(eq(activeCallBillingState.callControlId, callControlId))
    .catch(() => {});

  logger.warn("Terminating call due to billing", { callControlId, orgId: billing.orgId, reason });

  try {
    await speakText(callControlId, "We're sorry, but your account balance has reached the minimum threshold. This call will now end. Please top up your account to continue using our services. Goodbye.");
  } catch {}

  setTimeout(async () => {
    try {
      await hangupCall(callControlId);
    } catch (hangupErr) {
      logger.error("Failed to hangup call for billing", hangupErr instanceof Error ? hangupErr : undefined);
    }

    try {
      await db.update(callLogs).set({
        status: "completed",
        endedAt: new Date(),
        finalOutcome: `billing_${reason}`,
      }).where(eq(callLogs.providerCallId, callControlId));
    } catch {}

    cleanupCallConversation(callControlId);
    activeCallBilling.delete(callControlId);

    try {
      const { logAudit } = await import("@/lib/audit");
      await logAudit({
        actorId: null,
        action: "call.billing_termination",
        entityType: "call",
        entityId: billing.orgId,
        details: { callControlId, reason, orgId: billing.orgId },
      });
    } catch {}
  }, 5000);
}

export function getActiveCallCount(): number {
  return activeCallBilling.size;
}

export function isCallActive(callControlId: string): boolean {
  return activeCallBilling.has(callControlId) && !activeCallBilling.get(callControlId)!.terminated;
}

export async function terminateAllCallsForOrg(orgId: number, reason: string = "org_suspended"): Promise<number> {
  const entries = Array.from(activeCallBilling.entries());
  let terminated = 0;

  for (const [callControlId, billing] of entries) {
    if (billing.orgId !== orgId || billing.terminated) continue;

    billing.terminated = true;
    terminated++;

    db.delete(activeCallBillingState)
      .where(eq(activeCallBillingState.callControlId, callControlId))
      .catch(() => {});

    logger.warn("Force-terminating call due to org suspension", { callControlId, orgId, reason });

    try {
      await speakText(callControlId, "We're sorry, this service has been suspended. This call will now end. Goodbye.");
    } catch {}

    setTimeout(async () => {
      try {
        await hangupCall(callControlId);
      } catch {}

      try {
        await db.update(callLogs).set({
          status: "completed",
          endedAt: new Date(),
          finalOutcome: reason,
        }).where(eq(callLogs.providerCallId, callControlId));
      } catch {}

      cleanupCallConversation(callControlId);
      activeCallBilling.delete(callControlId);
    }, 3000);
  }

  return terminated;
}

export async function restoreCallBilling(): Promise<number> {
  try {
    const rows = await db
      .select()
      .from(activeCallBillingState)
      .where(eq(activeCallBillingState.terminated, false));

    if (rows.length === 0) return 0;

    let restored = 0;
    for (const row of rows) {
      const startTime = parseInt(row.startTime, 10);
      const elapsed = Date.now() - startTime;

      if (elapsed > 3600_000) {
        logger.warn("Stale billing state found (>1hr), cleaning up", { callControlId: row.callControlId });
        await db.delete(activeCallBillingState)
          .where(eq(activeCallBillingState.callControlId, row.callControlId));
        continue;
      }

      activeCallBilling.set(row.callControlId, {
        orgId: row.orgId,
        callControlId: row.callControlId,
        ratePerMinute: parseFloat(String(row.ratePerMinute)),
        startTime,
        lastBilledSecs: row.lastBilledSecs ?? 0,
        lowBalanceWarned: row.lowBalanceWarned ?? false,
        lowBalanceWarnedAt: row.lowBalanceWarnedAt ? parseInt(row.lowBalanceWarnedAt, 10) : null,
        terminated: false,
      });
      restored++;
    }

    if (restored > 0 && !billingIntervalId) {
      billingIntervalId = setInterval(guardedBillingCycle, BILLING_INTERVAL_MS);
    }

    logger.info(`Restored ${restored} active billing sessions from database`);
    return restored;
  } catch (err) {
    logger.error("Failed to restore billing state", err instanceof Error ? err : undefined);
    return 0;
  }
}
