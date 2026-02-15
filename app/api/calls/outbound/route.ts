import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agents, callLogs, twilioPhoneNumbers } from "@/shared/schema";
import { resolveRate } from "@/lib/rate-resolver";
import { eq, and } from "drizzle-orm";
import { getAuthenticatedUser, requireApiKeyScope, requireEmailVerified } from "@/lib/get-user";
import { isTwilioConfigured, makeOutboundCall } from "@/lib/twilio";
import { hasInsufficientBalance } from "@/lib/wallet";
import { isOnDNCList, hasValidConsent } from "@/lib/dnc";
import { canStartCall, getMinCallBalance } from "@/lib/call-limits";
import { logAudit } from "@/lib/audit";
import { callLimiter } from "@/lib/rate-limit";
import { runFullComplianceCheck } from "@/lib/compliance-engine";
import { runFraudCheck } from "@/lib/fraud-engine";

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

    const { isTwilioConfiguredForOrg } = await import("@/lib/twilio");
    const twilioReady = await isTwilioConfiguredForOrg(auth.orgId);
    if (!isTwilioConfigured() && !twilioReady) {
      return NextResponse.json({ error: "Telephony is not configured. Please set up Twilio credentials in Settings > Integrations." }, { status: 503 });
    }

    const body = await request.json();
    const { phoneNumber, agentId } = body;

    if (!phoneNumber || typeof phoneNumber !== "string") {
      return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
    }

    const e164Regex = /^\+[1-9]\d{6,14}$/;
    const sanitizedPhone = phoneNumber.replace(/[\s\-().]/g, "");
    if (!e164Regex.test(sanitizedPhone)) {
      return NextResponse.json({ error: "Invalid phone number. Use E.164 format (e.g. +14155551234)" }, { status: 400 });
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
    let countryCode = body.countryCode as string | undefined;
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
      .from(twilioPhoneNumbers)
      .where(and(eq(twilioPhoneNumbers.orgId, auth.orgId), eq(twilioPhoneNumbers.isActive, true)))
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

    let capturedRate: { deploymentModel: string; ratePerMinute: number } = { deploymentModel: "managed", ratePerMinute: 0.15 };
    try {
      const resolved = await resolveRate(auth.orgId, "voice_outbound");
      capturedRate = { deploymentModel: resolved.deploymentModel, ratePerMinute: resolved.ratePerMinute };
    } catch (rateErr) {
      console.error("[Outbound] Rate capture failed, using default:", rateErr);
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

    const webhookUrl = `${baseUrl}/api/twilio/voice`;

    const hasRecordingConsent = await hasValidConsent(auth.orgId, sanitizedPhone, "recording");

    try {
      const twilioCall = await makeOutboundCall(sanitizedPhone, orgPhone.phoneNumber, webhookUrl, { record: hasRecordingConsent }, auth.orgId);

      await db
        .update(callLogs)
        .set({
          twilioCallSid: twilioCall.sid,
          status: "ringing",
        })
        .where(eq(callLogs.id, callLog.id));

      try {
        await logAudit({
          actorId: auth.user.id,
          actorEmail: auth.user.email,
          action: "call_outbound_initiate",
          entityType: "call",
          entityId: callLog.id,
          details: { toNumber: sanitizedPhone },
        });
      } catch (auditErr) {
        console.error("Audit log error:", auditErr);
      }

      return NextResponse.json({
        callId: callLog.id,
        twilioSid: twilioCall.sid,
        status: "ringing",
        to: sanitizedPhone,
        from: orgPhone.phoneNumber,
        agent: agent.name,
      }, { status: 201 });
    } catch (twilioErr) {
      await db
        .update(callLogs)
        .set({ status: "failed", finalOutcome: "dial_failed", endedAt: new Date() })
        .where(eq(callLogs.id, callLog.id));

      console.error("Outbound call failed:", twilioErr);
      return NextResponse.json({ error: "Failed to initiate call. Please try again." }, { status: 500 });
    }
  } catch (error) {
    console.error("Outbound call API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
