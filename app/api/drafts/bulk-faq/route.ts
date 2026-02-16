import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agents, knowledgeChunks, drafts } from "@/shared/schema";
import { eq, and, count } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";
import { searchKnowledge, buildRAGContext } from "@/lib/rag";
import { callLLM } from "@/lib/llm-router";
import { AGENT_ANTI_INJECTION_PREAMBLE } from "@/lib/prompt-guard";
import { RAG_GROUNDING_INSTRUCTION } from "@/lib/output-guard";

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const topicCount = Math.min(body.count || 5, 10);
    const tone = body.tone || "professional";

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

    let agentContext = "";
    if (agent) {
      agentContext = `\nBusiness: ${agent.businessDescription || agent.name}`;
      const existingFaqs = (agent.faqEntries as Array<{ question: string; answer: string }>) || [];
      if (existingFaqs.length > 0) {
        agentContext += `\nExisting FAQ topics (do NOT repeat these): ${existingFaqs.map(f => f.question).join("; ")}`;
      }
    }

    const systemPrompt = `${AGENT_ANTI_INJECTION_PREAMBLE}
You generate FAQ question-answer pairs for a business AI agent.

${RAG_GROUNDING_INSTRUCTION}

Based on the business knowledge base below, generate ${topicCount} FAQ entries.
Each entry must be a question a caller might ask, paired with a concise, factual answer (2-4 sentences).
Only include information that is verifiably in the knowledge base.
Use a ${tone} tone.
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
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed)) {
          faqEntries = parsed.filter(
            (e: any) => e.question && e.answer && typeof e.question === "string" && typeof e.answer === "string"
          );
        }
      }
    } catch {
      return NextResponse.json({ error: "Failed to parse generated FAQs. Please try again." }, { status: 500 });
    }

    if (faqEntries.length === 0) {
      return NextResponse.json({ error: "No FAQs could be generated. Try adding more content to your knowledge base." }, { status: 400 });
    }

    const createdDrafts = [];
    for (const faq of faqEntries) {
      const [draft] = await db.insert(drafts).values({
        orgId: auth.orgId,
        userId: auth.user.id,
        type: "faq_answer",
        title: `FAQ: ${faq.question.slice(0, 180)}`,
        content: faq.answer,
        prompt: faq.question,
        tone,
        language: "en",
        status: "draft",
        version: 1,
      }).returning();
      createdDrafts.push(draft);
    }

    return NextResponse.json({
      drafts: createdDrafts,
      count: createdDrafts.length,
      message: `Generated ${createdDrafts.length} FAQ draft${createdDrafts.length !== 1 ? "s" : ""}`,
    });
  } catch (error) {
    console.error("[Drafts] Bulk FAQ error:", error);
    return NextResponse.json({ error: "Failed to generate FAQ drafts. Please try again." }, { status: 500 });
  }
}
