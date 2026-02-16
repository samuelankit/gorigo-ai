import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/replit_integrations/chat/client-openai";
import { checkBodySize, BODY_LIMITS } from "@/lib/body-limit";
import { db } from "@/server/db";
import { chatLeads, chatMessages } from "@/shared/schema";
import { eq, sql } from "drizzle-orm";
import { detectPromptInjection, SAFE_REFUSAL_TEXT } from "@/lib/prompt-guard";

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

const SYSTEM_PROMPT = `You are Rigo, the AI assistant for GoRigo.ai — an AI-powered call centre platform based in the UK.

Your role is to help website visitors understand what GoRigo does, answer their questions, and guide them toward trying the platform. You are warm, professional, and concise. British English. Never use emoji.

Your mission: Convert visitors into users. Introduce GoRigo, qualify their needs, and guide them to register or book a demo. Emphasise the mobile-first voice control experience — users can run their entire AI call centre from their phone using voice commands.

Key facts about GoRigo:
- AI voice agents that answer calls 24/7 with natural conversation
- Pay only for actual talk time — no seat licences or subscriptions
- Run your entire call centre from your phone using voice commands (Rigo assistant)
- Mobile app available for Managed and BYOK deployment packages
- UK compliant: GDPR, DNC checks, consent management, PII redaction built in
- Supports 30+ languages with automatic detection
- Real-time analytics dashboard with sentiment analysis and quality scoring
- Handles thousands of concurrent calls with consistent quality
- Four deployment options: Managed, BYOK (Bring Your Own Key), Self-Hosted, Custom
- Company: International Business Exchange Limited, UK Company No. 15985956
- Contact: hello@gorigo.ai
- For demos or sales enquiries, suggest they visit /contact or call the AI line

Engagement strategy:
1. Ask what their business does and what kind of calls they handle
2. Explain how GoRigo can automate those calls with AI agents
3. Highlight the voice control advantage — no dashboard needed, just speak
4. Guide them to register (/register) or book a demo (/contact)
5. If they ask about pricing, briefly explain pay-per-talk-time and direct to /pricing

Keep responses brief (2-4 sentences). If asked technical questions beyond your scope, suggest they contact the team.`;

const MAX_HISTORY = 10;
const MAX_MESSAGE_LENGTH = 500;

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

export async function POST(req: NextRequest) {
  try {
    if (!checkPublicRateLimit(req)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again shortly." },
        { status: 429 }
      );
    }

    const sizeError = checkBodySize(req, BODY_LIMITS.chat);
    if (sizeError) return sizeError;

    const body = await req.json();
    const { message, history, leadId } = body as {
      message: string;
      history?: unknown;
      leadId?: number;
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

    if (leadId && typeof leadId === "number") {
      try {
        await db.insert(chatMessages).values({
          leadId,
          role: "user",
          content: message.trim(),
        });
        await db
          .update(chatLeads)
          .set({
            totalMessages: sql`${chatLeads.totalMessages} + 1`,
            lastMessageAt: sql`CURRENT_TIMESTAMP`,
          })
          .where(eq(chatLeads.id, leadId));
      } catch {}
    }

    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: SYSTEM_PROMPT },
      ...safeHistory,
      { role: "user", content: message.trim() },
    ];

    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      stream: true,
      max_completion_tokens: 300,
      temperature: 0.7,
    });

    const encoder = new TextEncoder();
    let fullResponse = "";

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content;
            if (delta) {
              fullResponse += delta;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ content: delta, done: false })}\n\n`)
              );
            }
          }
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ content: "", done: true })}\n\n`)
          );
          controller.close();

          if (leadId && typeof leadId === "number" && fullResponse) {
            try {
              await db.insert(chatMessages).values({
                leadId,
                role: "assistant",
                content: fullResponse,
              });
              await db
                .update(chatLeads)
                .set({
                  totalMessages: sql`${chatLeads.totalMessages} + 1`,
                  lastMessageAt: sql`CURRENT_TIMESTAMP`,
                })
                .where(eq(chatLeads.id, leadId));
            } catch {}
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
