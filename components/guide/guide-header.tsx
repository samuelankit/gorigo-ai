"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen } from "lucide-react";

interface GuideHeaderProps {
  showBack?: boolean;
  backHref?: string;
  backLabel?: string;
}

export function GuideHeader({ showBack = false, backHref = "/guide", backLabel = "All Guides" }: GuideHeaderProps) {
  return (
    <header className="sticky top-14 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          {showBack && (
            <Link href={backHref}>
              <Button variant="ghost" size="sm" data-testid="button-guide-back">
                <ArrowLeft className="h-4 w-4 mr-1" />
                {backLabel}
              </Button>
            </Link>
          )}
          <Link href="/guide" className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-muted-foreground" />
            <span className="font-semibold text-lg" data-testid="text-guide-logo">GoRigo Guide</span>
          </Link>
        </div>
        <Link href="/admin">
          <Button variant="outline" size="sm" data-testid="button-goto-admin">
            Go to Admin Console
          </Button>
        </Link>
      </div>
    </header>
  );
}
