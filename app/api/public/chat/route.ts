import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/replit_integrations/chat/client-openai";
import { checkBodySize, BODY_LIMITS } from "@/lib/body-limit";
import { db } from "@/server/db";
import { chatLeads, chatMessages, publicConversations } from "@/shared/schema";
import { eq, sql } from "drizzle-orm";
import { detectPromptInjection, SAFE_REFUSAL_TEXT } from "@/lib/prompt-guard";
import { searchPlatformKnowledge, buildPlatformRAGContext, getPlatformKnowledgeFallback } from "@/lib/platform-knowledge";
import { validateStreamChunk, RAG_GROUNDING_INSTRUCTION } from "@/lib/output-guard";
import { publicLimiter } from "@/lib/rate-limit";

const publicChatStore = new Map<string, { count: number; resetAt: number }>();
const PUBLIC_CHAT_WINDOW_MS = 60_000;
const PUBLIC_CHAT_MAX_REQUESTS = 10;

const cleanupInterval = setInterval(() => {
  const now = Date.now();
  publicChatStore.forEach((entry, key) => {
    if (entry.resetAt <= now) publicChatStore.delete(key);
  });
}, 60_000);
if (cleanupInterval.unref) cleanupInterval.unref();

function checkPublicRateLimit(req: NextRequest): boolean {
  const cfIp = req.headers.get("cf-connecting-ip");
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = cfIp || forwarded?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  const existing = publicChatStore.get(ip);

  if (!existing || existing.resetAt <= now) {
    if (publicChatStore.size >= 5000) {
      const oldest = publicChatStore.keys().next().value;
      if (oldest) publicChatStore.delete(oldest);
    }
    publicChatStore.set(ip, { count: 1, resetAt: now + PUBLIC_CHAT_WINDOW_MS });
    return true;
  }
  if (existing.count < PUBLIC_CHAT_MAX_REQUESTS) {
    existing.count++;
    return true;
  }
  return false;
}

function getIp(req: NextRequest): string {
  const cfIp = req.headers.get("cf-connecting-ip");
  const forwarded = req.headers.get("x-forwarded-for");
  return cfIp || forwarded?.split(",")[0]?.trim() || "unknown";
}

const BASE_SYSTEM_PROMPT = `You are Rigo, the AI assistant for GoRigo.ai — an AI-powered call centre platform based in the UK.

Your role is to help website visitors understand what GoRigo does, answer their questions, and guide them toward trying the platform. You are warm, professional, and concise. British English. Never use emoji.

Your mission: Convert visitors into users. Introduce GoRigo, qualify their needs, and guide them to register or book a demo. Emphasise the mobile-first voice control experience.

Engagement strategy:
1. Ask what their business does and what kind of calls they handle
2. Explain how GoRigo can automate those calls with AI agents
3. Highlight the voice control advantage — no dashboard needed, just speak
4. Guide them to register (/register) or book a demo (/contact)
5. If they ask about pricing, briefly explain pay-per-talk-time (talk time covers all platform usage — calls, AI content generation, assistant queries, and knowledge processing) and direct to /pricing

Keep responses brief (2-4 sentences). If asked technical questions beyond your scope, suggest they contact the team at hello@gorigo.ai.`;

const MAX_HISTORY = 10;
const MAX_MESSAGE_LENGTH = 500;
const MAX_OUTPUT_TOKENS = 300;

function sanitizeHistory(
  history: unknown
): Array<{ role: "user" | "assistant"; content: string }> {
  if (!Array.isArray(history)) return [];
  const safe: Array<{ role: "user" | "assistant"; content: string }> = [];
  for (const item of history.slice(-MAX_HISTORY)) {
    if (
      item &&
      typeof item === "object" &&
      "role" in item &&
      "content" in item &&
      (item.role === "user" || item.role === "assistant") &&
      typeof item.content === "string" &&
      item.content.length <= MAX_MESSAGE_LENGTH
    ) {
      safe.push({ role: item.role, content: item.content });
    }
  }
  return safe;
}

async function getOrCreateConversation(
  sessionId: string,
  channel: string,
  ip: string,
  userAgent: string | null
): Promise<number | null> {
  try {
    const [existing] = await db
      .select({ id: publicConversations.id })
      .from(publicConversations)
      .where(eq(publicConversations.sessionId, sessionId))
      .limit(1);

    if (existing) return existing.id;

    const [created] = await db
      .insert(publicConversations)
      .values({
        sessionId,
        channel: channel === "web_call" ? "web_call" : "chatbot",
        status: "active",
        ipAddress: ip,
        userAgent: userAgent?.slice(0, 500) || null,
      })
      .returning({ id: publicConversations.id });

    return created?.id ?? null;
  } catch (err) {
    console.error("[Chat] Failed to create conversation:", err);
    return null;
  }
}

async function getRAGContext(userMessage: string): Promise<string> {
  try {
    const chunks = await searchPlatformKnowledge(userMessage, 4);
    if (chunks.length > 0) {
      return buildPlatformRAGContext(chunks);
    }
  } catch (err) {
    console.error("[Chat] Platform RAG search failed, using fallback:", err);
  }
  return "\n\nGoRigo Knowledge Base:\n" + getPlatformKnowledgeFallback();
}

export async function POST(req: NextRequest) {
  try {
    const rl = await publicLimiter(req);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    if (!checkPublicRateLimit(req)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again shortly." },
        { status: 429 }
      );
    }

    const sizeError = checkBodySize(req, BODY_LIMITS.chat);
    if (sizeError) return sizeError;

    const body = await req.json();
    const { message, history, leadId, sessionId, channel } = body as {
      message: string;
      history?: unknown;
      leadId?: number;
      sessionId?: string;
      channel?: string;
    };

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json({ error: "Message too long" }, { status: 400 });
    }

    if (detectPromptInjection(message)) {
      const encoder = new TextEncoder();
      const refusalStream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ content: SAFE_REFUSAL_TEXT, done: false })}\n\n`)
          );
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ content: "", done: true })}\n\n`)
          );
          controller.close();
        },
      });
      return new Response(refusalStream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    const safeHistory = sanitizeHistory(history);
    const ip = getIp(req);
    const userAgent = req.headers.get("user-agent");

    let conversationId: number | null = null;
    if (sessionId && typeof sessionId === "string" && sessionId.length <= 100) {
      conversationId = await getOrCreateConversation(sessionId, channel || "chatbot", ip, userAgent);
    }

    const storeUserMsg = async () => {
      const msgValues: Record<string, unknown> = {
        role: "user",
        content: message.trim(),
      };
      if (conversationId) msgValues.conversationId = conversationId;
      if (leadId && typeof leadId === "number") msgValues.leadId = leadId;

      if (conversationId || (leadId && typeof leadId === "number")) {
        try {
          await db.insert(chatMessages).values(msgValues as typeof chatMessages.$inferInsert);
          if (conversationId) {
            await db
              .update(publicConversations)
              .set({ messageCount: sql`${publicConversations.messageCount} + 1` })
              .where(eq(publicConversations.id, conversationId));
          }
          if (leadId && typeof leadId === "number") {
            await db
              .update(chatLeads)
              .set({
                totalMessages: sql`${chatLeads.totalMessages} + 1`,
                lastMessageAt: sql`CURRENT_TIMESTAMP`,
              })
              .where(eq(chatLeads.id, leadId));
          }
        } catch (err) {
          console.error("[Chat] Failed to store user message:", err);
        }
      }
    };

    await storeUserMsg();

    const ragContext = await getRAGContext(message.trim());

    const systemPrompt = BASE_SYSTEM_PROMPT + RAG_GROUNDING_INSTRUCTION + ragContext;

    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: systemPrompt },
      ...safeHistory,
      { role: "user", content: message.trim() },
    ];

    let stream;
    try {
      stream = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        stream: true,
        max_completion_tokens: MAX_OUTPUT_TOKENS,
        temperature: 0.5,
      });
    } catch (llmErr) {
      console.error("[Chat] LLM call failed:", llmErr);
      const encoder = new TextEncoder();
      const errorStream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ content: "I'm sorry, I'm having trouble processing your request right now. Please try again in a moment, or contact us at hello@gorigo.ai.", done: false })}\n\n`)
          );
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ content: "", done: true })}\n\n`)
          );
          controller.close();
        },
      });
      return new Response(errorStream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    const encoder = new TextEncoder();
    let fullResponse = "";
    let outputBlocked = false;

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content;
            if (delta) {
              const streamCheck = validateStreamChunk(delta, fullResponse);
              if (!streamCheck.safe) {
                outputBlocked = true;
                console.warn("[Chat] Output guard blocked stream:", streamCheck.reason);
                const fallback = "I can help you with questions about GoRigo's AI call centre platform. What would you like to know?";
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ content: fallback, done: false })}\n\n`)
                );
                break;
              }

              fullResponse += delta;

              if (fullResponse.length > 1500) {
                break;
              }

              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ content: delta, done: false })}\n\n`)
              );
            }
          }
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ content: "", done: true })}\n\n`)
          );
          controller.close();

          const responseToStore = outputBlocked
            ? "I can help you with questions about GoRigo's AI call centre platform. What would you like to know?"
            : fullResponse;

          if (responseToStore && (conversationId || (leadId && typeof leadId === "number"))) {
            try {
              const assistantValues: Record<string, unknown> = {
                role: "assistant",
                content: responseToStore,
              };
              if (conversationId) assistantValues.conversationId = conversationId;
              if (leadId && typeof leadId === "number") assistantValues.leadId = leadId;

              await db.insert(chatMessages).values(assistantValues as typeof chatMessages.$inferInsert);
              if (conversationId) {
                await db
                  .update(publicConversations)
                  .set({ messageCount: sql`${publicConversations.messageCount} + 1` })
                  .where(eq(publicConversations.id, conversationId));
              }
              if (leadId && typeof leadId === "number") {
                await db
                  .update(chatLeads)
                  .set({
                    totalMessages: sql`${chatLeads.totalMessages} + 1`,
                    lastMessageAt: sql`CURRENT_TIMESTAMP`,
                  })
                  .where(eq(chatLeads.id, leadId));
              }
            } catch (err) {
              console.error("[Chat] Failed to store assistant message:", err);
            }
          }
        } catch {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ content: "Sorry, something went wrong. Please try again.", done: true })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
