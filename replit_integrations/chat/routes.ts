import type { Express } from "express";
import { chatStorage } from "./storage";
import { openai } from "./client-openai";
import { anthropic } from "./client-anthropic";

type Provider = "openai" | "anthropic";

const DEFAULT_OPENAI_MODEL = "gpt-5.2";
const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-5";

export function registerChatRoutes(app: Express) {
  app.get("/api/conversations", async (_req, res) => {
    const convs = await chatStorage.getConversations();
    res.json(convs);
  });

  app.post("/api/conversations", async (req, res) => {
    const { title } = req.body;
    if (!title || typeof title !== "string") {
      return res.status(400).json({ message: "title is required" });
    }
    const conv = await chatStorage.createConversation({ title });
    res.status(201).json(conv);
  });

  app.get("/api/conversations/:id", async (req, res) => {
    const conv = await chatStorage.getConversation(Number(req.params.id));
    if (!conv) return res.status(404).json({ message: "Conversation not found" });
    res.json(conv);
  });

  app.delete("/api/conversations/:id", async (req, res) => {
    await chatStorage.deleteConversation(Number(req.params.id));
    res.status(204).end();
  });

  app.get("/api/conversations/:id/messages", async (req, res) => {
    const msgs = await chatStorage.getMessages(Number(req.params.id));
    res.json(msgs);
  });

  app.post("/api/conversations/:id/messages", async (req, res) => {
    const conversationId = Number(req.params.id);
    const { content, provider = "openai", model } = req.body as {
      content: string;
      provider?: Provider;
      model?: string;
    };

    if (!content || typeof content !== "string") {
      return res.status(400).json({ message: "content is required" });
    }

    const conv = await chatStorage.getConversation(conversationId);
    if (!conv) return res.status(404).json({ message: "Conversation not found" });

    const userMsg = await chatStorage.createMessage({
      conversationId,
      role: "user",
      content,
    });

    const history = await chatStorage.getMessages(conversationId);
    const chatMessages = history.map((m) => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
    }));

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    let fullContent = "";

    try {
      if (provider === "anthropic") {
        const stream = anthropic.messages.stream({
          model: model || DEFAULT_ANTHROPIC_MODEL,
          max_tokens: 8192,
          messages: chatMessages.map((m) => ({
            role: m.role === "system" ? "user" : m.role,
            content: m.content,
          })),
        });

        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            const chunk = event.delta.text;
            fullContent += chunk;
            res.write(`data: ${JSON.stringify({ content: chunk, done: false })}\n\n`);
          }
        }
      } else {
        const client = openai;
        const selectedModel = model || DEFAULT_OPENAI_MODEL;

        const stream = await client.chat.completions.create({
          model: selectedModel,
          messages: chatMessages,
          stream: true,
          max_completion_tokens: 8192,
        });

        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content;
          if (delta) {
            fullContent += delta;
            res.write(`data: ${JSON.stringify({ content: delta, done: false })}\n\n`);
          }
        }
      }

      const assistantMsg = await chatStorage.createMessage({
        conversationId,
        role: "assistant",
        content: fullContent,
      });

      res.write(
        `data: ${JSON.stringify({ content: "", done: true, messageId: assistantMsg.id })}\n\n`,
      );
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      res.write(`data: ${JSON.stringify({ error: errMsg, done: true })}\n\n`);
    }

    res.end();
  });
}
