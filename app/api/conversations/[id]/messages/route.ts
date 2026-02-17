import { NextRequest, NextResponse } from "next/server";
import { chatStorage } from "../../../../../replit_integrations/chat/storage";
import { openai } from "../../../../../replit_integrations/chat/client-openai";
import { anthropic } from "../../../../../replit_integrations/chat/client-anthropic";
import { openrouter } from "../../../../../replit_integrations/chat/client-openrouter";
import { getAuthenticatedUser } from "@/lib/get-user";
import { settingsLimiter } from "@/lib/rate-limit";
import { z } from "zod";

const messageBodySchema = z.object({
  content: z.string().min(1),
  provider: z.enum(["openai", "anthropic", "openrouter"]).optional().default("openai"),
  model: z.string().optional(),
}).strict();

type Provider = "openai" | "anthropic" | "openrouter";

const DEFAULT_OPENAI_MODEL = "gpt-5.2";
const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-5";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rl = await settingsLimiter(_req);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { id } = await params;
  const msgs = await chatStorage.getMessages(Number(id));
  return NextResponse.json(msgs);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rl = await settingsLimiter(req);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const auth = await getAuthenticatedUser();
  if (!auth) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { id } = await params;
  const conversationId = Number(id);
  const body = await req.json();
  const parsed = messageBodySchema.parse(body);
  const { content, provider, model } = parsed;

  const conv = await chatStorage.getConversation(conversationId);
  if (!conv) return NextResponse.json({ message: "Conversation not found" }, { status: 404 });

  await chatStorage.createMessage({
    conversationId,
    role: "user",
    content,
  });

  const history = await chatStorage.getMessages(conversationId);
  const chatMessages = history.map((m) => ({
    role: m.role as "user" | "assistant" | "system",
    content: m.content,
  }));

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let fullContent = "";
      try {
        if (provider === "anthropic") {
          const anthropicStream = anthropic.messages.stream({
            model: model || DEFAULT_ANTHROPIC_MODEL,
            max_tokens: 8192,
            messages: chatMessages.map((m) => ({
              role: m.role === "system" ? "user" : m.role,
              content: m.content,
            })),
          });

          for await (const event of anthropicStream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              const chunk = event.delta.text;
              fullContent += chunk;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ content: chunk, done: false })}\n\n`),
              );
            }
          }
        } else {
          const client = provider === "openrouter" ? openrouter : openai;
          const selectedModel = model || DEFAULT_OPENAI_MODEL;

          const openaiStream = await client.chat.completions.create({
            model: selectedModel,
            messages: chatMessages,
            stream: true,
            max_completion_tokens: 8192,
          });

          for await (const chunk of openaiStream) {
            const delta = chunk.choices[0]?.delta?.content;
            if (delta) {
              fullContent += delta;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ content: delta, done: false })}\n\n`),
              );
            }
          }
        }

        const assistantMsg = await chatStorage.createMessage({
          conversationId,
          role: "assistant",
          content: fullContent,
        });

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ content: "", done: true, messageId: assistantMsg.id })}\n\n`,
          ),
        );
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: errMsg, done: true })}\n\n`),
        );
      }
      controller.close();
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
