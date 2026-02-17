import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agents, knowledgeChunks, drafts } from "@/shared/schema";
import { eq, and, count } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";
import { searchKnowledge, buildRAGContext } from "@/lib/rag";
import { callLLM } from "@/lib/llm-router";
import { AGENT_ANTI_INJECTION_PREAMBLE } from "@/lib/prompt-guard";
import { RAG_GROUNDING_INSTRUCTION, validateLLMOutput } from "@/lib/output-guard";
import { aiLimiter } from "@/lib/rate-limit";
import { checkBodySize, BODY_LIMITS } from "@/lib/body-limit";
import { hasInsufficientBalance, deductFromWallet } from "@/lib/wallet";
import { logAudit } from "@/lib/audit";
import { logCostEvent, calculateLLMCost } from "@/lib/unit-economics";
import { z } from "zod";

const bulkFaqSchema = z.object({
  count: z.number().int().min(1).max(10).default(5),
  tone: z.enum(["professional", "friendly", "concise", "detailed", "empathetic"]).default("professional"),
  language: z.string().max(10).default("en"),
}).strict();

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
    const parsed = bulkFaqSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
    }

    const { count: topicCount, tone, language } = parsed.data;

    const insufficientFunds = await hasInsufficientBalance(auth.orgId, 0.02);
    if (insufficientFunds) {
      return NextResponse.json({ error: "Insufficient wallet balance. Please top up your wallet to generate FAQ drafts." }, { status: 402 });
    }

    const [hasKnowledge] = await db
      .select({ total: count() })
      .from(knowledgeChunks)
      .where(eq(knowledgeChunks.orgId, auth.orgId));

    if (Number(hasKnowledge.total) === 0) {
      return NextResponse.json({
        error: "No knowledge base found. Please upload documents to your knowledge base first so we can generate accurate FAQ answers.",
      }, { status: 400 });
    }

    const [agent] = await db.select().from(agents).where(eq(agents.orgId, auth.orgId)).limit(1);

    let ragContext = "";
    try {
      const chunks = await searchKnowledge(auth.orgId, "frequently asked questions common topics");
      if (chunks.length > 0) {
        ragContext = buildRAGContext(chunks);
      }
    } catch {}

    if (!ragContext) {
      return NextResponse.json({
        error: "Could not retrieve knowledge base content for grounding. Please ensure your knowledge base has processed documents.",
      }, { status: 422 });
    }

    let agentContext = "";
    if (agent) {
      agentContext = `\nBusiness: ${agent.businessDescription || agent.name}`;
      const existingFaqs = (agent.faqEntries as Array<{ question: string; answer: string }>) || [];
      if (existingFaqs.length > 0) {
        agentContext += `\nExisting FAQ topics (do NOT repeat these): ${existingFaqs.map(f => f.question).join("; ")}`;
      }
    }

    const languageInstruction = language !== "en"
      ? `\nIMPORTANT: Write all questions and answers in the language with code "${language}".`
      : "";

    const systemPrompt = `${AGENT_ANTI_INJECTION_PREAMBLE}
You generate FAQ question-answer pairs for a business AI agent.

${RAG_GROUNDING_INSTRUCTION}

Based on the business knowledge base below, generate ${topicCount} FAQ entries.
Each entry must be a question a caller might ask, paired with a concise, factual answer (2-4 sentences).
Only include information that is verifiably in the knowledge base.
Use a ${tone} tone.${languageInstruction}
${agentContext}
${ragContext}

Respond in JSON array format:
[{"question": "...", "answer": "..."}, ...]

Output ONLY the JSON array. No commentary.`;

    const result = await callLLM(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Generate ${topicCount} FAQ entries from the knowledge base.` },
      ],
      { maxTokens: 2000, temperature: 0.5, orgId: auth.orgId }
    );

    let faqEntries: Array<{ question: string; answer: string }> = [];
    try {
      const jsonMatch = result.content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const rawParsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(rawParsed)) {
          faqEntries = rawParsed.filter(
            (e: unknown) => {
              const entry = e as Record<string, unknown>;
              return entry.question && entry.answer && typeof entry.question === "string" && typeof entry.answer === "string";
            }
          );
        }
      }
    } catch {
      return NextResponse.json({ error: "Failed to parse generated FAQs. Please try again." }, { status: 500 });
    }

    if (faqEntries.length === 0) {
      return NextResponse.json({ error: "No FAQs could be generated. Try adding more content to your knowledge base." }, { status: 400 });
    }

    const validatedEntries: Array<{ question: string; answer: string }> = [];
    for (const faq of faqEntries) {
      const questionCheck = validateLLMOutput(faq.question, ragContext + agentContext, {
        strictGrounding: false,
        maxResponseLength: 500,
      });
      const answerCheck = validateLLMOutput(faq.answer, ragContext + agentContext, {
        strictGrounding: true,
        maxResponseLength: 700,
      });

      if (questionCheck.safe && answerCheck.safe) {
        validatedEntries.push(faq);
      } else {
        const reason = !questionCheck.safe ? questionCheck.reason : answerCheck.reason;
        console.warn(`[Drafts] Bulk FAQ output guard filtered entry: ${reason}`);
      }
    }

    if (validatedEntries.length === 0) {
      return NextResponse.json({ error: "Generated FAQs did not pass quality checks. Please try again or add more content to your knowledge base." }, { status: 422 });
    }

    const createdDrafts = [];
    for (const faq of validatedEntries) {
      const [draft] = await db.insert(drafts).values({
        orgId: auth.orgId,
        userId: auth.user.id,
        type: "faq_answer",
        title: `FAQ: ${faq.question.slice(0, 180)}`,
        content: faq.answer,
        prompt: faq.question,
        tone,
        language,
        status: "draft",
        version: 1,
      }).returning();
      createdDrafts.push(draft);
    }

    const cost = calculateLLMCost(result.model || "gpt-4o-mini", result.promptTokens || 0, result.completionTokens || 0);
    try {
      await deductFromWallet(auth.orgId, cost, `Bulk FAQ generation (${validatedEntries.length} FAQs)`);
      await logCostEvent({
        orgId: auth.orgId,
        category: "ai_drafts",
        subcategory: "bulk_faq",
        amount: cost,
        model: result.model || "gpt-4o-mini",
        promptTokens: result.promptTokens || 0,
        completionTokens: result.completionTokens || 0,
      });
      await logAudit({
        userId: auth.user.id,
        orgId: auth.orgId,
        action: "draft.bulk_faq_generate",
        resource: "drafts",
        details: { count: validatedEntries.length, tone, language, cost },
      });
    } catch (costErr) {
      console.error("[Drafts] Cost tracking error:", costErr);
    }

    return NextResponse.json({
      drafts: createdDrafts,
      count: createdDrafts.length,
      message: `Generated ${createdDrafts.length} FAQ draft${createdDrafts.length !== 1 ? "s" : ""}`,
      cost,
    });
  } catch (error) {
    console.error("[Drafts] Bulk FAQ error:", error);
    return NextResponse.json({ error: "Failed to generate FAQ drafts. Please try again." }, { status: 500 });
  }
}
