import { db } from "@/lib/db";
import { countries, countryComplianceProfiles, countryHolidays, doNotCallList, consentRecords } from "@/shared/schema";
import { eq, and, isNull, or, gt } from "drizzle-orm";
import { normalizePhoneNumber, isOnDNCList, addToDNCList } from "@/lib/dnc";

export interface ComplianceCheckResult {
  allowed: boolean;
  reason?: string;
  checks: {
    dncClear: boolean;
    withinCallingHours: boolean;
    holidayCheck: boolean;
    consentValid: boolean;
    countryActive: boolean;
  };
  countryCode?: string;
  disclosureRequired?: string;
  recordingConsentMode?: string;
}

export interface CountryCallingHours {
  timezone: string;
  callingHoursStart: string;
  callingHoursEnd: string;
  weekendCallingAllowed: boolean;
}

export async function getCountryByCode(isoCode: string) {
  const [country] = await db
    .select()
    .from(countries)
    .where(eq(countries.isoCode, isoCode.toUpperCase()))
    .limit(1);

  if (!country) return null;

  const [compliance] = await db
    .select()
    .from(countryComplianceProfiles)
    .where(eq(countryComplianceProfiles.countryId, country.id))
    .limit(1);

  return { country, compliance };
}

export async function isWithinCountryCallingHours(
  isoCode: string
): Promise<{ allowed: boolean; reason?: string }> {
  const data = await getCountryByCode(isoCode);
  if (!data || !data.compliance) return { allowed: true };

  const { country, compliance } = data;
  const timezone = country.timezone;
  const start = compliance.callingHoursStart || "09:00";
  const end = compliance.callingHoursEnd || "20:00";

  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const dayFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "long",
  });

  const parts = formatter.formatToParts(now);
  const hour = parts.find((p) => p.type === "hour")?.value || "00";
  const minute = parts.find((p) => p.type === "minute")?.value || "00";
  const currentTime = `${hour}:${minute}`;

  const weekday = dayFormatter.format(now).toLowerCase();
  const isWeekend = weekday === "saturday" || weekday === "sunday";

  const restrictedDays =
    (compliance.restrictedDays as string[]) || [];
  if (isWeekend && restrictedDays.includes("saturday") && restrictedDays.includes("sunday")) {
    return {
      allowed: false,
      reason: `Calling not allowed on weekends in ${country.name}`,
    };
  }

  if (currentTime < start || currentTime >= end) {
    return {
      allowed: false,
      reason: `Outside calling hours (${start}-${end}) in ${country.name} (${timezone})`,
    };
  }

  const dateFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const todayStr = dateFormatter.format(now);

  const holidays = await db
    .select()
    .from(countryHolidays)
    .where(
      and(
        eq(countryHolidays.countryId, country.id),
        eq(countryHolidays.date, todayStr)
      )
    )
    .limit(1);

  if (holidays.length > 0 && holidays[0].noCallingAllowed) {
    return {
      allowed: false,
      reason: `Holiday: ${holidays[0].name} - no calling allowed in ${country.name}`,
    };
  }

  return { allowed: true };
}

export async function runFullComplianceCheck(
  orgId: number,
  phoneNumber: string,
  countryCode: string
): Promise<ComplianceCheckResult> {
  const result: ComplianceCheckResult = {
    allowed: true,
    checks: {
      dncClear: true,
      withinCallingHours: true,
      holidayCheck: true,
      consentValid: true,
      countryActive: true,
    },
    countryCode,
  };

  const data = await getCountryByCode(countryCode);
  if (!data) {
    result.allowed = false;
    result.checks.countryActive = false;
    result.reason = `Country ${countryCode} not configured`;
    return result;
  }

  if (data.country.status !== "active") {
    result.allowed = false;
    result.checks.countryActive = false;
    result.reason = `Calling to ${data.country.name} is currently disabled`;
    return result;
  }

  if (data.compliance) {
    result.disclosureRequired = data.compliance.aiDisclosureRequired
      ? data.compliance.aiDisclosureScript ||
        "This call may be recorded and uses AI assistance."
      : undefined;
    result.recordingConsentMode = data.compliance.recordingConsentType || "one_party";
  }

  const onDnc = await isOnDNCList(orgId, phoneNumber);
  if (onDnc) {
    result.allowed = false;
    result.checks.dncClear = false;
    result.reason = "Phone number is on Do Not Call list";
    return result;
  }

  if (data.compliance?.dncCheckMethod === "api" && countryCode.toUpperCase() === "GB") {
    try {
      const { checkTPS } = await import("@/lib/tps-checker");
      const tpsResult = await checkTPS(phoneNumber);
      if (tpsResult.isRegistered) {
        result.allowed = false;
        result.checks.dncClear = false;
        result.reason = `Phone number is registered on the UK ${tpsResult.registryType || "TPS"} (Telephone Preference Service)`;
        return result;
      }
    } catch (tpsErr) {
      console.warn("[Compliance] TPS check failed (fail-open):", tpsErr instanceof Error ? tpsErr.message : tpsErr);
    }
  }

  const hoursCheck = await isWithinCountryCallingHours(countryCode);
  if (!hoursCheck.allowed) {
    result.allowed = false;
    result.checks.withinCallingHours = false;
    result.checks.holidayCheck = hoursCheck.reason?.includes("Holiday")
      ? false
      : true;
    result.reason = hoursCheck.reason;
    return result;
  }

  return result;
}

export async function getDisclosureText(
  countryCode: string,
  language?: string
): Promise<string | null> {
  const data = await getCountryByCode(countryCode);
  if (!data?.compliance?.aiDisclosureRequired) return null;

  const disclosures: Record<string, string> = {
    en: "Just so you know, I'm an AI assistant and this call may be recorded.",
    fr: "Pour information, je suis un assistant IA et cet appel peut être enregistré.",
    de: "Kurz zur Info, ich bin ein KI-Assistent und dieses Gespräch kann aufgezeichnet werden.",
    es: "Solo para que lo sepas, soy un asistente de IA y esta llamada puede ser grabada.",
    it: "Solo per informarti, sono un assistente AI e questa chiamata potrebbe essere registrata.",
    pt: "Só para você saber, sou um assistente de IA e esta chamada pode ser gravada.",
    nl: "Even ter informatie, ik ben een AI-assistent en dit gesprek kan worden opgenomen.",
    ja: "ご参考までに、私はAIアシスタントです。この通話は録音される場合があります。",
    ar: "للعلم، أنا مساعد ذكاء اصطناعي وقد يتم تسجيل هذه المكالمة.",
    hi: "बस आपको बता दूं, मैं एक AI सहायक हूं और यह कॉल रिकॉर्ड की जा सकती है।",
    sv: "Bara så du vet, jag är en AI-assistent och samtalet kan spelas in.",
    pl: "Tylko dla informacji, jestem asystentem AI, a ta rozmowa może być nagrywana.",
  };

  const customText = data.compliance.aiDisclosureScript;
  if (customText) return customText;

  const langCode = language?.split("-")[0] || "en";
  return disclosures[langCode] || disclosures["en"];
}

export function detectOptOut(
  transcript: string
): { detected: boolean; keyword?: string } {
  const optOutPhrases = [
    "stop calling",
    "do not call",
    "remove me",
    "take me off",
    "unsubscribe",
    "opt out",
    "no more calls",
    "don't call",
    "never call",
    "remove my number",
    "arrêtez",
    "ne m'appelez plus",
    "hören sie auf",
    "rufen sie mich nicht mehr an",
    "deje de llamar",
    "no me llame",
    "smettila di chiamare",
    "non mi chiami più",
    "pare de ligar",
    "não me ligue",
    "stop met bellen",
    "sluta ringa",
    "przestań dzwonić",
  ];

  const lower = transcript.toLowerCase();
  for (const phrase of optOutPhrases) {
    if (lower.includes(phrase)) {
      return { detected: true, keyword: phrase };
    }
  }
  return { detected: false };
}

export async function handleOptOut(
  orgId: number,
  phoneNumber: string,
  callLogId?: number,
  reason?: string
): Promise<void> {
  await addToDNCList(
    orgId,
    phoneNumber,
    reason || "Customer requested opt-out during call",
    "call_opt_out",
    undefined,
    callLogId ? `Call ID: ${callLogId}` : undefined
  );
}

export async function getCountryVoiceConfig(
  countryCode: string
): Promise<{
  language: string;
  voice: string;
  speechModel: string;
} | null> {
  const data = await getCountryByCode(countryCode);
  if (!data?.country) return null;

  const voiceMap: Record<string, { language: string; voice: string }> = {
    GB: { language: "en-GB", voice: "Polly.Amy" },
    US: { language: "en-US", voice: "Polly.Joanna" },
    CA: { language: "en-US", voice: "Polly.Joanna" },
    AU: { language: "en-AU", voice: "Polly.Nicole" },
    IE: { language: "en-GB", voice: "Polly.Amy" },
    FR: { language: "fr-FR", voice: "Polly.Lea" },
    DE: { language: "de-DE", voice: "Polly.Vicki" },
    ES: { language: "es-ES", voice: "Polly.Lucia" },
    IT: { language: "it-IT", voice: "Polly.Bianca" },
    NL: { language: "nl-NL", voice: "Polly.Lotte" },
    JP: { language: "ja-JP", voice: "Polly.Mizuki" },
    BR: { language: "pt-BR", voice: "Polly.Vitoria" },
    MX: { language: "es-MX", voice: "Polly.Mia" },
    IN: { language: "hi-IN", voice: "Polly.Aditi" },
    AE: { language: "ar-SA", voice: "Polly.Zeina" },
    SG: { language: "en-US", voice: "Polly.Joanna" },
    ZA: { language: "en-GB", voice: "Polly.Amy" },
    SE: { language: "sv-SE", voice: "Polly.Astrid" },
    CH: { language: "de-DE", voice: "Polly.Vicki" },
    PL: { language: "pl-PL", voice: "Polly.Ewa" },
  };

  const config =
    voiceMap[countryCode.toUpperCase()] ||
    { language: "en-US", voice: "Polly.Joanna" };

  return {
    ...config,
    speechModel: "phone_call",
  };
}
