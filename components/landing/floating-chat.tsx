"use client";

import { useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatWidget } from "./chat-widget";

export function FloatingChat() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {open && <ChatWidget onClose={() => setOpen(false)} />}
      <div className="fixed bottom-5 right-5 z-50">
        <Button
          size="icon"
          onClick={() => setOpen(!open)}
          className="rounded-full shadow-lg"
          aria-label={open ? "Close chat" : "Chat with GoRigo AI"}
          data-testid="button-floating-chat"
        >
          {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
        </Button>
        {!open && (
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 pointer-events-none">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-green-500 border-2 border-background" />
          </span>
        )}
      </div>
    </>
  );
}
