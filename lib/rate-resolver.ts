import { db } from "@/lib/db";
import { rateCards, orgs } from "@/shared/schema";
import { eq, and } from "drizzle-orm";
import { safeParseNumeric } from "@/lib/money";

export type DeploymentModel = "managed" | "self_hosted" | "custom";
export type UsageCategory = "voice_inbound" | "voice_outbound" | "ai_chat";

export interface ResolvedRate {
  deploymentModel: DeploymentModel;
  category: UsageCategory;
  ratePerMinute: number;
  platformFeePerMinute: number;
  includesAiCost: boolean;
  includesTelephonyCost: boolean;
  label: string;
}

const DEFAULT_RATES: Record<DeploymentModel, Record<UsageCategory, ResolvedRate>> = {
  managed: {
    voice_inbound: { deploymentModel: "managed", category: "voice_inbound", ratePerMinute: 0.20, platformFeePerMinute: 0.20, includesAiCost: true, includesTelephonyCost: true, label: "Direct/Managed - Inbound Voice" },
    voice_outbound: { deploymentModel: "managed", category: "voice_outbound", ratePerMinute: 0.20, platformFeePerMinute: 0.20, includesAiCost: true, includesTelephonyCost: true, label: "Direct/Managed - Outbound Voice" },
    ai_chat: { deploymentModel: "managed", category: "ai_chat", ratePerMinute: 0.20, platformFeePerMinute: 0.20, includesAiCost: true, includesTelephonyCost: false, label: "Direct/Managed - AI Chat" },
  },
  self_hosted: {
    voice_inbound: { deploymentModel: "self_hosted", category: "voice_inbound", ratePerMinute: 0.12, platformFeePerMinute: 0.12, includesAiCost: false, includesTelephonyCost: false, label: "White-Label - Inbound Voice" },
    voice_outbound: { deploymentModel: "self_hosted", category: "voice_outbound", ratePerMinute: 0.12, platformFeePerMinute: 0.12, includesAiCost: false, includesTelephonyCost: false, label: "White-Label - Outbound Voice" },
    ai_chat: { deploymentModel: "self_hosted", category: "ai_chat", ratePerMinute: 0.12, platformFeePerMinute: 0.12, includesAiCost: false, includesTelephonyCost: false, label: "White-Label - AI Chat" },
  },
  custom: {
    voice_inbound: { deploymentModel: "custom", category: "voice_inbound", ratePerMinute: 0.20, platformFeePerMinute: 0.20, includesAiCost: true, includesTelephonyCost: true, label: "Custom - Inbound Voice" },
    voice_outbound: { deploymentModel: "custom", category: "voice_outbound", ratePerMinute: 0.20, platformFeePerMinute: 0.20, includesAiCost: true, includesTelephonyCost: true, label: "Custom - Outbound Voice" },
    ai_chat: { deploymentModel: "custom", category: "ai_chat", ratePerMinute: 0.20, platformFeePerMinute: 0.20, includesAiCost: true, includesTelephonyCost: false, label: "Custom - AI Chat" },
  },
};

export async function getOrgDeploymentModel(orgId: number): Promise<DeploymentModel> {
  const [org] = await db
    .select({ deploymentModel: orgs.deploymentModel })
    .from(orgs)
    .where(eq(orgs.id, orgId))
    .limit(1);

  if (!org || !org.deploymentModel) return "managed";
  const model = org.deploymentModel as DeploymentModel;
  if (!["managed", "self_hosted", "custom"].includes(model)) return "managed";
  return model;
}

export async function resolveRate(orgId: number, category: UsageCategory): Promise<ResolvedRate> {
  const model = await getOrgDeploymentModel(orgId);

  const [card] = await db
    .select()
    .from(rateCards)
    .where(
      and(
        eq(rateCards.deploymentModel, model),
        eq(rateCards.category, category),
        eq(rateCards.isActive, true)
      )
    )
    .limit(1);

  const modelDefaults = DEFAULT_RATES[model]?.[category] ?? DEFAULT_RATES.managed[category];

  if (card) {
    return {
      deploymentModel: model,
      category,
      ratePerMinute: safeParseNumeric(card.ratePerMinute, modelDefaults.ratePerMinute),
      platformFeePerMinute: safeParseNumeric(card.platformFeePerMinute, modelDefaults.platformFeePerMinute),
      includesAiCost: card.includesAiCost ?? true,
      includesTelephonyCost: card.includesTelephonyCost ?? true,
      label: card.label,
    };
  }

  return DEFAULT_RATES[model]?.[category] ?? DEFAULT_RATES.managed[category];
}

export async function getAllRatesForModel(model: DeploymentModel): Promise<ResolvedRate[]> {
  const cards = await db
    .select()
    .from(rateCards)
    .where(
      and(
        eq(rateCards.deploymentModel, model),
        eq(rateCards.isActive, true)
      )
    );

  if (cards.length > 0) {
    return cards.map((card) => {
      const catKey = card.category as UsageCategory;
      const catDefaults = DEFAULT_RATES[model]?.[catKey] ?? DEFAULT_RATES.managed[catKey];
      return {
        deploymentModel: model,
        category: catKey,
        ratePerMinute: safeParseNumeric(card.ratePerMinute, catDefaults.ratePerMinute),
        platformFeePerMinute: safeParseNumeric(card.platformFeePerMinute, catDefaults.platformFeePerMinute),
        includesAiCost: card.includesAiCost ?? true,
        includesTelephonyCost: card.includesTelephonyCost ?? true,
        label: card.label,
      };
    });
  }

  return Object.values(DEFAULT_RATES[model] ?? DEFAULT_RATES.managed);
}

export async function getAllRateCards(): Promise<ResolvedRate[]> {
  const cards = await db
    .select()
    .from(rateCards)
    .where(eq(rateCards.isActive, true));

  if (cards.length > 0) {
    return cards.map((card) => {
      const dm = card.deploymentModel as DeploymentModel;
      const catKey = card.category as UsageCategory;
      const catDefaults = DEFAULT_RATES[dm]?.[catKey] ?? DEFAULT_RATES.managed[catKey];
      return {
        deploymentModel: dm,
        category: catKey,
        ratePerMinute: safeParseNumeric(card.ratePerMinute, catDefaults.ratePerMinute),
        platformFeePerMinute: safeParseNumeric(card.platformFeePerMinute, catDefaults.platformFeePerMinute),
        includesAiCost: card.includesAiCost ?? true,
        includesTelephonyCost: card.includesTelephonyCost ?? true,
        label: card.label,
      };
    });
  }

  return [
    ...Object.values(DEFAULT_RATES.managed),
    ...Object.values(DEFAULT_RATES.self_hosted),
    ...Object.values(DEFAULT_RATES.custom),
  ];
}

export function getDeploymentModelLabel(model: DeploymentModel): string {
  switch (model) {
    case "managed": return "Direct / Managed (20p/min)";
    case "self_hosted": return "White-Label / Reseller (12p/min)";
    case "custom": return "Custom Plan";
    default: return "Direct / Managed (20p/min)";
  }
}

export function getDeploymentModelDescription(model: DeploymentModel): string {
  switch (model) {
    case "managed": return "Fully managed AI agents. AI, telephony, and platform costs included at 20p/min.";
    case "self_hosted": return "Wholesale rate for partners to resell under their own brand at 12p/min.";
    case "custom": return "Bespoke package with custom rates, features, and SLAs configured by our sales team.";
    default: return "";
  }
}
