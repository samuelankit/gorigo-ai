import { db } from "@/lib/db";
import { rateCards, orgs } from "@/shared/schema";
import { eq, and } from "drizzle-orm";
import { safeParseNumeric } from "@/lib/money";

export type DeploymentModel = "managed" | "byok" | "self_hosted" | "custom";
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
    voice_inbound: { deploymentModel: "managed", category: "voice_inbound", ratePerMinute: 0.15, platformFeePerMinute: 0.15, includesAiCost: true, includesTelephonyCost: true, label: "Managed - Inbound Voice" },
    voice_outbound: { deploymentModel: "managed", category: "voice_outbound", ratePerMinute: 0.18, platformFeePerMinute: 0.18, includesAiCost: true, includesTelephonyCost: true, label: "Managed - Outbound Voice" },
    ai_chat: { deploymentModel: "managed", category: "ai_chat", ratePerMinute: 0.05, platformFeePerMinute: 0.05, includesAiCost: true, includesTelephonyCost: false, label: "Managed - AI Chat" },
  },
  byok: {
    voice_inbound: { deploymentModel: "byok", category: "voice_inbound", ratePerMinute: 0.05, platformFeePerMinute: 0.05, includesAiCost: false, includesTelephonyCost: false, label: "BYOK - Inbound Voice" },
    voice_outbound: { deploymentModel: "byok", category: "voice_outbound", ratePerMinute: 0.06, platformFeePerMinute: 0.06, includesAiCost: false, includesTelephonyCost: false, label: "BYOK - Outbound Voice" },
    ai_chat: { deploymentModel: "byok", category: "ai_chat", ratePerMinute: 0.02, platformFeePerMinute: 0.02, includesAiCost: false, includesTelephonyCost: false, label: "BYOK - AI Chat" },
  },
  self_hosted: {
    voice_inbound: { deploymentModel: "self_hosted", category: "voice_inbound", ratePerMinute: 0.03, platformFeePerMinute: 0.03, includesAiCost: false, includesTelephonyCost: false, label: "Self-Hosted - Inbound Voice" },
    voice_outbound: { deploymentModel: "self_hosted", category: "voice_outbound", ratePerMinute: 0.04, platformFeePerMinute: 0.04, includesAiCost: false, includesTelephonyCost: false, label: "Self-Hosted - Outbound Voice" },
    ai_chat: { deploymentModel: "self_hosted", category: "ai_chat", ratePerMinute: 0.01, platformFeePerMinute: 0.01, includesAiCost: false, includesTelephonyCost: false, label: "Self-Hosted - AI Chat" },
  },
  custom: {
    voice_inbound: { deploymentModel: "custom", category: "voice_inbound", ratePerMinute: 0.15, platformFeePerMinute: 0.15, includesAiCost: true, includesTelephonyCost: true, label: "Custom - Inbound Voice" },
    voice_outbound: { deploymentModel: "custom", category: "voice_outbound", ratePerMinute: 0.18, platformFeePerMinute: 0.18, includesAiCost: true, includesTelephonyCost: true, label: "Custom - Outbound Voice" },
    ai_chat: { deploymentModel: "custom", category: "ai_chat", ratePerMinute: 0.05, platformFeePerMinute: 0.05, includesAiCost: true, includesTelephonyCost: false, label: "Custom - AI Chat" },
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
  if (!["managed", "byok", "self_hosted", "custom"].includes(model)) return "managed";
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
    ...Object.values(DEFAULT_RATES.byok),
    ...Object.values(DEFAULT_RATES.self_hosted),
    ...Object.values(DEFAULT_RATES.custom),
  ];
}

export function getDeploymentModelLabel(model: DeploymentModel): string {
  switch (model) {
    case "managed": return "Managed";
    case "byok": return "BYOK (Bring Your Own Keys)";
    case "self_hosted": return "Self-Hosted";
    case "custom": return "Custom Plan";
    default: return "Managed";
  }
}

export function getDeploymentModelDescription(model: DeploymentModel): string {
  switch (model) {
    case "managed": return "We host and run everything. AI, telephony, and platform costs included in rate.";
    case "byok": return "Use our platform with your own API keys. You pay AI/telephony providers directly, we charge platform fee only.";
    case "self_hosted": return "Run the platform on your own infrastructure. License fee per minute of usage.";
    case "custom": return "Bespoke package with custom rates, features, and SLAs configured by our sales team.";
    default: return "";
  }
}
