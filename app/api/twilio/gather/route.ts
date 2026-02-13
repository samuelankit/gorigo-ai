import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agents, callLogs, knowledgeChunks } from "@/shared/schema";
import { eq, and, count } from "drizzle-orm";
import { generateAgentResponse } from "@/lib/ai";
import { evaluateTransition, isValidState, STATE_ALLOWED_ACTIONS, type FSMState, type FSMConfig } from "@/lib/fsm";
import { searchKnowledge, buildRAGContext, checkResponseCache } from "@/lib/rag";
import { DEFAULT_VOICE, DEFAULT_LANGUAGE, validateTwilioSignature } from "@/lib/twilio";
import { analyzeSentimentLocal } from "@/lib/sentiment";
import { redactPII } from "@/lib/pii-redaction";
import twilio from "twilio";

const MAX_TURNS_BEFORE_CLOSE = 15;

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

function detectHumanRequest(message: string): boolean {
  const patterns = [
    /speak\s+to\s+(a\s+)?(human|person|agent|representative|manager|someone)/i,
    /transfer\s+me/i,
    /real\s+person/i,
    /human\s+agent/i,
    /talk\s+to\s+someone/i,
    /let\s+me\s+speak/i,
    /get\s+me\s+(a\s+)?(human|person|agent|representative|manager)/i,
    /want\s+(a\s+)?(human|person|agent|representative|manager)/i,
  ];
  return patterns.some((p) => p.test(message));
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const callLogId = parseInt(searchParams.get("callLogId") || "0");
    const agentId = parseInt(searchParams.get("agentId") || "0");
    const orgId = parseInt(searchParams.get("orgId") || "0");

    const formData = await request.formData();

    const signature = request.headers.get("x-twilio-signature") || "";
    const params: Record<string, string> = {};
    formData.forEach((value, key) => { params[key] = value.toString(); });
    const webhookUrl = getWebhookUrl(request);
    if (!await validateTwilioSignature(webhookUrl, params, signature, orgId || undefined)) {
      return new NextResponse("Unauthorized", { status: 403 });
    }

    const speechResult = formData.get("SpeechResult") as string;
    const confidence = parseFloat(formData.get("Confidence") as string || "0.8");

    if (!speechResult || !callLogId || !agentId || !orgId) {
      const vr = new twilio.twiml.VoiceResponse();
      vr.say({ voice: DEFAULT_VOICE, language: DEFAULT_LANGUAGE }, "I didn't catch that. Could you please repeat?");
      const gather = vr.gather({
        input: ["speech"] as any,
        action: `/api/twilio/gather?callLogId=${callLogId}&agentId=${agentId}&orgId=${orgId}`,
        method: "POST",
        speechTimeout: "auto",
        language: DEFAULT_LANGUAGE,
      });
      gather.say({ voice: DEFAULT_VOICE, language: DEFAULT_LANGUAGE }, "I'm still here. How can I help you?");
      return twimlResponse(vr.toString());
    }

    const [agent] = await db.select().from(agents).where(and(eq(agents.id, agentId), eq(agents.orgId, orgId))).limit(1);
    if (!agent) {
      const vr = new twilio.twiml.VoiceResponse();
      vr.say({ voice: DEFAULT_VOICE, language: DEFAULT_LANGUAGE }, "I'm sorry, I'm unable to continue this call. Goodbye.");
      vr.hangup();
      return twimlResponse(vr.toString());
    }

    const agentVoice = (agent.voiceName || DEFAULT_VOICE) as any;
    const agentLanguage = (agent.language || DEFAULT_LANGUAGE) as any;

    const [callLog] = await db.select().from(callLogs).where(and(eq(callLogs.id, callLogId), eq(callLogs.orgId, orgId))).limit(1);
    if (!callLog) {
      const vr = new twilio.twiml.VoiceResponse();
      vr.say({ voice: agentVoice, language: agentLanguage }, "I'm sorry, something went wrong. Goodbye.");
      vr.hangup();
      return twimlResponse(vr.toString());
    }

    const currentState = (callLog.currentState as FSMState) || "GREETING";
    const turnCount = (callLog.turnCount || 0) + 1;

    if (turnCount > MAX_TURNS_BEFORE_CLOSE) {
      const vr = new twilio.twiml.VoiceResponse();
      vr.say({ voice: agentVoice, language: agentLanguage }, "Thank you for your time. If you need further assistance, please call back. Goodbye.");
      vr.hangup();
      await db.update(callLogs).set({
        currentState: "CLOSE",
        turnCount,
        status: "completed",
        finalOutcome: "max_turns_exceeded",
        endedAt: new Date(),
      }).where(eq(callLogs.id, callLogId));
      return twimlResponse(vr.toString());
    }

    const userRequestedHuman = detectHumanRequest(speechResult);

    const fsmConfig: FSMConfig = {
      maxTurns: agent.maxTurns || 10,
      confidenceThreshold: Number(agent.confidenceThreshold) || 0.55,
      perStateRetries: 2,
    };

    const agentConfig = {
      name: agent.name,
      greeting: agent.greeting || "",
      businessDescription: agent.businessDescription,
      roles: agent.roles || "receptionist",
      faqEntries: (agent.faqEntries as Array<{ question: string; answer: string }>) || [],
      complianceDisclosure: agent.complianceDisclosure ?? true,
      negotiationEnabled: agent.negotiationEnabled ?? false,
      negotiationGuardrails: agent.negotiationGuardrails as any,
    };

    let ragContext = "";
    const [hasKnowledge] = await db
      .select({ total: count() })
      .from(knowledgeChunks)
      .where(eq(knowledgeChunks.orgId, orgId));

    if (Number(hasKnowledge.total) > 0) {
      try {
        const relevantChunks = await searchKnowledge(orgId, speechResult);
        if (relevantChunks.length > 0) {
          ragContext = buildRAGContext(relevantChunks);
        }
      } catch (ragErr) {
        console.error("RAG search error during call:", ragErr);
      }
    }

    const fsmConstraints = `
You are on a LIVE PHONE CALL. Respond naturally as if speaking. Keep responses concise (2-3 sentences max).
Current conversation state: ${currentState}
Turn: ${turnCount}/${fsmConfig.maxTurns}
Allowed actions: ${STATE_ALLOWED_ACTIONS[currentState]?.join(", ") || "none"}
${userRequestedHuman ? "IMPORTANT: The caller has requested to speak with a human. Acknowledge this and prepare for handoff." : ""}

Respond with ONLY the text you want to speak to the caller. Do NOT include JSON, state transitions, or metadata.
Be conversational, warm, and concise. This is a voice call, so keep it natural.
`;

    const conversationHistory: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: fsmConstraints + ragContext },
    ];

    const existingTranscript = callLog.transcript || "";
    if (existingTranscript) {
      const lines = existingTranscript.split("\n").filter(Boolean);
      for (const line of lines.slice(-6)) {
        if (line.startsWith("Caller: ")) {
          conversationHistory.push({ role: "user", content: line.replace("Caller: ", "") });
        } else if (line.startsWith("Agent: ")) {
          conversationHistory.push({ role: "assistant", content: line.replace("Agent: ", "") });
        }
      }
    }

    const aiResponse = await generateAgentResponse(agentConfig, conversationHistory, speechResult, orgId);
    let responseText = aiResponse.content;

    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        responseText = parsed.assistantText || parsed.text || parsed.response || responseText;
      }
    } catch {}

    responseText = responseText
      .replace(/\{[\s\S]*\}/g, "")
      .replace(/```[\s\S]*?```/g, "")
      .replace(/\*\*/g, "")
      .replace(/\*/g, "")
      .trim();

    if (!responseText) {
      responseText = "I'm sorry, could you repeat that?";
    }

    const fsmContext = {
      currentState,
      turnCount,
      lastConfidence: Number(callLog.lastConfidence),
      lowConfidenceCount: confidence < fsmConfig.confidenceThreshold ? 1 : 0,
      stateRetries: {} as Record<string, number>,
    };

    let proposedNextState: FSMState = currentState;
    if (userRequestedHuman) {
      proposedNextState = "HANDOFF";
    } else if (currentState === "GREETING") {
      proposedNextState = "INTENT_CAPTURE";
    }

    const transition = evaluateTransition(fsmContext, proposedNextState, confidence, userRequestedHuman, fsmConfig);

    const piiResult = redactPII(speechResult);
    const redactedSpeech = piiResult.redactedText;
    const updatedTranscript = existingTranscript + `Caller: ${redactedSpeech}\nAgent: ${responseText}\n`;

    const sentiment = analyzeSentimentLocal(speechResult);
    const sentimentHistory = Array.isArray(callLog.sentimentHistory) ? [...(callLog.sentimentHistory as any[])] : [];
    sentimentHistory.push({
      turn: turnCount,
      score: sentiment.score,
      label: sentiment.label,
      keywords: sentiment.keywords,
      timestamp: new Date().toISOString(),
    });

    await db.update(callLogs).set({
      currentState: transition.nextState,
      turnCount,
      lastConfidence: String(confidence),
      transcript: updatedTranscript,
      handoffTriggered: transition.shouldHandoff,
      handoffReason: transition.handoffReason,
      handoffAt: transition.shouldHandoff ? new Date() : undefined,
      sentimentScore: String(sentiment.score),
      sentimentLabel: sentiment.label,
      sentimentHistory: sentimentHistory,
    }).where(eq(callLogs.id, callLogId));

    const vr = new twilio.twiml.VoiceResponse();

    if (transition.shouldHandoff && agent.handoffEnabled) {
      const handoffNumber = agent.handoffTargetValue || agent.handoffNumber;
      vr.say({ voice: agentVoice, language: agentLanguage }, responseText);

      let handoffContext = "";
      try {
        const { content: contextSummary } = await generateAgentResponse(
          { name: "Summarizer", greeting: "", businessDescription: null, roles: "receptionist", faqEntries: null, complianceDisclosure: false, negotiationEnabled: false, negotiationGuardrails: null },
          [],
          `Summarize for handoff: ${updatedTranscript.slice(-500)}`,
          orgId
        );
        handoffContext = contextSummary;
      } catch {}

      if (handoffNumber) {
        vr.say({ voice: agentVoice, language: agentLanguage }, "I'm now transferring you to a team member. Please hold.");
        vr.dial({}, handoffNumber);
      } else {
        vr.say({ voice: agentVoice, language: agentLanguage }, "Unfortunately, no one is available to take your call right now. Please try calling back during business hours. Goodbye.");
        vr.hangup();
      }

      await db.update(callLogs).set({
        status: "handoff",
        finalOutcome: "handoff_to_human",
        endedAt: new Date(),
        summary: handoffContext || `Call transferred to human agent. Reason: ${transition.handoffReason || "caller request"}`,
      }).where(eq(callLogs.id, callLogId));

      return twimlResponse(vr.toString());
    }

    if (transition.nextState === "CLOSE") {
      vr.say({ voice: agentVoice, language: agentLanguage }, responseText);
      vr.say({ voice: agentVoice, language: agentLanguage }, "Thank you for calling. Have a great day. Goodbye.");
      vr.hangup();

      await db.update(callLogs).set({
        status: "completed",
        finalOutcome: "completed_normally",
        endedAt: new Date(),
      }).where(eq(callLogs.id, callLogId));

      return twimlResponse(vr.toString());
    }

    const gather = vr.gather({
      input: ["speech"] as any,
      action: `/api/twilio/gather?callLogId=${callLogId}&agentId=${agentId}&orgId=${orgId}`,
      method: "POST",
      speechTimeout: "auto",
      language: agentLanguage,
    });
    gather.say({ voice: agentVoice, language: agentLanguage }, responseText);

    vr.say({ voice: agentVoice, language: agentLanguage }, "Are you still there?");
    vr.redirect(`/api/twilio/gather?callLogId=${callLogId}&agentId=${agentId}&orgId=${orgId}&silence=1`);

    return twimlResponse(vr.toString());
  } catch (error) {
    console.error("Twilio gather webhook error:", error);
    const vr = new twilio.twiml.VoiceResponse();
    vr.say({ voice: DEFAULT_VOICE, language: DEFAULT_LANGUAGE }, "I'm sorry, I encountered an error. Let me try again.");
    vr.pause({ length: 1 });
    vr.say({ voice: DEFAULT_VOICE, language: DEFAULT_LANGUAGE }, "How can I help you?");
    const gather = vr.gather({
      input: ["speech"] as any,
      speechTimeout: "auto",
      language: DEFAULT_LANGUAGE,
    });
    return twimlResponse(vr.toString());
  }
}
