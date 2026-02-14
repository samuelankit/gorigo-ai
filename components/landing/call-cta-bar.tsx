"use client";

import { Phone } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CallCtaBar() {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 bg-primary text-primary-foreground"
      data-testid="cta-call-bar"
    >
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-center gap-4 sm:gap-6 flex-wrap">
        <p
          className="text-sm sm:text-base font-semibold tracking-tight"
          data-testid="text-cta-punchline"
        >
          Talk to Our AI — It Picks Up Instantly
        </p>

        <Button variant="outline" asChild className="bg-white/15 border-white/20 text-primary-foreground">
          <a
            href="tel:+440000000000"
            data-testid="link-cta-phone"
          >
            <span className="relative flex h-5 w-5 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/40" />
              <Phone className="relative h-4 w-4" />
            </span>
            +44 (0) 000 000 0000
          </a>
        </Button>

        <span
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium opacity-90"
          data-testid="text-cta-availability"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-300 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-200" />
          </span>
          Available 24/7
        </span>
      </div>
    </div>
  );
}
