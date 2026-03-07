import { db } from "@/lib/db";
import { tpsCheckResults } from "@/shared/schema";
import { eq, gt } from "drizzle-orm";
import { createLogger } from "@/lib/logger";
import { createHash } from "crypto";

const logger = createLogger("TPSChecker");

const TPS_CACHE_DAYS = 30;

export interface TPSCheckResult {
  isRegistered: boolean;
  registryType: "TPS" | "CTPS" | null;
  checkedAt: Date;
  fromCache: boolean;
}

function hashPhone(phone: string): string {
  return createHash("sha256").update(phone.toLowerCase().trim()).digest("hex");
}

function getPhonePrefix(phone: string): string {
  return phone.substring(0, 6) + "***";
}

async function getCachedResult(phoneHash: string): Promise<TPSCheckResult | null> {
  const [cached] = await db
    .select()
    .from(tpsCheckResults)
    .where(eq(tpsCheckResults.phoneHash, phoneHash))
    .limit(1);

  if (!cached) return null;

  if (cached.expiresAt && new Date() > cached.expiresAt) {
    return null;
  }

  return {
    isRegistered: cached.isRegistered,
    registryType: cached.registryType as "TPS" | "CTPS" | null,
    checkedAt: cached.checkedAt ?? new Date(),
    fromCache: true,
  };
}

async function cacheResult(phoneHash: string, phonePrefix: string, result: TPSCheckResult): Promise<void> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + TPS_CACHE_DAYS);

  await db
    .insert(tpsCheckResults)
    .values({
      phoneHash,
      phonePrefix,
      isRegistered: result.isRegistered,
      registryType: result.registryType,
      checkedAt: result.checkedAt,
      expiresAt,
      source: result.fromCache ? "cache" : "api",
    })
    .onConflictDoUpdate({
      target: tpsCheckResults.phoneHash,
      set: {
        isRegistered: result.isRegistered,
        registryType: result.registryType,
        checkedAt: result.checkedAt,
        expiresAt,
        source: "api",
      },
    });
}

export async function checkTPS(phoneNumber: string): Promise<TPSCheckResult> {
  const phoneHash = hashPhone(phoneNumber);
  const phonePrefix = getPhonePrefix(phoneNumber);

  const cached = await getCachedResult(phoneHash);
  if (cached) {
    return cached;
  }

  const tpsApiKey = process.env.TPS_API_KEY;

  if (!tpsApiKey) {
    logger.warn("No TPS_API_KEY configured — TPS check skipped (fail-open)", { phonePrefix });
    return {
      isRegistered: false,
      registryType: null,
      checkedAt: new Date(),
      fromCache: false,
    };
  }

  try {
    const response = await fetch(`https://api.tps.org.uk/v1/check`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${tpsApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ telephone: phoneNumber }),
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      logger.error("TPS API returned error", undefined, { status: response.status, phonePrefix });
      return {
        isRegistered: false,
        registryType: null,
        checkedAt: new Date(),
        fromCache: false,
      };
    }

    const data = await response.json() as { registered: boolean; type?: string };

    const result: TPSCheckResult = {
      isRegistered: data.registered,
      registryType: data.type === "CTPS" ? "CTPS" : data.registered ? "TPS" : null,
      checkedAt: new Date(),
      fromCache: false,
    };

    await cacheResult(phoneHash, phonePrefix, result);
    logger.info("TPS check completed", { phonePrefix, isRegistered: result.isRegistered, registryType: result.registryType });

    return result;
  } catch (err) {
    logger.error("TPS API call failed — fail-open", err instanceof Error ? err : undefined, { phonePrefix });
    return {
      isRegistered: false,
      registryType: null,
      checkedAt: new Date(),
      fromCache: false,
    };
  }
}

export async function isTPSRegistered(phoneNumber: string): Promise<boolean> {
  const result = await checkTPS(phoneNumber);
  return result.isRegistered;
}
