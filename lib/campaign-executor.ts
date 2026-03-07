import { db } from "@/lib/db";
import { campaigns, campaignContacts, agents, phoneNumbers, callLogs, orgs } from "@/shared/schema";
import { eq, and, lt, sql, inArray, isNull, or } from "drizzle-orm";
import { createLogger } from "@/lib/logger";
import { makeOutboundCall } from "@/lib/voice-provider";
import { isOnDNCList } from "@/lib/dnc";
import { runFullComplianceCheck } from "@/lib/compliance-engine";
import { resolveRate } from "@/lib/rate-resolver";
import { hasInsufficientBalance } from "@/lib/wallet";
import { getMinCallBalance } from "@/lib/call-limits";
import { roundMoney } from "@/lib/money";

const logger = createLogger("CampaignExecutor");

let campaignEngineRunning = false;

export function startCampaignEngine(intervalMs: number): void {
  if ((globalThis as any).__campaignEngineStarted) return;
  (globalThis as any).__campaignEngineStarted = true;

  const guardedRun = () => {
    if (campaignEngineRunning) return;
    campaignEngineRunning = true;
    processCampaigns()
      .catch((err) => {
        logger.error("Campaign engine cycle failed", err instanceof Error ? err : undefined);
      })
      .finally(() => {
        campaignEngineRunning = false;
      });
  };

  setTimeout(guardedRun, 20_000);
  setInterval(guardedRun, intervalMs);
  logger.info("Campaign engine started");
}

async function processCampaigns(): Promise<void> {
  const runningCampaigns = await db
    .select()
    .from(campaigns)
    .where(
      and(
        eq(campaigns.status, "running"),
        isNull(campaigns.deletedAt)
      )
    );

  for (const campaign of runningCampaigns) {
    try {
      await processSingleCampaign(campaign);
    } catch (err) {
      logger.error("Failed to process campaign", err instanceof Error ? err : undefined, {
        campaignId: campaign.id,
      });
    }
  }
}

async function processSingleCampaign(campaign: typeof campaigns.$inferSelect): Promise<void> {
  if (!isWithinCallingHours(campaign)) {
    return;
  }

  const budgetCap = campaign.budgetCap ? parseFloat(String(campaign.budgetCap)) : Infinity;
  const budgetSpent = parseFloat(String(campaign.budgetSpent ?? "0"));

  if (budgetCap !== Infinity && budgetSpent >= budgetCap * 0.8 && !campaign.costCapReached) {
    await db.update(campaigns).set({
      costCapReached: true,
      pausedAt: new Date(),
      pausedReason: "Budget cap reached (80% threshold)",
      status: "paused",
      updatedAt: new Date(),
    }).where(eq(campaigns.id, campaign.id));
    logger.warn("Campaign paused — cost cap reached", { campaignId: campaign.id, budgetSpent, budgetCap });
    return;
  }

  const minBalance = await getMinCallBalance(campaign.orgId);
  const insufficientBalance = await hasInsufficientBalance(campaign.orgId, minBalance);
  if (insufficientBalance) {
    await db.update(campaigns).set({
      pausedAt: new Date(),
      pausedReason: "Insufficient wallet balance",
      status: "paused",
      updatedAt: new Date(),
    }).where(eq(campaigns.id, campaign.id));
    logger.warn("Campaign paused — insufficient balance", { campaignId: campaign.id });
    return;
  }

  const maxConcurrent = campaign.pacingMaxConcurrent ?? 3;

  const [activeCalls] = await db
    .select({ count: sql<number>`count(*)` })
    .from(campaignContacts)
    .where(
      and(
        eq(campaignContacts.campaignId, campaign.id),
        eq(campaignContacts.status, "calling")
      )
    );

  const activeCount = Number(activeCalls?.count ?? 0);
  if (activeCount >= maxConcurrent) {
    return;
  }

  const slotsAvailable = maxConcurrent - activeCount;

  const pendingContacts = await db
    .select()
    .from(campaignContacts)
    .where(
      and(
        eq(campaignContacts.campaignId, campaign.id),
        eq(campaignContacts.status, "pending"),
        or(
          isNull(campaignContacts.nextRetryAfter),
          lt(campaignContacts.nextRetryAfter, new Date())
        )
      )
    )
    .limit(slotsAvailable)
    .orderBy(campaignContacts.id);

  if (pendingContacts.length === 0) {
    const [remaining] = await db
      .select({ count: sql<number>`count(*)` })
      .from(campaignContacts)
      .where(
        and(
          eq(campaignContacts.campaignId, campaign.id),
          inArray(campaignContacts.status, ["pending", "calling"])
        )
      );

    if (Number(remaining?.count ?? 0) === 0) {
      await db.update(campaigns).set({
        status: "completed",
        completedAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(campaigns.id, campaign.id));
      logger.info("Campaign completed", { campaignId: campaign.id });
    }
    return;
  }

  for (const contact of pendingContacts) {
    const [claimed] = await db
      .update(campaignContacts)
      .set({ status: "claiming", lastAttemptAt: new Date() })
      .where(and(eq(campaignContacts.id, contact.id), eq(campaignContacts.status, "pending")))
      .returning({ id: campaignContacts.id });

    if (!claimed) continue;

    try {
      await initiateContactCall(campaign, contact);
    } catch (err) {
      logger.error("Failed to initiate contact call", err instanceof Error ? err : undefined, {
        campaignId: campaign.id,
        contactId: contact.id,
      });

      await db.update(campaignContacts).set({
        status: "failed",
        lastCallDisposition: "initiation_error",
        lastAttemptAt: new Date(),
        attemptCount: (contact.attemptCount ?? 0) + 1,
      }).where(eq(campaignContacts.id, contact.id));

      await db.update(campaigns).set({
        failedCount: sql`COALESCE(${campaigns.failedCount}, 0) + 1`,
        updatedAt: new Date(),
      }).where(eq(campaigns.id, campaign.id));
    }
  }
}

async function initiateContactCall(
  campaign: typeof campaigns.$inferSelect,
  contact: typeof campaignContacts.$inferSelect
): Promise<void> {
  const countryCode = contact.countryCode || campaign.countryCode || "GB";

  const dncResult = await isOnDNCList(campaign.orgId, contact.phoneNumberE164);
  if (dncResult) {
    await db.update(campaignContacts).set({
      status: "failed",
      dncChecked: true,
      dncResult: "blocked",
      dncCheckedAt: new Date(),
      lastCallDisposition: "dnc_blocked",
    }).where(eq(campaignContacts.id, contact.id));

    await db.update(campaigns).set({
      failedCount: sql`COALESCE(${campaigns.failedCount}, 0) + 1`,
      updatedAt: new Date(),
    }).where(eq(campaigns.id, campaign.id));
    return;
  }

  await db.update(campaignContacts).set({
    dncChecked: true,
    dncResult: "clear",
    dncCheckedAt: new Date(),
  }).where(eq(campaignContacts.id, contact.id));

  const compliance = await runFullComplianceCheck(campaign.orgId, contact.phoneNumberE164, countryCode);
  if (!compliance.allowed) {
    await db.update(campaignContacts).set({
      status: "failed",
      lastCallDisposition: `compliance_blocked: ${compliance.reason}`,
      lastAttemptAt: new Date(),
      attemptCount: (contact.attemptCount ?? 0) + 1,
    }).where(eq(campaignContacts.id, contact.id));

    await db.update(campaigns).set({
      failedCount: sql`COALESCE(${campaigns.failedCount}, 0) + 1`,
      updatedAt: new Date(),
    }).where(eq(campaigns.id, campaign.id));
    return;
  }

  const agentId = campaign.agentId;
  if (!agentId) {
    throw new Error("Campaign has no agent assigned");
  }

  const [agent] = await db
    .select()
    .from(agents)
    .where(and(eq(agents.id, agentId), eq(agents.status, "active")))
    .limit(1);

  if (!agent) {
    throw new Error(`Agent ${agentId} not found or inactive`);
  }

  const [orgPhone] = await db
    .select()
    .from(phoneNumbers)
    .where(and(eq(phoneNumbers.orgId, campaign.orgId), eq(phoneNumbers.isActive, true)))
    .limit(1);

  if (!orgPhone) {
    throw new Error("No active phone number for campaign org");
  }

  let capturedRate = { deploymentModel: "individual", ratePerMinute: 0.20 };
  try {
    const resolved = await resolveRate(campaign.orgId, "voice_outbound");
    capturedRate = { deploymentModel: resolved.deploymentModel, ratePerMinute: resolved.ratePerMinute };
  } catch {
    logger.warn("Rate resolution failed, using default", { campaignId: campaign.id });
  }

  const [orgRecord] = await db.select({ id: orgs.id }).from(orgs).where(eq(orgs.id, campaign.orgId)).limit(1);
  if (!orgRecord) {
    throw new Error("Campaign org not found");
  }

  const [callLog] = await db
    .insert(callLogs)
    .values({
      agentId: agent.id,
      userId: agent.userId ?? 0,
      orgId: campaign.orgId,
      direction: "outbound",
      callerNumber: contact.phoneNumberE164,
      status: "initiating",
      currentState: "GREETING",
      turnCount: 0,
      aiDisclosurePlayed: false,
      startedAt: new Date(),
      billedDeploymentModel: capturedRate.deploymentModel,
      billedRatePerMinute: String(capturedRate.ratePerMinute),
      campaignId: campaign.id,
      campaignContactId: contact.id,
      destinationCountry: countryCode,
    })
    .returning();

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `https://${process.env.REPLIT_DEV_DOMAIN}` || "https://gorigo.ai";
  const webhookUrl = `${baseUrl}/api/telnyx/voice`;

  const callResult = await makeOutboundCall(
    contact.phoneNumberE164,
    orgPhone.phoneNumber,
    webhookUrl,
    { record: false },
    campaign.orgId
  );

  await db.update(callLogs).set({
    providerCallId: callResult.callId,
    status: "ringing",
  }).where(eq(callLogs.id, callLog.id));

  await db.update(campaignContacts).set({
    status: "calling",
    callLogId: callLog.id,
    lastAttemptAt: new Date(),
    attemptCount: (contact.attemptCount ?? 0) + 1,
  }).where(eq(campaignContacts.id, contact.id));

  logger.info("Campaign call initiated", {
    campaignId: campaign.id,
    contactId: contact.id,
    callLogId: callLog.id,
    to: contact.phoneNumberE164,
  });
}

function isWithinCallingHours(campaign: typeof campaigns.$inferSelect): boolean {
  const start = campaign.callingHoursStart;
  const end = campaign.callingHoursEnd;
  const tz = campaign.callingTimezone || "Europe/London";

  if (!start || !end) return true;

  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: tz,
    });
    const currentTime = formatter.format(now);

    return currentTime >= start && currentTime <= end;
  } catch {
    return true;
  }
}

export async function dialCampaignContact(
  campaignId: number,
  contactId: number,
  _orgId: number
): Promise<Record<string, unknown>> {
  const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, campaignId)).limit(1);
  if (!campaign) return { success: false, reason: "Campaign not found" };

  const [contact] = await db.select().from(campaignContacts).where(eq(campaignContacts.id, contactId)).limit(1);
  if (!contact) return { success: false, reason: "Contact not found" };

  await initiateContactCall(campaign, contact);
  return { success: true, campaignId, contactId };
}
