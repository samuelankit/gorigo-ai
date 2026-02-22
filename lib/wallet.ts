import { db } from "@/lib/db";
import { wallets, walletTransactions, usageRecords, orgMembers, users, orgs } from "@/shared/schema";
import { eq, sql, and } from "drizzle-orm";
import { roundMoney, safeSubtract, safeAdd, validateAmount, safeParseNumeric } from "@/lib/money";
import { createNotification } from "@/lib/notifications";
import { getBaseUrl } from "@/lib/email";

export const MINIMUM_WALLET_BALANCE = 5.00;

export type TransactionType = "top_up" | "deduction" | "refund" | "adjustment" | "bonus" | "commission" | "revenue_share" | "payout";
export type ReferenceType = "call" | "ai_chat" | "rigo_assistant" | "ai_drafts" | "transcription" | "knowledge" | "manual" | "system" | "signup_bonus" | "affiliate_commission" | "partner_revenue_share" | "reseller_revenue_share" | "affiliate_payout";

export async function getOrCreateWallet(orgId: number) {
  try {
    const [existing] = await db
      .select()
      .from(wallets)
      .where(eq(wallets.orgId, orgId))
      .limit(1);

    if (existing) return existing;

    const [wallet] = await db
      .insert(wallets)
      .values({ orgId, balance: "0" })
      .onConflictDoNothing()
      .returning();

    if (wallet) return wallet;

    const [fallback] = await db
      .select()
      .from(wallets)
      .where(eq(wallets.orgId, orgId))
      .limit(1);

    if (fallback) return fallback;
    throw new Error("Failed to create or find wallet");
  } catch (err) {
    if (err instanceof Error && err.message === "Failed to create or find wallet") throw err;
    const [existing] = await db
      .select()
      .from(wallets)
      .where(eq(wallets.orgId, orgId))
      .limit(1);
    if (existing) return existing;
    throw err;
  }
}

export async function getWalletBalance(orgId: number): Promise<number> {
  const wallet = await getOrCreateWallet(orgId);
  return roundMoney(safeParseNumeric(wallet.balance, 0));
}

export async function hasInsufficientBalance(orgId: number, requiredAmount: number = 0.01): Promise<boolean> {
  const balance = await getWalletBalance(orgId);
  return balance < roundMoney(MINIMUM_WALLET_BALANCE + requiredAmount);
}

export function getUsableBalance(totalBalance: number): number {
  return roundMoney(Math.max(0, totalBalance - MINIMUM_WALLET_BALANCE));
}

async function checkSpendingCap(orgId: number, amount: number): Promise<{ exceeded: boolean; cap: number | null; currentSpend: number }> {
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [usage] = await db
    .select({ spendingCap: usageRecords.spendingCap })
    .from(usageRecords)
    .where(and(eq(usageRecords.orgId, orgId), eq(usageRecords.month, month)))
    .limit(1);

  const cap = usage?.spendingCap;
  const parsedCap = safeParseNumeric(cap, 0);
  if (parsedCap <= 0) {
    return { exceeded: false, cap: null, currentSpend: 0 };
  }

  const [spendResult] = await db
    .select({ total: sql<number>`COALESCE(SUM(ABS(amount)), 0)` })
    .from(walletTransactions)
    .where(
      and(
        eq(walletTransactions.orgId, orgId),
        eq(walletTransactions.type, "deduction"),
        sql`${walletTransactions.createdAt} >= date_trunc('month', CURRENT_DATE)`
      )
    );

  const currentSpend = roundMoney(safeParseNumeric(spendResult?.total, 0));
  const projectedSpend = safeAdd(currentSpend, amount);
  const roundedCap = roundMoney(parsedCap);

  return {
    exceeded: projectedSpend > roundedCap,
    cap: roundedCap,
    currentSpend,
  };
}

export async function deductFromWallet(
  orgId: number,
  amount: number,
  description: string,
  referenceType: ReferenceType,
  referenceId?: string
) {
  const roundedAmount = roundMoney(amount);
  if (roundedAmount <= 0) return null;

  const result = await db.transaction(async (tx) => {
    const walletResult = await tx.execute(
      sql`SELECT * FROM wallets WHERE org_id = ${orgId} FOR UPDATE`
    );
    const wallet = (walletResult.rows as Record<string, unknown>[])[0];

    if (!wallet) throw new Error("Wallet not found");
    const currentBalance = roundMoney(safeParseNumeric(wallet.balance, 0));
    const effectiveMinimum = roundMoney(MINIMUM_WALLET_BALANCE + roundedAmount);
    if (currentBalance < effectiveMinimum) throw new Error(`Insufficient balance. £${MINIMUM_WALLET_BALANCE.toFixed(2)} minimum reserve must be maintained.`);

    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const [usage] = await tx
      .select({ spendingCap: usageRecords.spendingCap })
      .from(usageRecords)
      .where(and(eq(usageRecords.orgId, orgId), eq(usageRecords.month, month)))
      .limit(1);

    const cap = usage?.spendingCap;
    const parsedCapInTx = safeParseNumeric(cap, 0);
    if (parsedCapInTx > 0) {
      const [spendResult] = await tx
        .select({ total: sql<number>`COALESCE(SUM(ABS(amount)), 0)` })
        .from(walletTransactions)
        .where(
          and(
            eq(walletTransactions.orgId, orgId),
            eq(walletTransactions.type, "deduction"),
            sql`${walletTransactions.createdAt} >= date_trunc('month', CURRENT_DATE)`
          )
        );

      const currentSpend = roundMoney(safeParseNumeric(spendResult?.total, 0));
      const projectedSpend = safeAdd(currentSpend, roundedAmount);
      const roundedCap = roundMoney(parsedCapInTx);

      if (projectedSpend > roundedCap) {
        throw new Error(
          `Spending cap exceeded. Monthly cap: £${roundedCap.toFixed(2)}, current spend: £${currentSpend.toFixed(2)}, attempted: £${roundedAmount.toFixed(2)}`
        );
      }
    }

    const balanceBefore = currentBalance;

    const updateRaw = await tx.execute(
      sql`UPDATE wallets SET balance = ROUND((balance - ${roundedAmount})::numeric, 2), updated_at = NOW() WHERE org_id = ${orgId} AND balance >= ${effectiveMinimum} RETURNING balance`
    );
    const updateResult = updateRaw.rows as Record<string, unknown>[];

    if (!updateResult || updateResult.length === 0) {
      throw new Error("Insufficient balance (concurrent deduction)");
    }

    const actualBalanceAfter = roundMoney(safeParseNumeric(updateResult[0].balance, 0));

    const [txn] = await tx
      .insert(walletTransactions)
      .values({
        orgId,
        type: "deduction" as TransactionType,
        amount: String(-roundedAmount),
        balanceBefore: String(balanceBefore),
        balanceAfter: String(actualBalanceAfter),
        description,
        referenceType,
        referenceId,
      })
      .returning();

    checkAndNotifyBalance(orgId, actualBalanceAfter).catch((error) => { console.error("Check and notify wallet balance failed:", error); });

    return { transaction: txn, newBalance: actualBalanceAfter };
  });

  const REVENUE_REFERENCE_TYPES: ReferenceType[] = ["call", "ai_chat", "rigo_assistant", "transcription", "knowledge"];

  if (result) {
    if (REVENUE_REFERENCE_TYPES.includes(referenceType)) {
      try {
        const { processDistribution } = await import("@/lib/distribution");
        await processDistribution(orgId, roundedAmount, result.transaction.id, description);
      } catch (distErr) {
        console.error("Distribution processing error:", distErr);
        try {
          const { logFailedDistribution } = await import("@/lib/distribution");
          await logFailedDistribution(orgId, roundedAmount, result.transaction.id, description, distErr instanceof Error ? distErr.message : "Unknown error");
        } catch (logErr) {
          console.error("Failed to log distribution error:", logErr);
        }
      }
    }

    try {
      const { logAudit } = await import("@/lib/audit");
      await logAudit({
        actorId: null,
        actorEmail: null,
        action: "wallet.deduction",
        entityType: "wallet",
        entityId: orgId,
        details: { amount: roundedAmount, description, referenceType, newBalance: result.newBalance },
      });
    } catch (auditErr) {
      console.error("Audit log error (deduction):", auditErr);
    }
  }

  return result;
}

const LOW_BALANCE_ALERT_COOLDOWN_MS = 6 * 60 * 60 * 1000;

async function checkAndNotifyBalance(orgId: number, newBalance: number) {
  try {
    const wallet = await getOrCreateWallet(orgId);
    const threshold = roundMoney(safeParseNumeric(wallet.lowBalanceThreshold, 10));
    const roundedBalance = roundMoney(newBalance);
    const now = new Date();

    const lastAlert = wallet.lastLowBalanceAlertAt ? new Date(wallet.lastLowBalanceAlertAt).getTime() : 0;
    const cooldownExpired = now.getTime() - lastAlert > LOW_BALANCE_ALERT_COOLDOWN_MS;

    if (roundedBalance <= threshold && roundedBalance > 0 && cooldownExpired) {
      await db.update(wallets).set({ lastLowBalanceAlertAt: now }).where(eq(wallets.orgId, orgId));

      const members = await db
        .select({ userId: orgMembers.userId })
        .from(orgMembers)
        .where(eq(orgMembers.orgId, orgId));

      for (const member of members) {
        await createNotification({
          userId: member.userId,
          orgId,
          type: "low_balance",
          title: "Low wallet balance",
          message: `Your balance is £${roundedBalance.toFixed(2)}, below the £${threshold.toFixed(2)} threshold. Top up to avoid service interruption.`,
          actionUrl: "/dashboard/wallet",
        });
      }

      if (wallet.lowBalanceEmailEnabled !== false) {
        sendLowBalanceEmail(orgId, roundedBalance, threshold).catch((err) => {
          console.error("[Notifications] Low balance email error:", err);
        });
      }
    }

    if (roundedBalance <= MINIMUM_WALLET_BALANCE && cooldownExpired) {
      const members = await db
        .select({ userId: orgMembers.userId })
        .from(orgMembers)
        .where(eq(orgMembers.orgId, orgId));

      for (const member of members) {
        await createNotification({
          userId: member.userId,
          orgId,
          type: "spending_cap",
          title: "Wallet below minimum balance",
          message: `Your wallet balance (£${roundedBalance.toFixed(2)}) is below the required £${MINIMUM_WALLET_BALANCE.toFixed(2)} minimum. Services will be blocked until you top up.`,
          actionUrl: "/dashboard/wallet",
        });
      }

      if (wallet.lowBalanceEmailEnabled !== false) {
        sendCriticalBalanceEmail(orgId, roundedBalance).catch((err) => {
          console.error("[Notifications] Critical balance email error:", err);
        });
      }
    }
  } catch (err) {
    console.error("[Notifications] Balance check notification error:", err);
  }
}

async function sendLowBalanceEmail(orgId: number, balance: number, threshold: number) {
  try {
    const { sendEmail } = await import("@/lib/email");
    const memberEmails = await db
      .select({ email: users.email })
      .from(orgMembers)
      .innerJoin(users, eq(orgMembers.userId, users.id))
      .where(eq(orgMembers.orgId, orgId));

    const [org] = await db.select({ name: orgs.name }).from(orgs).where(eq(orgs.id, orgId)).limit(1);
    const orgName = org?.name || "Your organisation";

    for (const { email } of memberEmails) {
      await sendEmail(email, "Low Wallet Balance Alert - GoRigo", `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8faf9;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:10px;overflow:hidden;border:1px solid #e2e8e5;">
    <div style="background:#d97706;padding:32px 24px;text-align:center;">
      <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700;">GoRigo</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Low Balance Alert</p>
    </div>
    <div style="padding:32px 24px;">
      <h2 style="margin:0 0 8px;color:#1a2e22;font-size:20px;">Your wallet balance is running low</h2>
      <p style="margin:0 0 16px;color:#5c7268;">${orgName}'s wallet balance has dropped to <strong>&pound;${balance.toFixed(2)}</strong>, below your alert threshold of &pound;${threshold.toFixed(2)}.</p>
      <p style="margin:0 0 16px;color:#5c7268;">To avoid service interruptions, please top up your wallet.</p>
      <div style="margin:24px 0;text-align:center;">
        <a href="${getBaseUrl()}/dashboard/wallet" style="display:inline-block;background:#d97706;color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:600;font-size:16px;">Top Up Now</a>
      </div>
      <p style="margin:16px 0 0;color:#8fa49a;font-size:13px;">You can adjust your alert threshold in your wallet settings.</p>
    </div>
    <div style="padding:16px 24px;background:#f8faf9;border-top:1px solid #e2e8e5;text-align:center;">
      <p style="margin:0;color:#8fa49a;font-size:12px;">GoRigo.ai - Powered by AI</p>
    </div>
  </div>
</body>
</html>`);
    }
  } catch (err) {
    console.error("[Email] Low balance email failed:", err);
  }
}

async function sendCriticalBalanceEmail(orgId: number, balance: number) {
  try {
    const { sendEmail } = await import("@/lib/email");
    const memberEmails = await db
      .select({ email: users.email })
      .from(orgMembers)
      .innerJoin(users, eq(orgMembers.userId, users.id))
      .where(eq(orgMembers.orgId, orgId));

    const [org] = await db.select({ name: orgs.name }).from(orgs).where(eq(orgs.id, orgId)).limit(1);
    const orgName = org?.name || "Your organisation";

    for (const { email } of memberEmails) {
      await sendEmail(email, "URGENT: Wallet Balance Critical - GoRigo", `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8faf9;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:10px;overflow:hidden;border:1px solid #e2e8e5;">
    <div style="background:#dc2626;padding:32px 24px;text-align:center;">
      <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700;">GoRigo</h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Critical Balance Alert</p>
    </div>
    <div style="padding:32px 24px;">
      <h2 style="margin:0 0 8px;color:#1a2e22;font-size:20px;">Services may be interrupted</h2>
      <p style="margin:0 0 16px;color:#5c7268;">${orgName}'s wallet balance is <strong>&pound;${balance.toFixed(2)}</strong>, below the required &pound;${MINIMUM_WALLET_BALANCE.toFixed(2)} minimum reserve.</p>
      <p style="margin:0 0 16px;color:#dc2626;font-weight:600;">AI calls and other services are blocked until you top up.</p>
      <div style="margin:24px 0;text-align:center;">
        <a href="${getBaseUrl()}/dashboard/wallet" style="display:inline-block;background:#dc2626;color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:600;font-size:16px;">Top Up Now</a>
      </div>
    </div>
    <div style="padding:16px 24px;background:#f8faf9;border-top:1px solid #e2e8e5;text-align:center;">
      <p style="margin:0;color:#8fa49a;font-size:12px;">GoRigo.ai - Powered by AI</p>
    </div>
  </div>
</body>
</html>`);
    }
  } catch (err) {
    console.error("[Email] Critical balance email failed:", err);
  }
}


export async function topUpWallet(
  orgId: number,
  amount: number,
  description: string = "Wallet top-up",
  referenceType: ReferenceType = "manual",
  referenceId?: string
) {
  const roundedAmount = roundMoney(amount);
  const validationError = validateAmount(roundedAmount, "Top-up amount");
  if (validationError) throw new Error(validationError);

  await getOrCreateWallet(orgId);

  const result = await db.transaction(async (tx) => {
    const topUpResult = await tx.execute(
      sql`SELECT * FROM wallets WHERE org_id = ${orgId} FOR UPDATE`
    );
    const topUpWalletRow = (topUpResult.rows as Record<string, unknown>[])[0];

    if (!topUpWalletRow) throw new Error("Wallet not found");

    const balanceBefore = roundMoney(safeParseNumeric(topUpWalletRow.balance, 0));

    const topUpUpdateRaw = await tx.execute(
      sql`UPDATE wallets SET balance = ROUND((balance + ${roundedAmount})::numeric, 2), updated_at = NOW() WHERE org_id = ${orgId} RETURNING balance`
    );
    const topUpUpdateResult = topUpUpdateRaw.rows as Record<string, unknown>[];
    const actualBalanceAfter = roundMoney(safeParseNumeric(topUpUpdateResult[0]?.balance, safeAdd(balanceBefore, roundedAmount)));

    const [txn] = await tx
      .insert(walletTransactions)
      .values({
        orgId,
        type: "top_up" as TransactionType,
        amount: String(roundedAmount),
        balanceBefore: String(balanceBefore),
        balanceAfter: String(actualBalanceAfter),
        description,
        referenceType,
        referenceId,
      })
      .returning();

    return { transaction: txn, newBalance: actualBalanceAfter };
  });

  try {
    const { logAudit } = await import("@/lib/audit");
    await logAudit({
      actorId: null,
      actorEmail: null,
      action: "wallet.topup",
      entityType: "wallet",
      entityId: orgId,
      details: { amount: roundedAmount, description, referenceType, newBalance: result.newBalance },
    });
  } catch (auditErr) {
    console.error("Audit log error (topup):", auditErr);
  }

  return result;
}

export async function refundToWallet(
  orgId: number,
  amount: number,
  description: string,
  referenceType: ReferenceType = "manual",
  referenceId?: string,
  originalTransactionId?: number
) {
  const roundedAmount = roundMoney(amount);
  const validationError = validateAmount(roundedAmount, "Refund amount");
  if (validationError) throw new Error(validationError);

  if (originalTransactionId) {
    const [existingRefund] = await db
      .select({ id: walletTransactions.id })
      .from(walletTransactions)
      .where(
        and(
          eq(walletTransactions.orgId, orgId),
          eq(walletTransactions.type, "refund"),
          eq(walletTransactions.referenceId, `refund-txn-${originalTransactionId}`)
        )
      )
      .limit(1);

    if (existingRefund) {
      throw new Error("Refund already processed for this transaction");
    }
  }

  await getOrCreateWallet(orgId);

  const result = await db.transaction(async (tx) => {
    const refundResult = await tx.execute(
      sql`SELECT * FROM wallets WHERE org_id = ${orgId} FOR UPDATE`
    );
    const refundWalletRow = (refundResult.rows as Record<string, unknown>[])[0];

    if (!refundWalletRow) throw new Error("Wallet not found");

    const balanceBefore = roundMoney(safeParseNumeric(refundWalletRow.balance, 0));

    const refundUpdateRaw = await tx.execute(
      sql`UPDATE wallets SET balance = ROUND((balance + ${roundedAmount})::numeric, 2), updated_at = NOW() WHERE org_id = ${orgId} RETURNING balance`
    );
    const refundUpdateResult = refundUpdateRaw.rows as Record<string, unknown>[];
    const actualBalanceAfter = roundMoney(safeParseNumeric(refundUpdateResult[0]?.balance, safeAdd(balanceBefore, roundedAmount)));

    const refId = originalTransactionId
      ? `refund-txn-${originalTransactionId}`
      : (referenceId || `refund-${Date.now()}`);

    const [txn] = await tx
      .insert(walletTransactions)
      .values({
        orgId,
        type: "refund" as TransactionType,
        amount: String(roundedAmount),
        balanceBefore: String(balanceBefore),
        balanceAfter: String(actualBalanceAfter),
        description,
        referenceType,
        referenceId: refId,
      })
      .returning();

    return { transaction: txn, newBalance: actualBalanceAfter };
  });

  let spendingCapNote: string | null = null;
  try {
    const capCheck = await checkSpendingCap(orgId, 0);
    if (capCheck.cap !== null && capCheck.cap > 0) {
      const netSpendAfterRefund = roundMoney(Math.max(0, capCheck.currentSpend - roundedAmount));
      if (netSpendAfterRefund < capCheck.currentSpend) {
        spendingCapNote = `Refund reduces effective spend from £${capCheck.currentSpend.toFixed(2)} to £${netSpendAfterRefund.toFixed(2)} (cap: £${capCheck.cap.toFixed(2)})`;
      }
    }
  } catch {}

  try {
    const { logAudit } = await import("@/lib/audit");
    await logAudit({
      actorId: null,
      actorEmail: null,
      action: "wallet.refund",
      entityType: "wallet",
      entityId: orgId,
      details: {
        amount: roundedAmount,
        description,
        referenceType,
        originalTransactionId,
        newBalance: result.newBalance,
        ...(spendingCapNote ? { spendingCapNote } : {}),
      },
    });
  } catch (auditErr) {
    console.error("Audit log error (refund):", auditErr);
  }

  return result;
}

export async function deductWithIdempotency(
  orgId: number,
  amount: number,
  idempotencyKey: string,
  description: string,
  referenceType: ReferenceType,
  referenceId?: string
) {
  const [existing] = await db
    .select({ id: walletTransactions.id })
    .from(walletTransactions)
    .where(
      and(
        eq(walletTransactions.orgId, orgId),
        eq(walletTransactions.referenceId, `idem-${idempotencyKey}`)
      )
    )
    .limit(1);

  if (existing) {
    return null;
  }

  return deductFromWallet(orgId, amount, description, referenceType, referenceId || `idem-${idempotencyKey}`);
}

export async function isLowBalance(orgId: number): Promise<boolean> {
  const wallet = await getOrCreateWallet(orgId);
  const threshold = roundMoney(Math.max(safeParseNumeric(wallet.lowBalanceThreshold, 10), MINIMUM_WALLET_BALANCE));
  return roundMoney(safeParseNumeric(wallet.balance, 0)) <= threshold;
}
