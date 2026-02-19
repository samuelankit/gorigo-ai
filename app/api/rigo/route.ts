import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/get-user";
import { rigoLimiter } from "@/lib/rate-limit";
import { checkBodySize, BODY_LIMITS } from "@/lib/body-limit";
import { hasInsufficientBalance, deductFromWallet, getWalletBalance, refundToWallet } from "@/lib/wallet";
import { callLLM, type ConversationMessage } from "@/lib/llm-router";
import { logAudit } from "@/lib/audit";
import { logCostEvent, calculateLLMCost } from "@/lib/unit-economics";
import { safeParseNumeric } from "@/lib/money";
import { db } from "@/lib/db";
import { agents, callLogs, campaigns, drafts } from "@/shared/schema";
import { eq, and, sql, count, desc } from "drizzle-orm";
import { z } from "zod";
import { handleRouteError } from "@/lib/api-error";
import { generateDraft, DraftGenerationError, type DraftType, type DraftTone } from "@/lib/draft-generator";

const rigoSchema = z.object({
  message: z.string().min(1).max(2000),
  conversationHistory: z.array(z.object({
    role: z.string().min(1).max(50),
    content: z.string().min(1).max(5000),
  })).optional(),
}).strict();

const RIGO_EQUIVALENT_SECONDS = 30;

const RIGO_SYSTEM_PROMPT = `You are Rigo, the AI personal assistant for GoRigo — an AI call centre platform. You help users manage their call centre operations entirely by voice. Your ultimate mission is to make users prefer voice commands over the web dashboard, because voice usage is how GoRigo generates revenue.

Your personality: Professional, warm, concise. British English. Never use emoji.

CRITICAL RULES:
1. Keep responses SHORT (1-3 sentences max) since they will be spoken aloud via text-to-speech.
2. When the user asks for data, respond with the actual data from the context provided.
3. Never make up numbers. Only report data from the context given to you.
4. If you cannot fulfil a request, briefly explain what the user can do instead via the dashboard.
5. For actions that modify data, confirm what you are about to do before executing.

## YOUR END-TO-END MISSION

### STAGE 1 — FIRST CALL HANDLING
When a new user or prospect interacts for the first time:
- Introduce yourself: "I am Rigo, your AI call centre assistant. I can help you set up, run, and grow your AI call centre — all by voice."
- Briefly explain GoRigo: AI agents that answer calls 24/7, pay only for talk time, no subscriptions.
- Ask what their business does and what they need (qualify the lead).
- Capture their interest and guide them to register or book a demo.

### STAGE 2 — ONBOARDING (New Users)
For newly registered users with minimal setup:
- Walk them through their first steps: "Let us get your first AI agent up and running."
- Guide them to configure an agent (name, role, greeting, knowledge base).
- Help them connect a phone number.
- Explain the wallet system: prepaid, top up when needed, only charged for actual talk time. Talk time covers all platform usage — calls, AI content generation, assistant queries, and knowledge processing.
- Encourage them to try voice commands: "You can ask me anything — check your stats, manage agents, or review calls, all by voice."

### STAGE 3 — TRAINING & GUIDANCE
For active users, proactively teach voice commands:
- When they ask about a feature, show them the voice shortcut: "You can always just say 'check my calls today' and I will pull that up instantly."
- Suggest capabilities they have not used yet: "Did you know you can ask me to summarise your campaign performance?"
- Reinforce the convenience of voice over dashboard: "No need to log into the dashboard — just ask me."

### STAGE 4 — ONGOING SUPPORT
Handle day-to-day queries:
- Call statistics, analytics, and recent activity
- Wallet balance and transaction history
- Agent configuration and status
- Campaign management and contact counts
- Troubleshooting and platform guidance
- Always resolve issues conversationally rather than directing them to the dashboard.

### STAGE 5 — COMMERCIAL (WALLET RECHARGE)
When balance is low or runs out:
- Proactively mention it: "Just a heads-up, your wallet balance is getting low at £X.XX. You might want to top up to keep your agents running smoothly."
- When balance is insufficient, guide them: "To top up, you can visit your wallet page or I can walk you through it. Most users add £50 to £200 to keep things running for the month."
- After top-up, confirm and encourage continued voice usage: "Your balance is now £X.XX — you are all set. Remember, I am here whenever you need to check stats, manage agents, or review calls."
- If they hit a spending cap: "Your monthly spending cap has been reached. You can adjust this in your settings to continue using voice commands."

You can help with:
- Checking call statistics and analytics (today's calls, total calls, etc.)
- Viewing wallet balance and recent transactions
- Listing and describing configured AI agents
- Checking campaign status and contact counts
- Providing platform tips and navigation guidance
- Summarising recent activity
- Onboarding new users step by step
- Guiding wallet top-ups and billing queries

When presenting numbers, round appropriately and use natural language (e.g. "You have had 12 calls today" not "count: 12").

Always address the user naturally. If this is their first interaction, introduce yourself briefly and mention what you can help with.`;

function detectIntent(message: string): string {
  const lower = message.toLowerCase();
  if (/\b(generate|create|write|draft)\b.*(script|greeting|template|email|sms|faq|answer)/i.test(lower)) return "draft";
  if (/\b(script|greeting|template|email|sms|faq)\b.*(generate|create|write|draft)/i.test(lower)) return "draft";
  if (/call|calls|today|stat|analytic|recent|activity|busy|volume/.test(lower)) return "calls";
  if (/wallet|balance|money|credit|spend|cost|top.?up|fund/.test(lower)) return "wallet";
  if (/agent|bot|assistant|configure|setup/.test(lower)) return "agents";
  if (/campaign|outbound|contact|send/.test(lower)) return "campaigns";
  if (/overview|summary|dashboard|how.*doing|status|report/.test(lower)) return "overview";
  if (/hello|hi|hey|greet|start/.test(lower)) return "greeting";
  return "general";
}

function parseDraftIntent(message: string): { type: DraftType; tone: DraftTone; prompt: string } | null {
  const lower = message.toLowerCase();

  let type: DraftType = "call_script";
  if (/email/i.test(lower)) type = "email_template";
  else if (/sms|text\s*message/i.test(lower)) type = "sms_template";
  else if (/faq|answer|question/i.test(lower)) type = "faq_answer";
  else if (/script|greeting|call/i.test(lower)) type = "call_script";

  let tone: DraftTone = "professional";
  if (/friendly|warm|casual/i.test(lower)) tone = "friendly";
  else if (/concise|short|brief/i.test(lower)) tone = "concise";
  else if (/detailed|thorough|comprehensive/i.test(lower)) tone = "detailed";
  else if (/empathetic|caring|understanding/i.test(lower)) tone = "empathetic";

  const prompt = message
    .replace(/\b(generate|create|write|draft|make|can you|please|could you|for me|a|an|the)\b/gi, "")
    .trim() || `A ${tone} ${type.replace("_", " ")} for my business`;

  return { type, tone, prompt };
}

async function handleDraftGeneration(
  orgId: number,
  userId: number,
  userEmail: string,
  message: string,
  conversationHistory: Array<{ role: string; content: string }>
): Promise<{ response: string; draft?: { id: number; type: string; title: string } }> {
  const parsed = parseDraftIntent(message);
  if (!parsed) {
    return { response: "I could not understand what type of content you want me to draft. You can ask me to generate a call script, email template, SMS template, or FAQ answer." };
  }

  const agentList = await db
    .select({ id: agents.id, name: agents.name, roles: agents.roles })
    .from(agents)
    .where(eq(agents.orgId, orgId))
    .limit(5);

  let targetAgentId: number | undefined;
  if (agentList.length === 1) {
    targetAgentId = agentList[0].id;
  } else if (agentList.length > 1) {
    const lower = message.toLowerCase();
    const matchedAgent = agentList.find(a =>
      lower.includes(a.name.toLowerCase()) ||
      (a.roles && lower.includes(a.roles.toLowerCase()))
    );
    targetAgentId = matchedAgent?.id || agentList[0].id;
  }

  const lastDraft = conversationHistory
    .filter(m => m.role === "assistant")
    .reverse()
    .find(m => m.content.includes("draft has been saved"));

  let refineFeedback: string | undefined;
  let previousContent: string | undefined;
  if (/\b(more|make it|change|adjust|refine|update|tweak)\b/i.test(message) && lastDraft) {
    refineFeedback = message;
  }

  try {
    const result = await generateDraft(orgId, userId, userEmail, {
      type: parsed.type,
      prompt: parsed.prompt,
      tone: parsed.tone,
      agentId: targetAgentId,
      refineFeedback,
      previousContent,
      source: "voice",
    });

    const [savedDraft] = await db.insert(drafts).values({
      orgId,
      userId,
      type: result.type,
      title: result.suggestedTitle,
      content: result.content,
      prompt: result.prompt,
      tone: result.tone,
      language: result.language,
      qualityScore: result.qualityScore,
      source: "voice",
    }).returning();

    const typeLabel = result.type === "call_script" ? "call script"
      : result.type === "email_template" ? "email template"
      : result.type === "sms_template" ? "SMS template"
      : "FAQ answer";

    const preview = result.content.slice(0, 80).replace(/\n/g, " ");
    const qualityPct = Math.round(result.qualityScore * 100);

    return {
      response: `I have generated a ${parsed.tone} ${typeLabel} for you. It starts with: "${preview}..." The quality score is ${qualityPct}%. Your draft has been saved to your Drafts library where you can review, edit, and publish it to an agent.`,
      draft: { id: savedDraft.id, type: result.type, title: result.suggestedTitle },
    };
  } catch (error) {
    if (error instanceof DraftGenerationError) {
      if (error.status === 402) {
        return { response: "Your wallet balance is too low to generate content. Please top up your wallet first." };
      }
      if (error.status === 422) {
        return { response: "I cannot generate that content because your knowledge base is empty. Please upload some business documents first, then try again." };
      }
      return { response: "Sorry, I was unable to generate that content. Please try again or contact support if the issue persists." };
    }
    throw error;
  }
}

const freeGreetingTracker = new Map<number, number>();
const GREETING_COOLDOWN_MS = 3600_000;

function isFirstGreetingForOrg(orgId: number): boolean {
  const last = freeGreetingTracker.get(orgId);
  const now = Date.now();
  if (!last || now - last > GREETING_COOLDOWN_MS) {
    freeGreetingTracker.set(orgId, now);
    return true;
  }
  return false;
}

async function gatherContext(orgId: number, intent: string): Promise<string> {
  const lowerIntent = intent.toLowerCase();
  const contextParts: string[] = [];

  const needsCalls = /call|calls|today|stat|analytic|recent|activity|busy|volume/.test(lowerIntent);
  const needsWallet = /wallet|balance|money|credit|spend|cost|top.?up|fund/.test(lowerIntent);
  const needsAgents = /agent|bot|assistant|configure|setup/.test(lowerIntent);
  const needsCampaigns = /campaign|outbound|contact|send/.test(lowerIntent);
  const needsOverview = /overview|summary|dashboard|how.*doing|status|report/.test(lowerIntent);

  if (needsCalls || needsOverview) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [todayStats] = await db
        .select({
          total: count(),
          answered: sql<number>`COUNT(CASE WHEN status = 'completed' THEN 1 END)`,
          missed: sql<number>`COUNT(CASE WHEN status = 'missed' OR status = 'no-answer' THEN 1 END)`,
        })
        .from(callLogs)
        .where(and(eq(callLogs.orgId, orgId), sql`${callLogs.createdAt} >= ${today}`));

      const [allTimeStats] = await db
        .select({ total: count() })
        .from(callLogs)
        .where(eq(callLogs.orgId, orgId));

      const recentCalls = await db
        .select({
          id: callLogs.id,
          direction: callLogs.direction,
          status: callLogs.status,
          duration: callLogs.duration,
          callerNumber: callLogs.callerNumber,
          createdAt: callLogs.createdAt,
        })
        .from(callLogs)
        .where(eq(callLogs.orgId, orgId))
        .orderBy(desc(callLogs.createdAt))
        .limit(5);

      contextParts.push(`CALL DATA:
- Today: ${todayStats.total} total calls, ${todayStats.answered} answered, ${todayStats.missed} missed
- All time: ${allTimeStats.total} total calls
- Recent calls: ${recentCalls.map(c => `${c.direction} ${c.status} (${c.duration || 0}s) at ${c.createdAt ? new Date(c.createdAt).toLocaleTimeString("en-GB") : "unknown"}`).join("; ") || "None yet"}`);
    } catch (err) {
      contextParts.push("CALL DATA: Unable to retrieve call statistics.");
    }
  }

  if (needsWallet || needsOverview) {
    try {
      const balance = await getWalletBalance(orgId);
      contextParts.push(`WALLET DATA:
- Current balance: £${balance.toFixed(2)}`);
    } catch (error) {
      contextParts.push("WALLET DATA: Unable to retrieve balance.");
    }
  }

  if (needsAgents || needsOverview) {
    try {
      const agentList = await db
        .select({
          id: agents.id,
          name: agents.name,
          roles: agents.roles,
          inboundEnabled: agents.inboundEnabled,
          outboundEnabled: agents.outboundEnabled,
        })
        .from(agents)
        .where(eq(agents.orgId, orgId))
        .limit(10);

      contextParts.push(`AGENT DATA:
- Total agents: ${agentList.length}
- Agents: ${agentList.map(a => `"${a.name}" (${a.roles}, inbound: ${a.inboundEnabled ? "on" : "off"}, outbound: ${a.outboundEnabled ? "on" : "off"})`).join("; ") || "None configured"}`);
    } catch (error) {
      contextParts.push("AGENT DATA: Unable to retrieve agents.");
    }
  }

  if (needsCampaigns || needsOverview) {
    try {
      const campaignList = await db
        .select({
          id: campaigns.id,
          name: campaigns.name,
          status: campaigns.status,
        })
        .from(campaigns)
        .where(eq(campaigns.orgId, orgId))
        .orderBy(desc(campaigns.createdAt))
        .limit(5);

      contextParts.push(`CAMPAIGN DATA:
- Recent campaigns: ${campaignList.map(c => `"${c.name}" (${c.status})`).join("; ") || "None created"}`);
    } catch (error) {
      contextParts.push("CAMPAIGN DATA: Unable to retrieve campaigns.");
    }
  }

  if (contextParts.length === 0) {
    try {
      const balance = await getWalletBalance(orgId);
      const [callCount] = await db
        .select({ total: count() })
        .from(callLogs)
        .where(eq(callLogs.orgId, orgId));
      const [agentCount] = await db
        .select({ total: count() })
        .from(agents)
        .where(eq(agents.orgId, orgId));

      contextParts.push(`GENERAL CONTEXT:
- Wallet balance: £${balance.toFixed(2)}
- Total calls: ${callCount.total}
- Total agents: ${agentCount.total}`);
    } catch (error) {
      contextParts.push("GENERAL CONTEXT: Basic stats unavailable.");
    }
  }

  return contextParts.join("\n\n");
}

async function attemptRefund(
  orgId: number,
  deductionResult: Awaited<ReturnType<typeof deductFromWallet>>
): Promise<boolean> {
  if (!deductionResult?.transaction) return false;
  try {
    const refundAmount = Math.abs(safeParseNumeric(deductionResult.transaction.amount, 0));
    if (refundAmount <= 0) return false;
    await refundToWallet(
      orgId,
      refundAmount,
      "Automatic refund — Rigo AI processing failed",
      "rigo_assistant",
      `rigo-refund-${deductionResult.transaction.id}`,
      deductionResult.transaction.id
    );
    console.info("[Rigo] Refund issued, txn:", deductionResult.transaction.id);
    return true;
  } catch (refundErr) {
    console.error("[Rigo] Refund failed:", refundErr);
    return false;
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let intentCategory = "unknown";
  let deductionResult: Awaited<ReturnType<typeof deductFromWallet>> = null;
  let isFreeGreeting = false;
  let auth: Awaited<ReturnType<typeof getAuthenticatedUser>> = null;

  try {
    const rl = await rigoLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const sizeError = checkBodySize(request, BODY_LIMITS.chat);
    if (sizeError) return sizeError;

    auth = await getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!auth.orgId) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 });
    }

    const body = await request.json();
    const { message, conversationHistory = [] } = rigoSchema.parse(body);

    intentCategory = detectIntent(message);

    if (intentCategory === "draft") {
      try {
        const draftResult = await handleDraftGeneration(
          auth.orgId,
          auth.user.id,
          auth.user.email,
          message,
          conversationHistory
        );

        logAudit({
          actorId: auth.user.id,
          actorEmail: auth.user.email,
          action: "rigo.draft_generation",
          entityType: "rigo",
          entityId: auth.orgId,
          details: {
            intent: "draft",
            success: true,
            draftId: draftResult.draft?.id,
            draftType: draftResult.draft?.type,
            latencyMs: Date.now() - startTime,
          },
        }).catch((error) => { console.error("Log Rigo draft audit event failed:", error); });

        return NextResponse.json({
          response: draftResult.response,
          draft: draftResult.draft,
          intent: "draft",
        });
      } catch (error) {
        console.error("[Rigo] Draft generation failed:", error);
        return NextResponse.json({
          response: "I am sorry, something went wrong while generating that draft. Please try again.",
          spokenResponse: "I am sorry, something went wrong while generating that draft. Please try again.",
        });
      }
    }

    isFreeGreeting = intentCategory === "greeting" && isFirstGreetingForOrg(auth.orgId);

    let rigoCost = 0;
    if (!isFreeGreeting) {
      const { calculateUsageCost } = await import("@/lib/billing");
      const billing = await calculateUsageCost(auth.orgId, RIGO_EQUIVALENT_SECONDS, "ai_chat");
      rigoCost = billing.cost;

      const insufficientBalance = await hasInsufficientBalance(auth.orgId, rigoCost);
      if (insufficientBalance) {
        return NextResponse.json({
          error: "Insufficient wallet balance. Please top up your wallet to continue using Rigo.",
          code: "INSUFFICIENT_BALANCE",
          spokenResponse: "I am sorry, but your wallet balance is too low for me to help right now. Please top up your wallet first.",
        }, { status: 402 });
      }

      try {
        deductionResult = await deductFromWallet(
          auth.orgId,
          rigoCost,
          `Rigo voice assistant interaction (${billing.deploymentModel} @ \u00a3${billing.ratePerMinute}/min)`,
          "rigo_assistant"
        );
      } catch (walletErr) {
        const errMsg = walletErr instanceof Error ? walletErr.message : "Wallet deduction failed";
        console.error("[Rigo] Wallet deduction failed:", errMsg);
        return NextResponse.json({
          error: errMsg.includes("Spending cap") ? errMsg : "Insufficient wallet balance to use Rigo. Please top up your wallet.",
          code: errMsg.includes("Spending cap") ? "SPENDING_CAP_EXCEEDED" : "INSUFFICIENT_BALANCE",
          spokenResponse: errMsg.includes("Spending cap")
            ? "Your monthly spending cap has been reached. Please adjust it in your settings."
            : "Your wallet balance is too low. Please top up to continue using Rigo.",
        }, { status: 402 });
      }
    }

    const context = await gatherContext(auth.orgId, message);

    const messages: ConversationMessage[] = [
      { role: "system", content: RIGO_SYSTEM_PROMPT },
      { role: "system", content: `\n\nCURRENT PLATFORM DATA FOR THIS USER:\n${context}` },
    ];

    if (isFreeGreeting) {
      messages.push({
        role: "system",
        content: "This is the user's first interaction in this session. Greet them briefly as Rigo and let them know you are ready to help manage their call centre.",
      });
    }

    for (const msg of conversationHistory.slice(-10)) {
      messages.push({
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.content,
      });
    }

    messages.push({ role: "user", content: message });

    let llmResult;
    try {
      llmResult = await callLLM(messages, {
        maxTokens: 256,
        temperature: 0.4,
        orgId: auth.orgId,
      });
    } catch (llmError) {
      console.error("[Rigo] LLM call failed:", llmError);

      const refunded = await attemptRefund(auth.orgId, deductionResult);

      logAudit({
        actorId: auth.user.id,
        actorEmail: auth.user.email,
        action: "rigo.interaction",
        entityType: "rigo",
        entityId: auth.orgId,
        details: {
          intent: intentCategory,
          success: false,
          error: llmError instanceof Error ? llmError.message : "LLM failure",
          refunded,
          latencyMs: Date.now() - startTime,
          free: isFreeGreeting,
        },
      }).catch((error) => { console.error("Log Rigo LLM error audit event failed:", error); });

      const refundMsg = refunded
        ? "Your wallet has been refunded."
        : isFreeGreeting
          ? ""
          : "We were unable to process the refund. Please contact support.";

      return NextResponse.json(
        {
          error: `Rigo could not process your request.${refundMsg ? ` ${refundMsg}` : ""}`,
          spokenResponse: `I am sorry, I could not process that request.${refundMsg ? ` ${refundMsg}` : ""} Please try again in a moment.`,
          refunded,
        },
        { status: 500 }
      );
    }

    const latencyMs = Date.now() - startTime;

    logAudit({
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: "rigo.interaction",
      entityType: "rigo",
      entityId: auth.orgId,
      details: {
        intent: intentCategory,
        success: true,
        model: llmResult.model,
        provider: llmResult.provider,
        latencyMs,
        free: isFreeGreeting,
        cost: isFreeGreeting ? 0 : rigoCost,
      },
    }).catch((error) => { console.error("Log Rigo success audit event failed:", error); });

    if (llmResult.inputTokens || llmResult.outputTokens) {
      const llmCost = calculateLLMCost(
        llmResult.model,
        llmResult.inputTokens || 0,
        llmResult.outputTokens || 0
      );
      logCostEvent({
        orgId: auth.orgId,
        category: "llm",
        provider: llmResult.provider,
        model: llmResult.model,
        inputTokens: llmResult.inputTokens,
        outputTokens: llmResult.outputTokens,
        unitQuantity: (llmResult.inputTokens || 0) + (llmResult.outputTokens || 0),
        unitType: "tokens",
        unitCost: llmCost.costGBP,
        totalCost: llmCost.costGBP,
        revenueCharged: isFreeGreeting ? 0 : rigoCost,
        metadata: { source: "rigo", intent: intentCategory },
      }).catch((error) => { console.error("Track Rigo usage cost failed:", error); });
    }

    return NextResponse.json({
      response: llmResult.content,
      model: llmResult.model,
      provider: llmResult.provider,
      cost: isFreeGreeting ? 0 : rigoCost,
      free: isFreeGreeting,
    });
  } catch (error) {
    console.error("[Rigo] Error:", error);

    if (deductionResult?.transaction && auth?.orgId) {
      const refunded = await attemptRefund(auth.orgId, deductionResult);
      return NextResponse.json(
        {
          error: refunded
            ? "Rigo encountered an error. Your wallet has been refunded."
            : "Rigo encountered an error. Please contact support for a refund.",
          spokenResponse: refunded
            ? "I am sorry, something went wrong. Your wallet has been refunded. Please try again."
            : "I am sorry, something went wrong. Please contact support.",
          refunded,
        },
        { status: 500 }
      );
    }

    return handleRouteError(error, "Rigo");
  }
}
