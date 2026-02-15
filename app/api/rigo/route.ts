import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/get-user";
import { rigoLimiter } from "@/lib/rate-limit";
import { checkBodySize, BODY_LIMITS } from "@/lib/body-limit";
import { hasInsufficientBalance, deductFromWallet, getWalletBalance, refundToWallet } from "@/lib/wallet";
import { callLLM, type ConversationMessage } from "@/lib/llm-router";
import { logAudit } from "@/lib/audit";
import { logCostEvent, calculateLLMCost } from "@/lib/unit-economics";
import { db } from "@/lib/db";
import { agents, callLogs, campaigns } from "@/shared/schema";
import { eq, and, sql, count, desc } from "drizzle-orm";
import { z } from "zod";
import { handleRouteError } from "@/lib/api-error";

const rigoSchema = z.object({
  message: z.string().min(1).max(2000),
  conversationHistory: z.array(z.object({
    role: z.string().min(1).max(50),
    content: z.string().min(1).max(5000),
  })).optional(),
}).strict();

const RIGO_COST_PER_INTERACTION = 0.01;

const RIGO_SYSTEM_PROMPT = `You are Rigo, the AI personal assistant for GoRigo — an AI call centre platform. You help users manage their call centre operations entirely by voice.

Your personality: Professional, warm, concise. British English. Never use emoji.

CRITICAL RULES:
1. Keep responses SHORT (1-3 sentences max) since they will be spoken aloud via text-to-speech.
2. When the user asks for data, respond with the actual data from the context provided.
3. Never make up numbers. Only report data from the context given to you.
4. If you cannot fulfil a request, briefly explain what the user can do instead via the dashboard.
5. For actions that modify data, confirm what you are about to do before executing.

You can help with:
- Checking call statistics and analytics (today's calls, total calls, etc.)
- Viewing wallet balance and recent transactions
- Listing and describing configured AI agents
- Checking campaign status and contact counts
- Providing platform tips and navigation guidance
- Summarising recent activity

When presenting numbers, round appropriately and use natural language (e.g. "You have had 12 calls today" not "count: 12").

Always address the user naturally. If this is their first interaction, introduce yourself briefly.`;

function detectIntent(message: string): string {
  const lower = message.toLowerCase();
  if (/call|calls|today|stat|analytic|recent|activity|busy|volume/.test(lower)) return "calls";
  if (/wallet|balance|money|credit|spend|cost|top.?up|fund/.test(lower)) return "wallet";
  if (/agent|bot|assistant|configure|setup/.test(lower)) return "agents";
  if (/campaign|outbound|contact|send/.test(lower)) return "campaigns";
  if (/overview|summary|dashboard|how.*doing|status|report/.test(lower)) return "overview";
  if (/hello|hi|hey|greet|start/.test(lower)) return "greeting";
  return "general";
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
    } catch {
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
    } catch {
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
    } catch {
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
    } catch {
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
    await refundToWallet(
      orgId,
      RIGO_COST_PER_INTERACTION,
      "Automatic refund — Rigo AI processing failed",
      "rigo_assistant",
      `rigo-refund-${deductionResult.transaction.id}`,
      deductionResult.transaction.id
    );
    console.log("[Rigo] Refund issued, txn:", deductionResult.transaction.id);
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
    isFreeGreeting = intentCategory === "greeting" && isFirstGreetingForOrg(auth.orgId);

    if (!isFreeGreeting) {
      const insufficientBalance = await hasInsufficientBalance(auth.orgId, RIGO_COST_PER_INTERACTION);
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
          RIGO_COST_PER_INTERACTION,
          "Rigo voice assistant interaction",
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
      }).catch(() => {});

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
        cost: isFreeGreeting ? 0 : RIGO_COST_PER_INTERACTION,
      },
    }).catch(() => {});

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
        revenueCharged: isFreeGreeting ? 0 : RIGO_COST_PER_INTERACTION,
        metadata: { source: "rigo", intent: intentCategory },
      }).catch(() => {});
    }

    return NextResponse.json({
      response: llmResult.content,
      model: llmResult.model,
      provider: llmResult.provider,
      cost: isFreeGreeting ? 0 : RIGO_COST_PER_INTERACTION,
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
