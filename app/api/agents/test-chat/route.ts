import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/get-user";
import { db } from "@/lib/db";
import { agents } from "@/shared/schema";
import { eq, and } from "drizzle-orm";
import { generateAgentResponse } from "@/lib/ai";
import { detectPromptInjection, SAFE_REFUSAL_TEXT } from "@/lib/prompt-guard";
import { generalLimiter } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const rl = await generalLimiter(req);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    const auth = await getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (!auth.orgId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    const body = await req.json();
    const { agentId, message, history } = body;

    if (!agentId || !message) {
      return NextResponse.json({ error: "agentId and message are required" }, { status: 400 });
    }

    if (detectPromptInjection(message)) {
      return NextResponse.json({
        reply: SAFE_REFUSAL_TEXT,
        model: "blocked",
        blocked: true,
      });
    }

    const [agent] = await db
      .select()
      .from(agents)
      .where(and(eq(agents.id, agentId), eq(agents.orgId, auth.orgId)))
      .limit(1);

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const conversationHistory = Array.isArray(history) ? history.map((h: any) => ({
      role: h.role as "user" | "assistant",
      content: h.content,
    })) : [];

    const agentConfig = {
      name: agent.name,
      greeting: agent.greeting || "Hello, how can I help you?",
      businessDescription: agent.businessDescription,
      roles: agent.roles || "receptionist",
      faqEntries: Array.isArray(agent.faqEntries) ? agent.faqEntries as Array<{ question: string; answer: string }> : [],
      complianceDisclosure: agent.complianceDisclosure ?? true,
      negotiationEnabled: agent.negotiationEnabled ?? false,
      negotiationGuardrails: agent.negotiationGuardrails,
    };

    const response = await generateAgentResponse(agentConfig, conversationHistory, message, auth.orgId);

    return NextResponse.json({
      reply: response.content,
      model: response.model,
    });
  } catch (error) {
    console.error("Test chat error:", error);
    return NextResponse.json({ error: "Failed to generate response" }, { status: 500 });
  }
}
