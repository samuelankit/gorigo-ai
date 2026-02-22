"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Send, Bot, User, ArrowRight, Sparkles, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function PublicDemoPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending) return;

    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/public/demo-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: messages.slice(-8) }),
      });
      const data = await res.json();
      if (data.response) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.response }]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, something went wrong. Please try again." }]);
    } finally {
      setSending(false);
    }
  };

  const suggestedTopics = ["What are your pricing plans?", "Tell me about your features", "How does appointment scheduling work?", "Show me support capabilities"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-violet-500 shadow-lg">
              <Bot className="h-7 w-7 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold" data-testid="text-demo-title">Try GoRigo AI</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Experience our AI call centre assistant. Chat below to see how GoRigo handles customer conversations.
          </p>
          <div className="flex items-center justify-center gap-2">
            <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Demo Mode
            </Badge>
            <span className="text-xs text-muted-foreground">No sign-up required</span>
          </div>
        </div>

        <Card className="border shadow-sm overflow-hidden" data-testid="card-chat">
          <div ref={scrollRef} className="h-[400px] overflow-y-auto p-4 space-y-4 bg-muted/10">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                <Sparkles className="h-8 w-8 text-muted-foreground/30" />
                <div>
                  <p className="text-sm text-muted-foreground">Start a conversation or try one of these topics:</p>
                  <div className="flex flex-wrap gap-2 justify-center mt-3">
                    {suggestedTopics.map((topic) => (
                      <Button
                        key={topic}
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => { setInput(topic); }}
                        data-testid={`button-suggestion-${topic.slice(0, 10).replace(/\s+/g, "-").toLowerCase()}`}
                      >
                        {topic}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "justify-start")} data-testid={`message-${i}`}>
                {msg.role === "assistant" && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                )}
                <div className={cn(
                  "max-w-[80%] rounded-xl px-4 py-3 text-sm whitespace-pre-wrap",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border"
                )}>
                  {msg.content.split(/(\*\*[^*]+\*\*)/).map((part, j) =>
                    part.startsWith("**") && part.endsWith("**")
                      ? <strong key={j}>{part.slice(2, -2)}</strong>
                      : part
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}

            {sending && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="bg-card border rounded-xl px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          <CardContent className="p-4 border-t bg-background">
            <form
              onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
              className="flex gap-2"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a message..."
                disabled={sending}
                className="flex-1"
                data-testid="input-chat"
              />
              <Button type="submit" size="icon" disabled={!input.trim() || sending} data-testid="button-send">
                <Send className="h-4 w-4" />
              </Button>
            </form>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Demo responses are pre-configured. Live agents use RAG-grounded AI with your knowledge base.
            </p>
          </CardContent>
        </Card>

        <div className="text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            Ready to build your own AI call centre?
          </p>
          <div className="flex justify-center gap-3">
            <Link href="/auth/register">
              <Button data-testid="button-signup">
                Get Started <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
            <Link href="/status">
              <Button variant="outline" data-testid="button-status">
                System Status
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
