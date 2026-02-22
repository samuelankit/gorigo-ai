import { db } from "@/lib/db";
import { costEvents, walletTransactions, distributionLedger } from "@/shared/schema";
import { eq, sql, and, gte, lte, count, desc } from "drizzle-orm";
import { PLATFORM_COSTS } from "@/lib/unit-economics";
import { CUSTOMER_TIERS, INTERNAL_COSTS, AFFILIATE_COMMISSION_RATE } from "@/lib/pricing-config";

export const FIXED_MONTHLY_COSTS = {
  azure: {
    containerApps: { name: "Azure Container Apps (UK South)", monthlyCost: 45.00, category: "infrastructure", provider: "Microsoft Azure" },
    postgresFlexible: { name: "Azure PostgreSQL Flexible Server", monthlyCost: 55.00, category: "infrastructure", provider: "Microsoft Azure" },
    containerRegistry: { name: "Azure Container Registry (Basic)", monthlyCost: 4.00, category: "infrastructure", provider: "Microsoft Azure" },
    managedCertificate: { name: "Azure Managed SSL Certificate", monthlyCost: 0, category: "infrastructure", provider: "Microsoft Azure" },
    keyVault: { name: "Azure Key Vault", monthlyCost: 0.50, category: "infrastructure", provider: "Microsoft Azure" },
    monitoring: { name: "Azure Monitor / Alerts", monthlyCost: 5.00, category: "infrastructure", provider: "Microsoft Azure" },
  },
  thirdParty: {
    domain: { name: "gorigo.ai Domain (Namecheap)", monthlyCost: 2.50, category: "operations", provider: "Namecheap" },
    githubActions: { name: "GitHub Actions CI/CD", monthlyCost: 0, category: "operations", provider: "GitHub" },
    replitDev: { name: "Replit Development Environment", monthlyCost: 25.00, category: "operations", provider: "Replit" },
    phoneNumbers: { name: "Phone Numbers (Telnyx/Vonage) (est. 5)", monthlyCost: 5.75, category: "telephony", provider: "Telnyx/Vonage" },
  },
} as const;

export function getFixedCostsSummary() {
  const azureCosts = Object.values(FIXED_MONTHLY_COSTS.azure);
  const thirdPartyCosts = Object.values(FIXED_MONTHLY_COSTS.thirdParty);
  const allCosts = [...azureCosts, ...thirdPartyCosts];

  const totalMonthly = allCosts.reduce((sum, c) => sum + c.monthlyCost, 0);
  const azureMonthly = azureCosts.reduce((sum, c) => sum + c.monthlyCost, 0);
  const thirdPartyMonthly = thirdPartyCosts.reduce((sum, c) => sum + c.monthlyCost, 0);

  const byCategory = allCosts.reduce((acc, c) => {
    acc[c.category] = (acc[c.category] || 0) + c.monthlyCost;
    return acc;
  }, {} as Record<string, number>);

  const byProvider = allCosts.reduce((acc, c) => {
    acc[c.provider] = (acc[c.provider] || 0) + c.monthlyCost;
    return acc;
  }, {} as Record<string, number>);

  return {
    items: allCosts,
    totalMonthly: round(totalMonthly),
    totalAnnual: round(totalMonthly * 12),
    azureMonthly: round(azureMonthly),
    thirdPartyMonthly: round(thirdPartyMonthly),
    byCategory,
    byProvider,
    amortisedPerMinute: (minutesPerMonth: number) =>
      minutesPerMonth > 0 ? round(totalMonthly / minutesPerMonth, 4) : 0,
    amortisedAt5000: round(totalMonthly / 5000, 4),
    amortisedAt10000: round(totalMonthly / 10000, 4),
    amortisedAt50000: round(totalMonthly / 50000, 4),
  };
}

export const UK_TAX = {
  corporationTaxRate: 0.25,
  smallProfitsRate: 0.19,
  smallProfitsThreshold: 50_000,
  marginalReliefLower: 50_000,
  marginalReliefUpper: 250_000,
  marginalReliefFraction: 3 / 200,
  vatRegistrationThreshold: 85_000,
  vatStandardRate: 0.20,
  vatCurrentlyRegistered: false,
  nationalInsuranceEmployerRate: 0.138,
  nationalInsuranceThreshold: 9_100,
  pensionAutoEnrolRate: 0.03,
  financialYearEnd: "31 March",
  stripeUkEuCardRate: 0.015,
  stripeUkEuFixedFee: 0.20,
  stripeNonEuCardRate: 0.029,
  stripeNonEuFixedFee: 0.20,
  hmrcExpenseCategories: [
    "Cost of Sales (COGS)",
    "Staff Costs",
    "Premises Costs",
    "Administrative Expenses",
    "Marketing & Advertising",
    "Professional Services",
    "Depreciation & Amortisation",
    "Finance Costs",
    "Research & Development",
  ],
} as const;

export function calculateCorporationTax(annualProfit: number): {
  taxableProfit: number;
  taxRate: number;
  taxDue: number;
  effectiveRate: number;
  bracket: string;
  vatNote: string;
} {
  if (annualProfit <= 0) {
    return {
      taxableProfit: 0,
      taxRate: 0,
      taxDue: 0,
      effectiveRate: 0,
      bracket: "Loss (carry forward available)",
      vatNote: `Not VAT registered. Required when taxable turnover exceeds £${UK_TAX.vatRegistrationThreshold.toLocaleString()} in any 12-month period.`,
    };
  }

  let taxDue: number;
  let bracket: string;
  let taxRate: number;

  if (annualProfit <= UK_TAX.smallProfitsThreshold) {
    taxRate = UK_TAX.smallProfitsRate;
    taxDue = annualProfit * taxRate;
    bracket = "Small Profits Rate (19%)";
  } else if (annualProfit >= UK_TAX.marginalReliefUpper) {
    taxRate = UK_TAX.corporationTaxRate;
    taxDue = annualProfit * taxRate;
    bracket = "Main Rate (25%)";
  } else {
    taxDue = annualProfit * UK_TAX.corporationTaxRate;
    const marginalRelief = (UK_TAX.marginalReliefUpper - annualProfit) * UK_TAX.marginalReliefFraction;
    taxDue -= marginalRelief;
    taxRate = taxDue / annualProfit;
    bracket = "Marginal Relief Band (19-25%)";
  }

  return {
    taxableProfit: round(annualProfit),
    taxRate: round(taxRate * 100, 1),
    taxDue: round(taxDue),
    effectiveRate: round((taxDue / annualProfit) * 100, 1),
    bracket,
    vatNote: `Not VAT registered. Required when taxable turnover exceeds £${UK_TAX.vatRegistrationThreshold.toLocaleString()} in any 12-month period.`,
  };
}

export function categoriseExpensesForTax(data: {
  llmCosts: number;
  telephonyCosts: number;
  stripeFees: number;
  infrastructureCosts: number;
  domainCosts: number;
  commissions: number;
}) {
  return [
    {
      hmrcCategory: "Cost of Sales (COGS)",
      description: "Direct costs of delivering the service",
      items: [
        { name: "AI/LLM API Costs (OpenAI, Anthropic)", amount: round(data.llmCosts), taxDeductible: true },
        { name: "Telephony Costs (Telnyx/Vonage)", amount: round(data.telephonyCosts), taxDeductible: true },
        { name: "Payment Processing Fees (Stripe)", amount: round(data.stripeFees), taxDeductible: true },
      ],
      subtotal: round(data.llmCosts + data.telephonyCosts + data.stripeFees),
    },
    {
      hmrcCategory: "Administrative Expenses",
      description: "Cloud infrastructure and operational tools",
      items: [
        { name: "Azure Cloud Infrastructure", amount: round(data.infrastructureCosts), taxDeductible: true },
        { name: "Domain & DNS (Namecheap)", amount: round(data.domainCosts), taxDeductible: true },
        { name: "Development Tools (Replit, GitHub)", amount: round(25 * 12), taxDeductible: true },
      ],
      subtotal: round(data.infrastructureCosts + data.domainCosts + 25 * 12),
    },
    {
      hmrcCategory: "Marketing & Advertising",
      description: "Partner and affiliate commissions",
      items: [
        { name: "Partner & Affiliate Commissions", amount: round(data.commissions), taxDeductible: true },
      ],
      subtotal: round(data.commissions),
    },
  ];
}

export interface PricingRecommendation {
  customerType: string;
  key: string;
  currentRatePerMin: number;
  recommendedRatePerMin: number;
  costPerMin: number;
  grossMarginPercent: number;
  netMarginPercent: number;
  rationale: string;
  marketBenchmark: string;
  minimumViableRate: number;
  suggestedWalletDeposit: number;
}

export function generatePricingRecommendations(params: {
  actualCostPerMinute: number;
  fixedCostsMonthly: number;
  estimatedMonthlyMinutes: number;
  partnerCommissionRate: number;
  affiliateCommissionRate: number;
}): PricingRecommendation[] {
  const { actualCostPerMinute, fixedCostsMonthly, estimatedMonthlyMinutes, partnerCommissionRate, affiliateCommissionRate } = params;

  const safeMinutes = Math.max(estimatedMonthlyMinutes, 1);
  const fixedCostPerMin = fixedCostsMonthly / safeMinutes;
  const fullyLoadedCost = actualCostPerMinute + fixedCostPerMin;

  const byokVariableCost = INTERNAL_COSTS.telephonyPerMin + INTERNAL_COSTS.azureHostingAmortisedPerMin;
  const byokFullyLoadedCost = byokVariableCost + fixedCostPerMin;

  const targetGrossMargin = { direct: 0.75, whiteLabel: 0.60, byok: 0.50, affiliate: 0.70 };

  function calcRecommendedRate(margin: number, commissionRate: number, costBase: number): number {
    const denominator = 1 - margin - commissionRate;
    if (denominator <= 0.05) return round(costBase * 10, 2);
    const rate = costBase / denominator;
    return Math.ceil(rate * 100) / 100;
  }

  function safeMargin(rate: number, cost: number): number {
    return rate > 0 ? round(((rate - cost) / rate) * 100, 1) : 0;
  }

  return [
    {
      customerType: "Direct / D2C (Managed)",
      key: "direct",
      currentRatePerMin: CUSTOMER_TIERS.direct.ratePerMinute,
      recommendedRatePerMin: calcRecommendedRate(targetGrossMargin.direct, 0, fullyLoadedCost),
      costPerMin: round(fullyLoadedCost, 4),
      grossMarginPercent: safeMargin(CUSTOMER_TIERS.direct.ratePerMinute, fullyLoadedCost),
      netMarginPercent: safeMargin(CUSTOMER_TIERS.direct.ratePerMinute, fullyLoadedCost),
      rationale: "Premium rate for fully managed service. Highest margin tier. Customer gets dedicated support, setup assistance, and all API costs included. Target 75% gross margin.",
      marketBenchmark: "UK AI call centre market: £0.15-£0.35/min. Traditional call centres: £3.50-£5.50/min.",
      minimumViableRate: round(fullyLoadedCost * 2, 2),
      suggestedWalletDeposit: 49,
    },
    {
      customerType: "White-Label / Reseller Partner",
      key: "whiteLabel",
      currentRatePerMin: CUSTOMER_TIERS.whiteLabel.ratePerMinute,
      recommendedRatePerMin: calcRecommendedRate(targetGrossMargin.whiteLabel, partnerCommissionRate, fullyLoadedCost),
      costPerMin: round(fullyLoadedCost, 4),
      grossMarginPercent: safeMargin(CUSTOMER_TIERS.whiteLabel.ratePerMinute, fullyLoadedCost),
      netMarginPercent: safeMargin(CUSTOMER_TIERS.whiteLabel.ratePerMinute, fullyLoadedCost + CUSTOMER_TIERS.whiteLabel.ratePerMinute * partnerCommissionRate),
      rationale: "Wholesale rate for partners. Partners add their own margin (typically 30-50%) when reselling. Your margin is lower but volume is higher. Factor in partner commission share.",
      marketBenchmark: "Wholesale AI voice: £0.08-£0.15/min. Partners typically resell at £0.18-£0.30/min.",
      minimumViableRate: round(fullyLoadedCost / Math.max(1 - partnerCommissionRate, 0.1) * 1.3, 2),
      suggestedWalletDeposit: 149,
    },
    {
      customerType: "BYOK (Bring Your Own Key)",
      key: "byok",
      currentRatePerMin: CUSTOMER_TIERS.byok.ratePerMinute,
      recommendedRatePerMin: calcRecommendedRate(targetGrossMargin.byok, 0, byokFullyLoadedCost),
      costPerMin: round(byokFullyLoadedCost, 4),
      grossMarginPercent: safeMargin(CUSTOMER_TIERS.byok.ratePerMinute, byokFullyLoadedCost),
      netMarginPercent: safeMargin(CUSTOMER_TIERS.byok.ratePerMinute, byokFullyLoadedCost),
      rationale: "Platform fee only. Customer pays their own LLM/STT/TTS costs directly. Your costs are telephony (Telnyx/Vonage) + infrastructure share only. Lower rate but zero AI cost risk.",
      marketBenchmark: "BYOK platforms: £0.05-£0.10/min platform fee. Customer bears API costs separately.",
      minimumViableRate: round(byokFullyLoadedCost * 1.5, 2),
      suggestedWalletDeposit: 49,
    },
    {
      customerType: "Affiliate-Referred D2C",
      key: "affiliate",
      currentRatePerMin: CUSTOMER_TIERS.direct.ratePerMinute,
      recommendedRatePerMin: calcRecommendedRate(targetGrossMargin.affiliate, affiliateCommissionRate, fullyLoadedCost),
      costPerMin: round(fullyLoadedCost, 4),
      grossMarginPercent: safeMargin(CUSTOMER_TIERS.direct.ratePerMinute, fullyLoadedCost),
      netMarginPercent: safeMargin(CUSTOMER_TIERS.direct.ratePerMinute, fullyLoadedCost + CUSTOMER_TIERS.direct.ratePerMinute * affiliateCommissionRate),
      rationale: `Same D2C rate but ${round(affiliateCommissionRate * 100)}% goes to referring affiliate. Net margin is lower. Affiliate brings the customer so acquisition cost is zero.`,
      marketBenchmark: "Affiliate commissions: 10-25% of customer spend. Industry standard is 20%.",
      minimumViableRate: round(fullyLoadedCost / Math.max(1 - affiliateCommissionRate, 0.1) * 1.4, 2),
      suggestedWalletDeposit: 49,
    },
  ];
}

export function generateBreakEvenAnalysis(params: {
  fixedCostsMonthly: number;
  variableCostPerMinute: number;
  ratePerMinute: number;
  partnerCommissionRate: number;
}) {
  const { fixedCostsMonthly, variableCostPerMinute, ratePerMinute, partnerCommissionRate } = params;

  const contributionPerMinute = ratePerMinute - variableCostPerMinute - (ratePerMinute * partnerCommissionRate);
  const isViable = contributionPerMinute > 0 && isFinite(fixedCostsMonthly / contributionPerMinute);

  const safeBreakEven = (divisor: number): number => {
    if (divisor <= 0 || !isFinite(fixedCostsMonthly / divisor)) return -1;
    return Math.ceil(fixedCostsMonthly / divisor);
  };

  const breakEvenMinutes = safeBreakEven(contributionPerMinute);
  const breakEvenCalls = breakEvenMinutes > 0 ? Math.ceil(breakEvenMinutes / 4) : -1;
  const breakEvenRevenue = breakEvenMinutes > 0 ? breakEvenMinutes * ratePerMinute : 0;

  const scenarios = [
    { label: "Conservative (3 min avg call)", avgCallMinutes: 3, breakEvenCalls: safeBreakEven(contributionPerMinute * 3) },
    { label: "Average (5 min avg call)", avgCallMinutes: 5, breakEvenCalls: safeBreakEven(contributionPerMinute * 5) },
    { label: "Optimistic (8 min avg call)", avgCallMinutes: 8, breakEvenCalls: safeBreakEven(contributionPerMinute * 8) },
  ];

  const monthlyTargets = isViable && breakEvenMinutes > 0 ? [
    { tier: "Survival", minutes: breakEvenMinutes, revenue: round(breakEvenMinutes * ratePerMinute), profit: 0 },
    { tier: "Comfortable", minutes: Math.ceil(breakEvenMinutes * 1.5), revenue: round(breakEvenMinutes * 1.5 * ratePerMinute), profit: round(breakEvenMinutes * 0.5 * contributionPerMinute) },
    { tier: "Growth", minutes: Math.ceil(breakEvenMinutes * 3), revenue: round(breakEvenMinutes * 3 * ratePerMinute), profit: round(breakEvenMinutes * 2 * contributionPerMinute) },
    { tier: "Scale", minutes: Math.ceil(breakEvenMinutes * 10), revenue: round(breakEvenMinutes * 10 * ratePerMinute), profit: round(breakEvenMinutes * 9 * contributionPerMinute) },
  ] : [];

  return {
    fixedCostsMonthly: round(fixedCostsMonthly),
    variableCostPerMinute: round(variableCostPerMinute, 4),
    ratePerMinute: round(ratePerMinute, 2),
    contributionPerMinute: round(contributionPerMinute, 4),
    breakEvenMinutes,
    breakEvenCalls,
    breakEvenRevenue: round(breakEvenRevenue),
    isViable,
    notViableReason: !isViable ? "Rate does not cover variable costs plus commissions. Increase rate or reduce costs." : null,
    scenarios,
    monthlyTargets,
  };
}

export async function generateProfitAndLoss(dateFrom?: Date, dateTo?: Date) {
  const conditions = [];
  if (dateFrom) conditions.push(gte(costEvents.createdAt, dateFrom));
  if (dateTo) conditions.push(lte(costEvents.createdAt, dateTo));
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const costData = await db
    .select({
      category: costEvents.category,
      provider: costEvents.provider,
      totalCost: sql<string>`COALESCE(SUM(CAST(${costEvents.totalCost} AS DECIMAL(12,6))), 0)`,
      totalRevenue: sql<string>`COALESCE(SUM(CAST(${costEvents.revenueCharged} AS DECIMAL(12,2))), 0)`,
      eventCount: count(),
    })
    .from(costEvents)
    .where(whereClause)
    .groupBy(costEvents.category, costEvents.provider);

  const walletConditions = [eq(walletTransactions.type, "deduction")];
  if (dateFrom) walletConditions.push(gte(walletTransactions.createdAt, dateFrom));
  if (dateTo) walletConditions.push(lte(walletTransactions.createdAt, dateTo));

  const walletRevenue = await db
    .select({
      totalRevenue: sql<string>`COALESCE(SUM(ABS(CAST(${walletTransactions.amount} AS DECIMAL(12,2)))), 0)`,
      txCount: count(),
    })
    .from(walletTransactions)
    .where(and(...walletConditions));

  const topUpConditions = [eq(walletTransactions.type, "topup")];
  if (dateFrom) topUpConditions.push(gte(walletTransactions.createdAt, dateFrom));
  if (dateTo) topUpConditions.push(lte(walletTransactions.createdAt, dateTo));

  const walletTopUps = await db
    .select({
      totalTopUps: sql<string>`COALESCE(SUM(CAST(${walletTransactions.amount} AS DECIMAL(12,2))), 0)`,
      txCount: count(),
    })
    .from(walletTransactions)
    .where(and(...topUpConditions));

  const distConditions = [];
  if (dateFrom) distConditions.push(gte(distributionLedger.createdAt, dateFrom));
  if (dateTo) distConditions.push(lte(distributionLedger.createdAt, dateTo));

  const distributions = await db
    .select({
      platformAmount: sql<string>`COALESCE(SUM(CAST(${distributionLedger.platformAmount} AS DECIMAL(12,2))), 0)`,
      partnerAmount: sql<string>`COALESCE(SUM(CAST(${distributionLedger.partnerAmount} AS DECIMAL(12,2))), 0)`,
      resellerAmount: sql<string>`COALESCE(SUM(CAST(${distributionLedger.resellerAmount} AS DECIMAL(12,2))), 0)`,
      affiliateAmount: sql<string>`COALESCE(SUM(CAST(${distributionLedger.affiliateAmount} AS DECIMAL(12,2))), 0)`,
    })
    .from(distributionLedger)
    .where(distConditions.length > 0 ? and(...distConditions) : undefined);

  const totalRevenue = parseFloat(walletRevenue[0]?.totalRevenue || "0");
  const totalCashIn = parseFloat(walletTopUps[0]?.totalTopUps || "0");

  let llmCosts = 0;
  let telephonyCosts = 0;
  let otherCosts = 0;
  costData.forEach((row) => {
    const cost = parseFloat(row.totalCost);
    if (row.category === "llm" || row.category === "stt" || row.category === "tts" || row.category === "embedding") {
      llmCosts += cost;
    } else if (row.category === "telephony") {
      telephonyCosts += cost;
    } else {
      otherCosts += cost;
    }
  });

  const totalVariableCosts = llmCosts + telephonyCosts + otherCosts;

  const months = dateFrom && dateTo
    ? Math.max(1, Math.ceil((dateTo.getTime() - dateFrom.getTime()) / (30 * 24 * 60 * 60 * 1000)))
    : 1;
  const fixedCosts = getFixedCostsSummary();
  const totalFixedCosts = fixedCosts.totalMonthly * months;

  const stripeFees = totalCashIn * PLATFORM_COSTS.stripePercentFee + (parseFloat(walletTopUps[0]?.txCount?.toString() || "0") * PLATFORM_COSTS.stripeFixedFee);

  const commissions = parseFloat(distributions[0]?.partnerAmount || "0")
    + parseFloat(distributions[0]?.resellerAmount || "0")
    + parseFloat(distributions[0]?.affiliateAmount || "0");

  const totalCOGS = totalVariableCosts + stripeFees;
  const grossProfit = totalRevenue - totalCOGS;
  const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

  const totalOpex = totalFixedCosts + commissions;
  const operatingProfit = grossProfit - totalOpex;
  const operatingMargin = totalRevenue > 0 ? (operatingProfit / totalRevenue) * 100 : 0;

  const annualisedProfit = operatingProfit * (12 / months);
  const tax = calculateCorporationTax(annualisedProfit > 0 ? annualisedProfit : 0);
  const provisionedTax = (tax.taxDue / 12) * months;

  const netProfit = operatingProfit - provisionedTax;
  const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  return {
    revenue: {
      talkTimeRevenue: round(totalRevenue),
      cashReceived: round(totalCashIn),
      topUpCount: parseInt(walletTopUps[0]?.txCount?.toString() || "0"),
    },
    cogs: {
      llmCosts: round(llmCosts),
      telephonyCosts: round(telephonyCosts),
      stripeFees: round(stripeFees),
      otherVariableCosts: round(otherCosts),
      totalCOGS: round(totalCOGS),
    },
    grossProfit: {
      amount: round(grossProfit),
      margin: round(grossMargin, 1),
    },
    operatingExpenses: {
      infrastructure: round(totalFixedCosts),
      commissions: round(commissions),
      partnerCommissions: round(parseFloat(distributions[0]?.partnerAmount || "0")),
      resellerCommissions: round(parseFloat(distributions[0]?.resellerAmount || "0")),
      affiliateCommissions: round(parseFloat(distributions[0]?.affiliateAmount || "0")),
      totalOpex: round(totalOpex),
    },
    operatingProfit: {
      amount: round(operatingProfit),
      margin: round(operatingMargin, 1),
    },
    tax: {
      ...tax,
      provisionedForPeriod: round(provisionedTax),
    },
    netProfit: {
      amount: round(netProfit),
      margin: round(netMargin, 1),
    },
    period: { months, dateFrom, dateTo },
    costBreakdown: costData,
  };
}

export async function getCOGSBreakdown(dateFrom?: Date, dateTo?: Date) {
  const conditions = [];
  if (dateFrom) conditions.push(gte(costEvents.createdAt, dateFrom));
  if (dateTo) conditions.push(lte(costEvents.createdAt, dateTo));
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const byProvider = await db
    .select({
      provider: costEvents.provider,
      model: costEvents.model,
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
    .groupBy(costEvents.provider, costEvents.model, costEvents.category)
    .orderBy(desc(sql`SUM(CAST(${costEvents.totalCost} AS DECIMAL(12,6)))`));

  const daily = await db
    .select({
      date: sql<string>`DATE(${costEvents.createdAt})`,
      category: costEvents.category,
      totalCost: sql<string>`COALESCE(SUM(CAST(${costEvents.totalCost} AS DECIMAL(12,6))), 0)`,
      totalRevenue: sql<string>`COALESCE(SUM(CAST(${costEvents.revenueCharged} AS DECIMAL(12,2))), 0)`,
    })
    .from(costEvents)
    .where(whereClause)
    .groupBy(sql`DATE(${costEvents.createdAt})`, costEvents.category)
    .orderBy(sql`DATE(${costEvents.createdAt})`);

  return { byProvider, daily };
}

function round(n: number, decimals = 2): number {
  return Math.round(n * Math.pow(10, decimals)) / Math.pow(10, decimals);
}
