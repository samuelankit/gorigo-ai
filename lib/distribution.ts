import { db } from "@/lib/db";
import { affiliates, affiliateCommissions, orgs, partners, partnerClients, failedDistributions, walletTransactions, distributionLedger, users } from "@/shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { topUpWallet } from "@/lib/wallet";
import { roundMoney, calculatePercentage, safeSubtract, safeParseNumeric } from "@/lib/money";

export async function logFailedDistribution(
  orgId: number,
  deductionAmount: number,
  walletTransactionId: number | undefined,
  description: string | undefined,
  errorMessage: string
) {
  try {
    await db.insert(failedDistributions).values({
      orgId,
      deductionAmount: String(roundMoney(deductionAmount)),
      walletTransactionId: walletTransactionId ?? null,
      description: description ?? null,
      errorMessage,
      retryCount: 0,
      maxRetries: 3,
      status: "pending",
    });
  } catch (logErr) {
    console.error("CRITICAL: Failed to log distribution failure:", logErr);
  }
}

export async function processAffiliateCommission(
  orgId: number,
  deductionAmount: number,
  walletTransactionId?: number,
  description?: string
) {
  if (deductionAmount <= 0) return null;

  try {
    const [org] = await db
      .select()
      .from(orgs)
      .where(eq(orgs.id, orgId))
      .limit(1);

    if (!org || !org.referredByAffiliateId) return null;

    const [affiliate] = await db
      .select()
      .from(affiliates)
      .where(eq(affiliates.id, org.referredByAffiliateId))
      .limit(1);

    if (!affiliate || affiliate.status !== "active") return null;

    let commissionAmount = 0;
    if (affiliate.commissionType === "percentage") {
      commissionAmount = calculatePercentage(deductionAmount, safeParseNumeric(affiliate.commissionRate, 10));
    } else {
      commissionAmount = roundMoney(safeParseNumeric(affiliate.commissionRate, 0));
    }

    if (commissionAmount <= 0) return null;

    const result = await db.insert(affiliateCommissions).values({
      affiliateId: affiliate.id,
      orgId,
      walletTransactionId: walletTransactionId ?? null,
      sourceAmount: String(roundMoney(deductionAmount)),
      commissionRate: affiliate.commissionRate ?? "10",
      commissionAmount: String(commissionAmount),
      status: "pending",
      description: description ?? `Commission on £${roundMoney(deductionAmount).toFixed(2)} spend`,
    }).onConflictDoNothing().returning();

    const commission = result[0];
    if (!commission) return null;

    await db
      .update(affiliates)
      .set({
        totalEarnings: sql`ROUND((${affiliates.totalEarnings} + ${commissionAmount})::numeric, 2)`,
        pendingPayout: sql`ROUND((${affiliates.pendingPayout} + ${commissionAmount})::numeric, 2)`,
        updatedAt: new Date(),
      })
      .where(eq(affiliates.id, affiliate.id));

    return commission;
  } catch (error) {
    console.error("Affiliate commission processing error:", error);
    throw error;
  }
}

export async function processPartnerRevenueShare(
  orgId: number,
  deductionAmount: number,
  description?: string,
  walletTransactionId?: number
) {
  if (deductionAmount <= 0) return null;

  try {
    const [clientLink] = await db
      .select()
      .from(partnerClients)
      .where(eq(partnerClients.orgId, orgId))
      .limit(1);

    if (!clientLink || clientLink.status !== "active") return null;

    const [partner] = await db
      .select()
      .from(partners)
      .where(eq(partners.id, clientLink.partnerId))
      .limit(1);

    if (!partner || partner.status !== "active" || !partner.orgId) return null;
    if (safeParseNumeric(partner.revenueSharePercent, 0) <= 0) return null;

    const shareAmount = calculatePercentage(deductionAmount, safeParseNumeric(partner.revenueSharePercent, 0));
    if (shareAmount <= 0) return null;

    const refId = walletTransactionId
      ? `partner_${partner.id}_txn_${walletTransactionId}`
      : `partner_${partner.id}_org_${orgId}_${Date.now()}`;

    if (walletTransactionId) {
      const [existingTxn] = await db
        .select({ id: walletTransactions.id })
        .from(walletTransactions)
        .where(
          and(
            eq(walletTransactions.referenceId, refId),
            eq(walletTransactions.referenceType, "partner_revenue_share")
          )
        )
        .limit(1);
      if (existingTxn) return null;
    }

    await topUpWallet(
      partner.orgId,
      shareAmount,
      description ?? `Revenue share: ${partner.revenueSharePercent}% of £${roundMoney(deductionAmount).toFixed(2)} from org #${orgId}`,
      "partner_revenue_share",
      refId
    );

    return { partnerId: partner.id, shareAmount };
  } catch (error) {
    console.error("Partner revenue share error:", error);
    throw error;
  }
}

export async function processDistribution(
  orgId: number,
  deductionAmount: number,
  walletTransactionId?: number,
  description?: string
) {
  const results = {
    affiliateCommission: null as Awaited<ReturnType<typeof processAffiliateCommission>>,
    partnerRevenueShare: null as Awaited<ReturnType<typeof processPartnerRevenueShare>>,
  };

  try {
    results.affiliateCommission = await processAffiliateCommission(
      orgId, deductionAmount, walletTransactionId, description
    );
  } catch (affErr) {
    console.error("Affiliate commission failed, logging for retry:", affErr);
    await logFailedDistribution(orgId, deductionAmount, walletTransactionId, `affiliate_commission: ${description ?? ""}`, affErr instanceof Error ? affErr.message : "Unknown error");
  }

  try {
    results.partnerRevenueShare = await processPartnerRevenueShare(
      orgId, deductionAmount, description, walletTransactionId
    );
  } catch (partErr) {
    console.error("Partner revenue share failed, logging for retry:", partErr);
    await logFailedDistribution(orgId, deductionAmount, walletTransactionId, `partner_revenue_share: ${description ?? ""}`, partErr instanceof Error ? partErr.message : "Unknown error");
  }

  return results;
}

async function retryDistributionEntry(entry: typeof failedDistributions.$inferSelect) {
  const isAffiliate = entry.description?.startsWith("affiliate_commission:");
  const isPartner = entry.description?.startsWith("partner_revenue_share:");

  const deductionAmt = safeParseNumeric(entry.deductionAmount, 0);
  if (deductionAmt <= 0) return;

  if (isAffiliate) {
    await processAffiliateCommission(
      entry.orgId, deductionAmt,
      entry.walletTransactionId ?? undefined,
      entry.description?.replace("affiliate_commission: ", "") ?? undefined
    );
  } else if (isPartner) {
    await processPartnerRevenueShare(
      entry.orgId, deductionAmt,
      entry.description?.replace("partner_revenue_share: ", "") ?? undefined
    );
  } else {
    await processAffiliateCommission(entry.orgId, deductionAmt, entry.walletTransactionId ?? undefined, entry.description ?? undefined);
    await processPartnerRevenueShare(entry.orgId, deductionAmt, entry.description ?? undefined);
  }
}

export async function retryFailedDistributions() {
  const pending = await db
    .select()
    .from(failedDistributions)
    .where(
      and(
        eq(failedDistributions.status, "pending"),
        sql`${failedDistributions.retryCount} < ${failedDistributions.maxRetries}`
      )
    )
    .limit(10);

  let resolved = 0;
  let deadLettered = 0;
  for (const entry of pending) {
    try {
      await retryDistributionEntry(entry);
      await db.update(failedDistributions).set({ status: "resolved", resolvedAt: new Date() }).where(eq(failedDistributions.id, entry.id));
      resolved++;
    } catch (err) {
      const newRetryCount = (entry.retryCount ?? 0) + 1;
      const maxRetries = entry.maxRetries ?? 3;
      const isExhausted = newRetryCount >= maxRetries;

      await db.update(failedDistributions).set({
        retryCount: newRetryCount,
        status: isExhausted ? "failed" : "pending",
        errorMessage: err instanceof Error ? err.message : "Unknown error",
      }).where(eq(failedDistributions.id, entry.id));

      if (isExhausted) {
        deadLettered++;
        notifyDistributionDeadLetter(entry, err instanceof Error ? err.message : "Unknown error").catch(
          (notifyErr) => console.error("Dead-letter notification failed:", notifyErr)
        );
      }
    }
  }
  return { total: pending.length, resolved, deadLettered };
}

async function notifyDistributionDeadLetter(
  entry: typeof failedDistributions.$inferSelect,
  lastError: string
) {
  const { createNotification } = await import("@/lib/notifications");
  const { logAudit } = await import("@/lib/audit");

  const amount = safeParseNumeric(entry.deductionAmount, 0);

  try {
    const admins = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.globalRole, "SUPER_ADMIN"))
      .limit(10);

    for (const admin of admins) {
      await createNotification({
        userId: admin.id,
        type: "system",
        title: "Commission processing failed permanently",
        message: `Distribution for org #${entry.orgId} (£${roundMoney(amount).toFixed(2)}) failed after ${entry.maxRetries ?? 3} retries. Last error: ${lastError}. Manual intervention required.`,
        actionUrl: "/admin/distribution",
        metadata: {
          failedDistributionId: entry.id,
          orgId: entry.orgId,
          amount,
          description: entry.description,
        },
      });
    }
  } catch (notifyErr) {
    console.error("Failed to notify admins about dead-letter distribution:", notifyErr);
  }

  try {
    await logAudit({
      actorId: null,
      action: "distribution.dead_letter",
      entityType: "distribution",
      entityId: entry.orgId,
      details: {
        failedDistributionId: entry.id,
        deductionAmount: amount,
        retryCount: entry.maxRetries ?? 3,
        lastError,
        description: entry.description,
      },
    });
  } catch {}
}

export async function getDistributionHierarchy(orgId: number) {
  const [org] = await db.select().from(orgs).where(eq(orgs.id, orgId)).limit(1);
  if (!org) return null;

  const hierarchy: {
    org: typeof org;
    channelType: string;
    partner: Record<string, unknown> | null;
    parentPartner: Record<string, unknown> | null;
    reseller: Record<string, unknown> | null;
    affiliate: Record<string, unknown> | null;
  } = {
    org,
    channelType: org.channelType ?? "d2c",
    partner: null,
    parentPartner: null,
    reseller: null,
    affiliate: null,
  };

  const [clientLink] = await db
    .select()
    .from(partnerClients)
    .where(eq(partnerClients.orgId, orgId))
    .limit(1);

  if (clientLink) {
    const [directPartner] = await db
      .select()
      .from(partners)
      .where(eq(partners.id, clientLink.partnerId))
      .limit(1);

    if (directPartner) {
      if (directPartner.partnerType === "reseller" && directPartner.parentPartnerId) {
        hierarchy.reseller = directPartner;
        hierarchy.channelType = "reseller";
        const [parent] = await db
          .select()
          .from(partners)
          .where(eq(partners.id, directPartner.parentPartnerId))
          .limit(1);
        if (parent) {
          hierarchy.parentPartner = parent;
          hierarchy.partner = parent;
        }
      } else {
        hierarchy.partner = directPartner;
        hierarchy.channelType = "partner";
      }
    }
  }

  if (org.referredByAffiliateId) {
    const [affiliate] = await db
      .select()
      .from(affiliates)
      .where(eq(affiliates.id, org.referredByAffiliateId))
      .limit(1);
    if (affiliate) {
      hierarchy.affiliate = affiliate;
    }
  }

  return hierarchy;
}

export interface WaterfallResult {
  totalAmount: number;
  platformAmount: number;
  partnerAmount: number;
  partnerId: number | null;
  resellerAmount: number;
  resellerId: number | null;
  affiliateAmount: number;
  affiliateId: number | null;
  channel: string;
}

export function calculateWaterfall(
  totalAmount: number,
  hierarchy: Awaited<ReturnType<typeof getDistributionHierarchy>>
): WaterfallResult {
  if (!hierarchy) {
    return {
      totalAmount: roundMoney(totalAmount),
      platformAmount: roundMoney(totalAmount),
      partnerAmount: 0,
      partnerId: null,
      resellerAmount: 0,
      resellerId: null,
      affiliateAmount: 0,
      affiliateId: null,
      channel: "d2c",
    };
  }

  let remaining = roundMoney(totalAmount);
  let affiliateAmount = 0;
  let partnerAmount = 0;
  let resellerAmount = 0;
  let partnerId: number | null = null;
  let resellerId: number | null = null;
  let affiliateId: number | null = null;

  if (hierarchy.affiliate && (hierarchy.affiliate as any).status === "active") {
    const aff = hierarchy.affiliate as any;
    affiliateId = aff.id;
    if (aff.commissionType === "percentage") {
      affiliateAmount = calculatePercentage(totalAmount, safeParseNumeric(aff.commissionRate, 10));
    } else {
      affiliateAmount = roundMoney(safeParseNumeric(aff.commissionRate, 0));
    }
    affiliateAmount = Math.min(affiliateAmount, remaining);
    remaining = safeSubtract(remaining, affiliateAmount);
  }

  if (hierarchy.reseller && hierarchy.parentPartner) {
    const resellerPartner = hierarchy.reseller as any;
    const parentPartner = hierarchy.parentPartner as any;
    resellerId = resellerPartner.id;
    partnerId = parentPartner.id;

    if (safeParseNumeric(resellerPartner.revenueSharePercent, 0) > 0) {
      resellerAmount = calculatePercentage(totalAmount, safeParseNumeric(resellerPartner.revenueSharePercent, 0));
      resellerAmount = Math.min(resellerAmount, remaining);
      remaining = safeSubtract(remaining, resellerAmount);
    }

    if (safeParseNumeric(parentPartner.revenueSharePercent, 0) > 0) {
      partnerAmount = calculatePercentage(totalAmount, safeParseNumeric(parentPartner.revenueSharePercent, 0));
      partnerAmount = Math.min(partnerAmount, remaining);
      remaining = safeSubtract(remaining, partnerAmount);
    }
  } else if (hierarchy.partner) {
    const partner = hierarchy.partner as any;
    partnerId = partner.id;
    if (safeParseNumeric(partner.revenueSharePercent, 0) > 0) {
      partnerAmount = calculatePercentage(totalAmount, safeParseNumeric(partner.revenueSharePercent, 0));
      partnerAmount = Math.min(partnerAmount, remaining);
      remaining = safeSubtract(remaining, partnerAmount);
    }
  }

  return {
    totalAmount: roundMoney(totalAmount),
    platformAmount: Math.max(0, remaining),
    partnerAmount,
    partnerId,
    resellerAmount,
    resellerId,
    affiliateAmount,
    affiliateId,
    channel: hierarchy.channelType,
  };
}

export async function recordDistribution(
  orgId: number,
  waterfall: WaterfallResult,
  billingLedgerId?: number,
  walletTransactionId?: number
) {
  const result = await db.insert(distributionLedger).values({
    orgId,
    billingLedgerId: billingLedgerId ?? null,
    walletTransactionId: walletTransactionId ?? null,
    totalAmount: String(waterfall.totalAmount),
    platformAmount: String(waterfall.platformAmount),
    partnerAmount: String(waterfall.partnerAmount),
    partnerId: waterfall.partnerId,
    resellerAmount: String(waterfall.resellerAmount),
    resellerId: waterfall.resellerId,
    affiliateAmount: String(waterfall.affiliateAmount),
    affiliateId: waterfall.affiliateId,
    channel: waterfall.channel,
    status: "completed",
  }).onConflictDoNothing().returning();

  return result[0] ?? null;
}

export async function processMultiTierDistribution(
  orgId: number,
  deductionAmount: number,
  walletTransactionId?: number,
  billingLedgerId?: number,
  description?: string
) {
  if (deductionAmount <= 0) return null;

  try {
    const hierarchy = await getDistributionHierarchy(orgId);
    const waterfall = calculateWaterfall(deductionAmount, hierarchy);

    if (waterfall.affiliateAmount > 0 && waterfall.affiliateId) {
      await processAffiliateCommission(orgId, deductionAmount, walletTransactionId, description);
    }

    if (waterfall.resellerAmount > 0 && waterfall.resellerId) {
      const resellerPartner = hierarchy?.reseller as any;
      if (resellerPartner?.orgId) {
        const refId = walletTransactionId
          ? `reseller_${waterfall.resellerId}_txn_${walletTransactionId}`
          : `reseller_${waterfall.resellerId}_org_${orgId}_${Date.now()}`;
        await topUpWallet(
          resellerPartner.orgId,
          waterfall.resellerAmount,
          description ?? `Reseller share: ${resellerPartner.revenueSharePercent}% of ${roundMoney(deductionAmount).toFixed(2)} from org #${orgId}`,
          "reseller_revenue_share",
          refId
        );
      }
    }

    if (waterfall.partnerAmount > 0 && waterfall.partnerId) {
      await processPartnerRevenueShare(orgId, deductionAmount, description, walletTransactionId);
    }

    const ledgerEntry = await recordDistribution(orgId, waterfall, billingLedgerId, walletTransactionId);

    return { waterfall, ledgerEntry };
  } catch (error) {
    console.error("Multi-tier distribution error:", error);
    await logFailedDistribution(
      orgId, deductionAmount, walletTransactionId,
      `multi_tier: ${description ?? ""}`,
      error instanceof Error ? error.message : "Unknown error"
    );
    return null;
  }
}
