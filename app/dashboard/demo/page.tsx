"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Headphones, Send, Bot, User, Sparkles, Phone, ArrowLeft, MessageSquare, Shield, Users } from "lucide-react";
import Link from "next/link";

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  agent?: string;
  department?: string;
  timestamp: Date;
}

const DEPARTMENTS = [
  {
    key: "sales",
    label: "Sales & Demo",
    agent: "Ava",
    icon: MessageSquare,
    color: "blue",
    desc: "Learn about features and pricing",
  },
  {
    key: "support",
    label: "Customer Support",
    agent: "Max",
    icon: Shield,
    color: "emerald",
    desc: "Get help with your account",
  },
  {
    key: "onboarding",
    label: "Onboarding",
    agent: "Zara",
    icon: Users,
    color: "violet",
    desc: "Get started with GoRigo",
  },
];

export default function DemoPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [currentAgent, setCurrentAgent] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const selectDepartment = (dept: string) => {
    setSelectedDept(dept);
    const deptInfo = DEPARTMENTS.find(d => d.key === dept);
    const greeting: ChatMessage = {
      id: `sys-${Date.now()}`,
      role: "system",
      content: `Connected to ${deptInfo?.label || dept}`,
      timestamp: new Date(),
    };
    const agentGreeting: ChatMessage = {
      id: `agent-${Date.now()}`,
      role: "assistant",
      content: getGreeting(dept),
      agent: deptInfo?.agent,
      department: deptInfo?.label,
      timestamp: new Date(),
    };
    setCurrentAgent(deptInfo?.agent || null);
    setMessages([greeting, agentGreeting]);
  };

  const getGreeting = (dept: string): string => {
    switch (dept) {
      case "sales":
        return "Hi there! I'm Ava, GoRigo's AI sales specialist. I'd love to show you how our platform can automate your call centre. What kind of business are you running, and what are you looking to automate?";
      case "support":
        return "Hello, this is Max from GoRigo support. I'm here to help you with any issues or questions about your account. What can I assist you with today?";
      case "onboarding":
        return "Welcome to GoRigo! I'm Zara, your onboarding concierge. Congratulations on joining — I'm going to make sure you're set up for success. Have you had a chance to explore your dashboard yet?";
      default:
        return "Hello! How can I help you today?";
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || sending) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/demo/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg.content,
          department: selectedDept,
        }),
      });

      if (!res.ok) {
        throw new Error("Chat request failed");
      }

      const data = await res.json();

      const assistantMsg: ChatMessage = {
        id: `agent-${Date.now()}`,
        role: "assistant",
        content: data.reply,
        agent: data.agent,
        department: data.department,
        timestamp: new Date(),
      };

      if (data.agent && data.agent !== currentAgent) {
        setCurrentAgent(data.agent);
      }

      setMessages(prev => [...prev, assistantMsg]);
    } catch (error) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: "system",
        content: "Sorry, something went wrong. Please try again.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const resetChat = () => {
    setMessages([]);
    setSelectedDept(null);
    setCurrentAgent(null);
    setInput("");
  };

  if (!selectedDept) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <Headphones className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground" data-testid="text-demo-page-title">
                Try GoRigo Live Demo
              </h1>
              <p className="text-sm text-muted-foreground">
                Chat with our AI agents and experience the platform firsthand
              </p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-500" />
              Choose a Department
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Select which GoRigo AI agent you'd like to talk to. Each agent specialises in a different area.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {DEPARTMENTS.map((dept) => (
              <button
                key={dept.key}
                onClick={() => selectDepartment(dept.key)}
                className="w-full flex items-center gap-4 p-4 rounded-md hover-elevate text-left transition-colors"
                data-testid={`button-dept-${dept.key}`}
              >
                <div className={`w-11 h-11 rounded-md bg-${dept.color}-500/10 dark:bg-${dept.color}-500/20 flex items-center justify-center shrink-0`}>
                  <dept.icon className={`h-5 w-5 text-${dept.color}-500`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-foreground">{dept.label}</p>
                    <Badge variant="secondary" className="no-default-hover-elevate text-xs">{dept.agent}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{dept.desc}</p>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/5 to-transparent dark:from-blue-500/10">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <Phone className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Prefer a phone call?</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Connect your Twilio phone number in{" "}
                  <Link href="/dashboard/settings" className="text-blue-500 hover:underline">Settings</Link>
                  {" "}to experience GoRigo's full voice AI capabilities with real phone calls.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeDept = DEPARTMENTS.find(d => d.key === selectedDept);

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-3xl mx-auto">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={resetChat} data-testid="button-back-demo">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-md bg-${activeDept?.color || "blue"}-500/10 flex items-center justify-center`}>
              {activeDept && <activeDept.icon className={`h-4 w-4 text-${activeDept.color}-500`} />}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground" data-testid="text-chat-agent-name">
                {currentAgent || activeDept?.agent}
              </p>
              <p className="text-xs text-muted-foreground">{activeDept?.label}</p>
            </div>
          </div>
        </div>
        <Badge variant="secondary" className="no-default-hover-elevate">
          <span className="relative flex h-1.5 w-1.5 mr-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
          </span>
          Live Demo
        </Badge>
      </div>

      <Card className="flex-1 flex flex-col min-h-0">
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className={`w-7 h-7 rounded-md bg-${activeDept?.color || "blue"}-500/10 flex items-center justify-center shrink-0 mt-0.5`}>
                  <Bot className={`h-3.5 w-3.5 text-${activeDept?.color || "blue"}-500`} />
                </div>
              )}
              {msg.role === "system" ? (
                <div className="w-full text-center">
                  <span className="text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
                    {msg.content}
                  </span>
                </div>
              ) : (
                <div
                  className={`max-w-[80%] rounded-md px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-muted"
                  }`}
                  data-testid={`chat-msg-${msg.id}`}
                >
                  {msg.role === "assistant" && msg.agent && (
                    <p className="text-xs font-semibold text-muted-foreground mb-1">{msg.agent}</p>
                  )}
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                </div>
              )}
              {msg.role === "user" && (
                <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="h-3.5 w-3.5 text-white" />
                </div>
              )}
            </div>
          ))}

          {sending && (
            <div className="flex gap-3">
              <div className={`w-7 h-7 rounded-md bg-${activeDept?.color || "blue"}-500/10 flex items-center justify-center shrink-0`}>
                <Bot className={`h-3.5 w-3.5 text-${activeDept?.color || "blue"}-500`} />
              </div>
              <div className="bg-muted rounded-md px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </CardContent>

        <div className="border-t p-3">
          <div className="flex items-end gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${currentAgent || "AI agent"}...`}
              className="resize-none min-h-[44px] max-h-32 text-sm"
              rows={1}
              disabled={sending}
              data-testid="input-demo-message"
            />
            <Button
              size="icon"
              onClick={sendMessage}
              disabled={!input.trim() || sending}
              data-testid="button-send-demo"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            This is a live demo of GoRigo's AI agents. Responses come from our knowledge base and agent configuration.
          </p>
        </div>
      </Card>
    </div>
  );
}
