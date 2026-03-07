import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agents, callLogs, orgs, phoneNumbers } from "@/shared/schema";
import { resolveRate, type UsageCategory } from "@/lib/rate-resolver";
import { eq, and } from "drizzle-orm";
import { validateTelnyxWebhook, speakText, speakAndGather, gatherInput, hangupCall, answerCall } from "@/lib/telnyx";
import { isWithinBusinessHours, getNextOpenTime, type BusinessHoursConfig } from "@/lib/business-hours";
import { recordConsent } from "@/lib/dnc";
import { getCountryVoiceConfig, getDisclosureText } from "@/lib/compliance-engine";
import { callLimiter } from "@/lib/rate-limit";
import { createLogger } from "@/lib/logger";
import { initCallConversation, generateVoiceResponse, cleanupCallConversation } from "@/lib/voice-ai";
import { startCallBilling, stopCallBilling } from "@/lib/mid-call-billing";
import { hasInsufficientBalance } from "@/lib/wallet";
import { processCallRefund } from "@/lib/call-refund";

const logger = createLogger("TelnyxVoice");

export async function POST(request: NextRequest) {
  try {
    const rl = await callLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const rawBody = await request.text();
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const signature = request.headers.get("telnyx-signature-ed25519") || "";
    const timestamp = request.headers.get("telnyx-timestamp") || "";

    if (process.env.TELNYX_PUBLIC_KEY) {
      if (!signature || !timestamp) {
        logger.warn("Missing Telnyx webhook signature headers");
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
      const isValid = validateTelnyxWebhook(rawBody, signature, timestamp);
      if (!isValid) {
        logger.warn("Invalid Telnyx webhook signature");
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
    } else if (process.env.NODE_ENV === "production") {
      logger.warn("TELNYX_PUBLIC_KEY not set — rejecting webhook in production");
      return NextResponse.json({ error: "Webhook validation not configured" }, { status: 503 });
    }

    const data = (body.data as Record<string, unknown>) || {};
    const eventType = data.event_type as string || "";
    const payload = (data.payload as Record<string, unknown>) || {};
    const callControlId = payload.call_control_id as string || "";
    const callerNumber = payload.from as string || "";
    const calledNumber = payload.to as string || "";
    const direction = payload.direction as string || "";

    logger.info(`Telnyx webhook: ${eventType}`, { callControlId, direction });

    if (eventType === "call.initiated" && direction === "incoming") {
      return await handleIncomingCall(callControlId, callerNumber, calledNumber);
    }

    if (eventType === "call.answered") {
      return await handleCallAnswered(callControlId, callerNumber, calledNumber);
    }

    if (eventType === "call.hangup") {
      return await handleCallHangup(callControlId, payload);
    }

    if (eventType === "call.speak.ended") {
      return NextResponse.json({ status: "ok" });
    }

    if (eventType === "call.gather.ended") {
      const digits = payload.digits as string || "";
      const speech = (payload.speech as Record<string, unknown>)?.result as string || "";
      const userInput = speech || digits;

      if (userInput) {
        return await handleUserInput(callControlId, userInput);
      }

      await speakAndGather(callControlId, "Sorry, I didn't quite catch that. Could you say that again?");
      return NextResponse.json({ status: "ok" });
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    logger.error("Telnyx voice webhook error", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function handleIncomingCall(
  callControlId: string,
  callerNumber: string,
  calledNumber: string
): Promise<NextResponse> {
  try {
    await answerCall(callControlId);

    const [phoneRecord] = await db
      .select()
      .from(phoneNumbers)
      .where(and(eq(phoneNumbers.phoneNumber, calledNumber), eq(phoneNumbers.isActive, true)))
      .limit(1);

    if (!phoneRecord || !phoneRecord.orgId) {
      await speakText(callControlId, "We're sorry, this number is not currently in service. Please try again later.");
      await hangupCall(callControlId);
      return NextResponse.json({ status: "ok" });
    }

    const orgId = phoneRecord.orgId;

    const insufficientBalance = await hasInsufficientBalance(orgId, 0.01);
    if (insufficientBalance) {
      logger.warn("Rejecting call due to insufficient wallet balance (below £5 minimum)", { orgId, calledNumber });
      await speakText(callControlId, "We're sorry, this service is temporarily unavailable due to insufficient account balance. Please try again later.");
      await hangupCall(callControlId);
      return NextResponse.json({ status: "ok" });
    }

    const [orgRecord] = await db.select().from(orgs).where(eq(orgs.id, orgId)).limit(1);
    if (!orgRecord || orgRecord.status === "suspended" || orgRecord.status === "terminated") {
      logger.warn("Rejecting call: org suspended or terminated", { orgId, status: orgRecord?.status });
      await speakText(callControlId, "We're sorry, this service is currently unavailable. Goodbye.");
      await hangupCall(callControlId);
      return NextResponse.json({ status: "ok" });
    }

    if (orgRecord) {
      const businessHours = orgRecord.businessHours as BusinessHoursConfig | null;
      if (businessHours && businessHours.enabled && !isWithinBusinessHours(businessHours)) {
        const closedMsg = `Thank you for calling. We are currently closed. ${getNextOpenTime(businessHours)} Goodbye.`;
        await speakText(callControlId, closedMsg);
        await hangupCall(callControlId);
        return NextResponse.json({ status: "ok" });
      }
    }

    const orgAgents = await db
      .select()
      .from(agents)
      .where(and(eq(agents.orgId, orgId), eq(agents.status, "active")))
      .limit(10);

    const activeAgent = orgAgents.find(a => a.inboundEnabled && !a.isRouter) || orgAgents[0];

    if (!activeAgent) {
      await speakText(callControlId, "We're sorry, no agent is available to take your call right now. Please try again later.");
      await hangupCall(callControlId);
      return NextResponse.json({ status: "ok" });
    }

    let capturedRate: { deploymentModel: string; ratePerMinute: number } = { deploymentModel: "individual", ratePerMinute: 0.20 };
    try {
      const resolved = await resolveRate(orgId, "voice_inbound" as UsageCategory);
      capturedRate = { deploymentModel: resolved.deploymentModel, ratePerMinute: resolved.ratePerMinute };
    } catch (rateErr) {
      logger.error("Rate capture failed, using default", rateErr instanceof Error ? rateErr : undefined);
    }

    await db
      .insert(callLogs)
      .values({
        agentId: activeAgent.id,
        userId: activeAgent.userId,
        orgId,
        direction: "inbound",
        callerNumber,
        status: "in-progress",
        providerCallId: callControlId,
        currentState: "GREETING",
        turnCount: 0,
        aiDisclosurePlayed: false,
        startedAt: new Date(),
        billedDeploymentModel: capturedRate.deploymentModel,
        billedRatePerMinute: String(capturedRate.ratePerMinute),
      });

    initCallConversation(callControlId, activeAgent.id);
    startCallBilling(callControlId, orgId, capturedRate.ratePerMinute);

    const phoneCountryCode = phoneRecord.countryCode;
    const agentLanguage = activeAgent.language || "en-GB";

    let disclosureText: string;
    if (phoneCountryCode) {
      const countryDisclosure = await getDisclosureText(phoneCountryCode, agentLanguage);
      disclosureText = countryDisclosure || `Just so you know, I'm an AI assistant and this call may be recorded.`;
    } else {
      disclosureText = `Just so you know, I'm an AI assistant and this call may be recorded.`;
    }

    const greeting = activeAgent.greeting || "How can I help you today?";
    const fullMessage = `Hi, I'm ${activeAgent.name}. ${disclosureText} ${greeting}`;

    await speakAndGather(callControlId, fullMessage, {
      voice: activeAgent.voiceName || "female",
      language: agentLanguage,
    });

    await db
      .update(callLogs)
      .set({ aiDisclosurePlayed: true, aiDisclosureVersion: "v2-telnyx-consent" })
      .where(eq(callLogs.providerCallId, callControlId));

    await recordConsent(orgId, callerNumber, "ai_call", true, "verbal_ivr", disclosureText);
    await recordConsent(orgId, callerNumber, "recording", true, "verbal_continuation", disclosureText);

    return NextResponse.json({ status: "ok" });
  } catch (err) {
    logger.error("Failed to handle incoming Telnyx call", err instanceof Error ? err : undefined);
    try {
      await speakText(callControlId, "We're experiencing technical difficulties. Please try again later.");
      await hangupCall(callControlId);
    } catch {}
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}

async function handleUserInput(
  callControlId: string,
  userInput: string
): Promise<NextResponse> {
  try {
    const [callLog] = await db
      .select()
      .from(callLogs)
      .where(eq(callLogs.providerCallId, callControlId))
      .limit(1);

    if (!callLog) {
      await speakText(callControlId, "I'm sorry, I'm having trouble with this call. Please try calling again.");
      await hangupCall(callControlId);
      return NextResponse.json({ status: "ok" });
    }

    const [agent] = await db.select().from(agents).where(eq(agents.id, callLog.agentId)).limit(1);

    const { responseText } = await generateVoiceResponse(
      callControlId,
      userInput,
      callLog.orgId
    );

    await speakAndGather(callControlId, responseText, {
      voice: agent?.voiceName || "female",
      language: agent?.language || "en-GB",
    });

    return NextResponse.json({ status: "ok" });
  } catch (err) {
    logger.error("Failed to handle Telnyx user input", err instanceof Error ? err : undefined);
    try {
      await speakAndGather(callControlId, "Sorry about that, could you say that again?");
    } catch {}
    return NextResponse.json({ status: "ok" });
  }
}

async function handleCallAnswered(
  callControlId: string,
  _callerNumber: string,
  _calledNumber: string
): Promise<NextResponse> {
  logger.info("Call answered", { callControlId });
  return NextResponse.json({ status: "ok" });
}

async function handleCallHangup(
  callControlId: string,
  payload: Record<string, unknown>
): Promise<NextResponse> {
  const hangupCause = payload.hangup_cause as string || "unknown";
  const durationSecs = payload.duration_secs as number || 0;

  logger.info("Call hangup", { callControlId, hangupCause, durationSecs });

  stopCallBilling(callControlId);
  cleanupCallConversation(callControlId);

  try {
    await db
      .update(callLogs)
      .set({
        status: "completed",
        endedAt: new Date(),
        duration: durationSecs,
        finalOutcome: hangupCause === "normal_clearing" ? "completed" : hangupCause,
      })
      .where(eq(callLogs.providerCallId, callControlId));
  } catch (err) {
    logger.error("Failed to update call log on hangup", err instanceof Error ? err : undefined);
  }

  processCallRefund(callControlId, hangupCause, durationSecs).catch(err => {
    logger.error("Auto-refund check failed", err instanceof Error ? err : undefined);
  });

  (async () => {
    try {
      const [completedCall] = await db.select().from(callLogs).where(eq(callLogs.providerCallId, callControlId)).limit(1);
      if (completedCall) {
        const { calculateBasicQuality } = await import("@/lib/call-quality");
        const sentimentScore = completedCall.sentimentScore ? parseFloat(String(completedCall.sentimentScore)) : null;
        const callDuration = completedCall.startedAt && completedCall.endedAt
          ? (new Date(completedCall.endedAt).getTime() - new Date(completedCall.startedAt).getTime()) / 1000
          : durationSecs;
        const quality = calculateBasicQuality(
          completedCall.turnCount || 0,
          10,
          sentimentScore,
          false,
          completedCall.finalOutcome,
          callDuration
        );
        await db.update(callLogs).set({
          qualityScore: String(quality.overallScore),
          qualityBreakdown: quality.breakdown,
          csatPrediction: String(quality.csatPrediction),
          resolutionStatus: quality.resolutionStatus,
        }).where(eq(callLogs.id, completedCall.id));
      }
    } catch (qualityErr) {
      logger.error("Call quality scoring failed", qualityErr instanceof Error ? qualityErr : undefined);
    }
  })();

  return NextResponse.json({ status: "ok" });
}
