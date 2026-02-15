import twilio from "twilio";
import { getOrgKeys } from "@/lib/byok";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

let platformClient: ReturnType<typeof twilio> | null = null;

if (accountSid && authToken) {
  try {
    platformClient = twilio(accountSid, authToken);
  } catch (err) {
    console.warn("Failed to initialize platform Twilio client:", err);
    platformClient = null;
  }
} else {
  console.warn("Platform Twilio credentials not configured. Twilio features will use BYOK keys.");
}

export const DEFAULT_VOICE: "Polly.Amy" = "Polly.Amy";
export const DEFAULT_LANGUAGE = "en-GB";

interface TwilioConfig {
  client: ReturnType<typeof twilio>;
  phoneNumber: string;
  accountSid: string;
  authToken: string;
  source: "org" | "platform";
}

export async function getTwilioConfig(orgId?: number): Promise<TwilioConfig | null> {
  if (orgId) {
    try {
      const keys = await getOrgKeys(orgId);
      if (keys.twilio.source === "org" && keys.twilio.accountSid && keys.twilio.authToken) {
        const orgClient = twilio(keys.twilio.accountSid, keys.twilio.authToken);
        return {
          client: orgClient,
          phoneNumber: keys.twilio.phoneNumber,
          accountSid: keys.twilio.accountSid,
          authToken: keys.twilio.authToken,
          source: "org",
        };
      }
    } catch (err) {
      console.warn(`[BYOK] Twilio: Failed to resolve org ${orgId} keys, falling back to platform:`, err);
    }
  }

  if (platformClient && accountSid && authToken && twilioPhoneNumber) {
    return {
      client: platformClient,
      phoneNumber: twilioPhoneNumber,
      accountSid,
      authToken,
      source: "platform",
    };
  }

  return null;
}

export async function getTwilioConfigForSubAccount(orgId: number): Promise<TwilioConfig | null> {
  const { db } = await import("@/lib/db");
  const { twilioSubAccounts } = await import("@/shared/schema");
  const { eq } = await import("drizzle-orm");

  const [subAccount] = await db
    .select()
    .from(twilioSubAccounts)
    .where(eq(twilioSubAccounts.orgId, orgId))
    .limit(1);

  if (subAccount && subAccount.status === "active" && subAccount.twilioAccountSid && subAccount.twilioAuthToken) {
    try {
      const subClient = twilio(subAccount.twilioAccountSid, subAccount.twilioAuthToken);
      return {
        client: subClient,
        phoneNumber: "",
        accountSid: subAccount.twilioAccountSid,
        authToken: subAccount.twilioAuthToken,
        source: "org" as const,
      };
    } catch (err) {
      console.warn(`[SubAccount] Failed to create client for org ${orgId}:`, err);
    }
  }

  return getTwilioConfig(orgId);
}

export function isTwilioConfigured(): boolean {
  return !!(platformClient && accountSid && authToken && twilioPhoneNumber);
}

export async function isTwilioConfiguredForOrg(orgId: number): Promise<boolean> {
  const config = await getTwilioConfig(orgId);
  return config !== null;
}

export function getTwilioPhoneNumber(): string | undefined {
  return twilioPhoneNumber;
}

export const TWO_PARTY_CONSENT_STATES = new Set([
  "CA", "CT", "DE", "FL", "IL", "MA", "MD", "MI", "MT", "NH",
  "NV", "OR", "PA", "WA",
]);

export async function makeOutboundCall(
  to: string,
  from: string,
  webhookUrl: string,
  options?: { record?: boolean },
  orgId?: number
) {
  const config = await getTwilioConfig(orgId);
  if (!config) {
    throw new Error("Twilio is not configured. Please set up Twilio credentials in Settings > Integrations, or set platform TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER.");
  }

  const shouldRecord = options?.record ?? false;

  const call = await config.client.calls.create({
    to,
    from: from || config.phoneNumber,
    url: webhookUrl,
    record: shouldRecord,
    statusCallback: webhookUrl.replace(/\/voice$/, "/status"),
    statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
  });

  return {
    sid: call.sid,
    status: call.status,
    to: call.to,
    from: call.from,
    dateCreated: call.dateCreated,
  };
}

export function generateTwimlResponse(options?: {
  message?: string;
  gather?: {
    input?: string[];
    action?: string;
    method?: string;
    speechTimeout?: string;
    timeout?: number;
  };
  record?: {
    action?: string;
    maxLength?: number;
    transcribe?: boolean;
  };
  dial?: {
    number: string;
    callerId?: string;
    timeout?: number;
  };
  pause?: number;
  redirect?: string;
}) {
  const response = new twilio.twiml.VoiceResponse();

  if (options?.message) {
    response.say({ voice: DEFAULT_VOICE, language: DEFAULT_LANGUAGE }, options.message);
  }

  if (options?.gather) {
    const gatherOptions: Record<string, unknown> = {};
    if (options.gather.input) gatherOptions.input = options.gather.input.join(" ");
    if (options.gather.action) gatherOptions.action = options.gather.action;
    if (options.gather.method) gatherOptions.method = options.gather.method;
    if (options.gather.speechTimeout) gatherOptions.speechTimeout = options.gather.speechTimeout;
    if (options.gather.timeout) gatherOptions.timeout = options.gather.timeout;

    const gather = response.gather(gatherOptions);
    if (options.message) {
      gather.say({ voice: DEFAULT_VOICE, language: DEFAULT_LANGUAGE }, options.message);
    }
  }

  if (options?.record) {
    const recordOptions: Record<string, unknown> = {};
    if (options.record.action) recordOptions.action = options.record.action;
    if (options.record.maxLength) recordOptions.maxLength = options.record.maxLength;
    if (options.record.transcribe !== undefined) recordOptions.transcribe = options.record.transcribe;
    response.record(recordOptions);
  }

  if (options?.dial) {
    const dialOptions: Record<string, unknown> = {};
    if (options.dial.callerId) dialOptions.callerId = options.dial.callerId;
    if (options.dial.timeout) dialOptions.timeout = options.dial.timeout;
    response.dial(dialOptions, options.dial.number);
  }

  if (options?.pause) {
    response.pause({ length: options.pause });
  }

  if (options?.redirect) {
    response.redirect(options.redirect);
  }

  return response.toString();
}

export const AVAILABLE_VOICES = [
  { id: "Polly.Amy", name: "Amy", language: "en-GB", gender: "female" },
  { id: "Polly.Brian", name: "Brian", language: "en-GB", gender: "male" },
  { id: "Polly.Emma", name: "Emma", language: "en-GB", gender: "female" },
  { id: "Polly.Joanna", name: "Joanna", language: "en-US", gender: "female" },
  { id: "Polly.Matthew", name: "Matthew", language: "en-US", gender: "male" },
  { id: "Polly.Ivy", name: "Ivy", language: "en-US", gender: "female" },
  { id: "Polly.Kendra", name: "Kendra", language: "en-US", gender: "female" },
  { id: "Polly.Kimberly", name: "Kimberly", language: "en-US", gender: "female" },
  { id: "Polly.Salli", name: "Salli", language: "en-US", gender: "female" },
  { id: "Polly.Joey", name: "Joey", language: "en-US", gender: "male" },
  { id: "Polly.Celine", name: "Celine", language: "fr-FR", gender: "female" },
  { id: "Polly.Lea", name: "Lea", language: "fr-FR", gender: "female" },
  { id: "Polly.Mathieu", name: "Mathieu", language: "fr-FR", gender: "male" },
  { id: "Polly.Hans", name: "Hans", language: "de-DE", gender: "male" },
  { id: "Polly.Marlene", name: "Marlene", language: "de-DE", gender: "female" },
  { id: "Polly.Vicki", name: "Vicki", language: "de-DE", gender: "female" },
  { id: "Polly.Conchita", name: "Conchita", language: "es-ES", gender: "female" },
  { id: "Polly.Enrique", name: "Enrique", language: "es-ES", gender: "male" },
  { id: "Polly.Lucia", name: "Lucia", language: "es-ES", gender: "female" },
  { id: "Polly.Mia", name: "Mia", language: "es-MX", gender: "female" },
  { id: "Polly.Penelope", name: "Penelope", language: "es-US", gender: "female" },
  { id: "Polly.Lupe", name: "Lupe", language: "es-US", gender: "female" },
  { id: "Polly.Carla", name: "Carla", language: "it-IT", gender: "female" },
  { id: "Polly.Giorgio", name: "Giorgio", language: "it-IT", gender: "male" },
  { id: "Polly.Bianca", name: "Bianca", language: "it-IT", gender: "female" },
  { id: "Polly.Takumi", name: "Takumi", language: "ja-JP", gender: "male" },
  { id: "Polly.Mizuki", name: "Mizuki", language: "ja-JP", gender: "female" },
  { id: "Polly.Seoyeon", name: "Seoyeon", language: "ko-KR", gender: "female" },
  { id: "Polly.Zhiyu", name: "Zhiyu", language: "cmn-CN", gender: "female" },
  { id: "Polly.Aditi", name: "Aditi", language: "hi-IN", gender: "female" },
  { id: "Polly.Raveena", name: "Raveena", language: "en-IN", gender: "female" },
];

export const SUPPORTED_LANGUAGES = [
  { code: "en-GB", name: "English (UK)" },
  { code: "en-US", name: "English (US)" },
  { code: "en-IN", name: "English (India)" },
  { code: "fr-FR", name: "French" },
  { code: "de-DE", name: "German" },
  { code: "es-ES", name: "Spanish (Spain)" },
  { code: "es-MX", name: "Spanish (Mexico)" },
  { code: "es-US", name: "Spanish (US)" },
  { code: "it-IT", name: "Italian" },
  { code: "ja-JP", name: "Japanese" },
  { code: "ko-KR", name: "Korean" },
  { code: "cmn-CN", name: "Chinese (Mandarin)" },
  { code: "hi-IN", name: "Hindi" },
  { code: "pt-BR", name: "Portuguese (Brazil)" },
  { code: "ar-SA", name: "Arabic" },
];

export async function validateTwilioSignature(
  url: string,
  params: Record<string, string>,
  signature: string,
  orgId?: number
): Promise<boolean> {
  const config = await getTwilioConfig(orgId);
  if (!config) return false;
  return twilio.validateRequest(config.authToken, signature, url, params);
}

export async function getCallDetails(callSid: string, orgId?: number) {
  const config = await getTwilioConfig(orgId);
  if (!config) {
    throw new Error("Twilio is not configured. Please set up Twilio credentials in Settings > Integrations.");
  }

  const call = await config.client.calls(callSid).fetch();

  return {
    sid: call.sid,
    status: call.status,
    to: call.to,
    from: call.from,
    direction: call.direction,
    duration: call.duration,
    startTime: call.startTime,
    endTime: call.endTime,
    price: call.price,
    priceUnit: call.priceUnit,
    dateCreated: call.dateCreated,
    dateUpdated: call.dateUpdated,
  };
}
