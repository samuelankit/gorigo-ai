import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { PublicLayout } from "@/components/public-layout";
import { DeploymentPackages } from "@/components/landing/deployment-packages";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { OrganizationJsonLd, WebPageJsonLd, SoftwareApplicationJsonLd } from "@/components/seo/json-ld";
import { CustomIcon } from "@/components/ui/custom-icon";
import { WebCallButton } from "@/components/landing/web-call-button";
import { SiApple, SiGoogleplay } from "react-icons/si";
import { TalkTimeInfo } from "@/components/talk-time-info";
import {
  ArrowRight,
  Activity,
  MessageCircle,
} from "lucide-react";

const features = [
  {
    customIcon: "ai-voice-head",
    title: "AI-Powered Agents",
    href: "/features/ai-agents",
    description:
      "Deploy intelligent voice agents that handle inbound and outbound calls with natural, human-like conversation.",
  },
  {
    customIcon: "vr-phone-mic",
    title: "24/7 Call Handling",
    href: "/features/call-handling",
    description:
      "Never miss a call. Your AI agents work around the clock, handling enquiries, bookings, and support requests.",
  },
  {
    customIcon: "vr-voice-lock",
    title: "Globally Compliant",
    href: "/features/compliance",
    description:
      "Per-country DNC registries, calling hours enforcement, AI disclosure in 12 languages, and PII redaction. Compliant across 20 countries from day one.",
  },
  {
    customIcon: "vr-waveform-scan",
    title: "Real-Time Analytics",
    href: "/features/analytics",
    description:
      "Live dashboards with call quality scoring, sentiment analysis, and actionable insights to improve every interaction.",
  },
  {
    customIcon: "vr-voice-chat",
    title: "20 Countries, 12+ Languages",
    href: "/features/multi-language",
    description:
      "Call internationally across 20 countries. AI agents detect languages, adapt to accents, and handle multilingual conversations naturally.",
  },
  {
    customIcon: "vr-speaking",
    title: "Pay Per Talk Time",
    href: "/features/pay-per-talk-time",
    description:
      "No seat licences. No subscriptions. Only pay for the minutes your AI agents spend on actual calls.",
  },
];

const steps = [
  {
    number: "1",
    title: "Configure",
    description:
      "Set up your AI agent's persona, knowledge base, and call handling rules through our dashboard. No coding required.",
    customIcon: "ai-voice-setting",
  },
  {
    number: "2",
    title: "Connect",
    description:
      "Link your existing business number or get a new one. Your AI agent starts handling calls immediately.",
    customIcon: "vr-voice-signal",
  },
  {
    number: "3",
    title: "Monitor",
    description:
      "Track every call in real time. Review transcripts, quality scores, and analytics to continuously improve.",
    customIcon: "ai-voice-record",
  },
];

const industries = [
  {
    customIcon: "industry-financial",
    title: "Financial Services",
    description: "Account enquiries, loan applications, fraud alerts, and appointment scheduling.",
  },
  {
    customIcon: "industry-retail",
    title: "Retail & E-Commerce",
    description: "Order tracking, returns processing, product recommendations, and customer support.",
  },
  {
    customIcon: "industry-telecoms",
    title: "Telecoms",
    description: "Service activations, billing enquiries, technical support, and plan upgrades.",
  },
  {
    customIcon: "industry-travel",
    title: "Travel & Hospitality",
    description: "Booking management, itinerary changes, loyalty programmes, and concierge services.",
  },
  {
    customIcon: "industry-healthcare",
    title: "Healthcare",
    description: "Appointment booking, prescription refills, patient follow-ups, and triage assistance.",
  },
  {
    customIcon: "industry-professional",
    title: "Professional Services",
    description: "Client intake, scheduling, follow-ups, and after-hours reception for law firms, agencies, and consultancies.",
  },
];



export default function HomePage() {
  return (
    <PublicLayout>
    <div className="min-h-screen bg-background" data-testid="page-home">
      <OrganizationJsonLd />
      <WebPageJsonLd 
        title="GoRigo - Run Your AI Call Center From Your Phone | 24/7 Voice Agents" 
        description="Run and manage your entire AI call center from your phone. Deploy intelligent voice agents, monitor calls, and control everything by voice. Pay only for talk time." 
        url="/" 
      />
      <SoftwareApplicationJsonLd />
      <Navbar />

      <section className="relative" data-testid="section-hero">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.08),transparent_60%)]" />
        <div className="relative max-w-6xl mx-auto px-6 pt-12 sm:pt-28 pb-16 sm:pb-24">
          <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
              <p
                className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-4 sm:mb-6"
                data-testid="text-hero-label"
              >
                AI Call Centre Engine
              </p>
              <h1
                className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]"
                data-testid="text-hero-title"
              >
                Run Your AI Call Center
                <br />
                <span className="font-light">From Your Phone</span>
              </h1>
              <p
                className="mt-4 sm:mt-6 text-base sm:text-lg text-muted-foreground max-w-xl leading-relaxed"
                data-testid="text-hero-subtitle"
              >
                Deploy AI-powered voice agents that handle calls with human-like
                conversations. Manage everything by voice from your mobile.
                No subscriptions — pay only for talk time<TalkTimeInfo />.
              </p>

              <div className="mt-6 sm:mt-10 flex flex-col sm:flex-row items-center gap-4 flex-wrap" data-testid="hero-talk-to-ai">
                <a
                  href="tel:+440000000000"
                  data-testid="link-hero-call-ai"
                  className="inline-flex items-center gap-3 rounded-full bg-white px-5 py-2.5 shadow-sm hover-elevate dark:bg-white sm:hidden"
                >
                  <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-primary">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/40" />
                    <CustomIcon name="phone-call" size={22} className="relative text-primary-foreground" />
                  </span>
                  <span className="flex flex-col items-start">
                    <span className="text-base font-semibold tracking-tight text-gray-900">Talk to Our AI</span>
                    <span className="text-sm text-gray-500">+44 (0) 000 000 0000</span>
                  </span>
                </a>
                <WebCallButton />
                <span className="inline-flex items-center gap-2 text-sm font-medium text-primary" data-testid="text-hero-availability">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
                  </span>
                  Available 24/7
                </span>
              </div>

              <div className="mt-4 sm:mt-6 flex items-center justify-center gap-3 flex-wrap">
                <Link href="/contact">
                  <Button size="lg" data-testid="button-hero-demo">
                    Book a Demo
                  </Button>
                </Link>
              </div>
          </div>
        </div>
      </section>

      <section className="pt-8 pb-24 bg-white dark:bg-background" data-testid="section-download-app">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center gap-12 md:gap-16">
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-3xl sm:text-4xl font-light tracking-tight mb-4" data-testid="text-download-title">
                Download the App Today
              </h2>
              <p className="text-muted-foreground mb-8 max-w-md">
                Run your AI call center from anywhere. Manage agents, monitor calls, and track revenue — all from your phone.
              </p>

              <div className="flex flex-col sm:flex-row items-center md:items-start gap-3 mb-8">
                <Button asChild size="lg" data-testid="link-download-appstore">
                  <a href="#">
                    <SiApple className="h-5 w-5" />
                    App Store
                  </a>
                </Button>
                <Button asChild size="lg" data-testid="link-download-googleplay">
                  <a href="#">
                    <SiGoogleplay className="h-5 w-5" />
                    Google Play
                  </a>
                </Button>
              </div>

              <div className="flex flex-col sm:flex-row items-center md:items-start gap-4">
                <div className="flex items-center justify-center w-24 h-24 rounded-lg border bg-background p-2" data-testid="qr-code-placeholder">
                  <svg viewBox="0 0 100 100" className="w-full h-full text-foreground">
                    <rect x="5" y="5" width="30" height="30" rx="2" fill="currentColor" />
                    <rect x="10" y="10" width="20" height="20" rx="1" fill="none" stroke="currentColor" strokeWidth="3" />
                    <rect x="16" y="16" width="8" height="8" fill="currentColor" />
                    <rect x="65" y="5" width="30" height="30" rx="2" fill="currentColor" />
                    <rect x="70" y="10" width="20" height="20" rx="1" fill="none" stroke="currentColor" strokeWidth="3" />
                    <rect x="76" y="16" width="8" height="8" fill="currentColor" />
                    <rect x="5" y="65" width="30" height="30" rx="2" fill="currentColor" />
                    <rect x="10" y="70" width="20" height="20" rx="1" fill="none" stroke="currentColor" strokeWidth="3" />
                    <rect x="16" y="76" width="8" height="8" fill="currentColor" />
                    <rect x="40" y="5" width="5" height="5" fill="currentColor" />
                    <rect x="50" y="5" width="5" height="5" fill="currentColor" />
                    <rect x="40" y="15" width="5" height="5" fill="currentColor" />
                    <rect x="50" y="20" width="5" height="5" fill="currentColor" />
                    <rect x="40" y="30" width="5" height="5" fill="currentColor" />
                    <rect x="5" y="40" width="5" height="5" fill="currentColor" />
                    <rect x="15" y="45" width="5" height="5" fill="currentColor" />
                    <rect x="25" y="40" width="5" height="5" fill="currentColor" />
                    <rect x="40" y="40" width="5" height="5" fill="currentColor" />
                    <rect x="50" y="45" width="5" height="5" fill="currentColor" />
                    <rect x="60" y="40" width="5" height="5" fill="currentColor" />
                    <rect x="70" y="45" width="5" height="5" fill="currentColor" />
                    <rect x="80" y="40" width="5" height="5" fill="currentColor" />
                    <rect x="90" y="45" width="5" height="5" fill="currentColor" />
                    <rect x="5" y="55" width="5" height="5" fill="currentColor" />
                    <rect x="20" y="55" width="5" height="5" fill="currentColor" />
                    <rect x="45" y="55" width="5" height="5" fill="currentColor" />
                    <rect x="55" y="55" width="5" height="5" fill="currentColor" />
                    <rect x="65" y="65" width="5" height="5" fill="currentColor" />
                    <rect x="75" y="70" width="5" height="5" fill="currentColor" />
                    <rect x="85" y="65" width="5" height="5" fill="currentColor" />
                    <rect x="65" y="80" width="5" height="5" fill="currentColor" />
                    <rect x="80" y="80" width="5" height="5" fill="currentColor" />
                    <rect x="90" y="90" width="5" height="5" fill="currentColor" />
                    <rect x="65" y="90" width="5" height="5" fill="currentColor" />
                    <rect x="75" y="85" width="5" height="5" fill="currentColor" />
                  </svg>
                </div>
                <div className="text-center md:text-left">
                  <p className="text-sm font-medium">Scan to download</p>
                  <p className="text-xs text-muted-foreground mt-1">Point your camera at the QR code</p>
                </div>
              </div>
            </div>

            <div className="relative shrink-0" data-testid="phone-mockup">
              <div className="relative w-[260px] h-[520px] rounded-[3rem] border-[6px] border-foreground/90 bg-background shadow-xl overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-foreground/90 rounded-b-2xl" />
                <div className="flex flex-col items-center justify-center h-full px-6">
                  <img src="/logo.png" alt="GoRigo" className="w-20 h-20 rounded-2xl shadow-lg mb-4 object-contain" />
                  <p className="text-lg font-semibold tracking-tight">GoRigo<span className="text-primary">.ai</span></p>
                  <p className="text-xs text-muted-foreground mt-1 text-center">AI Call Centre Engine</p>
                  <div className="mt-6 w-full space-y-2">
                    <div className="h-2 rounded-full bg-primary/20 w-full" />
                    <div className="h-2 rounded-full bg-primary/10 w-4/5" />
                    <div className="h-2 rounded-full bg-primary/10 w-3/5" />
                  </div>
                  <div className="mt-6 flex gap-2 w-full">
                    <div className="flex-1 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <div className="w-3 h-3 rounded-full bg-primary/40" />
                    </div>
                    <div className="flex-1 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <div className="w-3 h-3 rounded-full bg-primary/40" />
                    </div>
                    <div className="flex-1 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <div className="w-3 h-3 rounded-full bg-primary/40" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24" data-testid="section-features" id="features">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-16">
            <p className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-3">
              Capabilities
            </p>
            <h2 className="text-3xl sm:text-4xl font-light tracking-tight" data-testid="text-features-title">
              Everything you need to run
              <br />
              <span className="font-normal">an AI call centre</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border/50 rounded-md overflow-hidden border border-border/50">
            {features.map((feature) => (
              <Link
                key={feature.title}
                href={feature.href}
                className="bg-background p-8 group"
                data-testid={`card-feature-${feature.title.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <div className="flex items-start gap-3 mb-3">
                  <CustomIcon name={feature.customIcon} size={28} className="text-primary shrink-0 mt-0.5" />
                  <div className="flex items-start justify-between gap-2 flex-1 min-w-0">
                    <h3 className="font-medium text-base">{feature.title}</h3>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1 shrink-0" />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 border-t border-border/50" data-testid="section-how-it-works">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-16">
            <p className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-3">
              How It Works
            </p>
            <h2 className="text-3xl sm:text-4xl font-light tracking-tight" data-testid="text-how-title">
              Three steps to go live
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {steps.map((step) => (
              <Card key={step.number} data-testid={`step-${step.number}`}>
                <CardContent className="p-8">
                  <div className="flex items-center gap-4 mb-6">
                    <span className="text-3xl font-light text-muted-foreground/40">{step.number}</span>
                    <div className="h-px flex-1 bg-border/50" />
                    <CustomIcon name={step.customIcon} size={22} className="text-[#2DD4A8]" />
                  </div>
                  <h3 className="font-medium text-lg mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 border-t border-border/50" data-testid="section-industries">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-16">
            <p className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-3">
              Industries
            </p>
            <h2 className="text-3xl sm:text-4xl font-light tracking-tight" data-testid="text-industries-title">
              Built for every sector
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {industries.map((industry) => (
              <div
                key={industry.title}
                className="group p-6 rounded-md border border-border/50 hover-elevate"
                data-testid={`card-industry-${industry.title.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-md bg-[#2DD4A8]/10 mb-4">
                  <CustomIcon name={industry.customIcon} size={22} className="text-[#2DD4A8]" />
                </div>
                <h3 className="font-medium mb-1.5">{industry.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {industry.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <DeploymentPackages />

      <section className="py-24 border-t border-border/50" data-testid="section-cta">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-light tracking-tight mb-4" data-testid="text-cta-title">
            Ready to get started?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            Join businesses across 20 countries using GoRigo to deliver better
            customer experiences at a fraction of the cost.
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
            No credit card required. Set up in under 5 minutes.
          </p>
        </div>
      </section>

      <Footer />
    </div>
    </PublicLayout>
  );
}
