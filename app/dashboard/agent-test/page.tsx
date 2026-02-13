"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/lib/use-toast";
import {
  Bot,
  Send,
  RotateCcw,
  User,
  Loader2,
  ArrowRightLeft,
  CircleDot,
  Zap,
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  meta?: {
    model?: string;
    currentState?: string;
    previousState?: string;
    confidenceScore?: number;
    shouldHandoff?: boolean;
    handoffReason?: string;
    turnCount?: number;
    ragSource?: string;
  };
}

interface AgentInfo {
  name: string;
  roles: string;
  greeting: string;
  agentType: string;
}

export default function AgentTestPage() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [agent, setAgent] = useState<AgentInfo | null>(null);
  const [loadingAgent, setLoadingAgent] = useState(true);
  const [currentState, setCurrentState] = useState("GREETING");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/agents")
      .then((r) => r.json())
      .then((d) => {
        if (d?.agent) {
          setAgent({
            name: d.agent.name,
            roles: d.agent.roles,
            greeting: d.agent.greeting || "",
            agentType: d.agent.agentType || "general",
          });
          setMessages([
            {
              id: "greeting",
              role: "assistant",
              content: d.agent.greeting || `Hello! I'm ${d.agent.name}. How can I help you today?`,
              timestamp: new Date(),
              meta: { currentState: "GREETING", turnCount: 0 },
            },
          ]);
        }
      })
      .catch(() => toast({ title: "Error", description: "Failed to load agent", variant: "destructive" }))
      .finally(() => setLoadingAgent(false));
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);

    try {
      const conversationHistory = messages
        .filter((m) => m.role !== "system")
        .map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          conversationHistory,
          currentState,
          stream: false,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to get response");
      }

      const data = await res.json();

      const assistantMsg: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.response,
        timestamp: new Date(),
        meta: {
          model: data.model,
          currentState: data.currentState,
          previousState: data.previousState,
          confidenceScore: data.confidenceScore,
          shouldHandoff: data.shouldHandoff,
          handoffReason: data.handoffReason,
          turnCount: data.turnCount,
          ragSource: data.ragSource,
        },
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setCurrentState(data.currentState || "GREETING");

      if (data.shouldHandoff) {
        const sysMsg: Message = {
          id: `system-${Date.now()}`,
          role: "system",
          content: `Handoff triggered: ${data.handoffReason || "Agent requested transfer to human"}`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, sysMsg]);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to get response",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const handleReset = () => {
    setCurrentState("GREETING");
    setMessages(
      agent
        ? [
            {
              id: "greeting",
              role: "assistant",
              content: agent.greeting || `Hello! I'm ${agent.name}. How can I help you today?`,
              timestamp: new Date(),
              meta: { currentState: "GREETING", turnCount: 0 },
            },
          ]
        : []
    );
    toast({ title: "Conversation reset" });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getStateColor = (state: string) => {
    const colors: Record<string, string> = {
      GREETING: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
      INTENT_CAPTURE: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
      CONFIRM: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
      EXECUTE: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
      CLOSE: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      HANDOFF: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
      FAILSAFE: "bg-red-500/10 text-red-600 dark:text-red-400",
    };
    return colors[state] || "bg-muted text-muted-foreground";
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-500/10">
            <Bot className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground" data-testid="text-test-title">Agent Simulator</h1>
            <p className="text-sm text-muted-foreground">Test your AI agent in a chat conversation before going live.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="default" className={`no-default-hover-elevate ${getStateColor(currentState)}`} data-testid="badge-current-state">
            <CircleDot className="w-3 h-3 mr-1" />
            {currentState}
          </Badge>
          <Button variant="outline" size="sm" onClick={handleReset} data-testid="button-reset-chat">
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
        </div>
      </div>

      {loadingAgent ? (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          </CardContent>
        </Card>
      ) : !agent ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-12">
              <Bot className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground" data-testid="text-no-agent">No agent configured. Set up an agent first.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]" ref={scrollRef}>
                <div className="space-y-4 p-6">
                  {messages.map((msg) => (
                    <div key={msg.id} data-testid={`message-${msg.id}`}>
                      {msg.role === "system" ? (
                        <div className="flex justify-center">
                          <Badge variant="outline" className="no-default-hover-elevate text-xs">
                            <ArrowRightLeft className="w-3 h-3 mr-1" />
                            {msg.content}
                          </Badge>
                        </div>
                      ) : (
                        <div className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                          {msg.role === "assistant" && (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shrink-0 mt-1">
                              <Bot className="w-4 h-4 text-white" />
                            </div>
                          )}
                          <div className={`max-w-[75%] space-y-1 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                            <div
                              className={`rounded-lg px-4 py-3 text-sm leading-relaxed ${
                                msg.role === "user"
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted"
                              }`}
                            >
                              {msg.content}
                            </div>
                            {msg.meta && (
                              <div className="flex items-center gap-2 flex-wrap px-1">
                                {msg.meta.currentState && (
                                  <Badge
                                    variant="default"
                                    className={`no-default-hover-elevate text-[10px] py-0 ${getStateColor(msg.meta.currentState)}`}
                                  >
                                    {msg.meta.currentState}
                                  </Badge>
                                )}
                                {msg.meta.confidenceScore !== undefined && (
                                  <span className="text-[10px] text-muted-foreground">
                                    conf: {(msg.meta.confidenceScore * 100).toFixed(0)}%
                                  </span>
                                )}
                                {msg.meta.ragSource && msg.meta.ragSource !== "llm" && (
                                  <Badge variant="outline" className="no-default-hover-elevate text-[10px] py-0">
                                    <Zap className="w-2 h-2 mr-0.5" />
                                    {msg.meta.ragSource}
                                  </Badge>
                                )}
                                {msg.meta.turnCount !== undefined && (
                                  <span className="text-[10px] text-muted-foreground">
                                    turn {msg.meta.turnCount}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          {msg.role === "user" && (
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-1">
                              <User className="w-4 h-4 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  {sending && (
                    <div className="flex gap-3 justify-start">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shrink-0 mt-1">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                      <div className="bg-muted rounded-lg px-4 py-3 flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Thinking...</span>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
              <div className="border-t p-4">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Type a message to test your agent..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={sending}
                    data-testid="input-test-message"
                  />
                  <Button
                    onClick={handleSend}
                    disabled={sending || !input.trim()}
                    data-testid="button-send-test"
                  >
                    {sending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Agent Info</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground uppercase">Name</span>
                  <p className="font-semibold mt-1" data-testid="text-agent-name">{agent.name}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground uppercase">Role</span>
                  <p className="font-semibold mt-1 capitalize">{agent.roles}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground uppercase">Type</span>
                  <p className="font-semibold mt-1 capitalize">{agent.agentType}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground uppercase">FSM State</span>
                  <p className="mt-1">
                    <Badge variant="default" className={`no-default-hover-elevate ${getStateColor(currentState)}`}>
                      {currentState}
                    </Badge>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
