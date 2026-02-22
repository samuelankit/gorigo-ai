import Telnyx from "telnyx";

const telnyxApiKey = process.env.TELNYX_API_KEY;

let platformClient: Telnyx | null = null;

if (telnyxApiKey) {
  try {
    platformClient = new Telnyx({ apiKey: telnyxApiKey });
  } catch (err) {
    console.warn("Failed to initialize platform Telnyx client:", err);
    platformClient = null;
  }
} else {
  console.warn("Platform Telnyx credentials not configured. Telnyx features will not be available.");
}

export interface TelnyxConfig {
  client: Telnyx;
  connectionId: string;
  phoneNumber: string;
  source: "org" | "platform";
}

export function getTelnyxConfig(): TelnyxConfig | null {
  const connectionId = process.env.TELNYX_CONNECTION_ID || "";
  const phoneNumber = process.env.TELNYX_PHONE_NUMBER || "";

  if (platformClient && telnyxApiKey && connectionId) {
    return {
      client: platformClient,
      connectionId,
      phoneNumber,
      source: "platform",
    };
  }

  return null;
}

export function isTelnyxConfigured(): boolean {
  return !!(platformClient && telnyxApiKey && process.env.TELNYX_CONNECTION_ID);
}

export function getTelnyxPhoneNumber(): string | undefined {
  return process.env.TELNYX_PHONE_NUMBER;
}

export async function makeOutboundCallTelnyx(
  to: string,
  from: string,
  webhookUrl: string,
  options?: { record?: boolean }
): Promise<{ callControlId: string; callLegId: string; callSessionId: string; status: string; to: string; from: string }> {
  const config = getTelnyxConfig();
  if (!config) {
    throw new Error("Telnyx is not configured. Please set TELNYX_API_KEY and TELNYX_CONNECTION_ID.");
  }

  const callParams: Record<string, unknown> = {
    connection_id: config.connectionId,
    to,
    from: from || config.phoneNumber,
    webhook_url: webhookUrl,
    webhook_url_method: "POST",
  };

  if (options?.record) {
    callParams.record = "record-from-answer";
    callParams.record_format = "mp3";
    callParams.record_channels = "single";
  }

  const response = await config.client.calls.dial(callParams as any);
  const data = response.data as unknown as Record<string, unknown>;

  return {
    callControlId: (data.call_control_id as string) || "",
    callLegId: (data.call_leg_id as string) || "",
    callSessionId: (data.call_session_id as string) || "",
    status: "initiated",
    to,
    from: from || config.phoneNumber,
  };
}

export async function answerCall(callControlId: string): Promise<void> {
  const config = getTelnyxConfig();
  if (!config) throw new Error("Telnyx is not configured.");

  await config.client.calls.actions.answer(callControlId, {} as any);
}

export async function hangupCall(callControlId: string): Promise<void> {
  const config = getTelnyxConfig();
  if (!config) throw new Error("Telnyx is not configured.");

  await config.client.calls.actions.hangup(callControlId, {} as any);
}

export async function speakText(
  callControlId: string,
  text: string,
  options?: { voice?: string; language?: string }
): Promise<void> {
  const config = getTelnyxConfig();
  if (!config) throw new Error("Telnyx is not configured.");

  await config.client.calls.actions.speak(callControlId, {
    payload: text,
    voice: (options?.voice || "female") as any,
    language: (options?.language || "en-GB") as any,
  });
}

export async function gatherInput(
  callControlId: string,
  options?: {
    minDigits?: number;
    maxDigits?: number;
    timeoutMillis?: number;
    interDigitTimeoutMillis?: number;
  }
): Promise<void> {
  const config = getTelnyxConfig();
  if (!config) throw new Error("Telnyx is not configured.");

  await config.client.calls.actions.gather(callControlId, {
    minimum_digits: options?.minDigits || 1,
    maximum_digits: options?.maxDigits || 10,
    timeout_millis: options?.timeoutMillis || 30000,
    inter_digit_timeout_millis: options?.interDigitTimeoutMillis || 5000,
  });
}

export async function transferCall(
  callControlId: string,
  to: string,
  from?: string
): Promise<void> {
  const config = getTelnyxConfig();
  if (!config) throw new Error("Telnyx is not configured.");

  await config.client.calls.actions.transfer(callControlId, {
    to,
    from: from || config.phoneNumber,
  } as any);
}

export async function bridgeCalls(
  callControlId: string,
  otherCallControlId: string
): Promise<void> {
  const config = getTelnyxConfig();
  if (!config) throw new Error("Telnyx is not configured.");

  await config.client.calls.actions.bridge(otherCallControlId, {
    call_control_id_to_bridge_with: callControlId,
  });
}

export async function getCallDetails(callControlId: string): Promise<Record<string, unknown> | null> {
  const config = getTelnyxConfig();
  if (!config) throw new Error("Telnyx is not configured.");

  try {
    const response = await config.client.calls.retrieveStatus(callControlId);
    return response.data as unknown as Record<string, unknown>;
  } catch {
    return null;
  }
}

const WEBHOOK_TOLERANCE_SECONDS = 300;

export function validateTelnyxWebhook(
  payload: string,
  signature: string,
  timestamp: string,
  publicKey?: string
): boolean {
  try {
    if (!publicKey && !process.env.TELNYX_PUBLIC_KEY) return false;

    const currentTime = Math.floor(Date.now() / 1000);
    const webhookTime = parseInt(timestamp, 10);
    if (isNaN(webhookTime) || Math.abs(currentTime - webhookTime) > WEBHOOK_TOLERANCE_SECONDS) {
      console.warn("[Telnyx] Webhook timestamp outside tolerance window");
      return false;
    }

    const crypto = require("crypto");
    const key = publicKey || process.env.TELNYX_PUBLIC_KEY || "";
    const signedPayload = `${timestamp}|${payload}`;

    const signatureBuffer = Buffer.from(signature, "base64");
    const publicKeyBuffer = Buffer.from(key, "base64");

    const keyObject = crypto.createPublicKey({
      key: {
        kty: "OKP",
        crv: "Ed25519",
        x: publicKeyBuffer.toString("base64url"),
      },
      format: "jwk",
    });

    return crypto.verify(
      null,
      Buffer.from(signedPayload),
      keyObject,
      signatureBuffer
    );
  } catch (err) {
    console.error("[Telnyx] Webhook validation error:", err);
    return false;
  }
}

export async function searchAvailableNumbers(options: {
  countryCode: string;
  numberType?: "local" | "toll_free" | "mobile";
  limit?: number;
  areaCode?: string;
}): Promise<Array<{ phoneNumber: string; region: string; cost: string }>> {
  const config = getTelnyxConfig();
  if (!config) throw new Error("Telnyx is not configured.");

  try {
    const params: Record<string, unknown> = {
      "filter[country_code]": options.countryCode,
      "filter[limit]": options.limit || 10,
    };
    if (options.numberType) {
      params["filter[phone_number_type]"] = options.numberType;
    }
    if (options.areaCode) {
      params["filter[national_destination_code]"] = options.areaCode;
    }

    const response = await config.client.availablePhoneNumbers.list(params as any);
    const data = response.data as Array<Record<string, unknown>>;

    return (data || []).map((num) => ({
      phoneNumber: (num.phone_number as string) || "",
      region: (num.region_information as Array<Record<string, string>>)?.[0]?.region_name || "",
      cost: (num.cost_information as Record<string, string>)?.monthly_cost || "N/A",
    }));
  } catch (err) {
    console.error("Failed to search Telnyx numbers:", err);
    return [];
  }
}

export async function sendSMS(
  to: string,
  body: string,
  from?: string,
  options?: { messagingProfileId?: string; webhookUrl?: string }
): Promise<{ messageId: string; status: string; to: string; from: string }> {
  const config = getTelnyxConfig();
  if (!config) throw new Error("Telnyx is not configured. Please set TELNYX_API_KEY.");

  const fromNumber = from || config.phoneNumber;
  if (!fromNumber) throw new Error("No 'from' number provided and TELNYX_PHONE_NUMBER not set.");

  const params: Record<string, unknown> = {
    from: fromNumber,
    to,
    text: body,
    type: "SMS",
  };

  if (options?.messagingProfileId) {
    params.messaging_profile_id = options.messagingProfileId;
  }
  if (options?.webhookUrl) {
    params.webhook_url = options.webhookUrl;
  }

  const response = await (config.client as any).messages.create(params);
  const data = response.data as Record<string, unknown>;

  return {
    messageId: (data.id as string) || "",
    status: ((data.to as Array<Record<string, unknown>>)?.[0]?.status as string) || "queued",
    to,
    from: fromNumber,
  };
}

export async function sendMMS(
  to: string,
  body: string,
  mediaUrls: string[],
  from?: string
): Promise<{ messageId: string; status: string; to: string; from: string }> {
  const config = getTelnyxConfig();
  if (!config) throw new Error("Telnyx is not configured.");

  const fromNumber = from || config.phoneNumber;
  if (!fromNumber) throw new Error("No 'from' number provided and TELNYX_PHONE_NUMBER not set.");

  const response = await (config.client as any).messages.create({
    from: fromNumber,
    to,
    text: body,
    type: "MMS",
    media_urls: mediaUrls,
  });
  const data = response.data as Record<string, unknown>;

  return {
    messageId: (data.id as string) || "",
    status: ((data.to as Array<Record<string, unknown>>)?.[0]?.status as string) || "queued",
    to,
    from: fromNumber,
  };
}

export async function orderPhoneNumber(phoneNumber: string, connectionId?: string): Promise<{
  orderId: string;
  phoneNumber: string;
  status: string;
} | null> {
  const config = getTelnyxConfig();
  if (!config) throw new Error("Telnyx is not configured.");

  try {
    const response = await config.client.numberOrders.create({
      phone_numbers: [{ phone_number: phoneNumber }],
      connection_id: connectionId || config.connectionId,
    });
    const data = response.data as Record<string, unknown>;

    return {
      orderId: (data.id as string) || "",
      phoneNumber,
      status: (data.status as string) || "pending",
    };
  } catch (err) {
    console.error("Failed to order Telnyx number:", err);
    return null;
  }
}
