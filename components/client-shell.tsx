"use client";

import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { ErrorBoundary } from "@/components/error-boundary";
import { CookieConsent } from "@/components/cookie-consent";
import { QueryProvider } from "@/components/query-provider";
import { Suspense } from "react";
import { AnalyticsTracker } from "@/components/analytics-tracker";

export function ClientShell({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <ThemeProvider>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
        <Suspense fallback={null}>
          <AnalyticsTracker />
        </Suspense>
        <Toaster />
        <CookieConsent />
      </ThemeProvider>
    </QueryProvider>
  );
}
