"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ArrowRight, Loader2, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface Msg {
  role: "user" | "rigo";
  text: string;
}

const SUGGESTIONS = [
  "What is GoRigo?",
  "How much does it cost?",
  "Do I need a contract?",
  "How do I get started?",
];

export function RigoPrompt() {
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCta, setShowCta] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, loading]);

  const ask = useCallback(async (text: string) => {
    const q = text.trim();
    if (!q || loading) return;
    setInput("");
    setMsgs(prev => [...prev, { role: "user", text: q }]);
    setLoading(true);
    try {
      const res = await fetch("/api/demo/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: q, department: "sales" }),
      });
      const data = await res.json();
      setMsgs(prev => [...prev, { role: "rigo", text: data.reply || "Let me get that for you — try asking again." }]);
      setShowCta(prev => prev || msgs.length >= 2);
    } catch {
      setMsgs(prev => [...prev, { role: "rigo", text: "Connection hiccup — please try again." }]);
    }
    setLoading(false);
  }, [loading, msgs.length]);

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(input); }
  };

  const hasChat = msgs.length > 0;

  return (
    <div className="w-full max-w-2xl mx-auto mt-8" data-testid="rigo-prompt">
      {hasChat && (
        <div className="mb-3 flex flex-col gap-3 max-h-64 overflow-y-auto px-1">
          {msgs.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              {m.role === "rigo" && (
                <div className="flex items-start gap-2">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-[#E8604C] to-[#F5A623] flex items-center justify-center">
                    <Sparkles className="h-3.5 w-3.5 text-white" />
                  </div>
                  <div className="text-sm text-foreground bg-muted/60 rounded-xl rounded-tl-none px-4 py-2.5 max-w-lg leading-relaxed">
                    <span className="text-[10px] font-semibold text-[#E8604C] block mb-0.5">Rigo</span>
                    {m.text}
                  </div>
                </div>
              )}
              {m.role === "user" && (
                <div className="text-sm text-primary-foreground bg-primary rounded-xl rounded-tr-none px-4 py-2.5 max-w-lg leading-relaxed">
                  {m.text}
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="flex items-start gap-2">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-[#E8604C] to-[#F5A623] flex items-center justify-center">
                  <Sparkles className="h-3.5 w-3.5 text-white" />
                </div>
                <div className="bg-muted/60 rounded-xl rounded-tl-none px-4 py-3 flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      <div className="flex items-center gap-2 bg-background border border-border rounded-full px-4 py-2 shadow-sm focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/40 transition-all">
        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-[#E8604C] to-[#F5A623] flex items-center justify-center">
          <Sparkles className="h-3 w-3 text-white" />
        </div>
        <span className="text-xs font-semibold text-[#E8604C] pr-2 border-r border-border">Rigo</span>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder={hasChat ? "Ask a follow-up..." : "Ask me anything about GoRigo..."}
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60 min-w-0"
          maxLength={400}
          data-testid="input-rigo-prompt"
          disabled={loading}
        />
        <button
          onClick={() => ask(input)}
          disabled={!input.trim() || loading}
          className="flex-shrink-0 w-7 h-7 rounded-full bg-primary flex items-center justify-center disabled:opacity-30 transition-opacity"
          data-testid="button-rigo-send"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 text-primary-foreground animate-spin" /> : <Send className="h-3.5 w-3.5 text-primary-foreground" />}
        </button>
      </div>

      {!hasChat && (
        <div className="flex flex-wrap justify-center gap-2 mt-3">
          {SUGGESTIONS.map(s => (
            <button
              key={s}
              onClick={() => ask(s)}
              className="text-xs px-3 py-1.5 rounded-full border border-border bg-background/80 text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
              data-testid={`button-rigo-suggestion-${s.slice(0, 8).replace(/\s/g, "-").toLowerCase()}`}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {showCta && !loading && (
        <div className="mt-4 flex items-center justify-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <p className="text-sm text-muted-foreground">Ready to get started?</p>
          <Link href="/register">
            <Button size="sm" data-testid="button-rigo-cta-register">
              Create Account <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
