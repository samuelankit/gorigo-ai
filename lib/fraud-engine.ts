import { db } from "@/lib/db";
import { callLogs, twilioSubAccounts } from "@/shared/schema";
import { eq, and, gte, count } from "drizzle-orm";

export interface FraudCheckResult {
  allowed: boolean;
  riskScore: number; // 0-100
  flags: string[];
  action: "allow" | "warn" | "block";
}

export interface VelocityLimits {
  maxCallsPerMinute: number;
  maxCallsPerHour: number;
  maxCallsPerDay: number;
  maxFailedCallsPerHour: number;
  maxHighCostCallsPerHour: number;
  maxConcurrentCalls: number;
}

const DEFAULT_LIMITS: VelocityLimits = {
  maxCallsPerMinute: 5,
  maxCallsPerHour: 50,
  maxCallsPerDay: 500,
  maxFailedCallsPerHour: 20,
  maxHighCostCallsPerHour: 10,
  maxConcurrentCalls: 10,
};

const HIGH_RISK_COUNTRIES = new Set(["CU", "KP", "IR", "SY", "SD"]);
const PREMIUM_RATE_PREFIXES = ["+1900", "+44870", "+44871", "+44872", "+44873"];

// Check call velocity for an org
export async function checkVelocity(orgId: number, limits?: Partial<VelocityLimits>): Promise<{ allowed: boolean; reason?: string; currentRate: number }> {
  const l = { ...DEFAULT_LIMITS, ...limits };
  const now = new Date();
  
  const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  // Count calls in last minute
  const [minuteCount] = await db.select({ count: count() }).from(callLogs)
    .where(and(eq(callLogs.orgId, orgId), gte(callLogs.startedAt, oneMinuteAgo)));
  
  if ((minuteCount?.count ?? 0) >= l.maxCallsPerMinute) {
    return { allowed: false, reason: `Rate limit: ${l.maxCallsPerMinute} calls/minute exceeded`, currentRate: minuteCount?.count ?? 0 };
  }
  
  // Count calls in last hour
  const [hourCount] = await db.select({ count: count() }).from(callLogs)
    .where(and(eq(callLogs.orgId, orgId), gte(callLogs.startedAt, oneHourAgo)));
  
  if ((hourCount?.count ?? 0) >= l.maxCallsPerHour) {
    return { allowed: false, reason: `Rate limit: ${l.maxCallsPerHour} calls/hour exceeded`, currentRate: hourCount?.count ?? 0 };
  }
  
  // Count calls in last day
  const [dayCount] = await db.select({ count: count() }).from(callLogs)
    .where(and(eq(callLogs.orgId, orgId), gte(callLogs.startedAt, oneDayAgo)));
  
  if ((dayCount?.count ?? 0) >= l.maxCallsPerDay) {
    return { allowed: false, reason: `Daily limit: ${l.maxCallsPerDay} calls/day exceeded`, currentRate: dayCount?.count ?? 0 };
  }
  
  return { allowed: true, currentRate: minuteCount?.count ?? 0 };
}

// Check for failed call patterns
export async function checkFailedCallPattern(orgId: number): Promise<{ suspicious: boolean; failedCount: number; reason?: string }> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  
  const [failedCount] = await db.select({ count: count() }).from(callLogs)
    .where(and(
      eq(callLogs.orgId, orgId),
      gte(callLogs.startedAt, oneHourAgo),
      eq(callLogs.status, "failed")
    ));
  
  const failed = failedCount?.count ?? 0;
  if (failed >= DEFAULT_LIMITS.maxFailedCallsPerHour) {
    return { suspicious: true, failedCount: failed, reason: `High failed call rate: ${failed} failed calls in last hour` };
  }
  
  return { suspicious: false, failedCount: failed };
}

// Check destination risk
export function checkDestinationRisk(phoneNumber: string, countryCode?: string): { riskLevel: "low" | "medium" | "high"; flags: string[] } {
  const flags: string[] = [];
  let riskLevel: "low" | "medium" | "high" = "low";
  
  if (countryCode && HIGH_RISK_COUNTRIES.has(countryCode.toUpperCase())) {
    flags.push(`High-risk destination country: ${countryCode}`);
    riskLevel = "high";
  }
  
  for (const prefix of PREMIUM_RATE_PREFIXES) {
    if (phoneNumber.startsWith(prefix)) {
      flags.push(`Premium rate number detected: ${prefix}`);
      riskLevel = "high";
      break;
    }
  }
  
  return { riskLevel, flags };
}

// Run full fraud check
export async function runFraudCheck(
  orgId: number,
  phoneNumber: string,
  countryCode?: string
): Promise<FraudCheckResult> {
  const flags: string[] = [];
  let riskScore = 0;
  
  // Velocity check
  const velocity = await checkVelocity(orgId);
  if (!velocity.allowed) {
    flags.push(velocity.reason!);
    riskScore += 40;
  }
  
  // Failed call pattern
  const failedPattern = await checkFailedCallPattern(orgId);
  if (failedPattern.suspicious) {
    flags.push(failedPattern.reason!);
    riskScore += 30;
  }
  
  // Destination risk
  const destRisk = checkDestinationRisk(phoneNumber, countryCode);
  flags.push(...destRisk.flags);
  if (destRisk.riskLevel === "high") riskScore += 30;
  else if (destRisk.riskLevel === "medium") riskScore += 15;
  
  // Check daily spend limit from sub-account
  const [subAccount] = await db.select().from(twilioSubAccounts)
    .where(eq(twilioSubAccounts.orgId, orgId)).limit(1);
  
  if (subAccount?.dailySpendLimit && subAccount?.currentDailySpend) {
    const limit = parseFloat(subAccount.dailySpendLimit);
    const current = parseFloat(subAccount.currentDailySpend);
    if (current >= limit * 0.9) {
      flags.push(`Daily spend at ${Math.round((current / limit) * 100)}% of limit`);
      riskScore += 20;
    }
    if (current >= limit) {
      flags.push("Daily spend limit exceeded");
      riskScore += 40;
    }
  }
  
  let action: "allow" | "warn" | "block" = "allow";
  if (riskScore >= 70) action = "block";
  else if (riskScore >= 40) action = "warn";
  
  return {
    allowed: action !== "block",
    riskScore: Math.min(riskScore, 100),
    flags,
    action,
  };
}

// Check sub-account daily spend and reset if needed
export async function checkAndResetDailySpend(orgId: number): Promise<void> {
  const [subAccount] = await db.select().from(twilioSubAccounts)
    .where(eq(twilioSubAccounts.orgId, orgId)).limit(1);
  
  if (!subAccount) return;
  
  const now = new Date();
  const lastReset = subAccount.lastSpendResetAt;
  
  if (!lastReset || now.toDateString() !== lastReset.toDateString()) {
    await db.update(twilioSubAccounts)
      .set({ currentDailySpend: "0", lastSpendResetAt: now, updatedAt: now })
      .where(eq(twilioSubAccounts.orgId, orgId));
  }
}
