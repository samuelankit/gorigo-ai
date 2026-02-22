import { db } from "@/lib/db";
import { agents, callLogs } from "@/shared/schema";
import { eq } from "drizzle-orm";
import { searchKnowledge, buildRAGContext } from "@/lib/rag";
import { generateAgentResponse, type ConversationMessage } from "@/lib/ai";
import { detectOptOut, handleOptOut } from "@/lib/compliance-engine";
import { createLogger } from "@/lib/logger";

const logger = createLogger("VoiceAI");

const callConversations = new Map<string, ConversationMessage[]>();
const callAgentCache = new Map<string, number>();

const MAX_HISTORY_TURNS = 20;
const CLEANUP_INTERVAL_MS = 30 * 60 * 1000;
const MAX_CALL_AGE_MS = 2 * 60 * 60 * 1000;

const callTimestamps = new Map<string, number>();

setInterval(() => {
  const now = Date.now();
  callTimestamps.forEach((ts, callId) => {
    if (now - ts > MAX_CALL_AGE_MS) {
      callConversations.delete(callId);
      callAgentCache.delete(callId);
      callTimestamps.delete(callId);
    }
  });
}, CLEANUP_INTERVAL_MS);

export function initCallConversation(providerCallId: string, agentId: number): void {
  callConversations.set(providerCallId, []);
  callAgentCache.set(providerCallId, agentId);
  callTimestamps.set(providerCallId, Date.now());
}

export function cleanupCallConversation(providerCallId: string): void {
  callConversations.delete(providerCallId);
  callAgentCache.delete(providerCallId);
  callTimestamps.delete(providerCallId);
}

export async function generateVoiceResponse(
  providerCallId: string,
  userInput: string,
  orgId: number
): Promise<{ responseText: string; turnCount: number }> {
  const agentId = callAgentCache.get(providerCallId);
  if (!agentId) {
    logger.warn("No agent cached for call, falling back to DB lookup", { providerCallId });
    const [callLog] = await db.select().from(callLogs).where(eq(callLogs.providerCallId, providerCallId)).limit(1);
    if (!callLog) {
      return { responseText: "I'm sorry, I'm having trouble processing your request. Please try again.", turnCount: 0 };
    }
    callAgentCache.set(providerCallId, callLog.agentId);
    return generateVoiceResponse(providerCallId, userInput, orgId);
  }

  const [agent] = await db.select().from(agents).where(eq(agents.id, agentId)).limit(1);
  if (!agent) {
    return { responseText: "I'm sorry, this agent is no longer available. Please call back later.", turnCount: 0 };
  }

  let history = callConversations.get(providerCallId) || [];

  let ragContext = "";
  let ragAvailable = false;
  try {
    const chunks = await searchKnowledge(orgId, userInput);
    if (chunks.length > 0) {
      ragContext = buildRAGContext(chunks);
      ragAvailable = true;
    }
  } catch (ragErr) {
    logger.warn("RAG search failed", { providerCallId, error: ragErr instanceof Error ? ragErr.message : String(ragErr) });
  }

  const agentConfig = {
    name: agent.name,
    greeting: agent.greeting || "Hello, how can I help you?",
    businessDescription: agent.businessDescription,
    roles: agent.roles || "receptionist",
    faqEntries: agent.faqEntries as Array<{ question: string; answer: string }> | null,
    complianceDisclosure: agent.complianceDisclosure ?? true,
    negotiationEnabled: agent.negotiationEnabled ?? false,
    negotiationGuardrails: agent.negotiationGuardrails as any,
  };

  const optOutCheck = detectOptOut(userInput);
  if (optOutCheck.detected) {
    logger.info("Opt-out detected during call", { providerCallId, orgId, keyword: optOutCheck.keyword });
    const [callLog] = await db.select({ id: callLogs.id, callerNumber: callLogs.callerNumber }).from(callLogs).where(eq(callLogs.providerCallId, providerCallId)).limit(1);
    if (callLog?.callerNumber) {
      try {
        await handleOptOut(orgId, callLog.callerNumber, callLog.id, `Opt-out detected in call: "${optOutCheck.keyword}"`);
      } catch (optOutErr) {
        logger.error("Failed to process opt-out", optOutErr instanceof Error ? optOutErr : undefined);
      }
    }

    const optOutResponse = "I understand, and I respect your request. I've added your number to our Do Not Call list. You will not receive any further calls from us. Thank you for letting me know, and I apologise for any inconvenience. Goodbye.";
    const existingTranscript = await getExistingTranscript(providerCallId);
    const newTranscriptEntry = `\nCaller: ${userInput}\n${agent.name}: ${optOutResponse}`;
    try {
      await db.update(callLogs).set({
        transcript: (existingTranscript || "") + newTranscriptEntry,
        turnCount: Math.floor((history.length / 2) + 1),
      }).where(eq(callLogs.providerCallId, providerCallId));
    } catch {}

    return { responseText: optOutResponse, turnCount: Math.floor(history.length / 2) + 1 };
  }

  const hasFAQGrounding = agentConfig.faqEntries && agentConfig.faqEntries.length > 0;
  const hasBusinessContext = !!agentConfig.businessDescription;
  const hasAnyGrounding = ragAvailable || hasFAQGrounding || hasBusinessContext;

  if (!hasAnyGrounding) {
    logger.warn("NO RAG GROUNDING available — refusing LLM call (compliance)", { providerCallId, orgId });
    const fallbackResponse = "I don't have enough information to answer that question right now. Let me connect you with someone who can help. Please hold, or call us back during business hours.";

    const existingTranscript = await getExistingTranscript(providerCallId);
    const newTranscriptEntry = `\nCaller: ${userInput}\n${agent.name}: ${fallbackResponse}`;
    try {
      await db.update(callLogs).set({
        transcript: (existingTranscript || "") + newTranscriptEntry,
        turnCount: Math.floor((history.length / 2) + 1),
      }).where(eq(callLogs.providerCallId, providerCallId));
    } catch {}

    return { responseText: fallbackResponse, turnCount: Math.floor(history.length / 2) + 1 };
  }

  const systemMessages: ConversationMessage[] = [];
  if (ragContext) {
    systemMessages.push({ role: "system", content: ragContext });
  }
  systemMessages.push({
    role: "system",
    content: "IMPORTANT: You are on a live phone call. Keep your responses concise, conversational, and natural. Aim for 1-3 sentences. Avoid lists, bullet points, or formatting - speak as you would on a phone. If you don't know something from the provided knowledge base, FAQ, or business context, say so honestly and offer to transfer to a human. NEVER fabricate information."
  });

  const fullHistory = [...systemMessages, ...history];

  const aiResponse = await generateAgentResponse(agentConfig, fullHistory, userInput, orgId);

  history.push({ role: "user", content: userInput });
  history.push({ role: "assistant", content: aiResponse.content });

  if (history.length > MAX_HISTORY_TURNS * 2) {
    history = history.slice(-MAX_HISTORY_TURNS * 2);
  }
  callConversations.set(providerCallId, history);
  callTimestamps.set(providerCallId, Date.now());

  const turnCount = Math.floor(history.length / 2);

  const existingTranscript = await getExistingTranscript(providerCallId);
  const newTranscriptEntry = `\nCaller: ${userInput}\n${agent.name}: ${aiResponse.content}`;
  const updatedTranscript = existingTranscript ? existingTranscript + newTranscriptEntry : newTranscriptEntry;

  try {
    await db.update(callLogs).set({
      transcript: updatedTranscript,
      turnCount,
      llmTokensUsed: (aiResponse.inputTokens || 0) + (aiResponse.outputTokens || 0),
    }).where(eq(callLogs.providerCallId, providerCallId));
  } catch (dbErr) {
    logger.error("Failed to update call transcript", dbErr instanceof Error ? dbErr : undefined);
  }

  const maxTurns = agent.maxTurns || 10;
  if (turnCount >= maxTurns) {
    const wrapUp = `${aiResponse.content} I want to make sure I've been helpful. Is there anything else I can quickly help with before I go?`;
    return { responseText: wrapUp, turnCount };
  }

  return { responseText: aiResponse.content, turnCount };
}

async function getExistingTranscript(providerCallId: string): Promise<string> {
  try {
    const [callLog] = await db.select({ transcript: callLogs.transcript }).from(callLogs).where(eq(callLogs.providerCallId, providerCallId)).limit(1);
    return callLog?.transcript || "";
  } catch {
    return "";
  }
}
