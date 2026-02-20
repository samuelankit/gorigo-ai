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
  Mic,
  Bell,
  StickyNote,
  CalendarCheck,
  BarChart3,
  Brain,
  FileText,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Clock,
  Shield,
  BadgePoundSterling,
  MessageSquare,
  X,
} from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Rigo \u2014 Your AI Assistant That Works for Free | GoRigo.ai",
  description:
    "Meet Rigo, your voice-powered AI assistant built into every GoRigo account. Set reminders, take notes, schedule follow-ups, get daily briefings, and manage your entire call centre by voice. Productivity features are completely free \u2014 no wallet deduction.",
  alternates: {
    canonical: "/rigo",
  },
  openGraph: {
    title: "Rigo \u2014 Your AI Assistant That Works for Free | GoRigo.ai",
    description:
      "Meet Rigo, your voice-powered AI assistant. Set reminders, take notes, schedule follow-ups, get daily briefings, and manage your call centre by voice. Productivity tools are completely free.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Rigo \u2014 Your AI Assistant That Works for Free | GoRigo.ai",
    description:
      "Meet Rigo, your voice-powered AI assistant. Set reminders, take notes, schedule follow-ups, get daily briefings, and manage your call centre by voice. Productivity tools are completely free.",
  },
};

const freeTools = [
  {
    icon: Bell,
    title: "Smart Reminders",
    description:
      "Tell Rigo to remind you about anything and he will. \"Remind me to call John at 3pm.\" \"Remind me to review the campaign tomorrow morning.\" He understands natural time expressions \u2014 in 20 minutes, next week, at 9am \u2014 and will notify you when the moment arrives.",
    examples: [
      "Remind me to follow up on the proposal in 2 hours",
      "Set a reminder for Monday at 9am to check the weekly report",
      "List my reminders",
      "Complete reminder 1",
    ],
  },
  {
    icon: StickyNote,
    title: "Voice Notes",
    description:
      "Capture thoughts, observations, and details the moment they matter \u2014 without opening an app, finding a pen, or switching tabs. Just speak, and Rigo saves it with intelligent auto-tagging. Every note is searchable and timestamped.",
    examples: [
      "Note that the customer wants a quote for 50 units",
      "Jot down that the Manchester office prefers morning calls",
      "Show my notes",
    ],
  },
  {
    icon: CalendarCheck,
    title: "Follow-Up Scheduling",
    description:
      "Never let a lead go cold. Tell Rigo who to follow up with, when, and why. He tracks the contact name, phone number, reason, and due date \u2014 then reminds you when it is time. Your follow-up pipeline stays organised without a CRM.",
    examples: [
      "Follow up with Sarah tomorrow about the contract renewal",
      "Schedule a callback with 07700 900123 next week",
      "List my follow-ups",
      "Complete follow-up 2",
    ],
  },
  {
    icon: BarChart3,
    title: "Daily Briefings",
    description:
      "Start every day with clarity. Ask Rigo for your briefing and he will summarise yesterday\u2019s call volume, how many were answered versus missed, your average call duration, pending follow-ups, overdue reminders, wallet balance, and agent count \u2014 all in one spoken summary.",
    examples: [
      "Give me my briefing",
      "How did we do yesterday?",
      "Brief me on today",
    ],
  },
];

const aiFeatures = [
  {
    icon: Mic,
    title: "Voice-First Control",
    description:
      "Check your call stats, wallet balance, agent status, and campaign performance entirely by voice. No need to log in, navigate menus, or squint at dashboards. Just ask.",
  },
  {
    icon: Brain,
    title: "Conversation Memory",
    description:
      "Rigo remembers your conversations across sessions. Close the browser, come back tomorrow, and pick up where you left off. No context is lost \u2014 he knows what you discussed and what you need.",
  },
  {
    icon: FileText,
    title: "After-Call Summaries",
    description:
      "Every call with a transcript gets an automatic AI-generated summary \u2014 2 to 3 sentences covering the caller\u2019s intent, the outcome, and any follow-up actions. Review dozens of calls in minutes instead of hours.",
  },
  {
    icon: Sparkles,
    title: "Content Drafting",
    description:
      "Ask Rigo to generate call scripts, email templates, SMS messages, or FAQ answers. He drafts them using your business knowledge base, scores them for quality, and saves them to your library for review.",
  },
  {
    icon: MessageSquare,
    title: "Proactive Alerts",
    description:
      "When a reminder comes due, Rigo surfaces it naturally during your next interaction. He also warns you when your wallet balance is running low, ensuring you never miss a beat.",
  },
  {
    icon: Shield,
    title: "Grounded in Your Data",
    description:
      "Rigo never makes up numbers. Every statistic, every balance, every call count is pulled live from your account. What he tells you is what your dashboard would show \u2014 he just says it faster.",
  },
];

const comparisonPoints = [
  { feature: "Set reminders by voice", rigo: true, traditional: false },
  { feature: "Take notes hands-free", rigo: true, traditional: false },
  { feature: "Schedule follow-ups by speaking", rigo: true, traditional: false },
  { feature: "Daily briefings on demand", rigo: true, traditional: false },
  { feature: "Conversation memory across sessions", rigo: true, traditional: false },
  { feature: "After-call AI summaries", rigo: true, traditional: false },
  { feature: "Check stats without logging in", rigo: true, traditional: false },
  { feature: "Cost for productivity features", rigo: "Free", traditional: "Varies" },
];

export default function RigoPage() {
  return (
    <PublicLayout>
      <div className="min-h-screen bg-background" data-testid="page-rigo">
        <WebPageJsonLd
          title="Rigo \u2014 AI Voice Assistant for Call Centre Management"
          description="Rigo is a voice-powered AI assistant built into GoRigo. Set reminders, take notes, schedule follow-ups, get daily briefings, and manage your call centre by voice. Productivity tools are completely free."
          url="/rigo"
        />
        <BreadcrumbJsonLd
          items={[
            { name: "Home", url: "/" },
            { name: "Rigo", url: "/rigo" },
          ]}
        />
        <Navbar />

        <Breadcrumbs items={[{ label: "Rigo" }]} />

        <section className="relative" data-testid="section-rigo-hero">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.08),transparent_60%)]" />
          <div className="relative max-w-5xl mx-auto px-6 pt-28 pb-16 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 mb-8">
              <BadgePoundSterling className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Productivity features are completely free</span>
            </div>

            <h1
              className="text-4xl sm:text-5xl lg:text-6xl font-light tracking-tight leading-[1.1]"
              data-testid="text-rigo-hero-title"
            >
              Meet Rigo.{" "}
              <span className="bg-gradient-to-r from-[#E8604C] to-[#F5A623] bg-clip-text text-transparent">
                Your AI Assistant
              </span>{" "}
              That Never Clocks Off.
            </h1>
            <p
              className="mt-6 text-lg sm:text-xl text-muted-foreground font-light max-w-3xl mx-auto leading-relaxed"
              data-testid="text-rigo-hero-subtitle"
            >
              Rigo is built into every GoRigo account. He manages your reminders,
              takes your notes, tracks your follow-ups, and briefs you every morning
              &mdash; all by voice, all completely free. The productivity tools that
              most platforms charge extra for? Rigo includes them at no cost.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button asChild size="lg">
                <Link href="/register" data-testid="link-rigo-get-started">
                  Try Rigo Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" asChild size="lg">
                <Link href="/capabilities" data-testid="link-rigo-capabilities">
                  View All Capabilities
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="py-8 border-y border-border/50 bg-muted/30" data-testid="section-rigo-stats">
          <div className="max-w-5xl mx-auto px-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: "Free Features", value: "9+", icon: Sparkles },
                { label: "Wallet Cost", value: "\u00a30.00", icon: BadgePoundSterling },
                { label: "Voice Languages", value: "12+", icon: Mic },
                { label: "Memory", value: "Persistent", icon: Brain },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="flex flex-col items-center text-center gap-1"
                  data-testid={`stat-rigo-${stat.label.toLowerCase().replace(/\s+/g, "-")}`}
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

        <section className="py-20" data-testid="section-free-tools">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
              <p className="text-sm font-medium tracking-widest uppercase text-primary mb-4">
                Free Productivity Tools
              </p>
              <h2 className="text-3xl sm:text-4xl font-light tracking-tight leading-tight">
                Four Tools. Zero Cost. Unlimited Use.
              </h2>
              <p className="mt-4 text-lg text-muted-foreground font-light max-w-2xl mx-auto leading-relaxed">
                Most AI assistants charge for every interaction. Rigo&rsquo;s productivity
                tools are free because they make you more effective &mdash; and effective
                users are happy users. Simple as that.
              </p>
            </div>

            <div className="grid gap-12 lg:gap-16">
              {freeTools.map((tool, index) => {
                const isReversed = index % 2 !== 0;
                return (
                  <div
                    key={tool.title}
                    className={`flex flex-col gap-8 lg:gap-14 ${
                      isReversed ? "lg:flex-row-reverse" : "lg:flex-row"
                    } items-start`}
                    data-testid={`tool-${tool.title.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <div className="w-full lg:w-1/2">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="flex items-center justify-center h-11 w-11 rounded-lg bg-primary/10">
                          <tool.icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="text-xl sm:text-2xl font-light tracking-tight">
                            {tool.title}
                          </h3>
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                            <BadgePoundSterling className="h-3 w-3" />
                            Always free
                          </span>
                        </div>
                      </div>
                      <p className="text-base text-muted-foreground leading-relaxed">
                        {tool.description}
                      </p>
                    </div>

                    <div className="w-full lg:w-1/2">
                      <div className="rounded-lg border border-border/60 bg-muted/30 p-5">
                        <p className="text-xs font-medium tracking-wider uppercase text-muted-foreground mb-3">
                          Try saying
                        </p>
                        <div className="flex flex-col gap-2.5">
                          {tool.examples.map((ex) => (
                            <div
                              key={ex}
                              className="flex items-start gap-3 text-sm text-foreground"
                            >
                              <Mic className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                              <span className="italic">&ldquo;{ex}&rdquo;</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="py-20 bg-muted/20 border-y border-border/50" data-testid="section-ai-features">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-14">
              <p className="text-sm font-medium tracking-widest uppercase text-primary mb-4">
                AI-Powered Capabilities
              </p>
              <h2 className="text-3xl sm:text-4xl font-light tracking-tight leading-tight">
                More Than an Assistant. A Co-Pilot.
              </h2>
              <p className="mt-4 text-lg text-muted-foreground font-light max-w-2xl mx-auto leading-relaxed">
                Beyond the free productivity tools, Rigo brings AI intelligence
                to your daily operations. He learns your patterns, remembers your
                context, and surfaces insights before you ask for them.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {aiFeatures.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-lg border border-border/60 bg-background p-6 flex flex-col gap-3"
                  data-testid={`feature-${feature.title.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-medium tracking-tight">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20" data-testid="section-how-it-works">
          <div className="max-w-4xl mx-auto px-6">
            <div className="text-center mb-14">
              <p className="text-sm font-medium tracking-widest uppercase text-primary mb-4">
                How It Works
              </p>
              <h2 className="text-3xl sm:text-4xl font-light tracking-tight leading-tight">
                Three Words. That Is All It Takes.
              </h2>
            </div>

            <div className="grid sm:grid-cols-3 gap-8">
              {[
                {
                  step: "01",
                  title: "Tap the Microphone",
                  description:
                    "Rigo lives in the bottom-right corner of your dashboard. One tap opens the voice assistant, ready to listen.",
                  icon: Mic,
                },
                {
                  step: "02",
                  title: "Speak Naturally",
                  description:
                    "No special commands or syntax. Talk the way you would to a colleague. \"How many calls did I get today?\" \"Remind me to check the pipeline at 4.\"",
                  icon: MessageSquare,
                },
                {
                  step: "03",
                  title: "Rigo Handles It",
                  description:
                    "He pulls your data, sets your reminder, saves your note, or generates your content. Then speaks the answer back to you in clear British English.",
                  icon: CheckCircle2,
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="flex flex-col items-center text-center gap-4"
                  data-testid={`step-${item.step}`}
                >
                  <div className="flex items-center justify-center h-14 w-14 rounded-full bg-primary/10">
                    <item.icon className="h-6 w-6 text-primary" />
                  </div>
                  <span className="text-xs font-medium tracking-widest uppercase text-primary">
                    Step {item.step}
                  </span>
                  <h3 className="text-lg font-medium tracking-tight">
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 bg-muted/20 border-y border-border/50" data-testid="section-comparison">
          <div className="max-w-4xl mx-auto px-6">
            <div className="text-center mb-14">
              <p className="text-sm font-medium tracking-widest uppercase text-primary mb-4">
                Why Rigo Is Different
              </p>
              <h2 className="text-3xl sm:text-4xl font-light tracking-tight leading-tight">
                What You Get That Others Charge For
              </h2>
              <p className="mt-4 text-lg text-muted-foreground font-light max-w-2xl mx-auto leading-relaxed">
                Most call centre platforms treat productivity tools as premium
                add-ons. We believe they should come standard.
              </p>
            </div>

            <div className="rounded-lg border border-border/60 bg-background overflow-hidden" role="table" aria-label="Feature comparison between Rigo and traditional platforms">
              <div className="grid grid-cols-3 gap-0 border-b border-border/60 bg-muted/50" role="row">
                <div className="p-4 text-sm font-medium text-muted-foreground" role="columnheader">Feature</div>
                <div className="p-4 text-sm font-medium text-center text-primary border-x border-border/60" role="columnheader">Rigo</div>
                <div className="p-4 text-sm font-medium text-center text-muted-foreground" role="columnheader">Traditional</div>
              </div>
              {comparisonPoints.map((row, i) => (
                <div
                  key={row.feature}
                  role="row"
                  className={`grid grid-cols-3 gap-0 ${
                    i < comparisonPoints.length - 1 ? "border-b border-border/40" : ""
                  }`}
                  data-testid={`comparison-row-${i}`}
                >
                  <div className="p-4 text-sm text-foreground flex items-center" role="rowheader">
                    {row.feature}
                  </div>
                  <div className="p-4 flex items-center justify-center border-x border-border/40" role="cell">
                    {typeof row.rigo === "boolean" ? (
                      <CheckCircle2 className="h-5 w-5 text-primary" aria-label="Included" />
                    ) : (
                      <span className="text-sm font-medium text-primary">{row.rigo}</span>
                    )}
                  </div>
                  <div className="p-4 flex items-center justify-center" role="cell">
                    {typeof row.traditional === "boolean" ? (
                      <X className="h-5 w-5 text-muted-foreground/40" aria-label="Not included" />
                    ) : (
                      <span className="text-sm text-muted-foreground">{row.traditional}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20" data-testid="section-pricing-clarity">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <p className="text-sm font-medium tracking-widest uppercase text-primary mb-4">
              Transparent Pricing
            </p>
            <h2 className="text-3xl sm:text-4xl font-light tracking-tight leading-tight mb-6">
              What Costs Money. What Does Not.
            </h2>

            <div className="grid sm:grid-cols-2 gap-6 mt-10 max-w-3xl mx-auto">
              <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-6 text-left">
                <div className="flex items-center gap-2 mb-4">
                  <BadgePoundSterling className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-medium text-primary">Always Free</h3>
                </div>
                <ul className="flex flex-col gap-2.5">
                  {[
                    "Set, list, and complete reminders",
                    "Take and view voice notes",
                    "Schedule and manage follow-ups",
                    "Daily briefings on demand",
                    "First greeting each session",
                    "Proactive reminder alerts",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-foreground">
                      <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-lg border border-border/60 bg-background p-6 text-left">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <h3 className="text-lg font-medium">Uses Talk Time</h3>
                </div>
                <ul className="flex flex-col gap-2.5">
                  {[
                    "General questions and analytics",
                    "Content drafting (scripts, emails, SMS)",
                    "Complex AI reasoning and advice",
                    "Campaign management queries",
                    "Troubleshooting guidance",
                    "Platform navigation help",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4 text-muted-foreground/60 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <p className="mt-8 text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Paid interactions cost one talk-time unit (equivalent to 30 seconds)
              from your prepaid wallet. At standard rates, that is as little as 4p
              per interaction. Your first greeting each session is always free.
            </p>
          </div>
        </section>

        <ConversionCta
          headline="Start Using Rigo Today"
          subheadline="Create your GoRigo account and Rigo is ready immediately. No setup, no configuration, no extra charge. Just tap the microphone and start talking."
          talkToAiMessage="Talk to Rigo now"
        />

        <Footer />
      </div>
    </PublicLayout>
  );
}
