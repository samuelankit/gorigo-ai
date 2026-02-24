import { getWalletBalance } from "@/lib/wallet";

export const TIER_ENTRY_BARRIERS = {
  individual: {
    label: "Individual",
    minimumDeposit: 500,
    ratePerMinute: 0.20,
    description: "GoRigo manages everything. Full infrastructure provided.",
  },
  custom: {
    label: "Custom Enterprise",
    minimumDeposit: 2000,
    ratePerMinute: 0,
    description: "Custom pricing. Contact us for details.",
  },
} as const;

export type DeploymentTier = keyof typeof TIER_ENTRY_BARRIERS;

export async function checkEntryBarrier(
  orgId: number,
  tier: DeploymentTier
): Promise<{
  met: boolean;
  currentBalance: number;
  requiredMinimum: number;
  shortfall: number;
}> {
  const config = TIER_ENTRY_BARRIERS[tier];
  if (!config) {
    return { met: false, currentBalance: 0, requiredMinimum: 0, shortfall: 0 };
  }

  const currentBalance = await getWalletBalance(orgId);
  const requiredMinimum = config.minimumDeposit;
  const shortfall = Math.max(0, requiredMinimum - currentBalance);

  return {
    met: currentBalance >= requiredMinimum,
    currentBalance,
    requiredMinimum,
    shortfall,
  };
}
