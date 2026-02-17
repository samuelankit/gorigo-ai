import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { drafts, agents } from "@/shared/schema";
import { eq, and } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";
import { z } from "zod";

const publishSchema = z.object({
  draftId: z.number().int().positive(),
  agentId: z.number().int().positive().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = publishSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { draftId, agentId: requestedAgentId } = parsed.data;

    const [draft] = await db
      .select()
      .from(drafts)
      .where(and(eq(drafts.id, draftId), eq(drafts.orgId, auth.orgId)))
      .limit(1);

    if (!draft) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }

    if (draft.type !== "faq_answer" && draft.type !== "call_script") {
      return NextResponse.json({
        error: `Publishing is only supported for FAQ answers and call scripts. ${draft.type === "email_template" ? "Email" : "SMS"} templates cannot be published to an agent.`,
      }, { status: 400 });
    }

    const MIN_QUALITY_SCORE = 0.2;
    if (draft.qualityScore !== null && draft.qualityScore < MIN_QUALITY_SCORE) {
      return NextResponse.json({
        error: `Draft quality score (${Math.round(draft.qualityScore * 100)}%) is below the minimum required (${Math.round(MIN_QUALITY_SCORE * 100)}%) for publishing. Please refine the draft or regenerate it with more specific knowledge base content.`,
      }, { status: 400 });
    }

    const agentConditions = requestedAgentId
      ? and(eq(agents.id, requestedAgentId), eq(agents.orgId, auth.orgId))
      : eq(agents.orgId, auth.orgId);

    const [agent] = await db
      .select()
      .from(agents)
      .where(agentConditions)
      .limit(1);

    if (!agent) {
      return NextResponse.json({ error: "No agent found to publish to" }, { status: 404 });
    }

    if (draft.type === "faq_answer") {
      const existingFaqs = (agent.faqEntries as Array<{ question: string; answer: string }>) || [];
      const faqQuestion = draft.prompt || draft.title.replace(/^FAQ:\s*/, "");
      const existingIndex = existingFaqs.findIndex(
        f => f.question.toLowerCase() === faqQuestion.toLowerCase()
      );

      let updatedFaqs;
      if (existingIndex >= 0) {
        updatedFaqs = [...existingFaqs];
        updatedFaqs[existingIndex] = { question: faqQuestion, answer: draft.content };
      } else {
        updatedFaqs = [...existingFaqs, { question: faqQuestion, answer: draft.content }];
      }

      await db.update(agents).set({
        faqEntries: updatedFaqs,
      }).where(eq(agents.id, agent.id));
    } else if (draft.type === "call_script") {
      await db.update(agents).set({
        greeting: draft.content,
      }).where(eq(agents.id, agent.id));
    }

    await db.update(drafts).set({
      status: "published",
      publishedToAgentId: agent.id,
      publishedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(drafts.id, draftId));

    const publishTarget = draft.type === "faq_answer"
      ? "FAQ entry"
      : draft.type === "call_script"
        ? "agent greeting/script"
        : "agent";

    return NextResponse.json({
      success: true,
      message: `Draft published to ${publishTarget} "${agent.name}" successfully`,
      agentId: agent.id,
      agentName: agent.name,
      publishTarget,
    });
  } catch (error) {
    console.error("[Drafts] Publish error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
