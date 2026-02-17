import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agents, callLogs, knowledgeChunks } from "@/shared/schema";
import { eq, and, count } from "drizzle-orm";
import { generateAgentResponse } from "@/lib/ai";
import { evaluateTransition, isValidState, STATE_ALLOWED_ACTIONS, type FSMState, type FSMConfig } from "@/lib/fsm";
import { searchKnowledge, buildRAGContext } from "@/lib/rag";
import { DEFAULT_VOICE, DEFAULT_LANGUAGE, validateTwilioSignature } from "@/lib/twilio";
import { analyzeSentimentLocal } from "@/lib/sentiment";
import { redactPII } from "@/lib/pii-redaction";
import { detectPromptInjection, detectHumanRequest, SAFE_REFUSAL_VOICE } from "@/lib/prompt-guard";
import twilio from "twilio";
import { detectOptOut, handleOptOut } from "@/lib/compliance-engine";
import { logCostEvent, calculateLLMCost } from "@/lib/unit-economics";
import { validateLLMOutput, KNOWLEDGE_ONLY_REFUSAL_VOICE, RAG_GROUNDING_INSTRUCTION } from "@/lib/output-guard";
import { settingsLimiter } from "@/lib/rate-limit";

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

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export async function POST(request: NextRequest) {
  try {
    const rl = await settingsLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

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

    const maxTokensPerCall = agent.maxTokensPerCall ?? 4096;
    const existingTranscript = callLog.transcript || "";
    const currentTokenUsage = estimateTokens(existingTranscript);
    if (currentTokenUsage > maxTokensPerCall) {
      const vr = new twilio.twiml.VoiceResponse();
      vr.say({ voice: agentVoice, language: agentLanguage }, "Thank you for the conversation. For further assistance, please call back or I can connect you with a team member. Goodbye.");
      vr.hangup();
      await db.update(callLogs).set({
        currentState: "CLOSE",
        turnCount,
        status: "completed",
        finalOutcome: "token_budget_exceeded",
        endedAt: new Date(),
      }).where(eq(callLogs.id, callLogId));
      return twimlResponse(vr.toString());
    }

    const optOutCheck = detectOptOut(speechResult);
    if (optOutCheck.detected) {
      const callerNumber = callLog.callerNumber || "";
      await handleOptOut(orgId, callerNumber, callLogId, `Opt-out keyword: "${optOutCheck.keyword}"`);
      await db.update(callLogs).set({
        currentState: "CLOSE",
        turnCount,
        status: "completed",
        finalOutcome: "opt_out",
        complianceOptOutDetected: true,
        endedAt: new Date(),
      }).where(eq(callLogs.id, callLogId));

      const vr = new twilio.twiml.VoiceResponse();
      vr.say({ voice: agentVoice, language: agentLanguage }, "I understand. Your number has been removed from our calling list. You will not receive any further calls from us. Goodbye.");
      vr.hangup();
      return twimlResponse(vr.toString());
    }

    if (detectPromptInjection(speechResult)) {
      const vr = new twilio.twiml.VoiceResponse();
      vr.say({ voice: agentVoice, language: agentLanguage }, SAFE_REFUSAL_VOICE);
      const gather = vr.gather({
        input: ["speech"] as any,
        action: `/api/twilio/gather?callLogId=${callLogId}&agentId=${agentId}&orgId=${orgId}`,
        method: "POST",
        speechTimeout: "auto",
        language: agentLanguage,
      });
      gather.say({ voice: agentVoice, language: agentLanguage }, "How can I help you?");
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
    let hasKnowledgeBase = false;
    const [hasKnowledge] = await db
      .select({ total: count() })
      .from(knowledgeChunks)
      .where(eq(knowledgeChunks.orgId, orgId));

    if (Number(hasKnowledge.total) > 0) {
      hasKnowledgeBase = true;
      try {
        const relevantChunks = await searchKnowledge(orgId, speechResult);
        if (relevantChunks.length > 0) {
          ragContext = buildRAGContext(relevantChunks);
        }
      } catch (ragErr) {
        console.error("RAG search error during call:", ragErr);
      }
    }

    const strictMode = agent.strictKnowledgeMode ?? false;
    const hasFaqMatch = checkFaqRelevance(speechResult, agentConfig.faqEntries);

    if (strictMode && hasKnowledgeBase && !ragContext && !hasFaqMatch && !userRequestedHuman) {
      const vr = new twilio.twiml.VoiceResponse();
      vr.say({ voice: agentVoice, language: agentLanguage }, KNOWLEDGE_ONLY_REFUSAL_VOICE);
      const gather = vr.gather({
        input: ["speech"] as any,
        action: `/api/twilio/gather?callLogId=${callLogId}&agentId=${agentId}&orgId=${orgId}`,
        method: "POST",
        speechTimeout: "auto",
        language: agentLanguage,
      });
      gather.say({ voice: agentVoice, language: agentLanguage }, "Is there something else I can help with?");

      const updatedTranscript = existingTranscript + `Caller: ${speechResult}\nAgent: ${KNOWLEDGE_ONLY_REFUSAL_VOICE}\n`;
      await db.update(callLogs).set({
        turnCount,
        transcript: updatedTranscript,
      }).where(eq(callLogs.id, callLogId));

      return twimlResponse(vr.toString());
    }

    const groundingRule = (strictMode || hasKnowledgeBase) ? RAG_GROUNDING_INSTRUCTION : "";

    const fsmConstraints = `
You are on a LIVE PHONE CALL. Respond naturally as if speaking. Keep responses concise (2-3 sentences max).
Current conversation state: ${currentState}
Turn: ${turnCount}/${fsmConfig.maxTurns}
Allowed actions: ${STATE_ALLOWED_ACTIONS[currentState]?.join(", ") || "none"}
${userRequestedHuman ? "IMPORTANT: The caller has requested to speak with a human. Acknowledge this and prepare for handoff." : ""}
${groundingRule}
Respond with ONLY the text you want to speak to the caller. Do NOT include JSON, state transitions, or metadata.
Be conversational, warm, and concise. This is a voice call, so keep it natural.
`;

    const conversationHistory: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: fsmConstraints + ragContext },
    ];

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

    if (aiResponse.inputTokens || aiResponse.outputTokens) {
      const llmCost = calculateLLMCost(
        aiResponse.model,
        aiResponse.inputTokens || 0,
        aiResponse.outputTokens || 0
      );
      logCostEvent({
        orgId,
        callLogId: callLogId || undefined,
        category: "llm",
        provider: aiResponse.provider || "openai",
        model: aiResponse.model,
        inputTokens: aiResponse.inputTokens,
        outputTokens: aiResponse.outputTokens,
        unitQuantity: (aiResponse.inputTokens || 0) + (aiResponse.outputTokens || 0),
        unitType: "tokens",
        unitCost: llmCost.costGBP,
        totalCost: llmCost.costGBP,
        metadata: { source: "twilio_call", agentId, turnCount },
      }).catch((error) => { console.error("Track Twilio call usage cost failed:", error); });
    }

    let responseText = aiResponse.content;

    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        responseText = parsed.assistantText || parsed.text || parsed.response || responseText;
      }
    } catch (error) {
      console.error("Parse AI response JSON failed:", error);
    }

    responseText = responseText
      .replace(/\{[\s\S]*\}/g, "")
      .replace(/```[\s\S]*?```/g, "")
      .replace(/\*\*/g, "")
      .replace(/\*/g, "")
      .trim();

    if (!responseText) {
      responseText = "I'm sorry, could you repeat that?";
    }

    const outputCheck = validateLLMOutput(responseText, ragContext, {
      strictGrounding: strictMode,
      maxResponseLength: 1000,
    });
    if (!outputCheck.safe) {
      console.warn(`[Twilio] Output guard blocked response for call ${callLogId}: ${outputCheck.reason}`);
      responseText = outputCheck.sanitizedResponse || "I'm sorry, could you repeat that?";
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
      } catch (error) {
        console.error("Generate handoff context summary failed:", error);
      }

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

function checkFaqRelevance(
  userMessage: string,
  faqEntries: Array<{ question: string; answer: string }> | null
): boolean {
  if (!faqEntries || faqEntries.length === 0) return false;
  const messageLower = userMessage.toLowerCase();
  const messageWords = messageLower.split(/\s+/).filter((w) => w.length > 2);

  for (const faq of faqEntries) {
    const questionLower = faq.question.toLowerCase();
    const questionWords = questionLower.split(/\s+/).filter((w) => w.length > 2);
    const matchingWords = messageWords.filter((w) => questionWords.includes(w));
    if (matchingWords.length >= 2 || (questionWords.length <= 3 && matchingWords.length >= 1)) {
      return true;
    }
  }
  return false;
}
