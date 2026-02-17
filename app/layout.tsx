import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { ErrorBoundary } from "@/components/error-boundary";
import { CookieConsent } from "@/components/cookie-consent";
import { Suspense } from "react";
import { AnalyticsTracker } from "@/components/analytics-tracker";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GoRigo - AI Call Centre Platform | International Business Exchange Limited",
  description:
    "AI-powered call centre platform by International Business Exchange Limited. Deploy intelligent voice agents that handle inbound and outbound calls 24/7. Pay only for talk time. UK compliant with GDPR, DNC registry, and consent management.",
  keywords: "AI call centre, AI voice agents, UK call centre, automated calls, call centre platform, pay per talk time",
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: "/favicon.png",
    apple: "/logo.png",
  },
  openGraph: {
    title: "GoRigo - AI Call Centre Platform",
    description:
      "AI-powered call centre platform. Inbound receptionist, outbound sales, and seamless human handoff. Pay only for talk time.",
    siteName: "GoRigo",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "GoRigo - AI Call Centre Platform",
    description:
      "AI-powered call centre platform. Pay only for talk time. UK compliant.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
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
      </body>
    </html>
  );
}
