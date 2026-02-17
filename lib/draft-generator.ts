import { db } from "@/lib/db";
import { agents, knowledgeChunks, callLogs } from "@/shared/schema";
import { eq, and, desc, count, sql } from "drizzle-orm";
import { searchKnowledge, buildRAGContext } from "@/lib/rag";
import { validateLLMOutput, RAG_GROUNDING_INSTRUCTION } from "@/lib/output-guard";
import { callLLM, type ConversationMessage } from "@/lib/llm-router";
import { AGENT_ANTI_INJECTION_PREAMBLE } from "@/lib/prompt-guard";
import { hasInsufficientBalance, deductFromWallet } from "@/lib/wallet";
import { logAudit } from "@/lib/audit";
import { logCostEvent, calculateLLMCost } from "@/lib/unit-economics";

export const DRAFT_TYPES = {
  call_script: {
    label: "Call Script",
    maxLength: 1000,
    instruction: "Write a concise call script for an AI voice agent. It should sound natural when spoken aloud. Keep sentences short (under 15 words each). Include greeting, main content, and closing. Do NOT include stage directions, notes, or formatting — only the words the agent should speak.",
  },
  email_template: {
    label: "Email Template",
    maxLength: 3000,
    instruction: "Write a professional email template. Include a subject line on the first line prefixed with 'Subject: '. Use proper greeting, body paragraphs, and sign-off. Use {{placeholders}} for personalisation fields like {{name}}, {{company}}, {{date}}.",
  },
  sms_template: {
    label: "SMS Template",
    maxLength: 320,
    instruction: "Write a concise SMS message under 160 characters. Be direct and include a clear call-to-action. No greeting or sign-off needed — keep it tight. Use {{placeholders}} for personalisation like {{name}}.",
  },
  faq_answer: {
    label: "FAQ Answer",
    maxLength: 700,
    instruction: "Write a clear, factual FAQ answer that an AI agent can use when a caller asks this question. Be concise (2-4 sentences). Only include information that is verifiably true based on the business knowledge base. If a question could have multiple answers, give the most common/helpful one.",
  },
} as const;

export type DraftType = keyof typeof DRAFT_TYPES;

export const TONES = {
  professional: "Use a professional, business-appropriate tone.",
  friendly: "Use a warm, friendly, approachable tone while staying professional.",
  concise: "Be extremely concise and to-the-point. Minimise filler words.",
  detailed: "Be thorough and detailed, covering all relevant points.",
  empathetic: "Use an empathetic, understanding tone that acknowledges the caller's situation.",
} as const;

export type DraftTone = keyof typeof TONES;

const STOP_WORDS = new Set([
  "this", "that", "with", "from", "your", "have", "been", "will", "would",
  "could", "should", "about", "their", "there", "where", "when", "what",
  "which", "these", "those", "they", "them", "than", "then", "also",
  "just", "more", "most", "some", "such", "each", "every", "both",
  "into", "over", "after", "before", "between", "through", "during",
  "does", "doing", "done", "being", "make", "made", "like", "very",
  "only", "other", "here", "still", "well", "back", "even", "much",
  "many", "good", "need", "want", "come", "take", "give", "look",
  "know", "think", "help", "call", "work", "time", "long", "keep",
]);

export function calculateQualityScore(
  content: string,
  ragChunks: string[],
  agentFaqs: Array<{ question: string; answer: string }> | null
): number {
  if (!content) return 0;

  const contentLower = content.toLowerCase();
  const contentWords = contentLower.split(/\s+/)
    .filter(w => w.length > 3 && !STOP_WORDS.has(w));

  if (contentWords.length === 0) return 0;

  const allContext = [
    ...ragChunks.map(c => c.toLowerCase()),
    ...(agentFaqs || []).map(f => `${f.question} ${f.answer}`.toLowerCase()),
  ].join(" ");

  const contextWords = new Set(
    allContext.split(/\s+/).filter(w => w.length > 3 && !STOP_WORDS.has(w))
  );

  let groundedWords = 0;
  const seen = new Set<string>();
  for (const word of contentWords) {
    if (seen.has(word)) continue;
    seen.add(word);
    if (contextWords.has(word)) groundedWords++;
  }

  const rawScore = seen.size > 0 ? groundedWords / seen.size : 0;
  return Math.min(Math.round(rawScore * 100) / 100, 1.0);
}

export interface GenerateDraftInput {
  type: DraftType;
  prompt: string;
  tone?: DraftTone;
  language?: string;
  refineFeedback?: string;
  previousContent?: string;
  agentId?: number;
  source?: string;
}

export interface GenerateDraftResult {
  content: string;
  type: DraftType;
  tone: DraftTone;
  language: string;
  prompt: string;
  suggestedTitle: string;
  qualityScore: number;
  charCount: number;
  maxLength: number;
  model: string;
  outputGuardSafe: boolean;
  cost: number;
  ragChunkCount: number;
  hasKnowledgeBase: boolean;
}

export async function checkKnowledgeBaseStatus(orgId: number): Promise<{ hasContent: boolean; chunkCount: number }> {
  try {
    const [result] = await db
      .select({ total: count() })
      .from(knowledgeChunks)
      .where(eq(knowledgeChunks.orgId, orgId));
    return { hasContent: (result?.total || 0) > 0, chunkCount: result?.total || 0 };
  } catch {
    return { hasContent: false, chunkCount: 0 };
  }
}

export async function generateDraft(
  orgId: number,
  userId: number,
  userEmail: string,
  input: GenerateDraftInput
): Promise<GenerateDraftResult> {
  const {
    type,
    prompt,
    tone = "professional",
    language = "en",
    refineFeedback,
    previousContent,
    agentId,
  } = input;

  const typeConfig = DRAFT_TYPES[type];

  const agentCondition = agentId
    ? and(eq(agents.id, agentId), eq(agents.orgId, orgId))
    : eq(agents.orgId, orgId);

  const [agent] = await db.select().from(agents).where(agentCondition).limit(1);

  const insufficientFunds = await hasInsufficientBalance(orgId, 0.01);
  if (insufficientFunds) {
    throw new DraftGenerationError("Insufficient wallet balance. Please top up your wallet to generate drafts.", 402);
  }

  let ragContext = "";
  const ragChunks: string[] = [];
  try {
    const relevantChunks = await searchKnowledge(orgId, prompt);
    if (relevantChunks.length > 0) {
      ragContext = buildRAGContext(relevantChunks);
      ragChunks.push(...relevantChunks.map(c => c.content));
    }
  } catch (ragErr) {
    console.error("[DraftGenerator] RAG search failed:", ragErr);
  }

  const agentFaqs = ((agent?.faqEntries as Array<{ question: string; answer: string }>) || []);
  const hasFaqMatch = type === "faq_answer" && agentFaqs.some(
    f => f.question.toLowerCase().includes(prompt.toLowerCase().slice(0, 40)) ||
         prompt.toLowerCase().includes(f.question.toLowerCase().slice(0, 40))
  );

  if (!ragContext && !hasFaqMatch) {
    throw new DraftGenerationError(
      "No knowledge base content found. Please upload documents to your knowledge base before generating drafts. All content must be grounded in your business data.",
      422
    );
  }

  let agentContext = "";
  if (agent) {
    agentContext = `\n\nAgent Configuration:`;
    agentContext += `\n- Agent Name: ${agent.name}`;
    if (agent.businessDescription) agentContext += `\n- Business: ${agent.businessDescription}`;
    if (agent.greeting) agentContext += `\n- Standard Greeting: ${agent.greeting}`;
    if (agentFaqs && agentFaqs.length > 0) {
      agentContext += `\n- Existing FAQ Topics: ${agentFaqs.map(f => f.question).join("; ")}`;
    }
  }

  let callContext = "";
  try {
    const recentCalls = await db
      .select({ transcript: callLogs.transcript, sentimentLabel: callLogs.sentimentLabel })
      .from(callLogs)
      .where(and(
        eq(callLogs.orgId, orgId),
        eq(callLogs.status, "completed"),
      ))
      .orderBy(desc(callLogs.createdAt))
      .limit(3);

    if (recentCalls.length > 0) {
      const summaries = recentCalls
        .filter(c => c.transcript)
        .map(c => {
          const lines = (c.transcript || "").split("\n").slice(-4).join(" ");
          return `[${c.sentimentLabel || "neutral"}] ${lines.slice(0, 200)}`;
        });
      if (summaries.length > 0) {
        callContext = `\n\nRecent Call Context (use these to understand common caller patterns):\n${summaries.join("\n")}`;
      }
    }
  } catch {}

  const languageInstruction = language !== "en"
    ? `\n\nIMPORTANT: Write the draft in the language with code "${language}". Do NOT write in English unless the language code is "en".`
    : "";

  let refineBlock = "";
  if (refineFeedback && previousContent) {
    refineBlock = `\n\nPREVIOUS DRAFT (refine this based on feedback):\n${previousContent}\n\nUSER FEEDBACK:\n${refineFeedback}\n\nApply the feedback to improve the draft. Keep the overall structure but address the specific feedback.`;
  }

  const systemPrompt = `${AGENT_ANTI_INJECTION_PREAMBLE}
You are a professional content drafter for business communications.

${typeConfig.instruction}

CONSTRAINTS:
- Maximum length: ${typeConfig.maxLength} characters
- ${TONES[tone]}
${languageInstruction}

${RAG_GROUNDING_INSTRUCTION}

BUSINESS CONTEXT:${agentContext}${ragContext}${callContext}${refineBlock}

Output ONLY the draft content. Do not include explanations, notes, or meta-commentary. Do not wrap in quotes.`;

  const messages: ConversationMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: prompt },
  ];

  const result = await callLLM(messages, {
    maxTokens: Math.min(Math.ceil(typeConfig.maxLength / 2), 1000),
    temperature: 0.6,
    orgId,
  });

  let content = result.content.trim();

  if (content.startsWith('"') && content.endsWith('"')) {
    content = content.slice(1, -1);
  }
  if (content.startsWith("Subject:") && type !== "email_template") {
    const lines = content.split("\n");
    if (lines[0].startsWith("Subject:")) {
      content = lines.slice(1).join("\n").trim();
    }
  }

  if (type === "sms_template" && content.length > 160) {
    content = content.slice(0, 157) + "...";
  }

  const outputCheck = validateLLMOutput(content, ragContext + agentContext, {
    strictGrounding: true,
    maxResponseLength: typeConfig.maxLength + 200,
  });

  if (!outputCheck.safe) {
    console.warn(`[DraftGenerator] Output guard flagged draft for org ${orgId}: ${outputCheck.reason}`);
    content = outputCheck.sanitizedResponse || content;
  }

  const qualityScore = calculateQualityScore(content, ragChunks, agentFaqs);

  const suggestedTitle = type === "faq_answer"
    ? `FAQ: ${prompt.slice(0, 80)}`
    : type === "sms_template"
      ? `SMS: ${prompt.slice(0, 80)}`
      : type === "email_template"
        ? `Email: ${prompt.slice(0, 80)}`
        : `Script: ${prompt.slice(0, 80)}`;

  let cost = 0;
  try {
    const llmCost = calculateLLMCost(result.model || "gpt-4o-mini", result.inputTokens || 0, result.outputTokens || 0);
    cost = llmCost.costGBP;
    await deductFromWallet(orgId, cost, `Draft generation (${type})`, "ai_drafts");
    await logCostEvent({
      orgId,
      category: "ai_drafts",
      provider: result.provider,
      model: result.model || "gpt-4o-mini",
      inputTokens: result.inputTokens || 0,
      outputTokens: result.outputTokens || 0,
      unitQuantity: (result.inputTokens || 0) + (result.outputTokens || 0),
      unitType: "tokens",
      unitCost: cost,
      totalCost: cost,
      revenueCharged: cost,
      metadata: { type, tone, source: input.source || "web" },
    });
    logAudit({
      actorId: userId,
      actorEmail: userEmail,
      action: "draft.generate",
      entityType: "drafts",
      entityId: orgId,
      details: { type, tone, language, qualityScore, cost, source: input.source || "web", agentId },
    }).catch(() => {});
  } catch (costErr) {
    console.error("[DraftGenerator] Cost tracking error:", costErr);
  }

  return {
    content,
    type,
    tone,
    language,
    prompt,
    suggestedTitle,
    qualityScore,
    charCount: content.length,
    maxLength: typeConfig.maxLength,
    model: result.model,
    outputGuardSafe: outputCheck.safe,
    cost,
    ragChunkCount: ragChunks.length,
    hasKnowledgeBase: ragChunks.length > 0 || agentFaqs.length > 0,
  };
}

export class DraftGenerationError extends Error {
  status: number;
  constructor(message: string, status: number = 500) {
    super(message);
    this.name = "DraftGenerationError";
    this.status = status;
  }
}
