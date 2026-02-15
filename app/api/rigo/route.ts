import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/get-user";
import { aiLimiter } from "@/lib/rate-limit";
import { checkBodySize, BODY_LIMITS } from "@/lib/body-limit";
import { hasInsufficientBalance, deductFromWallet, getWalletBalance } from "@/lib/wallet";
import { callLLM, type ConversationMessage } from "@/lib/llm-router";
import { db } from "@/lib/db";
import { agents, callLogs, campaigns } from "@/shared/schema";
import { eq, and, sql, count, desc } from "drizzle-orm";

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

export async function POST(request: NextRequest) {
  try {
    const rl = await aiLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const sizeError = checkBodySize(request, BODY_LIMITS.chat);
    if (sizeError) return sizeError;

    const auth = await getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!auth.orgId) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 });
    }

    const insufficientBalance = await hasInsufficientBalance(auth.orgId, RIGO_COST_PER_INTERACTION);
    if (insufficientBalance) {
      return NextResponse.json({
        error: "Insufficient wallet balance. Please top up your wallet to continue using Rigo.",
        code: "INSUFFICIENT_BALANCE",
        spokenResponse: "I am sorry, but your wallet balance is too low for me to help right now. Please top up your wallet first.",
      }, { status: 402 });
    }

    const body = await request.json();
    const { message, conversationHistory = [], isFirstInteraction = false } = body;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    try {
      await deductFromWallet(
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

    const context = await gatherContext(auth.orgId, message);

    const messages: ConversationMessage[] = [
      { role: "system", content: RIGO_SYSTEM_PROMPT },
      { role: "system", content: `\n\nCURRENT PLATFORM DATA FOR THIS USER:\n${context}` },
    ];

    if (isFirstInteraction) {
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

    const llmResult = await callLLM(messages, {
      maxTokens: 256,
      temperature: 0.4,
      orgId: auth.orgId,
    });

    return NextResponse.json({
      response: llmResult.content,
      model: llmResult.model,
      provider: llmResult.provider,
      cost: RIGO_COST_PER_INTERACTION,
    });
  } catch (error) {
    console.error("[Rigo] Error:", error);
    return NextResponse.json(
      {
        error: "Rigo encountered an error. Please try again.",
        spokenResponse: "I am sorry, something went wrong. Please try again in a moment.",
      },
      { status: 500 }
    );
  }
}
