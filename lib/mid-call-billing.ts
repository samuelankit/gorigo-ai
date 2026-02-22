import { db } from "@/lib/db";
import { callLogs } from "@/shared/schema";
import { eq } from "drizzle-orm";
import { getWalletBalance, deductFromWallet } from "@/lib/wallet";
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
  activeCallBilling.set(callControlId, {
    orgId,
    callControlId,
    ratePerMinute,
    startTime: Date.now(),
    lastBilledSecs: 0,
    lowBalanceWarned: false,
    lowBalanceWarnedAt: null,
    terminated: false,
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
        deductFromWallet(
          billing.orgId,
          finalCharge,
          `Call billing: final ${unbilledSecs}s at £${billing.ratePerMinute}/min`,
          "call",
          `call_billing_final_${callControlId}`
        ).catch(err => {
          logger.error("Final billing deduction failed", err instanceof Error ? err : undefined);
        });
      }
    }
  }
  activeCallBilling.delete(callControlId);

  if (activeCallBilling.size === 0 && billingIntervalId) {
    clearInterval(billingIntervalId);
    billingIntervalId = null;
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
      const balance = await getWalletBalance(billing.orgId);
      const remainingMinutes = billing.ratePerMinute > 0 ? balance / billing.ratePerMinute : Infinity;

      if (remainingMinutes <= LOW_BALANCE_WARNING_THRESHOLD_MINUTES && !billing.lowBalanceWarned) {
        billing.lowBalanceWarned = true;
        billing.lowBalanceWarnedAt = now;
        try {
          await speakText(callControlId, "Please note: your account balance is running low. This call may end shortly.");
        } catch {
          logger.warn("Failed to send low balance warning", { callControlId });
        }
      }

      if (balance <= 0 || (charge > 0 && balance < charge)) {
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

      if (charge > 0 && balance >= charge) {
        try {
          await deductFromWallet(
            billing.orgId,
            charge,
            `Call billing: ${unbilledSecs}s at £${billing.ratePerMinute}/min`,
            "call",
            `call_billing_${callControlId}_${totalSecs}`
          );
          billing.lastBilledSecs = totalSecs;
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

  logger.warn("Terminating call due to billing", { callControlId, orgId: billing.orgId, reason });

  try {
    await speakText(callControlId, "We're sorry, but your account balance has been depleted. This call will now end. Please top up your account to continue using our services. Goodbye.");
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
