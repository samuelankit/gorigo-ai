import { Navbar } from "@/components/landing/navbar";
import { PublicLayout } from "@/components/public-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { OrganizationJsonLd, WebPageJsonLd, SoftwareApplicationJsonLd } from "@/components/seo/json-ld";
import { CustomIcon } from "@/components/ui/custom-icon";
import { WebCallButton } from "@/components/landing/web-call-button";
import { TalkTimeInfo } from "@/components/talk-time-info";
import { ArrowRight } from "lucide-react";
import { Suspense, lazy } from "react";

const HomeBelowFold = lazy(() => import("@/components/landing/home-sections").then((mod) => ({ default: mod.HomeBelowFold })));

export default function HomePage() {
  return (
    <PublicLayout>
    <div className="min-h-screen bg-background" data-testid="page-home">
      <OrganizationJsonLd />
      <WebPageJsonLd 
        title="GoRigo - AI That Runs Your Business | Voice Agents, Campaigns, Teams" 
        description="AI-powered business platform. Voice agents, campaigns, team management, finance, and compliance — all from your phone. Pay only for what you use." 
        url="/" 
      />
      <SoftwareApplicationJsonLd />
      <Navbar />

      <section className="relative overflow-hidden" data-testid="section-hero">
        <div className="absolute inset-0 bg-gradient-to-br from-[#E8604C]/8 via-transparent to-[#F5A623]/8 dark:from-[#E8604C]/5 dark:to-[#F5A623]/5" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.12),transparent_65%)]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.06),transparent_70%)]" />

        <div className="relative max-w-6xl mx-auto px-6 pt-28 pb-20">
          <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
            <Badge variant="outline" className="mb-6 px-4 py-1.5 text-xs font-medium tracking-wide border-[#E8604C]/30 text-[#E8604C] dark:text-[#F5A623]" data-testid="badge-hero-ai">
              <span className="relative flex h-2 w-2 mr-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#E8604C] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#E8604C]" />
              </span>
              AI-Powered Business Engine
            </Badge>

            <h1
              className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]"
              data-testid="text-hero-title"
            >
              AI That Runs Your Business.
              <br />
              <span className="bg-gradient-to-r from-[#E8604C] via-[#F09040] to-[#F5A623] bg-clip-text text-transparent">You Run It From Your Phone.</span>
            </h1>

            <p
              className="mt-6 text-lg text-muted-foreground max-w-2xl leading-relaxed"
              data-testid="text-hero-subtitle"
            >
              Voice agents, campaigns, team management, finance, and compliance — one platform.
              Manage everything by voice, tap, or text.
            </p>

            <p
              className="mt-6 text-base sm:text-lg font-semibold"
              data-testid="callout-no-subscriptions"
            >
              <span className="bg-gradient-to-r from-teal-500 to-emerald-400 dark:from-teal-400 dark:to-emerald-300 bg-clip-text text-transparent" data-testid="text-hero-no-subscriptions">
                No subscriptions. No seat fees. Pay only for what you use
              </span>
              <span className="text-lg sm:text-xl font-bold text-teal-500 dark:text-teal-400 ml-0.5" data-testid="text-hero-pound-symbol">£</span>
              <TalkTimeInfo />
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center gap-4 flex-wrap" data-testid="hero-talk-to-ai">
              <Link
                href="/demo"
                data-testid="link-hero-call-ai"
                className="inline-flex items-center gap-3 rounded-full bg-white px-5 py-2.5 shadow-sm hover-elevate dark:bg-white sm:hidden"
              >
                <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#E8604C] to-[#F5A623]">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#E8604C]/40" />
                  <CustomIcon name="phone-call" size={22} className="relative text-white" />
                </span>
                <span className="flex flex-col items-start">
                  <span className="text-base font-semibold tracking-tight text-gray-900">Talk to Our AI</span>
                  <span className="text-sm text-gray-500">Try the live demo</span>
                </span>
              </Link>
              <WebCallButton />
              <span className="inline-flex items-center gap-2 text-sm font-medium text-[#E8604C] dark:text-[#F5A623]" data-testid="text-hero-availability">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#E8604C] opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#E8604C]" />
                </span>
                Available 24/7
              </span>
            </div>

            <div className="mt-6 flex items-center justify-center gap-3 flex-wrap">
              <Link href="/register">
                <Button size="lg" data-testid="button-hero-start">
                  Start Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/contact">
                <Button variant="outline" size="lg" data-testid="button-hero-demo">
                  Book a Demo
                </Button>
              </Link>
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
              No credit card required. Go live in under 5 minutes.
            </p>
          </div>
        </div>
      </section>

      <Suspense fallback={<div className="min-h-screen" />}>
        <HomeBelowFold />
      </Suspense>
    </div>
    </PublicLayout>
  );
}
