import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { ErrorBoundary } from "@/components/error-boundary";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GoRigo - AI Call Centre Platform | International Business Exchange Limited",
  description:
    "AI-powered call centre platform by International Business Exchange Limited. Inbound receptionist, outbound sales, and seamless human handoff. Pay only for talk time. UK compliant.",
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
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
