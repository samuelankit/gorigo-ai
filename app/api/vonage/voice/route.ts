import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agents, callLogs, orgs, phoneNumbers } from "@/shared/schema";
import { resolveRate, type UsageCategory } from "@/lib/rate-resolver";
import { eq, and } from "drizzle-orm";
import { validateVonageWebhook, talkAction, inputAction, buildNCCO } from "@/lib/vonage";
import { isWithinBusinessHours, getNextOpenTime, type BusinessHoursConfig } from "@/lib/business-hours";
import { recordConsent } from "@/lib/dnc";
import { getCountryVoiceConfig, getDisclosureText } from "@/lib/compliance-engine";
import { callLimiter } from "@/lib/rate-limit";
import { createLogger } from "@/lib/logger";
import { initCallConversation, generateVoiceResponse, cleanupCallConversation } from "@/lib/voice-ai";

const logger = createLogger("VonageVoice");

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

    const authHeader = request.headers.get("authorization") || "";

    if (process.env.VONAGE_SIGNATURE_SECRET) {
      if (!authHeader) {
        logger.warn("Missing Vonage webhook Authorization header");
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
      const isValid = validateVonageWebhook(rawBody, authHeader);
      if (!isValid) {
        logger.warn("Invalid Vonage webhook signature");
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
    } else if (process.env.NODE_ENV === "production") {
      logger.warn("VONAGE_SIGNATURE_SECRET not set — rejecting webhook in production");
      return NextResponse.json({ error: "Webhook validation not configured" }, { status: 503 });
    }

    const status = body.status as string || "";
    const direction = body.direction as string || "";
    const callUuid = body.uuid as string || "";
    const conversationUuid = body.conversation_uuid as string || "";
    const from = body.from as string || "";
    const to = body.to as string || "";

    logger.info(`Vonage webhook: status=${status} direction=${direction}`, { callUuid, conversationUuid });

    if (status === "ringing" && direction === "inbound") {
      return await handleIncomingCall(callUuid, from, to, request);
    }

    if (status === "answered") {
      return await handleCallAnswered(callUuid, from, to);
    }

    if (status === "completed") {
      return await handleCallCompleted(callUuid, body);
    }

    if (body.type === "transfer" || body.type === "input") {
      return await handleInput(callUuid, body);
    }

    return NextResponse.json([{ action: "talk", text: "" }]);
  } catch (error) {
    logger.error("Vonage voice webhook error", error instanceof Error ? error : undefined);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function handleIncomingCall(
  callUuid: string,
  callerNumber: string,
  calledNumber: string,
  request: NextRequest
): Promise<NextResponse> {
  try {
    const normalizedCalled = calledNumber.replace(/[^0-9]/g, "");
    const searchVariants = [
      calledNumber,
      `+${normalizedCalled}`,
      normalizedCalled,
    ];

    let phoneRecord = null;
    for (const variant of searchVariants) {
      const [result] = await db
        .select()
        .from(phoneNumbers)
        .where(and(eq(phoneNumbers.phoneNumber, variant), eq(phoneNumbers.isActive, true)))
        .limit(1);
      if (result) {
        phoneRecord = result;
        break;
      }
    }

    if (!phoneRecord || !phoneRecord.orgId) {
      return NextResponse.json(buildNCCO([
        talkAction("We're sorry, this number is not currently in service. Please try again later."),
      ]));
    }

    const orgId = phoneRecord.orgId;

    const [orgRecord] = await db.select().from(orgs).where(eq(orgs.id, orgId)).limit(1);
    if (orgRecord) {
      const businessHours = orgRecord.businessHours as BusinessHoursConfig | null;
      if (businessHours && businessHours.enabled && !isWithinBusinessHours(businessHours)) {
        const closedMsg = `Thank you for calling. We are currently closed. ${getNextOpenTime(businessHours)} Goodbye.`;
        return NextResponse.json(buildNCCO([talkAction(closedMsg)]));
      }
    }

    const orgAgents = await db
      .select()
      .from(agents)
      .where(and(eq(agents.orgId, orgId), eq(agents.status, "active")))
      .limit(10);

    const activeAgent = orgAgents.find(a => a.inboundEnabled && !a.isRouter) || orgAgents[0];

    if (!activeAgent) {
      return NextResponse.json(buildNCCO([
        talkAction("We're sorry, no agent is available to take your call right now. Please try again later."),
      ]));
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
        callerNumber: callerNumber.startsWith("+") ? callerNumber : `+${callerNumber}`,
        status: "in-progress",
        providerCallId: callUuid,
        currentState: "GREETING",
        turnCount: 0,
        aiDisclosurePlayed: false,
        startedAt: new Date(),
        billedDeploymentModel: capturedRate.deploymentModel,
        billedRatePerMinute: String(capturedRate.ratePerMinute),
      });

    initCallConversation(callUuid, activeAgent.id);

    const phoneCountryCode = phoneRecord.countryCode;
    const agentLanguage = activeAgent.language || "en-GB";

    let disclosureText: string;
    if (phoneCountryCode) {
      const countryDisclosure = await getDisclosureText(phoneCountryCode, agentLanguage);
      disclosureText = countryDisclosure || `I'm ${activeAgent.name}, an AI assistant. This call may be recorded.`;
    } else {
      disclosureText = `This call is being recorded for quality and training purposes. By continuing, you consent to being recorded. I'm ${activeAgent.name}, an AI assistant.`;
    }

    const greeting = activeAgent.greeting || "Hello, thank you for calling. How can I help you today?";
    const fullMessage = `${disclosureText} ${greeting}`;

    await db
      .update(callLogs)
      .set({ aiDisclosurePlayed: true, aiDisclosureVersion: "v2-vonage-consent" })
      .where(eq(callLogs.providerCallId, callUuid));

    await recordConsent(orgId, callerNumber.startsWith("+") ? callerNumber : `+${callerNumber}`, "ai_call", true, "verbal_ivr", disclosureText);
    await recordConsent(orgId, callerNumber.startsWith("+") ? callerNumber : `+${callerNumber}`, "recording", true, "verbal_continuation", disclosureText);

    return NextResponse.json(buildNCCO([
      talkAction(fullMessage, {
        voiceName: activeAgent.voiceName || "Amy",
        language: agentLanguage,
        bargeIn: true,
      }),
      inputAction({
        type: ["dtmf", "speech"],
        dtmf: { maxDigits: 10, timeOut: 10, submitOnHash: true },
        speech: { language: agentLanguage, endOnSilence: 2 },
      }),
    ]));
  } catch (err) {
    logger.error("Failed to handle incoming Vonage call", err instanceof Error ? err : undefined);
    return NextResponse.json(buildNCCO([
      talkAction("We're experiencing technical difficulties. Please try again later."),
    ]));
  }
}

async function handleInput(
  callUuid: string,
  body: Record<string, unknown>
): Promise<NextResponse> {
  const dtmfDigits = (body.dtmf as Record<string, unknown>)?.digits as string || "";
  const speechResults = (body.speech as Record<string, unknown>)?.results as Array<Record<string, unknown>> | undefined;
  const speechText = speechResults?.[0]?.text as string || "";
  const userInput = speechText || dtmfDigits;

  logger.info("Vonage input received", { callUuid, dtmfDigits, speechText });

  if (!userInput) {
    return NextResponse.json(buildNCCO([
      talkAction("I didn't catch that. Could you please repeat?", { voiceName: "Amy", language: "en-GB", bargeIn: true }),
      inputAction({
        type: ["speech", "dtmf"],
        speech: { language: "en-GB", endOnSilence: 2 },
        dtmf: { maxDigits: 10, timeOut: 10 },
      }),
    ]));
  }

  try {
    const [callLog] = await db
      .select()
      .from(callLogs)
      .where(eq(callLogs.providerCallId, callUuid))
      .limit(1);

    if (!callLog) {
      return NextResponse.json(buildNCCO([
        talkAction("I'm sorry, I'm having trouble with this call. Please try calling again."),
      ]));
    }

    const [agent] = await db.select().from(agents).where(eq(agents.id, callLog.agentId)).limit(1);

    const { responseText } = await generateVoiceResponse(
      callUuid,
      userInput,
      callLog.orgId
    );

    const voiceName = agent?.voiceName || "Amy";
    const language = agent?.language || "en-GB";

    return NextResponse.json(buildNCCO([
      talkAction(responseText, { voiceName, language, bargeIn: true }),
      inputAction({
        type: ["speech", "dtmf"],
        speech: { language, endOnSilence: 2 },
        dtmf: { maxDigits: 10, timeOut: 10 },
      }),
    ]));
  } catch (err) {
    logger.error("Failed to handle Vonage input", err instanceof Error ? err : undefined);
    return NextResponse.json(buildNCCO([
      talkAction("I'm sorry, I encountered an issue. Please try again.", { voiceName: "Amy" }),
      inputAction({
        type: ["speech", "dtmf"],
        speech: { language: "en-GB", endOnSilence: 2 },
        dtmf: { maxDigits: 10, timeOut: 10 },
      }),
    ]));
  }
}

async function handleCallAnswered(
  callUuid: string,
  _callerNumber: string,
  _calledNumber: string
): Promise<NextResponse> {
  logger.info("Vonage call answered", { callUuid });
  return NextResponse.json([{ action: "talk", text: "" }]);
}

async function handleCallCompleted(
  callUuid: string,
  body: Record<string, unknown>
): Promise<NextResponse> {
  const durationStr = body.duration as string || "0";
  const duration = parseInt(durationStr, 10) || 0;
  const endTime = body.end_time as string || "";

  logger.info("Vonage call completed", { callUuid, duration });

  cleanupCallConversation(callUuid);

  try {
    await db
      .update(callLogs)
      .set({
        status: "completed",
        endedAt: endTime ? new Date(endTime) : new Date(),
        duration,
        finalOutcome: "completed",
      })
      .where(eq(callLogs.providerCallId, callUuid));
  } catch (err) {
    logger.error("Failed to update call log on completion", err instanceof Error ? err : undefined);
  }

  (async () => {
    try {
      const [completedCall] = await db.select().from(callLogs).where(eq(callLogs.providerCallId, callUuid)).limit(1);
      if (completedCall) {
        const { calculateBasicQuality } = await import("@/lib/call-quality");
        const sentimentScore = completedCall.sentimentScore ? parseFloat(String(completedCall.sentimentScore)) : null;
        const quality = calculateBasicQuality(
          completedCall.turnCount || 0,
          10,
          sentimentScore,
          false,
          completedCall.finalOutcome,
          duration
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
