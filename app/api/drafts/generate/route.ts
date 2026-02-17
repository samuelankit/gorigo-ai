import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/get-user";
import { aiLimiter } from "@/lib/rate-limit";
import { checkBodySize, BODY_LIMITS } from "@/lib/body-limit";
import { z } from "zod";
import { generateDraft, DraftGenerationError, type DraftType, type DraftTone } from "@/lib/draft-generator";

const generateSchema = z.object({
  type: z.enum(["call_script", "email_template", "sms_template", "faq_answer"]),
  prompt: z.string().min(3, "Describe what you want to draft").max(2000),
  tone: z.enum(["professional", "friendly", "concise", "detailed", "empathetic"]).default("professional"),
  language: z.string().max(10).default("en"),
  refineFeedback: z.string().max(1000).optional(),
  previousContent: z.string().max(5000).optional(),
  agentId: z.number().int().positive().optional(),
});

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

    const result = await generateDraft(auth.orgId, auth.user.id, auth.user.email, {
      type: parsed.data.type as DraftType,
      prompt: parsed.data.prompt,
      tone: parsed.data.tone as DraftTone,
      language: parsed.data.language,
      refineFeedback: parsed.data.refineFeedback,
      previousContent: parsed.data.previousContent,
      agentId: parsed.data.agentId,
      source: "web",
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof DraftGenerationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[Drafts] Generation error:", error);
    return NextResponse.json({ error: "Failed to generate draft. Please try again." }, { status: 500 });
  }
}
