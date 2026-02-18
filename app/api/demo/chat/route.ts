import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/get-user";
import { db } from "@/lib/db";
import { agents, knowledgeChunks, knowledgeDocuments } from "@/shared/schema";
import { eq, and } from "drizzle-orm";
import { generalLimiter } from "@/lib/rate-limit";
import { checkBodySize, BODY_LIMITS } from "@/lib/body-limit";
import { handleRouteError } from "@/lib/api-error";

const GORIGO_ORG_ID = 2;

const DEPARTMENT_AGENTS: Record<string, string> = {
  sales: "Sales",
  support: "Support",
  onboarding: "Onboarding",
};

export async function POST(request: NextRequest) {
  try {
    const rl = await generalLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const sizeError = checkBodySize(request, BODY_LIMITS.chat);
    if (sizeError) return sizeError;

    const auth = await getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { message, department } = body;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const deptName = DEPARTMENT_AGENTS[department] || null;

    let targetAgent;
    if (deptName) {
      [targetAgent] = await db
        .select()
        .from(agents)
        .where(
          and(
            eq(agents.orgId, GORIGO_ORG_ID),
            eq(agents.departmentName, deptName),
            eq(agents.status, "active")
          )
        )
        .limit(1);
    }

    if (!targetAgent) {
      const orgAgents = await db
        .select()
        .from(agents)
        .where(and(eq(agents.orgId, GORIGO_ORG_ID), eq(agents.status, "active")));

      const lowerMsg = message.toLowerCase();
      const salesKeywords = ["pricing", "cost", "demo", "buy", "plans", "features", "interested", "how much", "trial"];
      const supportKeywords = ["help", "issue", "problem", "not working", "error", "bug", "reset", "password", "billing"];
      const onboardingKeywords = ["new", "getting started", "setup", "first time", "how to", "configure", "just signed up"];

      if (salesKeywords.some(k => lowerMsg.includes(k))) {
        targetAgent = orgAgents.find(a => a.departmentName === "Sales") || orgAgents[0];
      } else if (supportKeywords.some(k => lowerMsg.includes(k))) {
        targetAgent = orgAgents.find(a => a.departmentName === "Support") || orgAgents[0];
      } else if (onboardingKeywords.some(k => lowerMsg.includes(k))) {
        targetAgent = orgAgents.find(a => a.departmentName === "Onboarding") || orgAgents[0];
      } else {
        targetAgent = orgAgents.find(a => a.departmentName === "Sales") || orgAgents[0];
      }
    }

    if (!targetAgent) {
      return NextResponse.json({
        reply: "I'm sorry, our AI agents are currently being set up. Please try again later.",
        agent: "System",
        department: "none",
      });
    }

    const msgClean = message.toLowerCase().replace(/[^a-z0-9\s]/g, "");
    const msgWords = msgClean.split(/\s+/).filter(w => w.length > 2);

    let faqMatch = "";
    if (targetAgent.faqEntries && Array.isArray(targetAgent.faqEntries)) {
      const faqs = targetAgent.faqEntries as Array<{ question: string; answer: string }>;
      let bestScore = 0;
      for (const faq of faqs) {
        const qWords = faq.question.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(w => w.length > 2);
        const matchCount = qWords.filter(w => msgWords.includes(w)).length;
        const score = qWords.length > 0 ? matchCount / qWords.length : 0;
        if (matchCount >= 2 && score > bestScore) {
          bestScore = score;
          faqMatch = faq.answer;
        }
      }
    }

    let knowledgeContext = "";
    if (!faqMatch) {
      try {
        const docs = await db
          .select()
          .from(knowledgeDocuments)
          .where(and(eq(knowledgeDocuments.orgId, GORIGO_ORG_ID), eq(knowledgeDocuments.status, "ready")));

        if (docs.length > 0) {
          const docIds = docs.map(d => d.id);
          const allChunks = await db
            .select()
            .from(knowledgeChunks)
            .where(eq(knowledgeChunks.orgId, GORIGO_ORG_ID));

          const longWords = msgWords.filter(w => w.length > 3);
          const relevantChunks = allChunks
            .filter(c => docIds.includes(c.documentId))
            .map(c => {
              const cLower = c.content.toLowerCase();
              const matchCount = longWords.filter(w => cLower.includes(w)).length;
              let boost = 0;
              const pricingKeywords = ["pricing", "price", "cost", "plan", "billing", "month", "minute"];
              if (pricingKeywords.some(k => msgClean.includes(k)) && pricingKeywords.some(k => cLower.includes(k))) {
                boost = 3;
              }
              return { ...c, relevance: matchCount + boost };
            })
            .filter(c => c.relevance > 0)
            .sort((a, b) => b.relevance - a.relevance)
            .slice(0, 2);

          if (relevantChunks.length > 0) {
            knowledgeContext = relevantChunks.map(c => c.content).join("\n\n");
          }
        }
      } catch (e) {
        console.error("Knowledge retrieval error:", e);
      }
    }

    let reply = "";
    if (faqMatch) {
      reply = faqMatch;
    } else if (knowledgeContext) {
      const trimmed = knowledgeContext.substring(0, 500);
      reply = trimmed.length < knowledgeContext.length ? trimmed + "..." : trimmed;
    } else {
      const genericReplies: Record<string, string[]> = {
        Sales: [
          "Great question! GoRigo offers AI-powered call centre automation with talk-time-only billing starting at just £29/month. Would you like to know more about our plans or features?",
          "Thanks for your interest in GoRigo! We help businesses automate their call centres with intelligent AI agents. Every new account comes with £5 free credit to test the platform. Shall I walk you through the key features?",
          "GoRigo stands out with our multi-agent system, BYOK architecture, and knowledge base RAG. You only pay for actual call minutes — no hidden fees. What aspect are you most interested in?",
        ],
        Support: [
          "I'd be happy to help! Could you describe the issue you're experiencing? I can assist with account settings, billing enquiries, agent configuration, and general troubleshooting.",
          "Thanks for reaching out to GoRigo support. I can help with most platform issues. Could you share a bit more detail about what you need help with?",
          "I'm here to help resolve any issues. Common things I can assist with include wallet and billing questions, agent setup, call quality, and integration configuration. What do you need?",
        ],
        Onboarding: [
          "Welcome to GoRigo! I'm thrilled to help you get started. The first step is to configure your AI agent — just go to Dashboard > Agent Configuration. Have you had a chance to explore your dashboard yet?",
          "Congratulations on joining GoRigo! Setting up is straightforward: create your agent, add some FAQ entries, fund your wallet, and you're ready for calls. Which step would you like help with?",
          "Welcome aboard! Your account comes with £5 free credit to get started. Let's set up your first AI agent — it only takes a few minutes. What kind of business are you running?",
        ],
      };

      const deptReplies = genericReplies[targetAgent.departmentName || "Sales"] || genericReplies.Sales;
      reply = deptReplies[Math.floor(Math.random() * deptReplies.length)];
    }

    return NextResponse.json({
      reply,
      agent: targetAgent.name,
      department: targetAgent.departmentName || "General",
    });
  } catch (error) {
    return handleRouteError(error, "DemoChat");
  }
}
