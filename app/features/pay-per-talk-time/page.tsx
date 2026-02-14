import type { Metadata } from "next";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Zap,
  Calculator,
  TrendingDown,
  Eye,
  ScaleIcon,
  Rocket,
  TreePine,
  Briefcase,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  Clock,
  DollarSign,
  Users,
  CalendarOff,
  Ban,
  X,
  Equal,
  Plus,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Pay Per Talk Time | GoRigo.ai",
  description:
    "No seat licences, no subscriptions, no per-agent fees. Only pay for the actual minutes your AI agents spend on calls. Transparent, predictable, and fair billing.",
  openGraph: {
    title: "Pay Per Talk Time | GoRigo.ai",
    description:
      "No seat licences, no subscriptions, no per-agent fees. Only pay for the actual minutes your AI agents spend on calls. Transparent, predictable, and fair billing.",
  },
};

const benefits = [
  {
    icon: Calculator,
    title: "Predictable Costs",
    color: "text-orange-500",
    description:
      "Your bill is directly tied to how many minutes your AI agents spend on calls. No surprises, no hidden charges, and no complex pricing tiers. You can forecast your costs accurately based on your expected call volume.",
  },
  {
    icon: ScaleIcon,
    title: "Scales Up and Down Automatically",
    color: "text-violet-500",
    description:
      "Busy month? You pay for more minutes. Quiet month? You pay for fewer. There is no need to add or remove seats, adjust licences, or renegotiate contracts. Your costs adjust naturally with your business activity.",
  },
  {
    icon: TrendingDown,
    title: "No Waste on Idle Time",
    color: "text-emerald-500",
    description:
      "Traditional call centres charge you for agents sitting idle between calls. With GoRigo, you are never paying for downtime. If your agents are not on a call, you are not being charged. Every penny goes towards actual customer interactions.",
  },
  {
    icon: Eye,
    title: "Transparent Billing",
    color: "text-sky-500",
    description:
      "Your dashboard shows exactly how many minutes have been used, broken down by agent, client, and time period. You can see your running total at any time and set spending limits to stay within your budget.",
  },
];

const useCases = [
  {
    icon: Rocket,
    title: "Startup with Low Volume",
    color: "text-emerald-500",
    scenario:
      "A small startup receives about 50 calls per month. With a traditional call centre, they would need to pay for at least one full-time agent seat, costing hundreds of pounds per month even when the phone is not ringing. With GoRigo, they pay only for the 50 calls they actually handle, keeping costs minimal while still delivering professional service.",
  },
  {
    icon: TreePine,
    title: "Seasonal Business",
    color: "text-green-500",
    scenario:
      "A retail business handles around 100 calls per month most of the year, but during the Christmas period, call volume surges to over 10,000. Instead of hiring temporary staff and paying for extra licences, GoRigo scales automatically. The business pays for 100 minutes in quiet months and 10,000 minutes in busy ones, with no setup changes required.",
  },
  {
    icon: Briefcase,
    title: "Agency Managing Multiple Clients",
    color: "text-purple-500",
    scenario:
      "A marketing agency manages call handling for 15 different clients. Each client has different call volumes and needs separate billing. GoRigo tracks talk time per client, generates individual usage reports, and allows the agency to bill each client accurately for their actual usage without any manual tracking or spreadsheets.",
  },
];

const faqs = [
  {
    question: "How is talk time calculated?",
    answer:
      "Talk time is calculated from the moment the AI agent begins speaking with a caller to the moment the call ends. Hold time, ring time, and post-call processing are not included in your billable minutes. You only pay for actual conversation time.",
  },
  {
    question: "Are there any hidden fees?",
    answer:
      "No. Your bill consists of talk time minutes at your agreed rate. There are no setup fees, no platform fees, no per-agent charges, and no minimum monthly commitments. What you see on your usage dashboard is what you pay.",
  },
  {
    question: "What are the rates?",
    answer:
      "Rates depend on your deployment model and volume. We offer competitive per-minute pricing that decreases as your volume increases. Contact our sales team for a personalised quote based on your expected usage, or visit our pricing page for published rate cards.",
  },
  {
    question: "Can I set spending limits?",
    answer:
      "Yes. You can set daily, weekly, or monthly spending caps through your dashboard. When you approach your limit, you will receive an alert. You can choose to automatically pause call handling when the limit is reached or simply receive a notification and continue operating.",
  },
  {
    question: "How does billing work for multiple clients?",
    answer:
      "If you manage multiple clients or brands, GoRigo tracks usage separately for each one. You can view individual client usage reports, set per-client spending limits, and export billing data for invoicing. This is particularly useful for agencies and resellers who need to bill their own customers accurately.",
  },
  {
    question: "Is there a minimum commitment?",
    answer:
      "No. There is no minimum monthly spend, no minimum contract term, and no minimum call volume. You can use GoRigo for a single call per month or ten thousand. You start paying from your first minute and stop when you stop using the service.",
  },
];

export default function PayPerTalkTimePage() {
  return (
    <div className="min-h-screen bg-background" data-testid="page-pay-per-talk-time">
      <Navbar />

      <section className="relative" data-testid="section-hero">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.06),transparent_60%)]" />
        <div className="relative max-w-5xl mx-auto px-6 pt-28 pb-20 text-center">
          <p className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-6" data-testid="badge-feature">
            Feature
          </p>
          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-light tracking-tight leading-[1.1]"
            data-testid="text-hero-title"
          >
            Pay Per Talk Time
          </h1>
          <p
            className="mt-4 text-xl text-muted-foreground font-light"
            data-testid="text-hero-subtitle"
          >
            Only Pay for Minutes That Matter
          </p>
          <p
            className="mt-6 text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed"
            data-testid="text-hero-intro"
          >
            Forget seat licences, monthly subscriptions, and per-agent fees. With GoRigo,
            you only pay for the actual minutes your AI agents spend talking to customers.
            No calls means no charges. It is the simplest, fairest way to run a call centre.
          </p>
        </div>
      </section>

      <section className="py-24 border-t border-border/50" data-testid="section-how-it-works">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-16">
            <p className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-3">
              How It Works
            </p>
            <h2 className="text-3xl font-light tracking-tight" data-testid="text-how-title">
              Traditional costs vs GoRigo
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8" data-testid="diagram-comparison">
            <div className="rounded-md border border-border/50 p-8" data-testid="diagram-traditional">
              <p className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-6">
                Traditional Call Centre
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center shrink-0">
                    <Users className="h-4 w-4 text-pink-500" />
                  </div>
                  <span className="text-sm">Agent Seats</span>
                </div>
                <div className="flex items-center justify-center">
                  <Plus className="h-4 w-4 text-muted-foreground/50" />
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center shrink-0">
                    <DollarSign className="h-4 w-4 text-orange-500" />
                  </div>
                  <span className="text-sm">Software Licences</span>
                </div>
                <div className="flex items-center justify-center">
                  <Plus className="h-4 w-4 text-muted-foreground/50" />
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center shrink-0">
                    <Clock className="h-4 w-4 text-rose-500" />
                  </div>
                  <span className="text-sm">Overtime Costs</span>
                </div>
                <div className="flex items-center justify-center">
                  <Plus className="h-4 w-4 text-muted-foreground/50" />
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center shrink-0">
                    <CalendarOff className="h-4 w-4 text-amber-500" />
                  </div>
                  <span className="text-sm">Holiday and Sick Pay</span>
                </div>
                <div className="flex items-center justify-center">
                  <Equal className="h-4 w-4 text-muted-foreground/50" />
                </div>
                <div className="rounded-md bg-muted p-4 text-center">
                  <p className="text-sm font-medium">High Fixed Cost</p>
                  <p className="text-xs text-muted-foreground mt-1">Paid whether phones ring or not</p>
                </div>
              </div>
            </div>

            <div className="rounded-md border border-primary/30 p-8" data-testid="diagram-gorigo">
              <p className="text-sm font-medium tracking-widest uppercase text-primary mb-6">
                GoRigo
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center shrink-0">
                    <Clock className="h-4 w-4 text-rose-500" />
                  </div>
                  <span className="text-sm">Actual Talk Minutes</span>
                </div>
                <div className="flex items-center justify-center">
                  <X className="h-4 w-4 text-muted-foreground/50" />
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center shrink-0">
                    <DollarSign className="h-4 w-4 text-orange-500" />
                  </div>
                  <span className="text-sm">Your Per-Minute Rate</span>
                </div>
                <div className="flex items-center justify-center">
                  <Equal className="h-4 w-4 text-muted-foreground/50" />
                </div>
                <div className="rounded-md bg-primary/10 border border-primary/20 p-4 text-center">
                  <p className="text-sm font-medium">What You Pay</p>
                  <p className="text-xs text-muted-foreground mt-1">Nothing more, nothing less</p>
                </div>

                <div className="pt-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Ban className="h-4 w-4 shrink-0" />
                    <span>No seat licences</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Ban className="h-4 w-4 shrink-0" />
                    <span>No monthly subscriptions</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Ban className="h-4 w-4 shrink-0" />
                    <span>No idle time charges</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 border-t border-border/50" data-testid="section-benefits">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-16">
            <p className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-3">
              Key Benefits
            </p>
            <h2 className="text-3xl font-light tracking-tight" data-testid="text-benefits-title">
              Why pay-per-minute makes sense
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {benefits.map((benefit) => (
              <Card
                key={benefit.title}
                data-testid={`card-benefit-${benefit.title.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <CardContent className="p-8">
                  <benefit.icon className={`h-5 w-5 ${benefit.color} mb-5`} />
                  <h3 className="font-medium text-lg mb-2">{benefit.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {benefit.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 border-t border-border/50" data-testid="section-use-cases">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-16">
            <p className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-3">
              Use Cases
            </p>
            <h2 className="text-3xl font-light tracking-tight" data-testid="text-use-cases-title">
              Real-world scenarios
            </h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {useCases.map((useCase) => (
              <Card
                key={useCase.title}
                data-testid={`card-usecase-${useCase.title.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <CardContent className="p-8">
                  <useCase.icon className={`h-5 w-5 ${useCase.color} mb-5`} />
                  <h3 className="font-medium text-lg mb-2">{useCase.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {useCase.scenario}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 border-t border-border/50" data-testid="section-faq">
        <div className="max-w-3xl mx-auto px-6">
          <div className="mb-16">
            <p className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-3">
              FAQ
            </p>
            <h2 className="text-3xl font-light tracking-tight" data-testid="text-faq-title">
              Common questions
            </h2>
          </div>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <details
                key={index}
                className="group rounded-md border border-border/50"
                data-testid={`faq-item-${index}`}
              >
                <summary className="flex items-center justify-between gap-4 cursor-pointer p-5 text-sm font-medium list-none">
                  {faq.question}
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 transition-transform group-open:rotate-180" />
                </summary>
                <div className="px-5 pb-5">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 border-t border-border/50" data-testid="section-cta">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2
            className="text-3xl font-light tracking-tight mb-4"
            data-testid="text-cta-title"
          >
            Ready to stop overpaying?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            Switch to a billing model that makes sense. Only pay for
            the minutes your AI agents actually spend on calls.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link href="/contact">
              <Button size="lg" data-testid="button-cta-contact">
                Book a Demo
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/register">
              <Button variant="outline" size="lg" data-testid="button-cta-register">
                Get Started Free
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-border/50" data-testid="section-feature-nav">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex items-center justify-start gap-4">
            <Link href="/features/multi-language" data-testid="link-prev-feature">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Multi-Language Support
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
