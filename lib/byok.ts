import crypto from "crypto";
import { db } from "@/lib/db";
import { orgs } from "@/shared/schema";
import { eq } from "drizzle-orm";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const key = process.env.BYOK_ENCRYPTION_KEY;
  if (!key) {
    throw new Error("BYOK_ENCRYPTION_KEY environment variable is required for BYOK encryption. Generate with: openssl rand -hex 32");
  }
  return crypto.createHash("sha256").update(key).digest();
}

export function encryptValue(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag();
  return iv.toString("hex") + ":" + tag.toString("hex") + ":" + encrypted;
}

export function decryptValue(ciphertext: string): string {
  try {
    const parts = ciphertext.split(":");
    if (parts.length !== 3) return "";
    const iv = Buffer.from(parts[0], "hex");
    const tag = Buffer.from(parts[1], "hex");
    const encrypted = parts[2];
    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch {
    return "";
  }
}

export function maskSecret(value: string): string {
  if (!value || value.length < 8) return "****";
  return value.slice(0, 4) + "****" + value.slice(-4);
}

export type ByokMode = "platform" | "byok";

export interface OrgKeys {
  mode: ByokMode;
  openai: {
    apiKey: string;
    baseUrl: string;
    source: "org" | "platform";
  };
  twilio: {
    accountSid: string;
    authToken: string;
    phoneNumber: string;
    source: "org" | "platform";
  };
}

export async function getOrgKeys(orgId: number): Promise<OrgKeys> {
  const [org] = await db
    .select({
      byokMode: orgs.byokMode,
      byokOpenaiKey: orgs.byokOpenaiKey,
      byokOpenaiBaseUrl: orgs.byokOpenaiBaseUrl,
      byokTwilioSid: orgs.byokTwilioSid,
      byokTwilioToken: orgs.byokTwilioToken,
      byokTwilioPhone: orgs.byokTwilioPhone,
    })
    .from(orgs)
    .where(eq(orgs.id, orgId))
    .limit(1);

  if (!org) {
    return getPlatformKeys();
  }

  const mode = (org.byokMode as ByokMode) || "platform";

  if (mode === "platform") {
    return getPlatformKeys();
  }

  const orgOpenaiKey = org.byokOpenaiKey ? decryptValue(org.byokOpenaiKey) : "";
  const orgOpenaiBaseUrl = org.byokOpenaiBaseUrl ? decryptValue(org.byokOpenaiBaseUrl) : "";
  const orgTwilioSid = org.byokTwilioSid ? decryptValue(org.byokTwilioSid) : "";
  const orgTwilioToken = org.byokTwilioToken ? decryptValue(org.byokTwilioToken) : "";
  const orgTwilioPhone = org.byokTwilioPhone ? decryptValue(org.byokTwilioPhone) : "";

  return {
    mode: "byok",
    openai: {
      apiKey: orgOpenaiKey || process.env.AI_INTEGRATIONS_OPENAI_API_KEY || "",
      baseUrl: orgOpenaiBaseUrl || process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || "https://api.openai.com/v1",
      source: orgOpenaiKey ? "org" : "platform",
    },
    twilio: {
      accountSid: orgTwilioSid || process.env.TWILIO_ACCOUNT_SID || "",
      authToken: orgTwilioToken || process.env.TWILIO_AUTH_TOKEN || "",
      phoneNumber: orgTwilioPhone || process.env.TWILIO_PHONE_NUMBER || "",
      source: orgTwilioSid ? "org" : "platform",
    },
  };
}

function getPlatformKeys(): OrgKeys {
  return {
    mode: "platform",
    openai: {
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || "",
      baseUrl: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || "https://api.openai.com/v1",
      source: "platform",
    },
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID || "",
      authToken: process.env.TWILIO_AUTH_TOKEN || "",
      phoneNumber: process.env.TWILIO_PHONE_NUMBER || "",
      source: "platform",
    },
  };
}

export async function saveOrgKeys(
  orgId: number,
  keys: {
    mode?: ByokMode;
    openaiKey?: string;
    openaiBaseUrl?: string;
    twilioSid?: string;
    twilioToken?: string;
    twilioPhone?: string;
  }
): Promise<void> {
  const updateData: Record<string, string | null> = {};

  if (keys.mode !== undefined) {
    updateData.byokMode = keys.mode;
  }
  if (keys.openaiKey !== undefined) {
    updateData.byokOpenaiKey = keys.openaiKey ? encryptValue(keys.openaiKey) : null;
  }
  if (keys.openaiBaseUrl !== undefined) {
    updateData.byokOpenaiBaseUrl = keys.openaiBaseUrl ? encryptValue(keys.openaiBaseUrl) : null;
  }
  if (keys.twilioSid !== undefined) {
    updateData.byokTwilioSid = keys.twilioSid ? encryptValue(keys.twilioSid) : null;
  }
  if (keys.twilioToken !== undefined) {
    updateData.byokTwilioToken = keys.twilioToken ? encryptValue(keys.twilioToken) : null;
  }
  if (keys.twilioPhone !== undefined) {
    updateData.byokTwilioPhone = keys.twilioPhone ? encryptValue(keys.twilioPhone) : null;
  }

  await db.update(orgs).set(updateData).where(eq(orgs.id, orgId));
}

export async function validateOpenAIKey(apiKey: string, baseUrl?: string): Promise<{ valid: boolean; error?: string; models?: string[] }> {
  try {
    const url = (baseUrl || "https://api.openai.com/v1") + "/models";
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      if (response.status === 401) return { valid: false, error: "Invalid API key" };
      if (response.status === 403) return { valid: false, error: "API key does not have sufficient permissions" };
      if (response.status === 429) return { valid: false, error: "Rate limited. Key is valid but has reached its usage limit." };
      return { valid: false, error: `API returned status ${response.status}` };
    }

    const data = await response.json();
    const models = (data.data || [])
      .map((m: any) => m.id)
      .filter((id: string) => id.includes("gpt"))
      .slice(0, 10);

    return { valid: true, models };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Connection failed";
    return { valid: false, error: `Could not reach API: ${message}` };
  }
}

export async function validateTwilioCredentials(
  accountSid: string,
  authToken: string
): Promise<{ valid: boolean; error?: string; friendlyName?: string }> {
  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`;
    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
    const response = await fetch(url, {
      headers: { Authorization: `Basic ${credentials}` },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      if (response.status === 401) return { valid: false, error: "Invalid Account SID or Auth Token" };
      return { valid: false, error: `Twilio returned status ${response.status}` };
    }

    const data = await response.json();
    return { valid: true, friendlyName: data.friendly_name };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Connection failed";
    return { valid: false, error: `Could not reach Twilio: ${message}` };
  }
}

export async function getOrgByokStatus(orgId: number): Promise<{
  mode: ByokMode;
  openai: { configured: boolean; masked: string; source: "org" | "platform" };
  twilio: { configured: boolean; maskedSid: string; maskedPhone: string; source: "org" | "platform" };
}> {
  const keys = await getOrgKeys(orgId);

  return {
    mode: keys.mode,
    openai: {
      configured: !!keys.openai.apiKey,
      masked: keys.openai.source === "org" ? maskSecret(keys.openai.apiKey) : "(platform default)",
      source: keys.openai.source,
    },
    twilio: {
      configured: !!(keys.twilio.accountSid && keys.twilio.authToken),
      maskedSid: keys.twilio.source === "org" ? maskSecret(keys.twilio.accountSid) : "(platform default)",
      maskedPhone: keys.twilio.source === "org" ? keys.twilio.phoneNumber : "(platform default)",
      source: keys.twilio.source,
    },
  };
}
