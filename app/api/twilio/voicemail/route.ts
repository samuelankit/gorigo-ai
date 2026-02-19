import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agents, callLogs } from "@/shared/schema";
import { eq, and } from "drizzle-orm";
import { DEFAULT_VOICE, DEFAULT_LANGUAGE, validateTwilioSignature } from "@/lib/twilio";
import twilio from "twilio";
import { callLimiter } from "@/lib/rate-limit";

function twimlResponse(xml: string) {
  return new NextResponse(xml, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

function getWebhookUrl(request: NextRequest): string {
  const proto = request.headers.get("x-forwarded-proto") || "https";
  const host = request.headers.get("host") || "";
  const url = new URL(request.url);
  return `${proto}://${host}${url.pathname}${url.search}`;
}

export async function POST(request: NextRequest) {
  try {
    const rl = await callLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    const orgId = parseInt(searchParams.get("orgId") || "0");

    const formData = await request.formData();

    const signature = request.headers.get("x-twilio-signature") || "";
    const params: Record<string, string> = {};
    formData.forEach((value, key) => { params[key] = value.toString(); });
    const webhookUrl = getWebhookUrl(request);
    if (!await validateTwilioSignature(webhookUrl, params, signature, orgId || undefined)) {
      console.warn(`[Voicemail] Signature validation failed for orgId=${orgId}, url=${webhookUrl}`);
      return new NextResponse("Unauthorized", { status: 403 });
    }

    const recordingUrl = formData.get("RecordingUrl") as string;
    const recordingSid = formData.get("RecordingSid") as string;
    const recordingDuration = parseInt(formData.get("RecordingDuration") as string || "0");
    const callerNumber = formData.get("From") as string;
    const transcriptionText = formData.get("TranscriptionText") as string;

    if (orgId && recordingUrl) {
      const [activeAgent] = await db
        .select()
        .from(agents)
        .where(and(eq(agents.orgId, orgId), eq(agents.status, "active")))
        .limit(1);

      const agentId = activeAgent?.id || 0;
      const userId = activeAgent?.userId || 0;

      await db.insert(callLogs).values({
        agentId,
        userId,
        orgId,
        direction: "inbound",
        callerNumber: callerNumber || "unknown",
        status: "completed",
        finalOutcome: "voicemail",
        currentState: "CLOSE",
        recordingUrl,
        recordingSid,
        transcript: transcriptionText ? `Voicemail: ${transcriptionText}` : "Voicemail recorded",
        summary: transcriptionText ? `Voicemail from ${callerNumber}: ${transcriptionText}` : `Voicemail from ${callerNumber}`,
        duration: recordingDuration,
        startedAt: new Date(),
        endedAt: new Date(),
      });
    }

    const vr = new twilio.twiml.VoiceResponse();
    vr.say({ voice: DEFAULT_VOICE as any, language: DEFAULT_LANGUAGE as any }, "Thank you. Your message has been recorded. Goodbye.");
    vr.hangup();
    return twimlResponse(vr.toString());
  } catch (error) {
    console.error("Voicemail webhook error:", error);
    const vr = new twilio.twiml.VoiceResponse();
    vr.say({ voice: DEFAULT_VOICE as any, language: DEFAULT_LANGUAGE as any }, "Thank you for calling. Goodbye.");
    vr.hangup();
    return twimlResponse(vr.toString());
  }
}
