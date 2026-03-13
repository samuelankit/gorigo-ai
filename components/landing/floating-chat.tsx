"use client";

import { useState } from "react";
import { X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatWidget } from "./chat-widget";

export function FloatingChat() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {open && <ChatWidget onClose={() => setOpen(false)} />}
      <div className="fixed bottom-5 right-5 z-50">
        {open ? (
          <Button
            size="icon"
            onClick={() => setOpen(false)}
            className="rounded-full shadow-lg"
            aria-label="Close Rigo chat"
            data-testid="button-floating-chat"
          >
            <X className="h-5 w-5" />
          </Button>
        ) : (
          <button
            onClick={() => setOpen(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-[#E8604C] to-[#F5A623] text-white rounded-full px-4 py-2.5 shadow-lg hover:shadow-xl transition-shadow"
            aria-label="Chat with Rigo"
            data-testid="button-floating-chat"
          >
            <div className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
            </div>
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-semibold">Ask Rigo</span>
          </button>
        )}
      </div>
    </>
  );
}
