import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { ErrorBoundary } from "@/components/error-boundary";
import { CookieConsent } from "@/components/cookie-consent";
import { QueryProvider } from "@/components/query-provider";
import { Suspense } from "react";
import { AnalyticsTracker } from "@/components/analytics-tracker";
import { StructuredData } from "@/components/seo/structured-data";
import { VerificationMeta } from "@/components/seo/verification-meta";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GoRigo - AI Voice Platform | International Business Exchange Limited",
  description:
    "AI voice platform by International Business Exchange Limited. Intelligent voice agents, outbound campaigns, team tools, billing, and compliance — run from your phone. Pay only for what you use. UK compliant with GDPR, DNC registry, and consent management.",
  keywords: "AI voice agents, AI voice platform, outbound campaigns, team management, automated calls, pay per talk time",
  alternates: {
    canonical: "/",
  },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/favicon.png", sizes: "64x64", type: "image/png" },
    ],
    apple: "/logo.png",
  },
  openGraph: {
    title: "GoRigo - AI Voice Platform",
    description:
      "AI voice platform. Intelligent voice agents, outbound campaigns, team tools, billing, and compliance — run from your phone. Pay only for what you use.",
    siteName: "GoRigo",
    type: "website",
    images: [
      {
        url: "https://gorigo.ai/logo.png",
        width: 512,
        height: 512,
        alt: "GoRigo AI Business Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "GoRigo - AI Business Platform",
    description:
      "AI-powered business platform. Pay only for what you use. UK compliant.",
    images: ["https://gorigo.ai/logo.png"],
  },
  other: {
    "theme-color": "#2196F3",
  },
  robots: {
    index: true,
    follow: true,
  },
  verification: {
    google: "gdqhzJd-fGBhEgKm-RYgO4om1uG-_1Yj7tuBdjcC_U8",
    other: {
      "msvalidate.01": "DE4103E292AC1A7D12408D03D7D0FAF3",
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var d=document.documentElement;d.classList.remove('light','dark');var t=localStorage.getItem('gorigo-theme');d.classList.add(t==='dark'?'dark':'light')}catch(e){document.documentElement.classList.add('light')}})()` }} />
        <StructuredData />
        <Suspense fallback={null}>
          <VerificationMeta />
        </Suspense>
        <link rel="canonical" href="https://gorigo.ai" />
        <link rel="alternate" hrefLang="en-GB" href="https://gorigo.ai" />
        <link rel="alternate" hrefLang="x-default" href="https://gorigo.ai" />
        <meta name="geo.region" content="GB-LAN" />
        <meta name="geo.placename" content="Preston" />
        <meta name="author" content="International Business Exchange Limited" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
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
      </body>
    </html>
  );
}
