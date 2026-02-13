import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agents, callLogs, orgs, twilioPhoneNumbers } from "@/shared/schema";
import { resolveRate, type UsageCategory } from "@/lib/rate-resolver";
import { eq, and } from "drizzle-orm";
import { DEFAULT_VOICE, DEFAULT_LANGUAGE, validateTwilioSignature } from "@/lib/twilio";
import { isWithinBusinessHours, getNextOpenTime, type BusinessHoursConfig } from "@/lib/business-hours";
import twilio from "twilio";
import { recordConsent } from "@/lib/dnc";

function twimlResponse(xml: string) {
  return new NextResponse(xml, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

function getWebhookUrl(request: NextRequest): string {
  const proto = request.headers.get("x-forwarded-proto") || "https";
  const host = request.headers.get("host") || "";
  return `${proto}://${host}${new URL(request.url).pathname}`;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const callSid = formData.get("CallSid") as string;
    const callerNumber = formData.get("From") as string;
    const calledNumber = formData.get("To") as string;
    const direction = formData.get("Direction") as string;

    // Step 1: Extract signature and params for validation
    const signature = request.headers.get("x-twilio-signature") || "";
    const params: Record<string, string> = {};
    formData.forEach((value, key) => { params[key] = value.toString(); });
    const webhookUrl = getWebhookUrl(request);

    // Step 2: Try platform-level validation first (no DB lookup needed)
    const platformAuthToken = process.env.TWILIO_AUTH_TOKEN;
    let signatureValid = false;

    if (platformAuthToken) {
      signatureValid = twilio.validateRequest(platformAuthToken, signature, webhookUrl, params);
    }

    // Step 3: Now do the DB lookup to find the phone record
    const [phoneRecord] = await db
      .select()
      .from(twilioPhoneNumbers)
      .where(and(eq(twilioPhoneNumbers.phoneNumber, calledNumber), eq(twilioPhoneNumbers.isActive, true)))
      .limit(1);

    if (!phoneRecord || !phoneRecord.orgId) {
      // If signature wasn't valid with platform creds and no phone record, reject
      if (!signatureValid) {
        return new NextResponse("Unauthorized", { status: 403 });
      }
      // Phone not found but signature was valid (legitimate Twilio request to unconfigured number)
      const vr = new twilio.twiml.VoiceResponse();
      vr.say({ voice: DEFAULT_VOICE, language: DEFAULT_LANGUAGE }, "We're sorry, this number is not currently in service. Please try again later.");
      vr.hangup();
      return twimlResponse(vr.toString());
    }

    const orgId = phoneRecord.orgId;

    // Step 4: If platform validation didn't pass, try BYOK validation
    if (!signatureValid) {
      signatureValid = await validateTwilioSignature(webhookUrl, params, signature, orgId);
    }

    if (!signatureValid) {
      return new NextResponse("Unauthorized", { status: 403 });
    }

    const [orgRecord] = await db.select().from(orgs).where(eq(orgs.id, orgId)).limit(1);
    if (orgRecord) {
      const businessHours = orgRecord.businessHours as BusinessHoursConfig | null;
      if (businessHours && businessHours.enabled && !isWithinBusinessHours(businessHours)) {
        const vr = new twilio.twiml.VoiceResponse();
        if (orgRecord.voicemailEnabled) {
          const vmGreeting = orgRecord.voicemailGreeting || "We are currently closed. Please leave a message after the tone and we will get back to you.";
          vr.say({ voice: DEFAULT_VOICE as any, language: DEFAULT_LANGUAGE as any }, vmGreeting);
          vr.say({ voice: DEFAULT_VOICE as any, language: DEFAULT_LANGUAGE as any }, getNextOpenTime(businessHours));
          vr.record({
            action: `/api/twilio/voicemail?orgId=${orgId}`,
            maxLength: 120,
            transcribe: true,
            playBeep: true,
          });
        } else {
          vr.say({ voice: DEFAULT_VOICE as any, language: DEFAULT_LANGUAGE as any }, `Thank you for calling. We are currently closed. ${getNextOpenTime(businessHours)} Goodbye.`);
          vr.hangup();
        }
        return twimlResponse(vr.toString());
      }
    }

    const orgAgents = await db
      .select()
      .from(agents)
      .where(and(eq(agents.orgId, orgId), eq(agents.status, "active")))
      .limit(10);

    let activeAgent = orgAgents.find(a => a.inboundEnabled && !a.isRouter) || orgAgents[0];

    if (!activeAgent) {
      const vr = new twilio.twiml.VoiceResponse();
      vr.say({ voice: DEFAULT_VOICE, language: DEFAULT_LANGUAGE }, "We're sorry, no agent is available to take your call right now. Please try again later.");
      vr.hangup();
      return twimlResponse(vr.toString());
    }

    const callDirection = direction?.includes("inbound") ? "inbound" : "outbound";
    const rateCategory: UsageCategory = callDirection === "outbound" ? "voice_outbound" : "voice_inbound";
    let capturedRate: { deploymentModel: string; ratePerMinute: number } = { deploymentModel: "managed", ratePerMinute: 0.15 };
    try {
      const resolved = await resolveRate(orgId, rateCategory);
      capturedRate = { deploymentModel: resolved.deploymentModel, ratePerMinute: resolved.ratePerMinute };
    } catch (rateErr) {
      console.error("[Voice] Rate capture failed, using default:", rateErr);
    }

    const [callLog] = await db
      .insert(callLogs)
      .values({
        agentId: activeAgent.id,
        userId: activeAgent.userId,
        orgId,
        direction: callDirection,
        callerNumber,
        status: "in-progress",
        twilioCallSid: callSid,
        currentState: "GREETING",
        turnCount: 0,
        aiDisclosurePlayed: false,
        startedAt: new Date(),
        billedDeploymentModel: capturedRate.deploymentModel,
        billedRatePerMinute: String(capturedRate.ratePerMinute),
      })
      .returning();

    const agentVoice = (activeAgent.voiceName || DEFAULT_VOICE) as any;
    const agentLanguage = (activeAgent.language || DEFAULT_LANGUAGE) as any;

    const greeting = activeAgent.greeting || "Hello, thank you for calling. How can I help you today?";

    const aiDisclosure = `I'm ${activeAgent.name}, an AI assistant.`;
    const recordingDisclosure = "This call is being recorded for quality and training purposes. By continuing, you consent to being recorded.";
    const fullDisclosure = `${recordingDisclosure} ${aiDisclosure} `;

    const vr = new twilio.twiml.VoiceResponse();
    const gather = vr.gather({
      input: ["speech"] as any,
      action: `/api/twilio/gather?callLogId=${callLog.id}&agentId=${activeAgent.id}&orgId=${orgId}`,
      method: "POST",
      speechTimeout: "auto",
      language: agentLanguage,
    });
    gather.say({ voice: agentVoice, language: agentLanguage }, fullDisclosure + greeting);

    vr.say({ voice: agentVoice, language: agentLanguage }, "I didn't catch that. Let me try again.");
    vr.redirect(`/api/twilio/voice?retry=1&callLogId=${callLog.id}&agentId=${activeAgent.id}&orgId=${orgId}`);

    await db
      .update(callLogs)
      .set({ aiDisclosurePlayed: true, aiDisclosureVersion: "v2-twilio-consent" })
      .where(eq(callLogs.id, callLog.id));

    await recordConsent(orgId, callerNumber, "ai_call", true, "verbal_ivr", aiDisclosure, callLog.id);
    await recordConsent(orgId, callerNumber, "recording", true, "verbal_continuation", recordingDisclosure, callLog.id);

    return twimlResponse(vr.toString());
  } catch (error) {
    console.error("Twilio voice webhook error:", error);
    const vr = new twilio.twiml.VoiceResponse();
    vr.say({ voice: DEFAULT_VOICE, language: DEFAULT_LANGUAGE }, "We're experiencing technical difficulties. Please try again later.");
    vr.hangup();
    return twimlResponse(vr.toString());
  }
}
