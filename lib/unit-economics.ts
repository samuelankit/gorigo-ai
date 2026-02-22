import { db } from "@/lib/db";
import { costEvents, costConfig, billingLedger, walletTransactions, callLogs, distributionLedger, rateCards } from "@/shared/schema";
import { eq, sql, and, gte, lte, desc, count, sum } from "drizzle-orm";

export const LLM_PRICING: Record<string, { input: number; output: number; currency: string }> = {
  "gpt-4o-mini": { input: 0.00015, output: 0.0006, currency: "USD" },
  "gpt-4o": { input: 0.0025, output: 0.01, currency: "USD" },
  "claude-sonnet-4-5": { input: 0.003, output: 0.015, currency: "USD" },
  "claude-3-5-sonnet-20241022": { input: 0.003, output: 0.015, currency: "USD" },
};

const USD_TO_GBP = 0.79;

export const PLATFORM_COSTS = {
  serverMonthly: 150,
  databaseMonthly: 50,
  storageMonthlyCostPerGb: 0.10,
  stripePercentFee: 0.015,
  stripeFixedFee: 0.20,
  stripeNonEuPercentFee: 0.029,
  stripeNonEuFixedFee: 0.20,
  telnyxPerMinuteUK: 0.015,
  telnyxPerMinuteUS: 0.014,
  telnyxPerMinuteEU: 0.025,
  telnyxPerMinuteDefault: 0.035,
  phoneNumberMonthly: 1.15,
  rigoInteractionCost: 0.005,
  embeddingCostPer1kTokens: 0.00002,
};

export function calculateLLMCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): { costUSD: number; costGBP: number } {
  const pricing = LLM_PRICING[model] || LLM_PRICING["gpt-4o-mini"];
  const costUSD = (inputTokens / 1000) * pricing.input + (outputTokens / 1000) * pricing.output;
  const costGBP = costUSD * USD_TO_GBP;
  return { costUSD, costGBP };
}

export function calculateTelephonyCost(durationSeconds: number, countryCode?: string): number {
  const minutes = Math.ceil(durationSeconds / 60);
  let ratePerMinute = PLATFORM_COSTS.telnyxPerMinuteDefault;
  if (countryCode === "GB" || countryCode === "UK") ratePerMinute = PLATFORM_COSTS.telnyxPerMinuteUK;
  else if (countryCode === "US" || countryCode === "CA") ratePerMinute = PLATFORM_COSTS.telnyxPerMinuteUS;
  else if (["DE", "FR", "ES", "IT", "NL", "SE", "CH", "PL", "IE"].includes(countryCode || "")) ratePerMinute = PLATFORM_COSTS.telnyxPerMinuteEU;
  return minutes * ratePerMinute;
}

export function calculateStripeFee(amount: number): number {
  return amount * PLATFORM_COSTS.stripePercentFee + PLATFORM_COSTS.stripeFixedFee;
}

export async function logCostEvent(event: {
  orgId: number;
  callLogId?: number;
  category: string;
  provider: string;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  unitQuantity: number;
  unitType: string;
  unitCost: number;
  totalCost: number;
  revenueCharged?: number;
  currency?: string;
  metadata?: Record<string, unknown>;
}) {
  const margin = (event.revenueCharged || 0) - event.totalCost;
  await db.insert(costEvents).values({
    orgId: event.orgId,
    callLogId: event.callLogId || null,
    category: event.category,
    provider: event.provider,
    model: event.model || null,
    inputTokens: event.inputTokens || 0,
    outputTokens: event.outputTokens || 0,
    unitQuantity: String(event.unitQuantity),
    unitType: event.unitType,
    unitCost: String(event.unitCost),
    totalCost: String(event.totalCost),
    revenueCharged: String(event.revenueCharged || 0),
    margin: String(margin),
    currency: event.currency || "GBP",
    metadata: event.metadata || null,
  });
}

export async function getUnitEconomicsSummary(dateFrom?: Date, dateTo?: Date) {
  const conditions = [];
  if (dateFrom) conditions.push(gte(costEvents.createdAt, dateFrom));
  if (dateTo) conditions.push(lte(costEvents.createdAt, dateTo));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const costsByCategory = await db
    .select({
      category: costEvents.category,
      totalCost: sql<string>`COALESCE(SUM(CAST(${costEvents.totalCost} AS DECIMAL(12,6))), 0)`,
      totalRevenue: sql<string>`COALESCE(SUM(CAST(${costEvents.revenueCharged} AS DECIMAL(12,2))), 0)`,
      totalMargin: sql<string>`COALESCE(SUM(CAST(${costEvents.margin} AS DECIMAL(12,6))), 0)`,
      eventCount: count(),
      totalInputTokens: sql<string>`COALESCE(SUM(${costEvents.inputTokens}), 0)`,
      totalOutputTokens: sql<string>`COALESCE(SUM(${costEvents.outputTokens}), 0)`,
    })
    .from(costEvents)
    .where(whereClause)
    .groupBy(costEvents.category);

  const costsByProvider = await db
    .select({
      provider: costEvents.provider,
      model: costEvents.model,
      totalCost: sql<string>`COALESCE(SUM(CAST(${costEvents.totalCost} AS DECIMAL(12,6))), 0)`,
      eventCount: count(),
      totalInputTokens: sql<string>`COALESCE(SUM(${costEvents.inputTokens}), 0)`,
      totalOutputTokens: sql<string>`COALESCE(SUM(${costEvents.outputTokens}), 0)`,
    })
    .from(costEvents)
    .where(whereClause)
    .groupBy(costEvents.provider, costEvents.model);

  const totals = await db
    .select({
      totalCost: sql<string>`COALESCE(SUM(CAST(${costEvents.totalCost} AS DECIMAL(12,6))), 0)`,
      totalRevenue: sql<string>`COALESCE(SUM(CAST(${costEvents.revenueCharged} AS DECIMAL(12,2))), 0)`,
      totalMargin: sql<string>`COALESCE(SUM(CAST(${costEvents.margin} AS DECIMAL(12,6))), 0)`,
      eventCount: count(),
    })
    .from(costEvents)
    .where(whereClause);

  const totalCostNum = parseFloat(totals[0]?.totalCost || "0");
  const totalRevenueNum = parseFloat(totals[0]?.totalRevenue || "0");
  const marginPercent = totalRevenueNum > 0 ? ((totalRevenueNum - totalCostNum) / totalRevenueNum) * 100 : 0;

  return {
    totals: {
      ...totals[0],
      marginPercent: marginPercent.toFixed(1),
    },
    byCategory: costsByCategory,
    byProvider: costsByProvider,
  };
}

export async function getCostTrends(days: number = 30, dateFrom?: Date, dateTo?: Date) {
  const from = dateFrom || new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const to = dateTo || new Date();

  const trends = await db
    .select({
      date: sql<string>`DATE(${costEvents.createdAt})`,
      category: costEvents.category,
      totalCost: sql<string>`COALESCE(SUM(CAST(${costEvents.totalCost} AS DECIMAL(12,6))), 0)`,
      totalRevenue: sql<string>`COALESCE(SUM(CAST(${costEvents.revenueCharged} AS DECIMAL(12,2))), 0)`,
      eventCount: count(),
    })
    .from(costEvents)
    .where(and(gte(costEvents.createdAt, from), lte(costEvents.createdAt, to)))
    .groupBy(sql`DATE(${costEvents.createdAt})`, costEvents.category)
    .orderBy(sql`DATE(${costEvents.createdAt})`);

  return trends;
}

export async function getPerCallEconomics(limit: number = 50) {
  const calls = await db
    .select({
      callId: costEvents.callLogId,
      category: costEvents.category,
      provider: costEvents.provider,
      model: costEvents.model,
      totalCost: sql<string>`CAST(${costEvents.totalCost} AS DECIMAL(12,6))`,
      revenueCharged: sql<string>`CAST(${costEvents.revenueCharged} AS DECIMAL(12,2))`,
      margin: sql<string>`CAST(${costEvents.margin} AS DECIMAL(12,6))`,
      createdAt: costEvents.createdAt,
    })
    .from(costEvents)
    .where(sql`${costEvents.callLogId} IS NOT NULL`)
    .orderBy(desc(costEvents.createdAt))
    .limit(limit);

  return calls;
}

export async function getRevenueFromBilling(dateFrom?: Date, dateTo?: Date) {
  const conditions = [];
  if (dateFrom) conditions.push(gte(walletTransactions.createdAt, dateFrom));
  if (dateTo) conditions.push(lte(walletTransactions.createdAt, dateTo));
  conditions.push(eq(walletTransactions.type, "deduction"));

  const revenue = await db
    .select({
      referenceType: walletTransactions.referenceType,
      totalRevenue: sql<string>`COALESCE(SUM(ABS(CAST(${walletTransactions.amount} AS DECIMAL(12,2)))), 0)`,
      txCount: count(),
    })
    .from(walletTransactions)
    .where(and(...conditions))
    .groupBy(walletTransactions.referenceType);

  return revenue;
}

export async function getDistributionSummary(dateFrom?: Date, dateTo?: Date) {
  const conditions = [];
  if (dateFrom) conditions.push(gte(distributionLedger.createdAt, dateFrom));
  if (dateTo) conditions.push(lte(distributionLedger.createdAt, dateTo));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const dist = await db
    .select({
      totalAmount: sql<string>`COALESCE(SUM(CAST(${distributionLedger.totalAmount} AS DECIMAL(12,2))), 0)`,
      platformAmount: sql<string>`COALESCE(SUM(CAST(${distributionLedger.platformAmount} AS DECIMAL(12,2))), 0)`,
      partnerAmount: sql<string>`COALESCE(SUM(CAST(${distributionLedger.partnerAmount} AS DECIMAL(12,2))), 0)`,
      resellerAmount: sql<string>`COALESCE(SUM(CAST(${distributionLedger.resellerAmount} AS DECIMAL(12,2))), 0)`,
      affiliateAmount: sql<string>`COALESCE(SUM(CAST(${distributionLedger.affiliateAmount} AS DECIMAL(12,2))), 0)`,
      eventCount: count(),
    })
    .from(distributionLedger)
    .where(whereClause);

  return dist[0];
}

export function simulatePricing(params: {
  callsPerMonth: number;
  avgCallDurationMinutes: number;
  avgLLMTokensPerCall: number;
  ratePerMinuteCharged: number;
  llmModel: string;
  countryCode: string;
  partnerCommissionPercent: number;
  affiliateCommissionPercent: number;
  topUpAmountAvg: number;
}) {
  const {
    callsPerMonth,
    avgCallDurationMinutes,
    avgLLMTokensPerCall,
    ratePerMinuteCharged,
    llmModel,
    countryCode,
    partnerCommissionPercent,
    affiliateCommissionPercent,
    topUpAmountAvg,
  } = params;

  const totalMinutes = callsPerMonth * avgCallDurationMinutes;
  const totalRevenueFromCalls = totalMinutes * ratePerMinuteCharged;

  const avgInputTokens = Math.round(avgLLMTokensPerCall * 0.7);
  const avgOutputTokens = Math.round(avgLLMTokensPerCall * 0.3);
  const llmCostPerCall = calculateLLMCost(llmModel, avgInputTokens, avgOutputTokens).costGBP;
  const totalLLMCost = llmCostPerCall * callsPerMonth;

  const telephonyCostPerCall = calculateTelephonyCost(avgCallDurationMinutes * 60, countryCode);
  const totalTelephonyCost = telephonyCostPerCall * callsPerMonth;

  const monthlyTopUps = Math.ceil(totalRevenueFromCalls / (topUpAmountAvg || 50));
  const totalStripeFees = monthlyTopUps * calculateStripeFee(topUpAmountAvg || 50);

  const totalInfrastructureCost = PLATFORM_COSTS.serverMonthly + PLATFORM_COSTS.databaseMonthly;

  const totalCOGS = totalLLMCost + totalTelephonyCost + totalStripeFees;

  const partnerCommission = totalRevenueFromCalls * (partnerCommissionPercent / 100);
  const affiliateCommission = totalRevenueFromCalls * (affiliateCommissionPercent / 100);
  const totalCommissions = partnerCommission + affiliateCommission;

  const grossProfit = totalRevenueFromCalls - totalCOGS;
  const netProfit = grossProfit - totalCommissions - totalInfrastructureCost;
  const grossMarginPercent = totalRevenueFromCalls > 0 ? (grossProfit / totalRevenueFromCalls) * 100 : 0;
  const netMarginPercent = totalRevenueFromCalls > 0 ? (netProfit / totalRevenueFromCalls) * 100 : 0;

  const costPerCall = callsPerMonth > 0 ? totalCOGS / callsPerMonth : 0;
  const revenuePerCall = callsPerMonth > 0 ? totalRevenueFromCalls / callsPerMonth : 0;
  const profitPerCall = revenuePerCall - costPerCall;

  const breakEvenCalls = costPerCall > 0 ? Math.ceil(totalInfrastructureCost / profitPerCall) : 0;

  return {
    revenue: {
      totalRevenueFromCalls: round(totalRevenueFromCalls),
      revenuePerCall: round(revenuePerCall),
      revenuePerMinute: round(ratePerMinuteCharged),
      totalMinutes,
    },
    costs: {
      llm: {
        totalCost: round(totalLLMCost),
        costPerCall: round(llmCostPerCall),
        model: llmModel,
        avgInputTokens,
        avgOutputTokens,
      },
      telephony: {
        totalCost: round(totalTelephonyCost),
        costPerCall: round(telephonyCostPerCall),
        ratePerMinute: calculateTelephonyCost(60, countryCode) / 1,
        country: countryCode,
      },
      stripe: {
        totalFees: round(totalStripeFees),
        monthlyTopUps,
      },
      infrastructure: {
        server: PLATFORM_COSTS.serverMonthly,
        database: PLATFORM_COSTS.databaseMonthly,
        total: totalInfrastructureCost,
      },
      totalCOGS: round(totalCOGS),
      costPerCall: round(costPerCall),
    },
    commissions: {
      partner: round(partnerCommission),
      affiliate: round(affiliateCommission),
      total: round(totalCommissions),
    },
    profitability: {
      grossProfit: round(grossProfit),
      grossMarginPercent: round(grossMarginPercent),
      netProfit: round(netProfit),
      netMarginPercent: round(netMarginPercent),
      profitPerCall: round(profitPerCall),
      breakEvenCalls,
    },
  };
}

function round(n: number, decimals = 2): number {
  return Math.round(n * Math.pow(10, decimals)) / Math.pow(10, decimals);
}
