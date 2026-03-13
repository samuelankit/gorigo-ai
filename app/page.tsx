import { Navbar } from "@/components/landing/navbar";
import { PublicLayout } from "@/components/public-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { OrganizationJsonLd, WebPageJsonLd, SoftwareApplicationJsonLd } from "@/components/seo/json-ld";
import { TalkTimeInfo } from "@/components/talk-time-info";
import { ArrowRight } from "lucide-react";
import { Suspense, lazy } from "react";
import { RigoPrompt } from "@/components/landing/rigo-prompt";

const HomeBelowFold = lazy(() => import("@/components/landing/home-sections").then((mod) => ({ default: mod.HomeBelowFold })));

export default function HomePage() {
  return (
    <PublicLayout>
    <div className="min-h-screen bg-background" data-testid="page-home">
      <OrganizationJsonLd />
      <WebPageJsonLd 
        title="GoRigo - AI Voice. Real Business. | Voice Agents, Social Media, Omnichannel" 
        description="AI voice platform with social media marketing, omnichannel messaging, campaigns, team tools, and compliance — run from your phone. Pay only for what you use." 
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
              AI Voice Platform
            </Badge>

            <h1
              className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]"
              data-testid="text-hero-title"
            >
              AI Voice. Real Business.
              <br />
              <span className="bg-gradient-to-r from-[#E8604C] via-[#F09040] to-[#F5A623] bg-clip-text text-transparent">Run From Your Phone.</span>
            </h1>

            <p
              className="mt-6 text-lg text-muted-foreground max-w-2xl leading-relaxed"
              data-testid="text-hero-subtitle"
            >
              AI voice agents, social media marketing, omnichannel messaging, campaigns, team tools, and compliance — one platform.
              No subscriptions, no seat fees.
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

            <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
              <Link href="/register">
                <Button size="lg" data-testid="button-hero-start">
                  Get Started
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
              Prepaid wallet from £50. Go live in under 5 minutes.
            </p>

            <RigoPrompt />

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
