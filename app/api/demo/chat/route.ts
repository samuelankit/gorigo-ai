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
    const lowerMsg = message.toLowerCase();
    const salesKeywords = ["pricing", "cost", "demo", "buy", "plans", "features", "interested", "how much", "trial"];
    const supportKeywords = ["help", "issue", "problem", "not working", "error", "bug", "reset", "password", "billing"];
    const onboardingKeywords = ["new", "getting started", "setup", "first time", "how to", "configure", "just signed up"];

    let targetAgent;
    try {
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
    } catch (dbErr) {
      console.warn("[DemoChat] DB query failed (table may not exist yet):", dbErr instanceof Error ? dbErr.message : dbErr);
    }

    const BUILTIN_AGENTS: Record<string, { name: string; dept: string; faqs: Array<{question: string; answer: string}> }> = {
      sales: {
        name: "Rigo", dept: "Sales",
        faqs: [
          { question: "what is gorigo", answer: "GoRigo is an AI-powered voice platform that automates outbound and inbound calling for businesses. You get intelligent AI agents, campaign management, compliance tools, and real-time analytics — all in one platform." },
          { question: "how much does gorigo cost price", answer: "GoRigo uses talk-time-only billing. Individual plan: £0.20/min. Team plan: £0.18/min. Enterprise: custom pricing. Minimum wallet top-up is £50. You only pay for actual call minutes — no monthly fees." },
          { question: "free trial", answer: "GoRigo is a prepaid platform with no free trials. You top up your wallet with a minimum of £50 and only pay for actual talk time used. No wasted budget on subscriptions." },
          { question: "features what can gorigo do", answer: "GoRigo includes: AI voice agents, outbound campaign management, inbound call handling, knowledge base RAG, compliance tools (DNC, TPS, TCPA), real-time analytics, multi-agent management, visual flow builder, and a mobile app." },
          { question: "how start get started sign up", answer: "Getting started is simple: 1) Create your account. 2) Top up your wallet (min £50). 3) Create your AI agent. 4) Add a phone number. 5) Launch your first campaign. Your AI is live in minutes." },
        ],
      },
      support: {
        name: "Rigo", dept: "Support",
        faqs: [
          { question: "top up wallet", answer: "Go to Dashboard > Finance > Wallet, click 'Top Up', and complete the Stripe checkout. Minimum top-up is £50. Top-ups are non-refundable except for platform errors." },
          { question: "reset password", answer: "Click 'Forgot Password' on the login page, enter your email, and follow the link we send you. Links expire after 1 hour." },
          { question: "call failed why", answer: "Common reasons: insufficient wallet balance (minimum £1.00 required), DNC/TPS compliance block, or invalid phone number format. Check your Call History for the exact failure reason." },
          { question: "billing invoice receipt", answer: "Go to Finance > Invoices to download PDF invoices and receipts. All transactions are logged in your wallet history with timestamps." },
        ],
      },
      onboarding: {
        name: "Rigo", dept: "Onboarding",
        faqs: [
          { question: "how get started first steps", answer: "Welcome! 3 steps: 1) Top up your wallet (minimum £50). 2) Create your AI agent in Agents & Flow. 3) Add your phone number and launch a campaign. That is it — your AI is live!" },
          { question: "create agent", answer: "Go to Agents & Flow > Create Agent. Give it a name, set the greeting message, add FAQ entries, and configure the voice. Your agent is ready in under 5 minutes." },
          { question: "run campaign", answer: "Go to Campaigns > Create Campaign. Choose your agent, upload a contact list (CSV), set your calling hours and budget cap, then click Approve. The platform handles everything automatically." },
          { question: "phone number", answer: "Go to Phone Numbers in the left menu. Search available UK numbers, select one, and it is instantly assigned to your account. You can then attach it to any agent or campaign." },
        ],
      },
    };

    const builtinKey = department in BUILTIN_AGENTS ? department : "sales";
    const builtin = BUILTIN_AGENTS[builtinKey];

    const syntheticAgent = targetAgent || {
      name: builtin.name,
      departmentName: builtin.dept,
      faqEntries: builtin.faqs,
    };

    const msgClean = message.toLowerCase().replace(/[^a-z0-9\s]/g, "");
    const msgWords = msgClean.split(/\s+/).filter(w => w.length > 2);

    const TOPIC_TRIGGERS: Array<{ keywords: string[]; faqKey: string }> = [
      { keywords: ["cost", "price", "pricing", "how much", "per minute", "rate", "plan", "package", "expensive", "cheap", "pay", "billing", "charge"], faqKey: "cost" },
      { keywords: ["free trial", "trial", "free"], faqKey: "trial" },
      { keywords: ["feature", "what can", "capability", "do for", "include", "offer", "tools", "does it do"], faqKey: "features" },
      { keywords: ["get started", "start", "sign up", "begin", "setup", "first step", "join", "onboard"], faqKey: "start" },
      { keywords: ["what is gorigo", "what is it", "about gorigo", "tell me about", "gorigo platform", "explain gorigo"], faqKey: "about" },
    ];

    const FAQ_KEY_MAP: Record<string, string> = {
      "cost": "how much does gorigo cost price",
      "trial": "free trial",
      "features": "features what can gorigo do",
      "start": "how start get started sign up",
      "about": "what is gorigo",
      "wallet": "top up wallet",
      "password": "reset password",
      "failed": "call failed why",
      "invoice": "billing invoice receipt",
      "create": "create agent",
      "campaign": "run campaign",
      "phone": "phone number",
    };

    let faqMatch = "";

    const DIRECT_ANSWERS: Record<string, string> = {
      "cost": "GoRigo uses talk-time-only billing. Individual plan: £0.20/min. Team plan: £0.18/min. Enterprise: custom pricing. Minimum wallet top-up is £50. You only pay for actual call minutes — no monthly fees.",
      "trial": "GoRigo is a prepaid platform with no free trials. You top up your wallet with a minimum of £50 and only pay for actual talk time used. No wasted budget on subscriptions.",
      "features": "GoRigo includes: AI voice agents, outbound campaign management, inbound call handling, knowledge base RAG, compliance tools (DNC, TPS, TCPA), real-time analytics, multi-agent management, visual flow builder, and a mobile app.",
      "start": "Getting started is simple: 1) Create your account. 2) Top up your wallet (min £50). 3) Create your AI agent. 4) Add a phone number. 5) Launch your first campaign. Your AI is live in minutes.",
      "about": "GoRigo is an AI-powered voice platform that automates outbound and inbound calling for businesses. You get intelligent AI agents, campaign management, compliance tools, and real-time analytics — all in one platform.",
      "wallet": "Go to Dashboard > Finance > Wallet, click 'Top Up', and complete the Stripe checkout. Minimum top-up is £50. Top-ups are non-refundable except for platform errors.",
      "password": "Click 'Forgot Password' on the login page, enter your email, and follow the link we send you. Links expire after 1 hour.",
      "failed": "Common reasons: insufficient wallet balance (minimum £1.00 required), DNC/TPS compliance block, or invalid phone number format. Check your Call History for the exact failure reason.",
      "invoice": "Go to Finance > Invoices to download PDF invoices and receipts. All transactions are logged in your wallet history with timestamps.",
      "create": "Go to Agents & Flow > Create Agent. Give it a name, set the greeting message, add FAQ entries, and configure the voice. Your agent is ready in under 5 minutes.",
      "campaign": "Go to Campaigns > Create Campaign. Choose your agent, upload a contact list (CSV), set your calling hours and budget cap, then click Approve. The platform handles everything automatically.",
      "phone": "Go to Phone Numbers in the left menu. Search available UK numbers, select one, and it is instantly assigned to your account. You can then attach it to any agent or campaign.",
    };

    for (const topic of TOPIC_TRIGGERS) {
      if (topic.keywords.some(k => lowerMsg.includes(k))) {
        faqMatch = DIRECT_ANSWERS[topic.faqKey] || "";
        if (faqMatch) break;
      }
    }

    if (!faqMatch && syntheticAgent.faqEntries && Array.isArray(syntheticAgent.faqEntries)) {
      const faqs = syntheticAgent.faqEntries as Array<{ question: string; answer: string }>;
      let bestScore = 0;
      for (const faq of faqs) {
        const qWords = faq.question.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(w => w.length > 3);
        const matchCount = msgWords.filter(w => w.length > 3 && qWords.includes(w)).length;
        if (matchCount > 0 && matchCount > bestScore) {
          bestScore = matchCount;
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
          "Thanks for your interest in GoRigo! We help businesses automate their call centres with intelligent AI agents. You only pay for actual talk time — no hidden fees or monthly minimums on Individual plans. Shall I walk you through the key features?",
          "GoRigo stands out with our multi-agent system, flexible deployment options, and knowledge base RAG. You only pay for actual call minutes — no hidden fees. What aspect are you most interested in?",
        ],
        Support: [
          "I'd be happy to help! Could you describe the issue you're experiencing? I can assist with account settings, billing enquiries, agent configuration, and general troubleshooting.",
          "Thanks for reaching out to GoRigo support. I can help with most platform issues. Could you share a bit more detail about what you need help with?",
          "I'm here to help resolve any issues. Common things I can assist with include wallet and billing questions, agent setup, call quality, and integration configuration. What do you need?",
        ],
        Onboarding: [
          "Welcome to GoRigo! I'm thrilled to help you get started. The first step is to configure your AI agent — just go to Dashboard > Agent Configuration. Have you had a chance to explore your dashboard yet?",
          "Congratulations on joining GoRigo! Setting up is straightforward: create your agent, add some FAQ entries, fund your wallet, and you're ready for calls. Which step would you like help with?",
          "Welcome aboard! Let's set up your first AI agent — it only takes a few minutes. Top up your prepaid wallet and you're ready to go. What kind of business are you running?",
        ],
      };

      const deptReplies = genericReplies[syntheticAgent.departmentName || "Sales"] || genericReplies.Sales;
      reply = deptReplies[Math.floor(Math.random() * deptReplies.length)];
    }

    return NextResponse.json({
      reply,
      agent: syntheticAgent.name,
      department: syntheticAgent.departmentName || "General",
    });
  } catch (error) {
    return handleRouteError(error, "DemoChat");
  }
}
