import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Suspense } from "react";
import { StructuredData } from "@/components/seo/structured-data";
import { VerificationMeta } from "@/components/seo/verification-meta";
import { ClientShell } from "@/components/client-shell";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GoRigo - AI Voice Platform | International Business Exchange Limited",
  description:
    "AI voice platform by International Business Exchange Limited. AI voice agents, social media marketing, omnichannel messaging, campaigns, team tools, and compliance — run from your phone. Pay only for what you use. UK compliant with GDPR, DNC registry, and consent management.",
  keywords: "AI voice agents, AI voice platform, social media marketing, omnichannel messaging, outbound campaigns, team management, automated calls, pay per talk time",
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
      "AI voice platform. AI voice agents, social media marketing, omnichannel messaging, campaigns, and team tools — run from your phone. Pay only for what you use.",
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
    title: "GoRigo - AI Voice Platform",
    description:
      "AI voice platform. AI voice agents, social media marketing, omnichannel messaging, campaigns, and team tools — run from your phone. Pay only for what you use.",
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
        <script dangerouslySetInnerHTML={{ __html: `(function(){if(typeof window!=='undefined'&&window.reportError){var o=window.reportError;window.reportError=function(e){var m=e&&e.message||'';if(m.indexOf('Hydration')>-1||m.indexOf('hydrat')>-1||m.indexOf('did not match')>-1||m.indexOf('server rendered')>-1)return;o.call(window,e)}}})()` }} />
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
        <ClientShell>
          {children}
        </ClientShell>
      </body>
    </html>
  );
}
