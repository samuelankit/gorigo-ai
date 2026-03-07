import { Vonage } from "@vonage/server-sdk";
import { createLogger } from "@/lib/logger";

const logger = createLogger("Vonage");

const vonageApiKey = process.env.VONAGE_API_KEY || "";
const vonageApiSecret = process.env.VONAGE_API_SECRET || "";
const vonageApplicationId = process.env.VONAGE_APPLICATION_ID || "";
const vonagePrivateKey = process.env.VONAGE_PRIVATE_KEY || "";
const vonagePhoneNumber = process.env.VONAGE_PHONE_NUMBER || "";
const vonageSignatureSecret = process.env.VONAGE_SIGNATURE_SECRET || "";

let vonageClient: Vonage | null = null;

function initClient(): Vonage | null {
  if (vonageClient) return vonageClient;

  if (!vonageApplicationId || !vonagePrivateKey) {
    return null;
  }

  try {
    vonageClient = new Vonage({
      apiKey: vonageApiKey,
      apiSecret: vonageApiSecret,
      applicationId: vonageApplicationId,
      privateKey: vonagePrivateKey,
    } as any);
    return vonageClient;
  } catch (err) {
    logger.warn("Failed to initialize Vonage client", { error: err instanceof Error ? err.message : String(err) });
    return null;
  }
}

if (vonageApplicationId && vonagePrivateKey) {
  initClient();
} else {
  logger.warn("Vonage credentials not configured. Vonage features will not be available.");
}

export function isVonageConfigured(): boolean {
  return !!(vonageApplicationId && vonagePrivateKey && vonageApiKey);
}

export function getVonagePhoneNumber(): string | undefined {
  return vonagePhoneNumber || undefined;
}

export interface VonageNCCO {
  action: string;
  [key: string]: unknown;
}

export async function makeOutboundCallVonage(
  to: string,
  from: string,
  webhookUrl: string,
  options?: { record?: boolean }
): Promise<{ callId: string; status: string; to: string; from: string; conversationId?: string }> {
  const client = initClient();
  if (!client) {
    throw new Error("Vonage is not configured. Please set VONAGE_APPLICATION_ID, VONAGE_PRIVATE_KEY, and VONAGE_API_KEY.");
  }

  const fromNumber = from || vonagePhoneNumber;
  if (!fromNumber) {
    throw new Error("No 'from' phone number provided and VONAGE_PHONE_NUMBER is not set.");
  }

  const toClean = to.replace(/[^0-9+]/g, "").replace("+", "");
  const fromClean = fromNumber.replace(/[^0-9+]/g, "").replace("+", "");

  const ncco: VonageNCCO[] = [];

  if (options?.record) {
    ncco.push({
      action: "record",
      eventUrl: [webhookUrl],
      format: "mp3",
      channels: 1,
      split: "conversation",
    });
  }

  ncco.push({
    action: "talk",
    text: "Just so you know, I'm an AI assistant and this call may be recorded. How can I help you?",
    voiceName: "Amy",
    language: "en-GB",
    bargeIn: true,
  });

  ncco.push({
    action: "input",
    type: ["speech", "dtmf"],
    speech: { language: "en-GB", endOnSilence: 1 },
    dtmf: { maxDigits: 10, timeOut: 10 },
    eventUrl: [webhookUrl],
  });

  const response = await client.voice.createOutboundCall({
    to: [{ type: "phone", number: toClean }],
    from: { type: "phone", number: fromClean },
    ncco,
    event_url: [webhookUrl],
    event_method: "POST" as any,
  } as any);

  const callData = response as any;

  return {
    callId: callData.uuid || callData.conversation_uuid || "",
    status: callData.status || "started",
    to,
    from: fromNumber,
    conversationId: callData.conversation_uuid || "",
  };
}

export async function hangupCallVonage(callId: string): Promise<void> {
  const client = initClient();
  if (!client) throw new Error("Vonage is not configured.");

  try {
    await client.voice.hangupCall(callId);
  } catch (err) {
    logger.error("Failed to hangup Vonage call", err instanceof Error ? err : undefined, { callId });
    throw err;
  }
}

export async function transferCallVonage(
  callId: string,
  ncco: VonageNCCO[]
): Promise<void> {
  const client = initClient();
  if (!client) throw new Error("Vonage is not configured.");

  try {
    await client.voice.transferCallWithNCCO(callId, ncco);
  } catch (err) {
    logger.error("Failed to transfer Vonage call", err instanceof Error ? err : undefined, { callId });
    throw err;
  }
}

export async function streamAudioVonage(
  callId: string,
  streamUrl: string,
  options?: { loop?: number; level?: number }
): Promise<void> {
  const client = initClient();
  if (!client) throw new Error("Vonage is not configured.");

  try {
    await client.voice.streamAudio(callId, streamUrl, options?.loop ?? 1, options?.level ?? 0);
  } catch (err) {
    logger.error("Failed to stream audio on Vonage call", err instanceof Error ? err : undefined, { callId });
    throw err;
  }
}

export async function playTTSVonage(
  callId: string,
  text: string,
  options?: { voiceName?: string; language?: string; style?: number }
): Promise<void> {
  const client = initClient();
  if (!client) throw new Error("Vonage is not configured.");

  try {
    await client.voice.playTTS(callId, {
      text,
      voice_name: options?.voiceName || "Amy",
      language: options?.language || "en-GB",
      style: options?.style ?? 0,
    } as any);
  } catch (err) {
    logger.error("Failed to play TTS on Vonage call", err instanceof Error ? err : undefined, { callId });
    throw err;
  }
}

export async function sendDTMFVonage(callId: string, digits: string): Promise<void> {
  const client = initClient();
  if (!client) throw new Error("Vonage is not configured.");

  try {
    await client.voice.playDTMF(callId, digits);
  } catch (err) {
    logger.error("Failed to send DTMF on Vonage call", err instanceof Error ? err : undefined, { callId });
    throw err;
  }
}

export async function getCallDetailsVonage(callId: string): Promise<Record<string, unknown> | null> {
  const client = initClient();
  if (!client) throw new Error("Vonage is not configured.");

  try {
    const response = await client.voice.getCall(callId);
    return response as unknown as Record<string, unknown>;
  } catch (err) {
    logger.error("Failed to get Vonage call details", err instanceof Error ? err : undefined, { callId });
    return null;
  }
}

const WEBHOOK_TOLERANCE_SECONDS = 300;

export function validateVonageWebhook(
  rawBody: string,
  authHeader: string,
  signatureSecret?: string
): boolean {
  try {
    const secret = signatureSecret || vonageSignatureSecret;
    if (!secret) return false;

    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return false;

    const jwt = require("jsonwebtoken");
    const sha256 = require("js-sha256").sha256;

    const decoded = jwt.verify(token, secret, {
      algorithms: ["HS256"],
    }) as Record<string, unknown>;

    if (decoded.iat) {
      const currentTime = Math.floor(Date.now() / 1000);
      const issuedAt = decoded.iat as number;
      if (Math.abs(currentTime - issuedAt) > WEBHOOK_TOLERANCE_SECONDS) {
        logger.warn("Vonage webhook JWT outside tolerance window");
        return false;
      }
    }

    if (decoded.payload_hash) {
      const computedHash = sha256(rawBody);
      if (computedHash !== decoded.payload_hash) {
        logger.warn("Vonage webhook payload hash mismatch — possible tampering");
        return false;
      }
    }

    return true;
  } catch (err) {
    logger.error("Vonage webhook validation error", err instanceof Error ? err : undefined);
    return false;
  }
}

export function buildNCCO(actions: VonageNCCO[]): VonageNCCO[] {
  return actions;
}

export function talkAction(text: string, options?: { voiceName?: string; bargeIn?: boolean; language?: string; style?: number }): VonageNCCO {
  return {
    action: "talk",
    text,
    voiceName: options?.voiceName || "Amy",
    bargeIn: options?.bargeIn ?? false,
    language: options?.language || "en-GB",
    style: options?.style ?? 0,
  };
}

export function inputAction(options?: {
  type?: string[];
  dtmf?: { maxDigits?: number; timeOut?: number; submitOnHash?: boolean };
  speech?: { language?: string; endOnSilence?: number };
  eventUrl?: string[];
}): VonageNCCO {
  const action: VonageNCCO = {
    action: "input",
    type: options?.type || ["dtmf"],
  };
  if (options?.dtmf) action.dtmf = options.dtmf;
  if (options?.speech) action.speech = options.speech;
  if (options?.eventUrl) action.eventUrl = options.eventUrl;
  return action;
}

export function connectAction(number: string, from: string, options?: { eventUrl?: string[]; timeout?: number }): VonageNCCO {
  return {
    action: "connect",
    endpoint: [{ type: "phone", number: number.replace(/[^0-9]/g, "") }],
    from: from.replace(/[^0-9]/g, ""),
    eventUrl: options?.eventUrl,
    timeout: options?.timeout || 30,
  };
}

export function recordAction(options?: { eventUrl?: string[]; format?: string; channels?: number; endOnSilence?: number }): VonageNCCO {
  return {
    action: "record",
    eventUrl: options?.eventUrl || [],
    format: options?.format || "mp3",
    channels: options?.channels || 1,
    endOnSilence: options?.endOnSilence || 5,
  };
}
