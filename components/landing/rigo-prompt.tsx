"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ArrowRight, ArrowUp, Loader2, Mic } from "lucide-react";
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, loading]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  const ask = useCallback(async (text: string) => {
    const q = text.trim();
    if (!q || loading) return;
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setMsgs(prev => [...prev, { role: "user", text: q }]);
    setLoading(true);
    try {
      const res = await fetch("/api/demo/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: q, department: "sales" }),
      });
      const data = await res.json();
      setMsgs(prev => {
        const next = [...prev, { role: "rigo" as const, text: data.reply || "Try asking again." }];
        if (next.filter(m => m.role === "rigo").length >= 2) setShowCta(true);
        return next;
      });
    } catch {
      setMsgs(prev => [...prev, { role: "rigo", text: "Connection hiccup — please try again." }]);
    }
    setLoading(false);
  }, [loading]);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      ask(input);
    }
  };

  const hasChat = msgs.length > 0;

  return (
    <div className="w-full max-w-3xl mx-auto mt-10" data-testid="rigo-prompt">

      {hasChat && (
        <div className="mb-6 flex flex-col gap-4 max-h-80 overflow-y-auto px-2">
          {msgs.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              {m.role === "rigo" && (
                <div className="flex items-start gap-3 max-w-[85%]">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-[#E8604C] to-[#F5A623] flex items-center justify-center shadow-sm">
                    <span className="text-white text-xs font-bold">R</span>
                  </div>
                  <div className="text-sm text-foreground bg-muted/70 rounded-2xl rounded-tl-none px-4 py-3 leading-relaxed">
                    {m.text}
                  </div>
                </div>
              )}
              {m.role === "user" && (
                <div className="text-sm text-primary-foreground bg-primary rounded-2xl rounded-tr-none px-4 py-3 max-w-[85%] leading-relaxed">
                  {m.text}
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-[#E8604C] to-[#F5A623] flex items-center justify-center shadow-sm">
                <span className="text-white text-xs font-bold">R</span>
              </div>
              <div className="bg-muted/70 rounded-2xl rounded-tl-none px-4 py-3 flex gap-1 items-center">
                <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      <div className="relative bg-background border border-border rounded-2xl shadow-lg focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/30 transition-all">
        <div className="flex items-start px-5 pt-4 pb-2 gap-3">
          <div className="flex-shrink-0 w-7 h-7 mt-0.5 rounded-full bg-gradient-to-br from-[#E8604C] to-[#F5A623] flex items-center justify-center shadow-sm">
            <span className="text-white text-xs font-bold">R</span>
          </div>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={hasChat ? "Ask a follow-up..." : "Ask Rigo anything about GoRigo..."}
            rows={1}
            maxLength={600}
            disabled={loading}
            className="flex-1 bg-transparent text-base text-foreground outline-none resize-none placeholder:text-muted-foreground/50 leading-relaxed pt-0.5"
            style={{ minHeight: "28px", maxHeight: "160px" }}
            data-testid="input-rigo-prompt"
          />
        </div>

        <div className="flex items-center justify-between px-4 pb-3 pt-1">
          <Link
            href="/demo"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-[#E8604C] transition-colors group"
            data-testid="link-rigo-voice"
          >
            <span className="flex items-center justify-center w-8 h-8 rounded-full border border-border group-hover:border-[#E8604C]/40 group-hover:bg-[#E8604C]/5 transition-all">
              <Mic className="h-4 w-4" />
            </span>
            <span className="font-medium">Voice Connect</span>
          </Link>

          <button
            onClick={() => ask(input)}
            disabled={!input.trim() || loading}
            className="flex items-center justify-center w-9 h-9 rounded-full bg-primary disabled:opacity-25 hover:opacity-90 transition-opacity"
            data-testid="button-rigo-send"
          >
            {loading
              ? <Loader2 className="h-4 w-4 text-primary-foreground animate-spin" />
              : <ArrowUp className="h-4 w-4 text-primary-foreground" />
            }
          </button>
        </div>
      </div>

      {!hasChat && (
        <div className="flex flex-wrap justify-center gap-2 mt-4">
          {SUGGESTIONS.map(s => (
            <button
              key={s}
              onClick={() => ask(s)}
              className="text-sm px-4 py-2 rounded-full border border-border bg-background/80 text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors"
              data-testid={`button-rigo-suggestion-${s.slice(0, 8).replace(/\s/g, "-").toLowerCase()}`}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {showCta && !loading && (
        <div className="mt-5 flex items-center justify-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <p className="text-sm text-muted-foreground">Ready to get started?</p>
          <Link href="/register" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline" data-testid="button-rigo-cta-register">
            Create Account <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
}
