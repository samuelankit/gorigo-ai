import type { Metadata } from "next";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { PublicLayout } from "@/components/public-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Users,
  Share2,
  MessageCircle,
} from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Capabilities | GoRigo.ai — AI Voice, Social Media, Omnichannel & More",
  description:
    "Explore GoRigo's platform capabilities: AI voice agents, social media marketing, omnichannel messaging, campaigns, team collaboration, compliance, and billing across 20 countries. No subscriptions, no seat licences.",
  alternates: {
    canonical: "/capabilities",
  },
  openGraph: {
    title: "Capabilities | GoRigo.ai — AI Voice, Social Media, Omnichannel & More",
    description:
      "Explore GoRigo's platform capabilities: AI voice agents, social media marketing, omnichannel messaging, campaigns, team collaboration, compliance, and billing across 20 countries. No subscriptions, no seat licences.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Capabilities | GoRigo.ai — AI Voice, Social Media, Omnichannel & More",
    description:
      "Explore GoRigo's platform capabilities: AI voice agents, social media marketing, omnichannel messaging, campaigns, team collaboration, compliance, and billing across 20 countries. No subscriptions, no seat licences.",
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
    color: "text-emerald-600 dark:text-emerald-400",
    bgAccent: "bg-emerald-500/10",
    borderAccent: "border-emerald-500/30",
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
    color: "text-blue-600 dark:text-blue-400",
    bgAccent: "bg-blue-500/10",
    borderAccent: "border-blue-500/30",
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
    color: "text-violet-600 dark:text-violet-400",
    bgAccent: "bg-violet-500/10",
    borderAccent: "border-violet-500/30",
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
    color: "text-amber-600 dark:text-amber-400",
    bgAccent: "bg-amber-500/10",
    borderAccent: "border-amber-500/30",
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
    color: "text-rose-600 dark:text-rose-400",
    bgAccent: "bg-rose-500/10",
    borderAccent: "border-rose-500/30",
    highlights: [
      "20 countries with per-country compliance",
      "12+ languages with accent adaptation",
      "Country-specific rate cards and currency",
    ],
  },
  {
    slug: "pay-per-talk-time",
    title: "Pay Per Talk Time",
    tagline: "Only pay for what you use",
    description:
      "No seat licences, no subscriptions, no per-agent fees. You only pay for actual talk time — calls, AI content generation, and all platform usage. Quiet month? Lower bill. Busy month? It scales with you. Transparent, predictable, and fair.",
    video: "/features/pay-per-talk-time-intro.mp4",
    icon: Zap,
    color: "text-teal-600 dark:text-teal-400",
    bgAccent: "bg-teal-500/10",
    borderAccent: "border-teal-500/30",
    highlights: [
      "No idle time charges",
      "Real-time usage dashboard",
      "Custom spending caps",
    ],
  },
  {
    slug: "team-collaboration",
    title: "Team Collaboration",
    tagline: "Bring your whole company onto one platform",
    description:
      "Bring your whole company — employees, departments, board members. Shared AI agents, team dashboard, department budgets, and activity tracking. No per-seat fees.",
    video: "/features/team-collaboration-intro.mp4",
    icon: Users,
    color: "text-indigo-600 dark:text-indigo-400",
    bgAccent: "bg-indigo-500/10",
    borderAccent: "border-indigo-500/30",
    highlights: [
      "Unlimited team members with no per-seat charges",
      "Shared AI agents across the whole company",
      "Per-department budgets and activity tracking",
    ],
  },
  {
    slug: "social-media-marketing",
    title: "Social Media Marketing",
    tagline: "Post everywhere, from one place",
    description:
      "Create and schedule posts across Facebook, Instagram, LinkedIn, X, TikTok, and YouTube — all from one dashboard. AI writes your captions, pulls images from your website or cloud storage (Google Drive, Dropbox, OneDrive), and publishes at the best time. No uploads needed — your files stay in your cloud.",
    video: "/features/social-media-intro.mp4",
    icon: Share2,
    color: "text-pink-600 dark:text-pink-400",
    bgAccent: "bg-pink-500/10",
    borderAccent: "border-pink-500/30",
    highlights: [
      "6+ social platforms from one dashboard",
      "AI-generated captions with hashtags and CTAs",
      "Zero media storage — files stay in your cloud",
    ],
  },
  {
    slug: "omnichannel",
    title: "Omnichannel Messaging",
    tagline: "Every conversation, one inbox",
    description:
      "Reach your customers on WhatsApp, SMS, email, and web chat — all managed from a single unified inbox. AI handles replies, routes conversations to the right team member, and keeps every channel perfectly in sync. No more switching between apps.",
    video: "/features/omnichannel-intro.mp4",
    icon: MessageCircle,
    color: "text-cyan-600 dark:text-cyan-400",
    bgAccent: "bg-cyan-500/10",
    borderAccent: "border-cyan-500/30",
    highlights: [
      "WhatsApp, SMS, email, and web chat in one inbox",
      "AI-powered auto-replies and smart routing",
      "Full conversation history across every channel",
    ],
  },
];

const platformStats = [
  { label: "Countries", value: "20", icon: Globe, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-500/10" },
  { label: "Languages", value: "12+", icon: Phone, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10" },
  { label: "Uptime", value: "99.9%", icon: TrendingUp, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10" },
  { label: "Concurrent Calls", value: "Unlimited", icon: Bot, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10" },
];

export default function CapabilitiesPage() {
  return (
    <PublicLayout>
    <div className="min-h-screen bg-background" data-testid="page-capabilities">
      <WebPageJsonLd
        title="GoRigo Platform Capabilities"
        description="Explore GoRigo's platform capabilities. AI voice agents, campaigns, team collaboration, finance, knowledge management, and compliance across 20 countries."
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

      <section className="relative overflow-hidden" data-testid="section-hero">
        <div className="absolute inset-0 bg-gradient-to-br from-[#E8604C]/8 via-transparent to-[#F5A623]/8 dark:from-[#E8604C]/5 dark:to-[#F5A623]/5" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.12),transparent_65%)]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.06),transparent_70%)]" />
        <div className="absolute top-20 left-0 w-[300px] h-[300px] bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.06),transparent_70%)]" />
        <div className="relative max-w-6xl mx-auto px-6 pt-28 pb-16 text-center">
          <Badge variant="outline" className="mb-6 px-4 py-1.5 text-xs font-medium tracking-wide border-[#E8604C]/30 text-[#E8604C] dark:text-[#F5A623]" data-testid="badge-capabilities">
            <span className="relative flex h-2 w-2 mr-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#E8604C] opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#E8604C]" />
            </span>
            Platform Capabilities
          </Badge>
          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]"
            data-testid="text-hero-title"
          >
            Everything Your Business
            <br />
            <span className="bg-gradient-to-r from-[#E8604C] via-[#F09040] to-[#F5A623] bg-clip-text text-transparent">Needs</span>
          </h1>
          <p
            className="mt-5 text-lg sm:text-xl text-muted-foreground font-light max-w-3xl mx-auto leading-relaxed"
            data-testid="text-hero-subtitle"
          >
            AI voice agents, social media marketing, omnichannel messaging, campaigns, team tools, compliance, and billing — nine powerful capabilities working together to run your business.
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
                <div className={`flex items-center justify-center h-10 w-10 rounded-md ${stat.bg} mb-1`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
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

      <section className="relative py-20" data-testid="section-capabilities">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#E8604C]/3 to-transparent dark:via-[#E8604C]/2 pointer-events-none" />
        <div className="relative max-w-6xl mx-auto px-6 flex flex-col gap-24">
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
                    <div className={`flex items-center justify-center h-11 w-11 rounded-full ${cap.bgAccent}`}>
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
                  <p className={`mt-1 text-base font-medium ${cap.color}`}>
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
        subheadline="From AI agents to team management, GoRigo handles your operations so you can focus on growth. No subscriptions, no seat licences."
        talkToAiMessage="Talk to AI to explore our Capabilities"
      />

      <Footer />
    </div>
    </PublicLayout>
  );
}
