"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  X,
  Send,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ReactMarkdown from "react-markdown";

interface ChatMsg {
  id?: number;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  rating?: number | null;
}

const QUICK_REPLIES = [
  "How does GoRigo work?",
  "What does it cost?",
  "Can I get a demo?",
  "What languages do you support?",
];

const SESSION_KEY = "gorigo_chat_session";

function formatTime(d: Date): string {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function playNotificationSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 800;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch {}
}

function saveSession(leadId: number, name: string, email: string, messages: ChatMsg[], sessionId: string) {
  try {
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        leadId,
        name,
        email,
        sessionId,
        messages: messages.map((m) => ({
          ...m,
          timestamp: m.timestamp.toISOString(),
        })),
      })
    );
  } catch {}
}

function loadSession(): {
  leadId: number;
  name: string;
  email: string;
  sessionId?: string;
  messages: ChatMsg[];
} | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data.leadId || !data.name || !data.email) return null;
    return {
      ...data,
      messages: (data.messages || []).map((m: Record<string, unknown>) => ({
        ...m,
        timestamp: new Date(m.timestamp as string),
      })),
    };
  } catch {
    return null;
  }
}

export function ChatWidget({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<"form" | "chat">("form");
  const [leadId, setLeadId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sessionIdRef = useRef(`cb_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`);

  useEffect(() => {
    const session = loadSession();
    if (session) {
      setLeadId(session.leadId);
      setName(session.name);
      setEmail(session.email);
      setMessages(session.messages);
      setStep("chat");
      if (session.sessionId) {
        sessionIdRef.current = session.sessionId;
      }
    }
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (step === "chat") {
      inputRef.current?.focus();
    }
  }, [step]);

  useEffect(() => {
    if (leadId && name && step === "chat") {
      saveSession(leadId, name, email, messages, sessionIdRef.current);
    }
  }, [messages, leadId, name, email, step]);

  const startChat = async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName || trimmedName.length < 1) {
      setFormError("Please enter your name");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setFormError("Please enter a valid email");
      return;
    }

    setFormLoading(true);
    setFormError("");

    try {
      const res = await fetch("/api/public/chat/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName, email: trimmedEmail, sessionId: sessionIdRef.current }),
      });

      if (!res.ok) {
        const data = await res.json();
        setFormError(data.error || "Something went wrong");
        setFormLoading(false);
        return;
      }

      const data = await res.json();
      setLeadId(data.leadId);
      setMessages([
        {
          role: "assistant",
          content: data.greeting,
          timestamp: new Date(),
        },
      ]);
      setStep("chat");
    } catch {
      setFormError("Connection error. Please try again.");
    }
    setFormLoading(false);
  };

  const sendMessage = async (text?: string) => {
    const trimmed = (text || input).trim();
    if (!trimmed || isStreaming) return;

    const userMessage: ChatMsg = {
      role: "user",
      content: trimmed,
      timestamp: new Date(),
    };
    const history = messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsStreaming(true);

    const assistantTimestamp = new Date();
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: "", timestamp: assistantTimestamp },
    ]);

    try {
      const res = await fetch("/api/public/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, history, leadId, sessionId: sessionIdRef.current, channel: "chatbot" }),
      });

      if (!res.ok) {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content:
              res.status === 429
                ? "You're sending messages too quickly. Please wait a moment."
                : "Sorry, I could not process that. Please try again.",
            timestamp: assistantTimestamp,
          };
          return updated;
        });
        setIsStreaming(false);
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        setIsStreaming(false);
        return;
      }

      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.content) {
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                updated[updated.length - 1] = {
                  ...last,
                  content: last.content + data.content,
                };
                return updated;
              });
            }
            if (data.done) {
              playNotificationSound();
            }
          } catch {}
        }
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "Connection lost. Please try again.",
          timestamp: assistantTimestamp,
        };
        return updated;
      });
    }

    setIsStreaming(false);
  };

  const handleRate = async (msgIndex: number, rating: number) => {
    const msg = messages[msgIndex];
    if (!msg || msg.role !== "assistant") return;

    setMessages((prev) => {
      const updated = [...prev];
      updated[msgIndex] = { ...updated[msgIndex], rating };
      return updated;
    });

    if (msg.id) {
      try {
        await fetch("/api/public/chat/rate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageId: msg.id, rating }),
        });
      } catch {}
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (step === "form") {
        startChat();
      } else {
        sendMessage();
      }
    }
  };

  return (
    <div
      className="fixed bottom-16 right-4 z-50 w-[360px] sm:w-[400px] flex flex-col rounded-md border border-border shadow-xl bg-background animate-in slide-in-from-bottom-4 fade-in duration-300"
      style={{ maxHeight: "min(560px, calc(100vh - 100px))" }}
      data-testid="chat-widget"
    >
      <div className="flex items-center justify-between gap-2 px-4 py-3 bg-primary text-primary-foreground border-b border-primary-foreground/10">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-300 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-200" />
          </span>
          <span className="text-sm font-semibold">Chat with Us</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-7 w-7 text-primary-foreground no-default-hover-elevate"
          data-testid="button-close-chat"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {step === "form" ? (
        <div className="flex flex-col gap-4 p-5">
          <div className="flex flex-col gap-1 text-center">
            <div className="flex items-center justify-center gap-1.5 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <h3 className="text-base font-semibold text-foreground">
              Welcome to GoRigo
            </h3>
            <p className="text-sm text-muted-foreground">
              Enter your details to start chatting with our AI assistant.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Your Name
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Smith"
                maxLength={100}
                onKeyDown={handleKeyDown}
                data-testid="input-chat-name"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Email Address
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@company.com"
                maxLength={200}
                onKeyDown={handleKeyDown}
                data-testid="input-chat-email"
              />
            </div>
            {formError && (
              <p
                className="text-xs text-destructive"
                data-testid="text-chat-form-error"
              >
                {formError}
              </p>
            )}
            <Button
              onClick={startChat}
              disabled={formLoading}
              className="w-full"
              data-testid="button-start-chat"
            >
              {formLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Start Chatting
            </Button>
          </div>

          <p className="text-[10px] text-muted-foreground/70 text-center">
            By starting a chat you agree to our privacy policy.
          </p>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3 min-h-[200px]">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-md px-3 py-2 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                  data-testid={`chat-message-${msg.role}-${i}`}
                >
                  {msg.content ? (
                    msg.role === "assistant" ? (
                      <div className="prose prose-sm max-w-none dark:prose-invert [&>p]:m-0 [&>ul]:m-0 [&>ol]:m-0">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      msg.content
                    )
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <span className="flex gap-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: "300ms" }} />
                      </span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 mt-1 px-1">
                  <span className="text-[10px] text-muted-foreground/60 flex items-center gap-0.5">
                    <Clock className="h-2.5 w-2.5" />
                    {formatTime(msg.timestamp)}
                  </span>

                  {msg.role === "assistant" && msg.content && !isStreaming && (
                    <span className="flex items-center gap-0.5">
                      <button
                        onClick={() => handleRate(i, 1)}
                        className={`p-0.5 rounded-md transition-colors ${msg.rating === 1 ? "text-primary" : "text-muted-foreground/40 hover:text-muted-foreground"}`}
                        data-testid={`button-rate-up-${i}`}
                      >
                        <ThumbsUp className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleRate(i, -1)}
                        className={`p-0.5 rounded-md transition-colors ${msg.rating === -1 ? "text-destructive" : "text-muted-foreground/40 hover:text-muted-foreground"}`}
                        data-testid={`button-rate-down-${i}`}
                      >
                        <ThumbsDown className="h-3 w-3" />
                      </button>
                    </span>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {!isStreaming && messages.length <= 2 && (
            <div className="px-4 pb-2 flex flex-wrap gap-1.5">
              {QUICK_REPLIES.map((qr) => (
                <button
                  key={qr}
                  onClick={() => sendMessage(qr)}
                  className="text-xs px-2.5 py-1.5 rounded-md border border-border bg-muted/50 text-muted-foreground hover:bg-muted transition-colors"
                  data-testid={`button-quick-reply-${qr.slice(0, 10).replace(/\s/g, "-").toLowerCase()}`}
                >
                  {qr}
                </button>
              ))}
            </div>
          )}

          <div className="border-t border-border px-3 py-2.5">
            <div className="flex items-center gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your question..."
                maxLength={500}
                disabled={isStreaming}
                className="border-0 shadow-none focus-visible:ring-0"
                data-testid="input-chat-message"
              />
              <Button
                size="icon"
                variant="ghost"
                onClick={() => sendMessage()}
                disabled={!input.trim() || isStreaming}
                data-testid="button-send-message"
              >
                {isStreaming ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="text-center py-1.5 border-t border-border">
            <span className="text-[10px] text-muted-foreground/50">
              Powered by GoRigo AI
            </span>
          </div>
        </>
      )}
    </div>
  );
}
