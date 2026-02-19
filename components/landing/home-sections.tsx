"use client";

import { Footer } from "@/components/landing/footer";
import { DeploymentPackages } from "@/components/landing/deployment-packages";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { CustomIcon } from "@/components/ui/custom-icon";
import { SiApple } from "react-icons/si";
import {
  ArrowRight,
  PhoneOff,
  Clock,
  TrendingDown,
  Users,
  CheckCircle2,
  Globe,
  Shield,
  Zap,
  BarChart3,
  Phone,
  Headphones,
  XCircle,
  CircleDollarSign,
  Mic,
  Bot,
  BookOpen,
  MessageSquare,
} from "lucide-react";

const features = [
  {
    customIcon: "ai-voice-head",
    title: "AI-Powered Agents",
    href: "/features/ai-agents",
    description:
      "Deploy intelligent voice agents that understand context, remember caller history, and handle complex multi-turn conversations with human-like empathy and precision.",
    stat: "10,000+",
    statLabel: "concurrent calls",
    accentColor: "from-emerald-500/20 to-teal-500/20",
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    borderAccent: "border-emerald-500/20",
  },
  {
    customIcon: "vr-phone-mic",
    title: "24/7 Call Handling",
    href: "/features/call-handling",
    description:
      "Your AI agents never sleep, never take breaks, and never call in sick. Every call answered in under 2 seconds, around the clock, 365 days a year.",
    stat: "<2s",
    statLabel: "answer time",
    accentColor: "from-blue-500/20 to-cyan-500/20",
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-600 dark:text-blue-400",
    borderAccent: "border-blue-500/20",
  },
  {
    customIcon: "vr-voice-lock",
    title: "Globally Compliant",
    href: "/features/compliance",
    description:
      "Per-country DNC registries, calling hours enforcement, AI disclosure in 12 languages, PII auto-redaction, and GDPR-ready data handling. Compliant from day one.",
    stat: "20",
    statLabel: "countries",
    accentColor: "from-violet-500/20 to-purple-500/20",
    iconBg: "bg-violet-500/10",
    iconColor: "text-violet-600 dark:text-violet-400",
    borderAccent: "border-violet-500/20",
  },
  {
    customIcon: "vr-waveform-scan",
    title: "Real-Time Analytics",
    href: "/features/analytics",
    description:
      "Live dashboards with call quality scoring, sentiment analysis, topic extraction, agent scorecards, and actionable insights to optimise every interaction.",
    stat: "6",
    statLabel: "analytics tabs",
    accentColor: "from-amber-500/20 to-orange-500/20",
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-600 dark:text-amber-400",
    borderAccent: "border-amber-500/20",
  },
  {
    customIcon: "vr-voice-chat",
    title: "12+ Languages",
    href: "/features/multi-language",
    description:
      "AI agents detect caller language automatically, adapt to regional accents, and handle multilingual conversations without manual switching. True global reach.",
    stat: "12+",
    statLabel: "languages",
    accentColor: "from-rose-500/20 to-pink-500/20",
    iconBg: "bg-rose-500/10",
    iconColor: "text-rose-600 dark:text-rose-400",
    borderAccent: "border-rose-500/20",
  },
  {
    customIcon: "vr-speaking",
    title: "Pay Per Talk Time",
    href: "/features/pay-per-talk-time",
    description:
      "No seat licences. No monthly subscriptions. No hidden fees. You only pay for the minutes your AI agents spend on actual conversations. Simple, transparent pricing.",
    stat: "0",
    statLabel: "subscriptions",
    accentColor: "from-teal-500/20 to-green-500/20",
    iconBg: "bg-teal-500/10",
    iconColor: "text-teal-600 dark:text-teal-400",
    borderAccent: "border-teal-500/20",
  },
];

const steps = [
  {
    number: "01",
    title: "Configure Your Agent",
    description:
      "Set up your AI agent's persona, tone, knowledge base, and call handling rules through our intuitive dashboard. Upload documents, define FAQs, and customise responses. No coding required — just describe how you want your agent to behave.",
    customIcon: "ai-voice-setting",
    gradient: "from-[#E8604C] to-[#F5A623]",
  },
  {
    number: "02",
    title: "Connect Your Number",
    description:
      "Link your existing business phone number or provision a new one in any of our 20 supported countries. Your AI agent starts handling calls within minutes. Port existing numbers with zero downtime.",
    customIcon: "vr-voice-signal",
    gradient: "from-blue-500 to-violet-500",
  },
  {
    number: "03",
    title: "Monitor & Optimise",
    description:
      "Track every call in real time from your phone or web dashboard. Review full transcripts, quality scores, sentiment analysis, and performance trends. Your AI agent gets smarter with every conversation.",
    customIcon: "ai-voice-record",
    gradient: "from-violet-500 to-rose-500",
  },
];

const industries = [
  {
    customIcon: "industry-financial",
    title: "Financial Services",
    description: "Account enquiries, loan pre-qualification, fraud alert callbacks, appointment scheduling, and compliance-checked outbound campaigns.",
    gradient: "from-blue-500/10 to-cyan-500/10",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
  {
    customIcon: "industry-retail",
    title: "Retail & E-Commerce",
    description: "Order tracking, returns and refund processing, product recommendations, stock checks, and proactive delivery notifications.",
    gradient: "from-amber-500/10 to-orange-500/10",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  {
    customIcon: "industry-telecoms",
    title: "Telecoms",
    description: "Service activations, billing enquiries, technical troubleshooting, plan upgrade recommendations, and network status notifications.",
    gradient: "from-violet-500/10 to-purple-500/10",
    iconColor: "text-violet-600 dark:text-violet-400",
  },
  {
    customIcon: "industry-travel",
    title: "Travel & Hospitality",
    description: "Booking management, itinerary changes, loyalty programme queries, concierge services, and real-time flight/room availability checks.",
    gradient: "from-rose-500/10 to-pink-500/10",
    iconColor: "text-rose-600 dark:text-rose-400",
  },
  {
    customIcon: "industry-healthcare",
    title: "Healthcare",
    description: "Appointment booking and reminders, prescription refill requests, patient follow-ups, triage assistance, and insurance verification.",
    gradient: "from-emerald-500/10 to-teal-500/10",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  {
    customIcon: "industry-professional",
    title: "Professional Services",
    description: "Client intake forms, appointment scheduling, after-hours reception, follow-up calls, and billing enquiries for law firms, agencies, and consultancies.",
    gradient: "from-teal-500/10 to-cyan-500/10",
    iconColor: "text-teal-600 dark:text-teal-400",
  },
];

const painPoints = [
  {
    icon: PhoneOff,
    problem: "67% of callers hang up",
    detail: "when they can't reach a human within 2 minutes",
    color: "text-rose-500",
  },
  {
    icon: Clock,
    problem: "Night & weekend calls lost",
    detail: "traditional teams only cover business hours",
    color: "text-amber-500",
  },
  {
    icon: TrendingDown,
    problem: "Rising staff costs",
    detail: "average call centre agent costs increase 8% year on year",
    color: "text-violet-500",
  },
  {
    icon: Users,
    problem: "High agent turnover",
    detail: "call centre turnover rates average 30-45% annually",
    color: "text-blue-500",
  },
];

const stats = [
  { value: "20", label: "Countries Supported", icon: Globe, color: "text-emerald-500" },
  { value: "12+", label: "Languages Available", icon: Headphones, color: "text-blue-500" },
  { value: "<2s", label: "Average Answer Time", icon: Zap, color: "text-amber-500" },
  { value: "99.9%", label: "Platform Uptime", icon: Shield, color: "text-violet-500" },
  { value: "24/7", label: "Always Available", icon: Clock, color: "text-rose-500" },
  { value: "0", label: "Monthly Subscriptions", icon: BarChart3, color: "text-teal-500" },
];

export function HomeBelowFold() {
  return (
    <>
      <section className="py-4 border-y border-border/50 bg-muted/30" data-testid="section-stats-bar">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
            {stats.map((stat) => (
              <div key={stat.label} className="flex flex-col items-center text-center py-3" data-testid={`stat-${stat.label.toLowerCase().replace(/\s+/g, "-")}`}>
                <stat.icon className={`h-5 w-5 ${stat.color} mb-2`} />
                <p className="text-xl font-bold tracking-tight">{stat.value}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20" data-testid="section-problem">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <Badge variant="outline" className="mb-4 px-3 py-1 text-xs border-rose-500/30 text-rose-600 dark:text-rose-400">
              The Problem
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight" data-testid="text-problem-title">
              Traditional call centres are
              <span className="bg-gradient-to-r from-rose-500 to-amber-500 bg-clip-text text-transparent"> broken</span>
            </h2>
            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
              Businesses lose revenue, customers, and reputation every day because of outdated call centre models.
              GoRigo fixes this with AI that works around the clock.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {painPoints.map((point) => (
              <Card key={point.problem} className="border-border/60" data-testid={`card-problem-${point.problem.toLowerCase().replace(/\s+/g, "-").substring(0, 20)}`}>
                <CardContent className="p-6">
                  <point.icon className={`h-8 w-8 ${point.color} mb-4`} />
                  <p className="font-semibold text-sm mb-1">{point.problem}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{point.detail}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-10 text-center">
            <p className="text-sm text-muted-foreground">
              GoRigo eliminates these problems.{" "}
              <Link href="/roi-calculator" className="text-[#E8604C] dark:text-[#F5A623] font-medium underline" data-testid="link-problem-roi">
                See how much you could save
                <ArrowRight className="inline h-3.5 w-3.5 ml-1" />
              </Link>
            </p>
          </div>
        </div>
      </section>

      <section className="py-20 relative" data-testid="section-features" id="features">
        <div className="absolute inset-0 bg-gradient-to-b from-muted/40 via-transparent to-muted/40" />
        <div className="relative max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <Badge variant="outline" className="mb-4 px-3 py-1 text-xs border-[#E8604C]/30 text-[#E8604C] dark:text-[#F5A623]">
              Capabilities
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight" data-testid="text-features-title">
              Everything you need to run
              <br />
              <span className="bg-gradient-to-r from-[#E8604C] to-[#F5A623] bg-clip-text text-transparent">an AI call centre</span>
            </h2>
            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
              From intelligent voice agents to enterprise-grade compliance, GoRigo gives you a complete
              call centre platform that runs itself.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature) => (
              <Link
                key={feature.title}
                href={feature.href}
                className={`group relative rounded-md border ${feature.borderAccent} bg-background p-6 transition-all hover:shadow-md`}
                data-testid={`card-feature-${feature.title.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <div className={`absolute inset-0 rounded-md bg-gradient-to-br ${feature.accentColor} opacity-0 group-hover:opacity-100 transition-opacity`} />
                <div className="relative">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className={`flex items-center justify-center w-11 h-11 rounded-md ${feature.iconBg}`}>
                      <CustomIcon name={feature.customIcon} size={24} className={feature.iconColor} />
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-2 shrink-0" />
                  </div>
                  <h3 className="font-semibold text-base mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    {feature.description}
                  </p>
                  <div className="flex items-baseline gap-1.5">
                    <span className={`text-lg font-bold ${feature.iconColor}`}>{feature.stat}</span>
                    <span className="text-xs text-muted-foreground">{feature.statLabel}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link href="/capabilities">
              <Button variant="outline" data-testid="button-view-capabilities">
                Explore All Capabilities
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-20" data-testid="section-how-it-works">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <Badge variant="outline" className="mb-4 px-3 py-1 text-xs border-blue-500/30 text-blue-600 dark:text-blue-400">
              How It Works
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight" data-testid="text-how-title">
              Go live in
              <span className="bg-gradient-to-r from-blue-500 to-violet-500 bg-clip-text text-transparent"> three steps</span>
            </h2>
            <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
              No technical setup required. Configure your AI agent, connect a phone number, and start taking calls — all in under 5 minutes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {steps.map((step) => (
              <Card key={step.number} className="relative overflow-visible" data-testid={`step-${step.number}`}>
                <CardContent className="p-7">
                  <div className="flex items-center gap-4 mb-5">
                    <span className={`inline-flex items-center justify-center w-10 h-10 rounded-md bg-gradient-to-br ${step.gradient} text-white text-sm font-bold`}>
                      {step.number}
                    </span>
                    <div className="h-px flex-1 bg-border/50" />
                    <CustomIcon name={step.customIcon} size={22} className="text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 relative overflow-hidden" data-testid="section-no-subscriptions">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 via-transparent to-emerald-500/5 dark:from-teal-500/3 dark:to-emerald-500/3" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.06),transparent_70%)]" />

        <div className="relative max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <Badge variant="outline" className="mb-4 px-3 py-1 text-xs border-teal-500/30 text-teal-600 dark:text-teal-400" data-testid="badge-no-subscriptions">
              Pricing That Makes Sense
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight" data-testid="text-no-subscriptions-title">
              Zero subscriptions. Zero seat licences.
              <br />
              <span className="bg-gradient-to-r from-teal-500 to-emerald-500 bg-clip-text text-transparent">Just talk time.</span>
            </h2>
            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto leading-relaxed" data-testid="text-no-subscriptions-subtitle">
              Every other platform charges monthly subscriptions, per-seat fees, and hidden overage costs.
              GoRigo charges for one thing only: the minutes your AI actually works. Everything else is included.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            <Card className="border-rose-500/20 relative" data-testid="card-traditional-pricing">
              <CardContent className="p-7">
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex items-center justify-center w-10 h-10 rounded-md bg-rose-500/10">
                    <XCircle className="h-5 w-5 text-rose-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold" data-testid="text-traditional-title">Traditional Call Centre Software</h3>
                    <p className="text-xs text-muted-foreground">What everyone else charges</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    { text: "Monthly subscription per agent seat", cost: "from $150/seat/mo" },
                    { text: "Platform access fee", cost: "$500-2,000/mo" },
                    { text: "Overage charges on top", cost: "variable" },
                    { text: "Annual contract lock-in", cost: "12-24 months" },
                    { text: "Setup and onboarding fees", cost: "$1,000-5,000" },
                    { text: "Premium support add-on", cost: "$200-500/mo" },
                  ].map((item) => (
                    <div key={item.text} className="flex items-center justify-between gap-3 py-2 border-b border-border/40 last:border-0" data-testid={`row-traditional-${item.text.toLowerCase().replace(/\s+/g, "-").substring(0, 25)}`}>
                      <div className="flex items-center gap-2">
                        <XCircle className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                        <span className="text-sm">{item.text}</span>
                      </div>
                      <span className="text-xs text-rose-500 font-medium whitespace-nowrap">{item.cost}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-teal-500/30 relative" data-testid="card-gorigo-pricing">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-gradient-to-r from-teal-500 to-emerald-500 text-white border-0 px-4 py-1 text-xs shadow-sm" data-testid="badge-gorigo-approach">
                  The GoRigo Way
                </Badge>
              </div>
              <CardContent className="p-7 pt-8">
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex items-center justify-center w-10 h-10 rounded-md bg-teal-500/10">
                    <CircleDollarSign className="h-5 w-5 text-teal-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold" data-testid="text-gorigo-title">GoRigo Talk-Time Billing</h3>
                    <p className="text-xs text-muted-foreground">One metric. Total transparency.</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    { text: "No monthly subscription", detail: "ever" },
                    { text: "No per-seat or per-agent fees", detail: "unlimited agents" },
                    { text: "No setup or onboarding costs", detail: "go live free" },
                    { text: "No annual contracts", detail: "cancel anytime" },
                    { text: "No hidden overage charges", detail: "transparent rates" },
                    { text: "Support included at every tier", detail: "always" },
                  ].map((item) => (
                    <div key={item.text} className="flex items-center justify-between gap-3 py-2 border-b border-border/40 last:border-0" data-testid={`row-gorigo-${item.text.toLowerCase().replace(/\s+/g, "-").substring(0, 25)}`}>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-teal-500 shrink-0" />
                        <span className="text-sm">{item.text}</span>
                      </div>
                      <span className="text-xs text-teal-500 font-medium whitespace-nowrap">{item.detail}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border/50" data-testid="card-talk-time-includes">
            <CardContent className="p-7">
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold mb-1" data-testid="text-talk-time-includes-title">What does &ldquo;talk time&rdquo; cover?</h3>
                <p className="text-sm text-muted-foreground">One simple metric powers your entire platform. No separate charges.</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {[
                  { icon: Phone, label: "Inbound & outbound calls", sublabel: "AI voice conversations" },
                  { icon: Bot, label: "AI content generation", sublabel: "Scripts, emails, SMS drafts" },
                  { icon: MessageSquare, label: "Assistant queries", sublabel: "Rigo AI commands" },
                  { icon: BookOpen, label: "Knowledge processing", sublabel: "Document chunking & search" },
                  { icon: Mic, label: "Voice transcription", sublabel: "Call recordings to text" },
                ].map((item) => (
                  <div key={item.label} className="flex flex-col items-center text-center p-4 rounded-md bg-muted/40" data-testid={`item-talk-time-${item.label.toLowerCase().replace(/\s+/g, "-").substring(0, 20)}`}>
                    <item.icon className="h-5 w-5 text-teal-500 mb-2" />
                    <span className="text-sm font-medium leading-tight">{item.label}</span>
                    <span className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{item.sublabel}</span>
                  </div>
                ))}
              </div>
              <p className="text-center text-xs text-muted-foreground mt-5" data-testid="text-talk-time-note">
                Server infrastructure, storage, analytics dashboards, and compliance tools are GoRigo&apos;s cost — not yours.
                Your prepaid wallet is only deducted when the AI is actively working for you.
              </p>
            </CardContent>
          </Card>

          <div className="text-center mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 flex-wrap">
            <Link href="/register">
              <Button size="lg" data-testid="button-no-sub-start">
                Start Free — No Card Required
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/roi-calculator">
              <Button variant="outline" size="lg" data-testid="button-no-sub-roi">
                Calculate Your Savings
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-20 relative" data-testid="section-industries">
        <div className="absolute inset-0 bg-gradient-to-b from-muted/30 to-transparent" />
        <div className="relative max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <Badge variant="outline" className="mb-4 px-3 py-1 text-xs border-amber-500/30 text-amber-600 dark:text-amber-400">
              Industries
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight" data-testid="text-industries-title">
              Built for
              <span className="bg-gradient-to-r from-amber-500 to-rose-500 bg-clip-text text-transparent"> every sector</span>
            </h2>
            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
              From financial services to healthcare, GoRigo adapts to your industry's specific workflows, compliance requirements, and customer expectations.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {industries.map((industry) => (
              <div
                key={industry.title}
                className="group relative p-6 rounded-md border border-border/50 hover-elevate"
                data-testid={`card-industry-${industry.title.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <div className={`absolute inset-0 rounded-md bg-gradient-to-br ${industry.gradient} opacity-0 group-hover:opacity-100 transition-opacity`} />
                <div className="relative">
                  <div className={`flex items-center justify-center w-11 h-11 rounded-md bg-gradient-to-br ${industry.gradient} mb-4`}>
                    <CustomIcon name={industry.customIcon} size={22} className={industry.iconColor} />
                  </div>
                  <h3 className="font-semibold mb-2">{industry.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {industry.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="pt-8 pb-20" data-testid="section-download-app">
        <div className="max-w-6xl mx-auto px-6">
          <div className="relative rounded-md border border-border/50 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-[#E8604C]/5 via-[#F09040]/5 to-[#F5A623]/5" />
            <div className="relative flex flex-col md:flex-row items-center gap-12 md:gap-16 p-8 md:p-12">
              <div className="flex-1 text-center md:text-left">
                <Badge variant="outline" className="mb-4 px-3 py-1 text-xs border-[#E8604C]/30 text-[#E8604C] dark:text-[#F5A623]">
                  Mobile App
                </Badge>
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4" data-testid="text-download-title">
                  Your call centre
                  <br />
                  <span className="bg-gradient-to-r from-[#E8604C] to-[#F5A623] bg-clip-text text-transparent">in your pocket</span>
                </h2>
                <p className="text-muted-foreground mb-8 max-w-md">
                  Manage agents, monitor live calls, check revenue, and control everything by voice or tap. 
                  Biometric security, offline support, and push notifications keep you in control anywhere.
                </p>

                <div className="flex flex-col gap-4 mb-8">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-[#E8604C] shrink-0" />
                    <span className="text-sm">Voice commands to manage your call centre hands-free</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-[#E8604C] shrink-0" />
                    <span className="text-sm">Face ID and fingerprint security with auto-lock</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-[#E8604C] shrink-0" />
                    <span className="text-sm">Real-time push alerts for low balance, fraud, and agent issues</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-[#E8604C] shrink-0" />
                    <span className="text-sm">Works offline — commands queue and sync when back online</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center md:items-start gap-3">
                  <a
                    href="#"
                    className="inline-flex items-center gap-3 rounded-md bg-foreground px-5 py-3 hover-elevate transition-transform"
                    data-testid="link-download-appstore"
                  >
                    <SiApple className="h-7 w-7 text-background" />
                    <div className="flex flex-col items-start">
                      <span className="text-[10px] leading-tight text-muted-foreground uppercase tracking-wide">Download on the</span>
                      <span className="text-base font-semibold leading-tight text-background -mt-0.5">App Store</span>
                    </div>
                  </a>
                  <a
                    href="#"
                    className="inline-flex items-center gap-3 rounded-md bg-foreground px-5 py-3 hover-elevate transition-transform"
                    data-testid="link-download-googleplay"
                  >
                    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none">
                      <path d="M3.609 1.814L13.793 12 3.609 22.186a.996.996 0 0 1-.609-.92V2.734a.996.996 0 0 1 .609-.92z" fill="#4285F4"/>
                      <path d="M17.727 8.268L5.25.87a1.004 1.004 0 0 0-.516-.13L13.793 12l3.934-3.732z" fill="#EA4335"/>
                      <path d="M17.727 15.732L13.793 12l3.934-3.732L21.15 10.5c.78.45.78 1.55 0 2l-3.423 3.232z" fill="#FBBC04"/>
                      <path d="M4.734 23.26a1.004 1.004 0 0 0 .516-.13l12.477-7.398L13.793 12 4.734 23.26z" fill="#34A853"/>
                    </svg>
                    <div className="flex flex-col items-start">
                      <span className="text-[10px] leading-tight text-muted-foreground uppercase tracking-wide">Get it on</span>
                      <span className="text-base font-semibold leading-tight text-background -mt-0.5">Google Play</span>
                    </div>
                  </a>
                </div>
              </div>

              <div className="relative shrink-0 hidden md:block" data-testid="phone-mockup">
                <div className="absolute -inset-4 bg-gradient-to-br from-[#E8604C]/20 via-[#F09040]/10 to-[#F5A623]/20 rounded-[3.5rem] blur-xl" />
                <div className="relative w-[260px] h-[520px] rounded-[3rem] border-[6px] border-foreground/90 bg-background shadow-2xl overflow-hidden">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-foreground/90 rounded-b-2xl" />
                  <div className="flex flex-col items-center justify-center h-full px-6">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#E8604C] to-[#F5A623] flex items-center justify-center shadow-lg mb-4">
                      <Phone className="h-8 w-8 text-white" />
                    </div>
                    <p className="text-lg font-semibold tracking-tight">GoRigo<span className="bg-gradient-to-r from-[#E8604C] to-[#F5A623] bg-clip-text text-transparent">.ai</span></p>
                    <p className="text-xs text-muted-foreground mt-1 text-center">AI Call Centre Engine</p>
                    <div className="mt-6 w-full space-y-2">
                      <div className="h-2 rounded-full bg-gradient-to-r from-[#E8604C]/30 to-[#F5A623]/20 w-full" />
                      <div className="h-2 rounded-full bg-gradient-to-r from-blue-500/20 to-violet-500/15 w-4/5" />
                      <div className="h-2 rounded-full bg-gradient-to-r from-amber-500/20 to-rose-500/15 w-3/5" />
                    </div>
                    <div className="mt-6 flex gap-2 w-full">
                      <div className="flex-1 h-9 rounded-md bg-[#E8604C]/10 flex items-center justify-center">
                        <div className="w-3 h-3 rounded-full bg-[#E8604C]/40" />
                      </div>
                      <div className="flex-1 h-9 rounded-md bg-blue-500/10 flex items-center justify-center">
                        <div className="w-3 h-3 rounded-full bg-blue-500/40" />
                      </div>
                      <div className="flex-1 h-9 rounded-md bg-violet-500/10 flex items-center justify-center">
                        <div className="w-3 h-3 rounded-full bg-violet-500/40" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <DeploymentPackages />

      <section className="py-20 relative" data-testid="section-cta">
        <div className="absolute inset-0 bg-gradient-to-br from-[#E8604C]/5 via-transparent to-[#F5A623]/5" />
        <div className="relative max-w-3xl mx-auto px-6 text-center">
          <Badge variant="outline" className="mb-4 px-3 py-1 text-xs border-[#E8604C]/30 text-[#E8604C] dark:text-[#F5A623]">
            Get Started Today
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4" data-testid="text-cta-title">
            Ready to transform your
            <br />
            <span className="bg-gradient-to-r from-[#E8604C] via-[#F09040] to-[#F5A623] bg-clip-text text-transparent">customer experience?</span>
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto leading-relaxed">
            Join businesses across 20 countries using GoRigo to deliver exceptional
            customer experiences at a fraction of the cost. Go live in under 5 minutes.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link href="/register">
              <Button size="lg" data-testid="button-cta-start">
                Start Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button variant="outline" size="lg" data-testid="button-cta-contact">
                Talk to Sales
              </Button>
            </Link>
          </div>
          <p className="text-xs text-muted-foreground mt-6">
            No credit card required. No long-term contracts. Cancel anytime.
          </p>
        </div>
      </section>

      <Footer />
    </>
  );
}
