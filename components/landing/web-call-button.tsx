"use client";

import { useState } from "react";
import { Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WebCallModal } from "@/components/landing/web-call-modal";

export function WebCallButton() {
  const [showCall, setShowCall] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setShowCall(true)}
        className="hidden sm:inline-flex items-center gap-3 rounded-full bg-white border-border/50 shadow-sm dark:bg-white dark:text-gray-900 dark:border-border/50"
        data-testid="button-hero-web-call"
      >
        <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-[#2DD4A8]">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#2DD4A8]/40" />
          <Monitor className="relative h-5 w-5 text-white" />
        </span>
        <span className="flex flex-col items-start">
          <span className="text-base font-semibold tracking-tight">Call from Browser</span>
          <span className="text-sm text-gray-500">Talk to Rigo now</span>
        </span>
      </Button>

      {showCall && <WebCallModal onClose={() => setShowCall(false)} />}
    </>
  );
}
