import { roundMoney } from "@/lib/money";
import { resolveRate, getOrgDeploymentModel, type DeploymentModel, type UsageCategory } from "@/lib/rate-resolver";

export interface BillingCalculation {
  billableSeconds: number;
  cost: number;
}

export interface DeploymentAwareBilling extends BillingCalculation {
  deploymentModel: DeploymentModel;
  ratePerMinute: number;
  platformFeePerMinute: number;
  includesAiCost: boolean;
  includesTelephonyCost: boolean;
}

export function calculateCallCost(
  connectedAt: Date | null,
  endedAt: Date | null,
  ratePerMinute: number,
  minChargeSeconds: number = 30
): BillingCalculation {
  if (!connectedAt || !endedAt) {
    return { billableSeconds: 0, cost: 0 };
  }

  const rawSeconds = Math.floor((endedAt.getTime() - connectedAt.getTime()) / 1000);

  if (rawSeconds <= 0) {
    return { billableSeconds: 0, cost: 0 };
  }

  const billableSeconds = Math.max(rawSeconds, minChargeSeconds);

  const cost = roundMoney((billableSeconds / 60) * ratePerMinute);

  return { billableSeconds, cost };
}

export async function calculateDeploymentAwareCost(
  orgId: number,
  connectedAt: Date | null,
  endedAt: Date | null,
  category: UsageCategory = "voice_inbound",
  minChargeSeconds: number = 30
): Promise<DeploymentAwareBilling> {
  const rate = await resolveRate(orgId, category);

  const base = calculateCallCost(connectedAt, endedAt, rate.ratePerMinute, minChargeSeconds);

  return {
    ...base,
    deploymentModel: rate.deploymentModel,
    ratePerMinute: rate.ratePerMinute,
    platformFeePerMinute: rate.platformFeePerMinute,
    includesAiCost: rate.includesAiCost,
    includesTelephonyCost: rate.includesTelephonyCost,
  };
}

export async function calculateUsageCost(
  orgId: number,
  durationSeconds: number,
  category: UsageCategory = "voice_inbound"
): Promise<DeploymentAwareBilling> {
  const rate = await resolveRate(orgId, category);
  const billableSeconds = Math.max(durationSeconds, 0);
  const cost = roundMoney((billableSeconds / 60) * rate.ratePerMinute);

  return {
    billableSeconds,
    cost,
    deploymentModel: rate.deploymentModel,
    ratePerMinute: rate.ratePerMinute,
    platformFeePerMinute: rate.platformFeePerMinute,
    includesAiCost: rate.includesAiCost,
    includesTelephonyCost: rate.includesTelephonyCost,
  };
}
