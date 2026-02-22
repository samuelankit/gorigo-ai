import { db } from "@/lib/db";
import { callLogs, walletTransactions } from "@/shared/schema";
import { eq, and } from "drizzle-orm";
import { refundToWallet } from "@/lib/wallet";
import { createLogger } from "@/lib/logger";
import { roundMoney, safeParseNumeric } from "@/lib/money";

const logger = createLogger("CallRefund");

const PLATFORM_FAILURE_CAUSES = new Set([
  "service_unavailable",
  "server_error",
  "media_timeout",
  "system_failure",
  "temporary_failure",
  "switch_congestion",
  "network_out_of_order",
  "destination_out_of_order",
  "incompatible_destination",
  "protocol_error",
  "interworking",
]);

const MIN_REFUND_AMOUNT = 0.01;
const MAX_AUTO_REFUND_AMOUNT = 50.00;

export async function processCallRefund(
  callControlId: string,
  hangupCause: string,
  durationSecs: number
): Promise<{ refunded: boolean; amount: number; reason: string } | null> {
  if (!isPlatformFailure(hangupCause)) {
    return null;
  }

  try {
    const [callLog] = await db
      .select()
      .from(callLogs)
      .where(eq(callLogs.providerCallId, callControlId))
      .limit(1);

    if (!callLog) {
      logger.warn("Call log not found for refund check", { callControlId });
      return null;
    }

    if (durationSecs <= 0) {
      return null;
    }

    const ratePerMinute = safeParseNumeric(callLog.billedRatePerMinute, 0);
    if (ratePerMinute <= 0) return null;

    const billedMinutes = durationSecs / 60;
    const refundAmount = roundMoney(billedMinutes * ratePerMinute);

    if (refundAmount < MIN_REFUND_AMOUNT) return null;

    const cappedRefund = Math.min(refundAmount, MAX_AUTO_REFUND_AMOUNT);

    const refundRef = `call_refund_${callControlId}`;
    const [existingRefund] = await db
      .select({ id: walletTransactions.id })
      .from(walletTransactions)
      .where(
        and(
          eq(walletTransactions.orgId, callLog.orgId),
          eq(walletTransactions.referenceId, refundRef)
        )
      )
      .limit(1);

    if (existingRefund) {
      logger.info("Refund already processed for call", { callControlId });
      return null;
    }

    const result = await refundToWallet(
      callLog.orgId,
      cappedRefund,
      `Auto-refund: platform failure (${hangupCause}) during ${durationSecs}s call`,
      "call",
      refundRef
    );

    try {
      await db.update(callLogs).set({
        notes: `Auto-refunded £${cappedRefund.toFixed(2)} due to platform failure: ${hangupCause}`,
      }).where(eq(callLogs.providerCallId, callControlId));
    } catch {}

    try {
      const { logAudit } = await import("@/lib/audit");
      await logAudit({
        actorId: null,
        action: "call.auto_refund",
        entityType: "call",
        entityId: callLog.orgId,
        details: {
          callControlId,
          callLogId: callLog.id,
          hangupCause,
          durationSecs,
          ratePerMinute,
          refundAmount: cappedRefund,
          originalAmount: refundAmount,
          wasCapped: refundAmount > MAX_AUTO_REFUND_AMOUNT,
        },
      });
    } catch {}

    logger.info("Auto-refund processed for platform failure", {
      callControlId,
      orgId: callLog.orgId,
      amount: cappedRefund,
      hangupCause,
    });

    return {
      refunded: true,
      amount: cappedRefund,
      reason: `Platform failure: ${hangupCause}`,
    };
  } catch (err) {
    logger.error("Auto-refund processing failed", err instanceof Error ? err : undefined);
    return null;
  }
}

function isPlatformFailure(hangupCause: string): boolean {
  if (!hangupCause) return false;
  const normalized = hangupCause.toLowerCase().trim();
  if (PLATFORM_FAILURE_CAUSES.has(normalized)) return true;
  if (normalized.includes("error") || normalized.includes("failure") || normalized.includes("unavailable")) {
    if (normalized === "normal_clearing" || normalized === "user_busy" || normalized === "no_answer") {
      return false;
    }
    return true;
  }
  return false;
}
