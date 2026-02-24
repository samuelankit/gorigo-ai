export interface CustomerTier {
  name: string;
  key: string;
  ratePerMinute: number;
  description: string;
  customerPaysApiCosts: boolean;
}

export interface InternalCostStructure {
  openaiWhisperSttPerMin: number;
  gpt4oMiniLlmPerMin: number;
  ttsPerMin: number;
  telephonyPerMin: number;
  azureHostingAmortisedPerMin: number;
  totalPerMin: number;
}

export interface HumanCallCentreCosts {
  averageAgentSalaryAnnual: number;
  employerNIRate: number;
  employerPensionRate: number;
  workspaceCostMonthlyPerAgent: number;
  recruitmentCostPerAgent: number;
  trainingCostPerAgent: number;
  agentTurnoverRateAnnual: number;
  absenteeismRate: number;
  overtimePremiumRate: number;
  qualityMonitoringMonthlyPerAgent: number;
  crmSoftwareLicenceMonthlyPerAgent: number;
  managementRatio: number;
  managerSalaryAnnual: number;
}

export interface IndustryBenchmarks {
  costPerHumanCallMin: number;
  costPerHumanCallMax: number;
  averageHandleTimeMinutes: number;
  fcrHuman: number;
  fcrAI: number;
  csatHuman: number;
  csatAI: number;
  aiAutomationRateMin: number;
  aiAutomationRateMax: number;
  aiRampUpPeriodDaysMin: number;
  aiRampUpPeriodDaysMax: number;
  industryAverageAgentUtilisation: number;
}

export interface PresetScenario {
  name: string;
  key: string;
  callsPerMonth: number;
  avgCallDurationMinutes: number;
  agentCount: number;
}

export interface SavingsResult {
  monthlySavings: number;
  annualSavings: number;
  savingsPercent: number;
}

export interface SensitivityResult {
  bestCase: number;
  baseCase: number;
  worstCase: number;
}

export interface RevenueImpactResult {
  recoveredCallsPerMonth: number;
  additionalRevenuePerMonth: number;
  additionalRevenuePerYear: number;
}

export const CUSTOMER_TIERS = {
  individual: {
    name: "Individual",
    key: "individual",
    ratePerMinute: 0.20,
    description: "Everything you need to run your business with AI",
    customerPaysApiCosts: false,
  },
  team: {
    name: "Team",
    key: "team",
    ratePerMinute: 0.18,
    description: "Whole-company collaboration with shared agents, departments, and team dashboard",
    customerPaysApiCosts: false,
  },
  whiteLabel: {
    name: "White-Label / Reseller",
    key: "whiteLabel",
    ratePerMinute: 0.12,
    description: "Wholesale rate for partners to resell under their own brand",
    customerPaysApiCosts: false,
  },
} as const satisfies Record<string, CustomerTier>;

export const TEAM_MINIMUM_MONTHLY_SPEND = 50.00;

export type TierKey = keyof typeof CUSTOMER_TIERS;

export const AFFILIATE_COMMISSION_RATE = 0.20 as const;

export const INTERNAL_COSTS: InternalCostStructure = {
  openaiWhisperSttPerMin: 0.006,
  gpt4oMiniLlmPerMin: 0.003,
  ttsPerMin: 0.015,
  telephonyPerMin: 0.014,
  azureHostingAmortisedPerMin: 0.002,
  totalPerMin: 0.04,
} as const;

export const HUMAN_CALL_CENTRE_COSTS: HumanCallCentreCosts = {
  averageAgentSalaryAnnual: 26_000,
  employerNIRate: 0.138,
  employerPensionRate: 0.03,
  workspaceCostMonthlyPerAgent: 350,
  recruitmentCostPerAgent: 3_000,
  trainingCostPerAgent: 1_500,
  agentTurnoverRateAnnual: 0.375,
  absenteeismRate: 0.10,
  overtimePremiumRate: 0.15,
  qualityMonitoringMonthlyPerAgent: 200,
  crmSoftwareLicenceMonthlyPerAgent: 80,
  managementRatio: 12,
  managerSalaryAnnual: 38_000,
} as const;

export const INDUSTRY_BENCHMARKS: IndustryBenchmarks = {
  costPerHumanCallMin: 3.50,
  costPerHumanCallMax: 5.50,
  averageHandleTimeMinutes: 6,
  fcrHuman: 0.55,
  fcrAI: 0.80,
  csatHuman: 0.78,
  csatAI: 0.88,
  aiAutomationRateMin: 0.60,
  aiAutomationRateMax: 0.80,
  aiRampUpPeriodDaysMin: 60,
  aiRampUpPeriodDaysMax: 90,
  industryAverageAgentUtilisation: 0.65,
} as const;

export const PRESET_SCENARIOS = {
  smallBusiness: {
    name: "Small Business",
    key: "smallBusiness",
    callsPerMonth: 500,
    avgCallDurationMinutes: 3,
    agentCount: 2,
  },
  midMarket: {
    name: "Mid-Market",
    key: "midMarket",
    callsPerMonth: 5_000,
    avgCallDurationMinutes: 4,
    agentCount: 8,
  },
  enterprise: {
    name: "Enterprise",
    key: "enterprise",
    callsPerMonth: 50_000,
    avgCallDurationMinutes: 5,
    agentCount: 50,
  },
  contactCentre: {
    name: "Contact Centre",
    key: "contactCentre",
    callsPerMonth: 100_000,
    avgCallDurationMinutes: 6,
    agentCount: 100,
  },
} as const satisfies Record<string, PresetScenario>;

export type ScenarioKey = keyof typeof PRESET_SCENARIOS;

export function calculateFullHumanCost(agentCount: number, salary?: number): number {
  const c = HUMAN_CALL_CENTRE_COSTS;
  const baseSalary = salary ?? c.averageAgentSalaryAnnual;
  const monthlySalary = baseSalary / 12;

  const niMonthly = (baseSalary * c.employerNIRate) / 12;
  const pensionMonthly = (baseSalary * c.employerPensionRate) / 12;
  const overtimeMonthly = (baseSalary * c.overtimePremiumRate) / 12;

  const turnoverReplacementMonthly =
    ((c.recruitmentCostPerAgent + c.trainingCostPerAgent) * c.agentTurnoverRateAnnual) / 12;

  const absenteeismCostMonthly = monthlySalary * c.absenteeismRate;

  const managersNeeded = agentCount / c.managementRatio;
  const managementCostMonthly = (managersNeeded * c.managerSalaryAnnual) / 12;

  const perAgentMonthly =
    monthlySalary +
    niMonthly +
    pensionMonthly +
    overtimeMonthly +
    c.workspaceCostMonthlyPerAgent +
    turnoverReplacementMonthly +
    absenteeismCostMonthly +
    c.qualityMonitoringMonthlyPerAgent +
    c.crmSoftwareLicenceMonthlyPerAgent;

  return perAgentMonthly * agentCount + managementCostMonthly;
}

export function calculateAICost(minutes: number, tier: TierKey): number {
  return minutes * CUSTOMER_TIERS[tier].ratePerMinute;
}

export function calculatePartnerMargin(
  wholesaleRate: number,
  retailRate: number,
  minutes: number,
): number {
  return (retailRate - wholesaleRate) * minutes;
}

export function calculateAffiliateEarnings(clientSpend: number): number {
  return clientSpend * AFFILIATE_COMMISSION_RATE;
}

export function calculateSavings(humanCost: number, aiCost: number): SavingsResult {
  const monthlySavings = humanCost - aiCost;
  return {
    monthlySavings,
    annualSavings: monthlySavings * 12,
    savingsPercent: humanCost > 0 ? (monthlySavings / humanCost) * 100 : 0,
  };
}

export function calculatePayback(monthlySavings: number, setupCost: number = 2_500): number {
  if (monthlySavings <= 0) return Infinity;
  return Math.ceil(setupCost / monthlySavings);
}

export function calculateMultiYear(monthlySavings: number, years: number): number {
  return monthlySavings * 12 * years;
}

export function calculateSensitivity(
  baseSavings: number,
  automationVariance: number,
  volumeGrowth: number,
): SensitivityResult {
  return {
    bestCase: baseSavings * (1 + automationVariance) * (1 + volumeGrowth),
    baseCase: baseSavings,
    worstCase: baseSavings * (1 - automationVariance) * (1 - volumeGrowth),
  };
}

export function calculateRevenueImpact(
  callVolume: number,
  missedCallRate: number,
  averageCallValue: number = 25,
): RevenueImpactResult {
  const recoveredCallsPerMonth = Math.round(callVolume * missedCallRate);
  const additionalRevenuePerMonth = recoveredCallsPerMonth * averageCallValue;
  return {
    recoveredCallsPerMonth,
    additionalRevenuePerMonth,
    additionalRevenuePerYear: additionalRevenuePerMonth * 12,
  };
}

function addThousandsSeparator(numStr: string): string {
  const parts = numStr.split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
}

export function formatGBP(value: number, decimals?: number): string {
  const d = decimals ?? 0;
  const abs = Math.abs(value);
  const fixed = abs.toFixed(d);
  const formatted = addThousandsSeparator(fixed);
  const sign = value < 0 ? "-" : "";
  return `${sign}£${formatted}`;
}

export function formatPercent(value: number): string {
  const pct = value * 100;
  const formatted = pct % 1 === 0 ? pct.toFixed(0) : pct.toFixed(1);
  return `${formatted}%`;
}

export function formatNumber(value: number): string {
  return addThousandsSeparator(Math.round(value).toString());
}
