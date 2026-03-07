import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agents, callLogs, orgs, phoneNumbers } from "@/shared/schema";
import { resolveRate } from "@/lib/rate-resolver";
import { eq, and } from "drizzle-orm";
import { getAuthenticatedUser, requireApiKeyScope, requireEmailVerified } from "@/lib/get-user";
import { makeOutboundCall, isAnyProviderConfigured, getActiveProvider } from "@/lib/voice-provider";
import { hasInsufficientBalance } from "@/lib/wallet";
import { isOnDNCList, hasValidConsent } from "@/lib/dnc";
import { canStartCall, getMinCallBalance } from "@/lib/call-limits";
import { logAudit } from "@/lib/audit";
import { callLimiter } from "@/lib/rate-limit";
import { runFullComplianceCheck } from "@/lib/compliance-engine";
import { runFraudCheck } from "@/lib/fraud-engine";
import { z } from "zod";
import { handleRouteError } from "@/lib/api-error";
import { createLogger } from "@/lib/logger";

const logger = createLogger("OutboundCall");

const outboundCallSchema = z.object({
  phoneNumber: z.string().min(1).max(20).regex(/^\+?[0-9\s\-()]*$/),
  agentId: z.number().int().positive().optional(),
  countryCode: z.string().min(2).max(3).optional(),
}).strict();

export async function POST(request: NextRequest) {
  try {
    const rl = await callLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const scopeCheck = requireApiKeyScope(auth, "calls:write");
    if (!scopeCheck.allowed) {
      return NextResponse.json({ error: scopeCheck.error }, { status: scopeCheck.status || 403 });
    }

    const verifiedCheck = requireEmailVerified(auth);
    if (!verifiedCheck.allowed) {
      return NextResponse.json({ error: verifiedCheck.error }, { status: verifiedCheck.status || 403 });
    }

    const body = await request.json();
    const { phoneNumber, agentId, countryCode: bodyCountryCode } = outboundCallSchema.parse(body);

    const e164Regex = /^\+[1-9]\d{6,14}$/;
    const sanitizedPhone = phoneNumber.replace(/[\s\-().]/g, "");
    if (!e164Regex.test(sanitizedPhone)) {
      return NextResponse.json({ error: "Invalid phone number. Use E.164 format (e.g. +14155551234)" }, { status: 400 });
    }

    if (!isAnyProviderConfigured()) {
      return NextResponse.json({ error: "Telephony is not configured. Please set up voice provider credentials in Settings > Integrations." }, { status: 503 });
    }

    const isDNC = await isOnDNCList(auth.orgId, sanitizedPhone);
    if (isDNC) {
      return NextResponse.json({ error: "This number is on the Do Not Call list and cannot be dialed." }, { status: 403 });
    }

    const E164_PREFIX_MAP: [string, string][] = [
      ["+1", "US"], ["+44", "GB"], ["+33", "FR"], ["+49", "DE"],
      ["+91", "IN"], ["+61", "AU"], ["+34", "ES"], ["+39", "IT"],
      ["+31", "NL"], ["+81", "JP"], ["+55", "BR"], ["+52", "MX"],
      ["+971", "AE"], ["+65", "SG"], ["+27", "ZA"], ["+353", "IE"],
      ["+46", "SE"], ["+41", "CH"], ["+48", "PL"],
    ];
    let countryCode = bodyCountryCode;
    if (!countryCode) {
      for (const [prefix, code] of E164_PREFIX_MAP) {
        if (sanitizedPhone.startsWith(prefix)) {
          countryCode = code;
          break;
        }
      }
    }

    if (countryCode) {
      const complianceResult = await runFullComplianceCheck(auth.orgId, sanitizedPhone, countryCode);
      if (!complianceResult.allowed) {
        return NextResponse.json({
          error: complianceResult.reason || "Call blocked by compliance check",
          complianceChecks: complianceResult.checks,
        }, { status: 403 });
      }
    }

    const fraudResult = await runFraudCheck(auth.orgId, sanitizedPhone, countryCode);
    if (!fraudResult.allowed) {
      return NextResponse.json({
        error: "Call blocked by fraud detection",
        riskScore: fraudResult.riskScore,
        flags: fraudResult.flags,
      }, { status: 403 });
    }

    const [orgRecord] = await db.select().from(orgs).where(eq(orgs.id, auth.orgId)).limit(1);
    if (!orgRecord || orgRecord.status === "suspended" || orgRecord.status === "terminated") {
      return NextResponse.json({ error: "Your organisation account is currently suspended. Please contact support." }, { status: 403 });
    }

    const callCheck = await canStartCall(auth.orgId);
    if (!callCheck.allowed) {
      return NextResponse.json({ error: callCheck.reason }, { status: 429 });
    }

    const minBalance = await getMinCallBalance(auth.orgId);
    const insufficientBalance = await hasInsufficientBalance(auth.orgId, minBalance);
    if (insufficientBalance) {
      return NextResponse.json({ error: `Insufficient wallet balance. Minimum \u00a3${minBalance.toFixed(2)} required to make calls.` }, { status: 402 });
    }

    const [orgPhone] = await db
      .select()
      .from(phoneNumbers)
      .where(and(eq(phoneNumbers.orgId, auth.orgId), eq(phoneNumbers.isActive, true)))
      .limit(1);

    if (!orgPhone) {
      return NextResponse.json({ error: "No phone number assigned to your organization. Contact your administrator." }, { status: 400 });
    }

    let agent;
    if (agentId) {
      [agent] = await db
        .select()
        .from(agents)
        .where(and(eq(agents.id, agentId), eq(agents.orgId, auth.orgId), eq(agents.status, "active")))
        .limit(1);
    }

    if (!agent) {
      const orgAgents = await db
        .select()
        .from(agents)
        .where(and(eq(agents.orgId, auth.orgId), eq(agents.status, "active"), eq(agents.outboundEnabled, true)))
        .limit(1);
      agent = orgAgents[0];
    }

    if (!agent) {
      const orgAgents = await db
        .select()
        .from(agents)
        .where(and(eq(agents.orgId, auth.orgId), eq(agents.status, "active")))
        .limit(1);
      agent = orgAgents[0];
    }

    if (!agent) {
      return NextResponse.json({ error: "No AI agent configured for your organization" }, { status: 400 });
    }

    let capturedRate: { deploymentModel: string; ratePerMinute: number };
    try {
      const resolved = await resolveRate(auth.orgId, "voice_outbound");
      capturedRate = { deploymentModel: resolved.deploymentModel, ratePerMinute: resolved.ratePerMinute };
    } catch (rateErr) {
      logger.error("Rate resolution failed — blocking call to prevent incorrect billing", rateErr);
      return NextResponse.json({ error: "Unable to determine call rate. Please try again." }, { status: 503 });
    }

    const [callLog] = await db
      .insert(callLogs)
      .values({
        agentId: agent.id,
        userId: auth.user.id,
        orgId: auth.orgId,
        direction: "outbound",
        callerNumber: sanitizedPhone,
        status: "initiating",
        currentState: "GREETING",
        turnCount: 0,
        aiDisclosurePlayed: false,
        startedAt: new Date(),
        billedDeploymentModel: capturedRate.deploymentModel,
        billedRatePerMinute: String(capturedRate.ratePerMinute),
      })
      .returning();

    const baseUrl = request.headers.get("x-forwarded-proto") === "https"
      ? `https://${request.headers.get("host")}`
      : `http://${request.headers.get("host")}`;

    const webhookUrl = `${baseUrl}/api/telnyx/voice`;

    const hasRecordingConsent = await hasValidConsent(auth.orgId, sanitizedPhone, "recording");

    try {
      const callResult = await makeOutboundCall(sanitizedPhone, orgPhone.phoneNumber, webhookUrl, { record: hasRecordingConsent }, auth.orgId);

      const callLogUpdate: Record<string, unknown> = {
        providerCallId: callResult.callId,
        status: "ringing",
      };

      await db
        .update(callLogs)
        .set(callLogUpdate)
        .where(eq(callLogs.id, callLog.id));

      try {
        await logAudit({
          actorId: auth.user.id,
          actorEmail: auth.user.email,
          action: "call_outbound_initiate",
          entityType: "call",
          entityId: callLog.id,
          details: { toNumber: sanitizedPhone, provider: callResult.provider },
        });
      } catch (auditErr) {
        logger.error("Audit log error", auditErr);
      }

      return NextResponse.json({
        callId: callLog.id,
        providerCallId: callResult.callId,
        provider: callResult.provider,
        status: "ringing",
        to: sanitizedPhone,
        from: orgPhone.phoneNumber,
        agent: agent.name,
      }, { status: 201 });
    } catch (callErr) {
      await db
        .update(callLogs)
        .set({ status: "failed", finalOutcome: "dial_failed", endedAt: new Date() })
        .where(eq(callLogs.id, callLog.id));

      logger.error("Outbound call failed", callErr);
      return NextResponse.json({ error: "Failed to initiate call. Please try again." }, { status: 500 });
    }
  } catch (error) {
    return handleRouteError(error, "OutboundCall");
  }
}
