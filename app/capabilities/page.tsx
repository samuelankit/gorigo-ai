import type { Metadata } from "next";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { PublicLayout } from "@/components/public-layout";
import { Button } from "@/components/ui/button";
import { WebPageJsonLd, BreadcrumbJsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { ConversionCta } from "@/components/seo/conversion-cta";
import Link from "next/link";
import {
  Bot,
  Clock,
  Shield,
  BarChart3,
  Globe,
  Zap,
  ArrowRight,
  CheckCircle2,
  Phone,
  TrendingUp,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Capabilities | GoRigo.ai",
  description:
    "Explore GoRigo's AI call centre capabilities across 20 countries. Intelligent agents, 24/7 call handling, per-country compliance, real-time analytics, 12+ languages, and pay-per-talk-time billing. No subscriptions, no seat licences.",
  alternates: {
    canonical: "/capabilities",
  },
  openGraph: {
    title: "Capabilities | GoRigo.ai",
    description:
      "Explore GoRigo's AI call centre capabilities across 20 countries. Intelligent agents, 24/7 call handling, per-country compliance, real-time analytics, 12+ languages, and pay-per-talk-time billing. No subscriptions, no seat licences.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Capabilities | GoRigo.ai",
    description:
      "Explore GoRigo's AI call centre capabilities across 20 countries. Intelligent agents, 24/7 call handling, per-country compliance, real-time analytics, 12+ languages, and pay-per-talk-time billing. No subscriptions, no seat licences.",
  },
};

const capabilities = [
  {
    slug: "ai-agents",
    title: "AI-Powered Agents",
    tagline: "Your tireless team of virtual call handlers",
    description:
      "Deploy intelligent voice agents that listen, understand, and respond naturally to every call. They never tire, never take breaks, and handle thousands of conversations simultaneously with consistent quality.",
    video: "/features/ai-agents-intro.mp4",
    icon: Bot,
    color: "text-teal-500",
    bgAccent: "bg-teal-500/10",
    highlights: [
      "Natural conversational voice",
      "Instant knowledge base updates",
      "Unlimited concurrent calls",
    ],
  },
  {
    slug: "call-handling",
    title: "24/7 Call Handling",
    tagline: "Never miss a call, day or night",
    description:
      "Every call to your business is answered instantly, whether it arrives at midday or 2am on a bank holiday. Zero wait time, no hold music, no voicemail. Your customers always reach someone who can help.",
    video: "/features/call-handling-intro.mp4",
    icon: Clock,
    color: "text-cyan-500",
    bgAccent: "bg-cyan-500/10",
    highlights: [
      "Zero missed calls",
      "Sub-second answer time",
      "Auto-scales with volume",
    ],
  },
  {
    slug: "compliance",
    title: "Globally Compliant",
    tagline: "Per-country compliance across 20 countries",
    description:
      "DNC registry checks, calling hours enforcement by timezone, AI disclosure in 12 languages, consent management, and PII redaction all happen automatically on every call. Your business stays compliant across 20 countries without extra effort.",
    video: "/features/compliance-intro.mp4",
    icon: Shield,
    color: "text-blue-500",
    bgAccent: "bg-blue-500/10",
    highlights: [
      "Country-specific DNC and calling hours",
      "AI disclosure in 12 languages",
      "PII auto-redaction and audit trail",
    ],
  },
  {
    slug: "analytics",
    title: "Real-Time Analytics",
    tagline: "See what is happening, as it happens",
    description:
      "Every call generates valuable data. Live dashboards show call volumes, quality scores, customer sentiment, and trends as they develop. Spot problems instantly and make data-driven decisions from a single view.",
    video: "/features/analytics-intro.mp4",
    icon: BarChart3,
    color: "text-violet-500",
    bgAccent: "bg-violet-500/10",
    highlights: [
      "Live sentiment tracking",
      "Agent performance metrics",
      "Exportable reports",
    ],
  },
  {
    slug: "multi-language",
    title: "International Calling",
    tagline: "20 countries, 12+ languages, one platform",
    description:
      "Call internationally across the UK, US, France, Germany, India, Canada, Australia, Spain, Italy, Netherlands, Japan, Brazil, Mexico, UAE, Singapore, South Africa, Ireland, Sweden, Switzerland, and Poland. AI agents detect languages, adapt to accents, and handle every conversation naturally.",
    video: "/features/multi-language-intro.mp4",
    icon: Globe,
    color: "text-amber-500",
    bgAccent: "bg-amber-500/10",
    highlights: [
      "20 countries with per-country compliance",
      "12+ languages with accent adaptation",
      "Country-specific rate cards and currency",
    ],
  },
  {
    slug: "pay-per-talk-time",
    title: "Pay Per Talk Time",
    tagline: "Only pay for minutes that matter",
    description:
      "No seat licences, no subscriptions, no per-agent fees. You only pay for actual minutes your AI agents spend on calls. Quiet month? Lower bill. Busy month? It scales with you. Transparent, predictable, and fair.",
    video: "/features/pay-per-talk-time-intro.mp4",
    icon: Zap,
    color: "text-emerald-500",
    bgAccent: "bg-emerald-500/10",
    highlights: [
      "No idle time charges",
      "Real-time usage dashboard",
      "Custom spending caps",
    ],
  },
];

const platformStats = [
  { label: "Countries", value: "20", icon: Globe },
  { label: "Languages", value: "12+", icon: Phone },
  { label: "Uptime", value: "99.9%", icon: TrendingUp },
  { label: "Concurrent Calls", value: "Unlimited", icon: Bot },
];

export default function CapabilitiesPage() {
  return (
    <PublicLayout>
    <div className="min-h-screen bg-background" data-testid="page-capabilities">
      <WebPageJsonLd
        title="GoRigo AI Call Centre Capabilities"
        description="Explore GoRigo's AI call centre capabilities in the UK. Intelligent agents, 24/7 call handling, GDPR compliance, real-time analytics, multi-language support, and pay-per-talk-time billing."
        url="/capabilities"
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Capabilities", url: "/capabilities" },
        ]}
      />
      <Navbar />

      <Breadcrumbs items={[{ label: "Capabilities" }]} />

      <section className="relative" data-testid="section-hero">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.08),transparent_60%)]" />
        <div className="relative max-w-6xl mx-auto px-6 pt-28 pb-16 text-center">
          <p
            className="text-sm font-medium tracking-widest uppercase text-primary mb-6"
            data-testid="badge-capabilities"
          >
            Platform Capabilities
          </p>
          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-light tracking-tight leading-[1.1]"
            data-testid="text-hero-title"
          >
            Everything Your Call Centre Needs
          </h1>
          <p
            className="mt-5 text-lg sm:text-xl text-muted-foreground font-light max-w-3xl mx-auto leading-relaxed"
            data-testid="text-hero-subtitle"
          >
            Six powerful capabilities working together to automate your calls,
            protect your business, and grow your revenue — all powered by AI.
          </p>
        </div>
      </section>

      <section className="py-8 border-y border-border/50 bg-muted/30" data-testid="section-stats">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {platformStats.map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col items-center text-center gap-1"
                data-testid={`stat-${stat.label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <stat.icon className="h-5 w-5 text-primary mb-1" />
                <span className="text-2xl sm:text-3xl font-light tracking-tight">
                  {stat.value}
                </span>
                <span className="text-xs text-muted-foreground uppercase tracking-wider">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20" data-testid="section-capabilities">
        <div className="max-w-6xl mx-auto px-6 flex flex-col gap-24">
          {capabilities.map((cap, index) => {
            const isReversed = index % 2 !== 0;
            return (
              <div
                key={cap.slug}
                className={`flex flex-col gap-10 lg:gap-16 ${
                  isReversed ? "lg:flex-row-reverse" : "lg:flex-row"
                } items-center`}
                data-testid={`capability-${cap.slug}`}
              >
                <div className="w-full lg:w-1/2 flex-shrink-0">
                  <div className="rounded-md overflow-hidden border border-border/50 shadow-lg relative group">
                    <video
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full h-auto object-cover"
                      data-testid={`video-${cap.slug}`}
                    >
                      <source src={cap.video} type="video/mp4" />
                    </video>
                    <div className="absolute top-3 left-3">
                      <div className={`inline-flex items-center gap-1.5 rounded-md ${cap.bgAccent} backdrop-blur-sm px-2.5 py-1`}>
                        <cap.icon className={`h-3.5 w-3.5 ${cap.color}`} />
                        <span className={`text-xs font-medium ${cap.color}`}>
                          {String(index + 1).padStart(2, "0")}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="w-full lg:w-1/2">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`flex items-center justify-center h-10 w-10 rounded-md ${cap.bgAccent}`}>
                      <cap.icon className={`h-5 w-5 ${cap.color}`} />
                    </div>
                    <span className="text-xs font-medium tracking-widest uppercase text-muted-foreground">
                      Capability {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>

                  <h2
                    className="text-2xl sm:text-3xl font-light tracking-tight leading-tight"
                    data-testid={`title-${cap.slug}`}
                  >
                    {cap.title}
                  </h2>
                  <p className="mt-1 text-base text-primary font-medium">
                    {cap.tagline}
                  </p>
                  <p className="mt-4 text-base text-muted-foreground leading-relaxed">
                    {cap.description}
                  </p>

                  <ul className="mt-6 flex flex-col gap-2.5">
                    {cap.highlights.map((h) => (
                      <li
                        key={h}
                        className="flex items-center gap-2.5 text-sm text-foreground"
                      >
                        <CheckCircle2 className={`h-4 w-4 flex-shrink-0 ${cap.color}`} />
                        {h}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-8">
                    <Button variant="outline" asChild>
                      <Link
                        href={`/features/${cap.slug}`}
                        data-testid={`link-${cap.slug}`}
                      >
                        Learn More
                        <ArrowRight className="ml-1.5 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <ConversionCta
        headline="See What GoRigo Can Do for Your Business"
        subheadline="From AI agents to real-time analytics, GoRigo handles your calls so you can focus on growth. No subscriptions, no seat licences."
        talkToAiMessage="Talk to AI to explore our Capabilities"
      />

      <Footer />
    </div>
    </PublicLayout>
  );
}
