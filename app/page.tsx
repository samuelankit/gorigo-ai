import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { PublicLayout } from "@/components/public-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { OrganizationJsonLd, WebPageJsonLd, SoftwareApplicationJsonLd } from "@/components/seo/json-ld";
import {
  Phone,
  Bot,
  Shield,
  BarChart3,
  Globe,
  Zap,
  ArrowRight,
  CheckCircle2,
  Building2,
  ShoppingCart,
  Plane,
  Stethoscope,
  Landmark,
  Wifi,
  Headphones,
  Activity,
  Lock,
} from "lucide-react";

const features = [
  {
    icon: Bot,
    title: "AI-Powered Agents",
    href: "/features/ai-agents",
    description:
      "Deploy intelligent voice agents that handle inbound and outbound calls with natural, human-like conversation.",
  },
  {
    icon: Phone,
    title: "24/7 Call Handling",
    href: "/features/call-handling",
    description:
      "Never miss a call. Your AI agents work around the clock, handling enquiries, bookings, and support requests.",
  },
  {
    icon: Shield,
    title: "Globally Compliant",
    href: "/features/compliance",
    description:
      "Per-country DNC registries, calling hours enforcement, AI disclosure in 12 languages, and PII redaction. Compliant across 20 countries from day one.",
  },
  {
    icon: BarChart3,
    title: "Real-Time Analytics",
    href: "/features/analytics",
    description:
      "Live dashboards with call quality scoring, sentiment analysis, and actionable insights to improve every interaction.",
  },
  {
    icon: Globe,
    title: "20 Countries, 12+ Languages",
    href: "/features/multi-language",
    description:
      "Call internationally across 20 countries. AI agents detect languages, adapt to accents, and handle multilingual conversations naturally.",
  },
  {
    icon: Zap,
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
    icon: Bot,
    color: "text-teal-500",
  },
  {
    number: "2",
    title: "Connect",
    description:
      "Link your existing business number or get a new one. Your AI agent starts handling calls immediately.",
    icon: Phone,
    color: "text-cyan-500",
  },
  {
    number: "3",
    title: "Monitor",
    description:
      "Track every call in real time. Review transcripts, quality scores, and analytics to continuously improve.",
    icon: Activity,
    color: "text-violet-500",
  },
];

const industries = [
  {
    icon: Landmark,
    title: "Financial Services",
    description: "Account enquiries, loan applications, fraud alerts, and appointment scheduling.",
    color: "text-blue-500",
  },
  {
    icon: ShoppingCart,
    title: "Retail & E-Commerce",
    description: "Order tracking, returns processing, product recommendations, and customer support.",
    color: "text-orange-500",
  },
  {
    icon: Wifi,
    title: "Telecoms",
    description: "Service activations, billing enquiries, technical support, and plan upgrades.",
    color: "text-violet-500",
  },
  {
    icon: Plane,
    title: "Travel & Hospitality",
    description: "Booking management, itinerary changes, loyalty programmes, and concierge services.",
    color: "text-amber-500",
  },
  {
    icon: Stethoscope,
    title: "Healthcare",
    description: "Appointment booking, prescription refills, patient follow-ups, and triage assistance.",
    color: "text-rose-500",
  },
  {
    icon: Building2,
    title: "Professional Services",
    description: "Client intake, scheduling, follow-ups, and after-hours reception for law firms, agencies, and consultancies.",
    color: "text-purple-500",
  },
];

const packages = [
  {
    name: "Managed",
    description: "We handle everything. You focus on your business.",
    highlights: [
      "Fully managed AI agents",
      "Dedicated account manager",
      "Custom integrations",
      "Priority support",
    ],
    cta: "Book a Demo",
    href: "/contact",
  },
  {
    name: "Bring Your Own Key",
    description: "Use your own AI provider keys with our engine.",
    highlights: [
      "Your own API keys",
      "Full engine access",
      "Lower per-minute costs",
      "Self-service setup",
    ],
    cta: "Get Started",
    href: "/register",
    featured: true,
  },
  {
    name: "Self-Hosted",
    description: "Deploy on your own infrastructure with full control.",
    highlights: [
      "On-premise deployment",
      "Complete data sovereignty",
      "Custom SLAs",
      "Enterprise support",
    ],
    cta: "Contact Sales",
    href: "/contact",
  },
  {
    name: "Custom",
    description: "Tailored solution built around your exact requirements.",
    highlights: [
      "Bespoke configuration",
      "Custom billing rates",
      "Dedicated onboarding",
      "Negotiated SLAs",
    ],
    cta: "Contact Sales",
    href: "/contact",
  },
];

const capabilities = [
  { icon: Headphones, label: "Voice AI", color: "text-teal-500" },
  { icon: Globe, label: "20 Countries", color: "text-amber-500" },
  { icon: Shield, label: "Compliance", color: "text-blue-500" },
  { icon: BarChart3, label: "Analytics", color: "text-violet-500" },
  { icon: Lock, label: "Data Security", color: "text-rose-500" },
  { icon: Zap, label: "Pay-Per-Use", color: "text-emerald-500" },
];

export default function HomePage() {
  return (
    <PublicLayout>
    <div className="min-h-screen bg-background" data-testid="page-home">
      <OrganizationJsonLd />
      <WebPageJsonLd 
        title="GoRigo - AI Call Centre Platform | 24/7 Voice Agents" 
        description="AI-powered call centre platform by International Business Exchange Limited. Deploy intelligent voice agents that handle calls 24/7. Pay only for talk time. UK compliant." 
        url="/" 
      />
      <SoftwareApplicationJsonLd />
      <Navbar />

      <section className="relative" data-testid="section-hero">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.08),transparent_60%)]" />
        <div className="relative max-w-6xl mx-auto px-6 pt-28 pb-24">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
            <div className="w-full lg:w-1/2 flex-shrink-0">
              <div className="rounded-md overflow-hidden border border-border/50 shadow-lg">
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="metadata"
                  className="w-full h-auto object-cover"
                  data-testid="video-hero-intro"
                >
                  <source src="/intro-video.mp4" type="video/mp4" />
                </video>
              </div>
            </div>
            <div className="w-full lg:w-1/2 text-center lg:text-left">
              <p
                className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-6"
                data-testid="text-hero-label"
              >
                AI Call Centre Engine
              </p>
              <h1
                className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]"
                data-testid="text-hero-title"
              >
                Your AI Call Center,
                <br />
                <span className="font-light">Ready in Minutes</span>
              </h1>
              <p
                className="mt-6 text-lg text-muted-foreground max-w-xl leading-relaxed"
                data-testid="text-hero-subtitle"
              >
                Deploy AI-powered voice agents that handle calls with human-like
                conversations. No subscriptions — pay only for talk time.
              </p>
              <div className="mt-8 flex items-center justify-center lg:justify-start gap-3 flex-wrap">
                <Link href="/register">
                  <Button size="lg" data-testid="button-hero-get-started">
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
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-border/50" data-testid="section-stats">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between gap-6 flex-wrap">
            {capabilities.map((cap) => (
              <div
                key={cap.label}
                className="flex items-center gap-2 text-muted-foreground"
                data-testid={`stat-${cap.label.toLowerCase().replace(/[^a-z]/g, "-")}`}
              >
                <cap.icon className={`h-4 w-4 ${cap.color}`} />
                <span className="text-sm">{cap.label}</span>
              </div>
            ))}
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
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium text-base mb-2">{feature.title}</h3>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1 shrink-0" />
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
                    <step.icon className={`h-5 w-5 ${step.color}`} />
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
                <industry.icon className={`h-5 w-5 ${industry.color} mb-4`} />
                <h3 className="font-medium mb-1.5">{industry.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {industry.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 border-t border-border/50" data-testid="section-pricing-preview">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-16">
            <p className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-3">
              Deployment
            </p>
            <h2 className="text-3xl sm:text-4xl font-light tracking-tight" data-testid="text-pricing-title">
              Choose how you deploy
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {packages.map((pkg) => (
              <Card
                key={pkg.name}
                className={pkg.featured ? "border-primary/40" : ""}
                data-testid={`card-package-${pkg.name.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <CardContent className="p-8">
                  {pkg.featured && (
                    <p className="text-xs font-medium tracking-widest uppercase text-primary mb-4">
                      Most Popular
                    </p>
                  )}
                  <h3 className="font-medium text-xl mb-2">{pkg.name}</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    {pkg.description}
                  </p>
                  <ul className="space-y-2.5 mb-8">
                    {pkg.highlights.map((h) => (
                      <li
                        key={h}
                        className="flex items-start gap-2 text-sm"
                      >
                        <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{h}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href={pkg.href}>
                    <Button
                      variant={pkg.featured ? "default" : "outline"}
                      className="w-full"
                      data-testid={`button-package-${pkg.name.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      {pkg.cta}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link href="/pricing">
              <Button variant="ghost" size="sm" data-testid="link-view-pricing">
                View full pricing details
                <ArrowRight className="ml-2 h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

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
