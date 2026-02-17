import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agents, knowledgeChunks, callLogs } from "@/shared/schema";
import { eq, and, desc, count, sql } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";
import { aiLimiter } from "@/lib/rate-limit";
import { checkBodySize, BODY_LIMITS } from "@/lib/body-limit";
import { searchKnowledge, buildRAGContext } from "@/lib/rag";
import { validateLLMOutput, RAG_GROUNDING_INSTRUCTION } from "@/lib/output-guard";
import { callLLM } from "@/lib/llm-router";
import { AGENT_ANTI_INJECTION_PREAMBLE } from "@/lib/prompt-guard";
import { z } from "zod";
import { hasInsufficientBalance, deductFromWallet } from "@/lib/wallet";
import { logAudit } from "@/lib/audit";
import { logCostEvent, calculateLLMCost } from "@/lib/unit-economics";

const DRAFT_TYPES = {
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

const TONES = {
  professional: "Use a professional, business-appropriate tone.",
  friendly: "Use a warm, friendly, approachable tone while staying professional.",
  concise: "Be extremely concise and to-the-point. Minimise filler words.",
  detailed: "Be thorough and detailed, covering all relevant points.",
  empathetic: "Use an empathetic, understanding tone that acknowledges the caller's situation.",
} as const;

const generateSchema = z.object({
  type: z.enum(["call_script", "email_template", "sms_template", "faq_answer"]),
  prompt: z.string().min(3, "Describe what you want to draft").max(2000),
  tone: z.enum(["professional", "friendly", "concise", "detailed", "empathetic"]).default("professional"),
  language: z.string().max(10).default("en"),
  refineFeedback: z.string().max(1000).optional(),
  previousContent: z.string().max(5000).optional(),
});

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

function calculateQualityScore(content: string, ragChunks: string[], agentFaqs: Array<{ question: string; answer: string }> | null): number {
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
  const uniqueContentWords = [...new Set(contentWords)];

  for (const word of uniqueContentWords) {
    if (contextWords.has(word)) groundedWords++;
  }

  const rawScore = uniqueContentWords.length > 0 ? groundedWords / uniqueContentWords.length : 0;
  return Math.min(Math.round(rawScore * 100) / 100, 1.0);
}

export async function POST(request: NextRequest) {
  try {
    const rl = await aiLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const sizeError = checkBodySize(request, BODY_LIMITS.chat);
    if (sizeError) return sizeError;

    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = generateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
    }

    const { type, prompt, tone, language, refineFeedback, previousContent } = parsed.data;
    const typeConfig = DRAFT_TYPES[type];

    const [agent] = await db.select().from(agents).where(eq(agents.orgId, auth.orgId)).limit(1);

    const insufficientFunds = await hasInsufficientBalance(auth.orgId, 0.01);
    if (insufficientFunds) {
      return NextResponse.json({ error: "Insufficient wallet balance. Please top up your wallet to generate drafts." }, { status: 402 });
    }

    let ragContext = "";
    const ragChunks: string[] = [];
    try {
      const relevantChunks = await searchKnowledge(auth.orgId, prompt);
      if (relevantChunks.length > 0) {
        ragContext = buildRAGContext(relevantChunks);
        ragChunks.push(...relevantChunks.map(c => c.content));
      }
    } catch (ragErr) {
      console.error("[Drafts] RAG search failed:", ragErr);
    }

    const agentFaqs = ((agent?.faqEntries as Array<{ question: string; answer: string }>) || []);
    const hasFaqMatch = type === "faq_answer" && agentFaqs.some(
      f => f.question.toLowerCase().includes(prompt.toLowerCase().slice(0, 40)) ||
           prompt.toLowerCase().includes(f.question.toLowerCase().slice(0, 40))
    );

    if (!ragContext && !hasFaqMatch) {
      return NextResponse.json({
        error: "No knowledge base content found. Please upload documents to your knowledge base before generating drafts. All content must be grounded in your business data.",
      }, { status: 422 });
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
          eq(callLogs.orgId, auth.orgId),
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

    const messages = [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: prompt },
    ];

    const result = await callLLM(messages, {
      maxTokens: Math.min(Math.ceil(typeConfig.maxLength / 2), 1000),
      temperature: 0.6,
      orgId: auth.orgId,
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
      console.warn(`[Drafts] Output guard flagged draft for org ${auth.orgId}: ${outputCheck.reason}`);
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
      cost = calculateLLMCost(result.model || "gpt-4o-mini", result.promptTokens || 0, result.completionTokens || 0);
      await deductFromWallet(auth.orgId, cost, `Draft generation (${type})`);
      await logCostEvent({
        orgId: auth.orgId,
        category: "ai_drafts",
        subcategory: type,
        amount: cost,
        model: result.model || "gpt-4o-mini",
        promptTokens: result.promptTokens || 0,
        completionTokens: result.completionTokens || 0,
      });
      await logAudit({
        userId: auth.user.id,
        orgId: auth.orgId,
        action: "draft.generate",
        resource: "drafts",
        details: { type, tone, language, qualityScore, cost },
      });
    } catch (costErr) {
      console.error("[Drafts] Cost tracking error:", costErr);
    }

    return NextResponse.json({
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
    });
  } catch (error) {
    console.error("[Drafts] Generation error:", error);
    return NextResponse.json({ error: "Failed to generate draft. Please try again." }, { status: 500 });
  }
}
