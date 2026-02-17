"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, X, Send, Loader2 } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface RigoResponse {
  response?: string;
  message?: string;
  error?: string;
  spokenResponse?: string;
}

async function postToRigo(payload: { message: string; conversationHistory?: { role: string; content: string }[] }): Promise<RigoResponse> {
  const res = await fetch("/api/rigo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || data.message || "Request failed");
  }
  return data;
}

export function RigoAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hello! I'm Rigo, your AI assistant. Ask me about your calls, agents, wallet, or anything else." },
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const mutation = useMutation({
    mutationFn: postToRigo,
    onSuccess: (data) => {
      const reply = data.response || data.message || "No response received.";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    },
    onError: (error: Error) => {
      setMessages((prev) => [...prev, { role: "assistant", content: error.message }]);
    },
  });

  const handleSend = useCallback(() => {
    const trimmed = inputValue.trim();
    if (!trimmed || mutation.isPending) return;

    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setInputValue("");

    const history = messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.content }));

    mutation.mutate({ message: trimmed, conversationHistory: history });
  }, [inputValue, mutation, messages]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50" data-testid="rigo-chat-fab">
        <Button
          size="icon"
          className="h-14 w-14 rounded-full shadow-lg"
          onClick={() => setIsOpen(true)}
          data-testid="button-rigo-chat-open"
        >
          <Sparkles className="h-6 w-6" />
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50" style={{ width: 400, height: 500 }} data-testid="rigo-chat-panel">
      <Card className="flex flex-col h-full shadow-xl">
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary text-primary-foreground shrink-0">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold" data-testid="text-rigo-chat-title">Rigo Assistant</span>
          </div>
          <Button size="icon" variant="ghost" onClick={() => setIsOpen(false)} data-testid="button-rigo-chat-close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3" data-testid="rigo-chat-messages">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              data-testid={`rigo-chat-message-${msg.role}-${i}`}
            >
              <div
                className={`max-w-[80%] rounded-md px-3 py-2 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {mutation.isPending && (
            <div className="flex justify-start" data-testid="rigo-chat-loading">
              <div className="bg-muted text-foreground rounded-md px-3 py-2 text-sm">
                <span className="inline-flex gap-1">
                  <span className="animate-bounce" style={{ animationDelay: "0ms" }}>.</span>
                  <span className="animate-bounce" style={{ animationDelay: "150ms" }}>.</span>
                  <span className="animate-bounce" style={{ animationDelay: "300ms" }}>.</span>
                </span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="flex items-center gap-2 px-3 py-3 border-t shrink-0">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Rigo anything..."
            disabled={mutation.isPending}
            className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
            data-testid="input-rigo-chat-message"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!inputValue.trim() || mutation.isPending}
            data-testid="button-rigo-chat-send"
          >
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </Card>
    </div>
  );
}
