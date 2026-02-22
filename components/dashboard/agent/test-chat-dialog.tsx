"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Bot, Loader2, MessageSquare, Send, User,
} from "lucide-react";
import type { AgentRecord } from "./types";
import { apiRequest } from "@/components/query-provider";

interface TestChatDialogProps {
  agent: AgentRecord | null;
  onClose: () => void;
}

export function TestChatDialog({ agent, onClose }: TestChatDialogProps) {
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (agent) {
      setMessages([]);
      setInput("");
      setSending(false);
    }
  }, [agent]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !agent || sending) return;
    const userMsg = input.trim();
    setInput("");
    const updatedMessages = [...messages, { role: "user" as const, content: userMsg }];
    setMessages(updatedMessages);
    setSending(true);
    try {
      const data = await apiRequest("/api/agents/test-chat", {
        method: "POST",
        body: JSON.stringify({
          agentId: agent.id,
          message: userMsg,
          history: messages,
        }),
      });
      setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", content: "Error: Could not generate a response. Please try again." }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={!!agent} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Test Chat: {agent?.name}
          </DialogTitle>
          <DialogDescription>
            Simulate a conversation with this agent. Messages are not saved.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto min-h-[300px] max-h-[400px] space-y-3 p-3 rounded-md border bg-muted/30" data-testid="test-chat-messages">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm gap-2">
              <MessageSquare className="h-8 w-8 opacity-40" />
              <p>Send a message to start the conversation</p>
              {agent?.greeting && (
                <p className="text-xs italic text-center max-w-xs">Agent greeting: &ldquo;{agent.greeting}&rdquo;</p>
              )}
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className="flex-shrink-0 h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              )}
              <div
                className={`rounded-lg px-3 py-2 max-w-[80%] text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border"
                }`}
                data-testid={`test-chat-msg-${i}`}
              >
                {msg.content}
              </div>
              {msg.role === "user" && (
                <div className="flex-shrink-0 h-7 w-7 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}
          {sending && (
            <div className="flex gap-2 justify-start">
              <div className="flex-shrink-0 h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div className="rounded-lg px-3 py-2 bg-card border text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
        <div className="flex items-center gap-2 pt-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Type a message..."
            disabled={sending}
            data-testid="input-test-chat"
          />
          <Button
            size="icon"
            onClick={sendMessage}
            disabled={!input.trim() || sending}
            data-testid="button-send-test-chat"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <DialogFooter className="flex-row justify-between gap-2">
          <Button variant="outline" onClick={() => { setMessages([]); }} disabled={messages.length === 0} data-testid="button-clear-test-chat">
            Clear Chat
          </Button>
          <Button variant="outline" onClick={onClose} data-testid="button-close-test-chat">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
