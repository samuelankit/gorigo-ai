"use client";

import { useState } from "react";
import { Phone, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatWidget } from "./chat-widget";

export function CallCtaBar() {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <>
      {chatOpen && <ChatWidget onClose={() => setChatOpen(false)} />}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-border"
        data-testid="cta-call-bar"
      >
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-center gap-4 sm:gap-6 flex-wrap">
          <p
            className="text-sm sm:text-base font-semibold tracking-tight text-primary"
            data-testid="text-cta-punchline"
          >
            Talk to Our AI — It Picks Up Instantly
          </p>

          <div className="flex items-center gap-2">
            <Button variant="outline" asChild className="border-primary/30 text-primary">
              <a
                href="tel:+440000000000"
                data-testid="link-cta-phone"
              >
                <span className="relative flex h-5 w-5 items-center justify-center">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/30" />
                  <Phone className="relative h-4 w-4" />
                </span>
                +44 (0) 000 000 0000
              </a>
            </Button>

            <Button
              variant="outline"
              onClick={() => setChatOpen(!chatOpen)}
              className="border-primary/30 text-primary"
              data-testid="button-cta-chat"
            >
              <MessageCircle className="h-4 w-4" />
              Chat with Us
            </Button>
          </div>

          <span
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-primary"
            data-testid="text-cta-availability"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
            </span>
            Available 24/7
          </span>
        </div>
      </div>
    </>
  );
}
