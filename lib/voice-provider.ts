import { createLogger } from "@/lib/logger";

const logger = createLogger("VoiceProvider");

export type VoiceProviderName = "telnyx" | "vonage";

export interface OutboundCallResult {
  provider: VoiceProviderName;
  callId: string;
  status: string;
  to: string;
  from: string;
  metadata?: Record<string, unknown>;
}

export interface VoiceProviderStatus {
  name: VoiceProviderName;
  configured: boolean;
  isPrimary: boolean;
  costPerMinuteGBP: number;
}

const PROVIDER_COSTS: Record<VoiceProviderName, number> = {
  telnyx: 0.007,
  vonage: 0.008,
};

function getPrimaryProvider(): VoiceProviderName {
  return (process.env.PRIMARY_VOICE_PROVIDER as VoiceProviderName) || "telnyx";
}

function getFallbackProvider(): VoiceProviderName {
  const primary = getPrimaryProvider();
  return primary === "telnyx" ? "vonage" : "telnyx";
}

export function getProviderStatus(): VoiceProviderStatus[] {
  const { isTelnyxConfigured } = require("@/lib/telnyx");
  const { isVonageConfigured } = require("@/lib/vonage");

  const primary = getPrimaryProvider();

  return [
    {
      name: "telnyx",
      configured: isTelnyxConfigured(),
      isPrimary: primary === "telnyx",
      costPerMinuteGBP: PROVIDER_COSTS.telnyx,
    },
    {
      name: "vonage",
      configured: isVonageConfigured(),
      isPrimary: primary === "vonage",
      costPerMinuteGBP: PROVIDER_COSTS.vonage,
    },
  ];
}

export function isAnyProviderConfigured(): boolean {
  const statuses = getProviderStatus();
  return statuses.some((s) => s.configured);
}

export function getActiveProvider(): VoiceProviderName | null {
  const { isTelnyxConfigured } = require("@/lib/telnyx");
  const { isVonageConfigured } = require("@/lib/vonage");

  const primary = getPrimaryProvider();
  const fallback = getFallbackProvider();

  if (primary === "telnyx" && isTelnyxConfigured()) return "telnyx";
  if (primary === "vonage" && isVonageConfigured()) return "vonage";
  if (fallback === "telnyx" && isTelnyxConfigured()) return "telnyx";
  if (fallback === "vonage" && isVonageConfigured()) return "vonage";

  return null;
}

export function getActiveCostPerMinute(): number {
  const provider = getActiveProvider();
  if (!provider) return PROVIDER_COSTS.vonage;
  return PROVIDER_COSTS[provider];
}

export async function makeOutboundCall(
  to: string,
  from: string,
  webhookUrl: string,
  options?: { record?: boolean },
  orgId?: number
): Promise<OutboundCallResult> {
  const primary = getPrimaryProvider();
  const fallback = getFallbackProvider();

  try {
    const result = await makeCallWithProvider(primary, to, from, webhookUrl, options, orgId);
    logger.info(`Call initiated via ${primary}`, { to, callId: result.callId });
    return result;
  } catch (primaryErr) {
    logger.warn(`Primary provider ${primary} failed, trying fallback ${fallback}`, { error: primaryErr instanceof Error ? primaryErr.message : String(primaryErr) });

    try {
      const result = await makeCallWithProvider(fallback, to, from, webhookUrl, options, orgId);
      logger.info(`Call initiated via fallback ${fallback}`, { to, callId: result.callId });
      return result;
    } catch (fallbackErr) {
      logger.error(`Both providers failed for call to ${to}`, primaryErr instanceof Error ? primaryErr : undefined, { fallbackError: fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr) });
      throw new Error(`All voice providers failed. Primary (${primary}): ${primaryErr instanceof Error ? primaryErr.message : "Unknown error"}. Fallback (${fallback}): ${fallbackErr instanceof Error ? fallbackErr.message : "Unknown error"}.`);
    }
  }
}

async function makeCallWithProvider(
  provider: VoiceProviderName,
  to: string,
  from: string,
  webhookUrl: string,
  options?: { record?: boolean },
  _orgId?: number
): Promise<OutboundCallResult> {
  if (provider === "telnyx") {
    const { makeOutboundCallTelnyx, isTelnyxConfigured, getTelnyxPhoneNumber } = await import("@/lib/telnyx");
    if (!isTelnyxConfigured()) {
      throw new Error("Telnyx is not configured");
    }

    const telnyxWebhookUrl = webhookUrl.replace("/api/vonage/voice", "/api/telnyx/voice").replace("/api/twilio/voice", "/api/telnyx/voice");

    const telnyxFrom = getTelnyxPhoneNumber() || from;

    const result = await makeOutboundCallTelnyx(to, telnyxFrom, telnyxWebhookUrl, options);
    return {
      provider: "telnyx",
      callId: result.callControlId,
      status: result.status,
      to: result.to,
      from: result.from,
      metadata: {
        callLegId: result.callLegId,
        callSessionId: result.callSessionId,
      },
    };
  }

  if (provider === "vonage") {
    const { makeOutboundCallVonage, isVonageConfigured, getVonagePhoneNumber } = await import("@/lib/vonage");
    if (!isVonageConfigured()) {
      throw new Error("Vonage is not configured");
    }

    const vonageWebhookUrl = webhookUrl.replace("/api/telnyx/voice", "/api/vonage/voice").replace("/api/twilio/voice", "/api/vonage/voice");

    const vonageFrom = getVonagePhoneNumber() || from;

    const result = await makeOutboundCallVonage(to, vonageFrom, vonageWebhookUrl, options);
    return {
      provider: "vonage",
      callId: result.callId,
      status: result.status,
      to: result.to,
      from: result.from,
      metadata: {
        conversationId: result.conversationId,
      },
    };
  }

  throw new Error(`Unknown voice provider: ${provider}`);
}

export function getProviderCostSavings(): {
  primaryProvider: VoiceProviderName;
  primaryCost: number;
  fallbackProvider: VoiceProviderName;
  fallbackCost: number;
  savingsPerMinute: number;
  savingsPercent: number;
} {
  const primary = getPrimaryProvider();
  const fallback = getFallbackProvider();

  const primaryCost = PROVIDER_COSTS[primary];
  const fallbackCost = PROVIDER_COSTS[fallback];
  const savingsPerMinute = Math.abs(fallbackCost - primaryCost);
  const savingsPercent = fallbackCost > primaryCost
    ? Math.round((savingsPerMinute / fallbackCost) * 100)
    : 0;

  return {
    primaryProvider: primary,
    primaryCost,
    fallbackProvider: fallback,
    fallbackCost,
    savingsPerMinute,
    savingsPercent,
  };
}
