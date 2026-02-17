"use client";

import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const TALK_TIME_DEFINITION =
  "Talk time includes all platform usage: calls, AI content generation, assistant queries, and knowledge processing. Server infrastructure is included — you only pay for what you use.";

export function TalkTimeInfo({ className }: { className?: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={`inline-flex items-center gap-0.5 cursor-help text-muted-foreground hover:text-foreground transition-colors ${className || ""}`}
            data-testid="tooltip-talk-time-info"
          >
            <sup className="text-[9px] font-bold leading-none">*</sup>
            <Info className="h-3 w-3" />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[280px] text-xs leading-relaxed">
          <p>{TALK_TIME_DEFINITION}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function TalkTimeFootnote({ className }: { className?: string }) {
  return (
    <p
      className={`text-[11px] text-muted-foreground leading-relaxed ${className || ""}`}
      data-testid="text-talk-time-footnote"
    >
      <span className="font-semibold">* Talk time</span> includes all platform
      usage: calls, AI content generation, assistant queries, and knowledge
      processing. Server infrastructure is included.
    </p>
  );
}
