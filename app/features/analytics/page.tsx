import type { Metadata } from "next";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { PublicLayout } from "@/components/public-layout";
import { WebPageJsonLd, BreadcrumbJsonLd, FAQJsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { ConversionCta } from "@/components/seo/conversion-cta";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  BarChart3,
  Phone,
  Database,
  Cpu,
  LayoutDashboard,
  TrendingUp,
  Lightbulb,
  AlertTriangle,
  Users,
  Heart,
  Target,
  Briefcase,
  Megaphone,
  LineChart,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Real-Time Analytics | GoRigo.ai",
  description:
    "See what is happening across your AI call centre as it happens. Live dashboards, sentiment analysis, call quality scoring, and actionable insights to improve every interaction.",
  openGraph: {
    title: "Real-Time Analytics | GoRigo.ai",
    description:
      "See what is happening across your AI call centre as it happens. Live dashboards, sentiment analysis, call quality scoring, and actionable insights to improve every interaction.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Real-Time Analytics | GoRigo.ai",
    description:
      "See what is happening across your AI call centre as it happens. Live dashboards, sentiment analysis, call quality scoring, and actionable insights to improve every interaction.",
  },
  alternates: {
    canonical: "/features/analytics",
  },
};

const flowSteps = [
  { icon: Phone, label: "Call Happens", description: "A customer call takes place with your AI agent", color: "text-cyan-500" },
  { icon: Database, label: "Data Captured", description: "Duration, sentiment, quality, and outcome are recorded", color: "text-indigo-500" },
  { icon: Cpu, label: "Processed in Real-Time", description: "Data is analysed instantly as calls complete", color: "text-teal-500" },
  { icon: LayoutDashboard, label: "Dashboard Updates", description: "Your live dashboard reflects the latest figures", color: "text-sky-500" },
  { icon: TrendingUp, label: "Trends Visible", description: "Patterns and trends emerge across hours and days", color: "text-violet-500" },
  { icon: Lightbulb, label: "Insights Generated", description: "Actionable recommendations are surfaced for you", color: "text-amber-500" },
];

const benefits = [
  {
    icon: AlertTriangle,
    title: "Spot Problems Instantly",
    color: "text-orange-500",
    description:
      "If call quality drops or customer sentiment shifts, you will know straight away. Real-time monitoring means you can address issues the moment they appear, not hours or days later when the damage is already done.",
  },
  {
    icon: Users,
    title: "Track Agent Performance",
    color: "text-pink-500",
    description:
      "See how each AI agent is performing across key metrics like resolution rate, average call duration, and customer satisfaction. Identify which agents are excelling and which configurations need fine-tuning.",
  },
  {
    icon: Heart,
    title: "Understand Customer Sentiment",
    color: "text-rose-500",
    description:
      "Our sentiment analysis engine listens to the tone and language of every call, scoring each interaction as positive, neutral, or negative. This helps you understand how your customers truly feel about your service.",
  },
  {
    icon: Target,
    title: "Data-Driven Decisions",
    color: "text-emerald-500",
    description:
      "Stop guessing and start knowing. With clear metrics and trends at your fingertips, you can make informed decisions about staffing, training, product changes, and customer experience improvements.",
  },
];

const useCases = [
  {
    icon: Briefcase,
    title: "Morning Performance Review",
    color: "text-purple-500",
    scenario:
      "A call centre manager arrives at work and opens the GoRigo dashboard. Within seconds, they can see overnight call volumes, average wait times, resolution rates, and any calls that were flagged for follow-up. They spot a spike in negative sentiment around a billing issue and immediately update the knowledge base to address it.",
  },
  {
    icon: Megaphone,
    title: "Campaign Call Quality",
    color: "text-amber-500",
    scenario:
      "A marketing team launches a new advertising campaign that drives a surge in inbound calls. Using the analytics dashboard, they track call quality in real time, monitoring how well the AI agents handle campaign-specific questions. They can see which ad channels are driving the highest quality leads based on call outcomes.",
  },
  {
    icon: LineChart,
    title: "Weekly Conversion Trends",
    color: "text-violet-500",
    scenario:
      "A business owner reviews their weekly analytics report every Friday. They track conversion rates from call to sale, identify the busiest hours for high-value calls, and compare performance week over week. This data helps them optimise their marketing spend and agent configurations for the following week.",
  },
];

const faqs = [
  {
    question: "What metrics can I see?",
    answer:
      "The dashboard shows a comprehensive range of metrics including total call volume, average call duration, resolution rates, customer sentiment scores, call quality ratings, peak call times, agent performance comparisons, and conversion tracking. You can customise which metrics appear on your main dashboard view.",
  },
  {
    question: "How quickly does the dashboard update?",
    answer:
      "The dashboard updates in real time. As soon as a call ends, the data is processed and reflected in your dashboard within seconds. For ongoing calls, you can see live status updates including current call duration and real-time sentiment indicators.",
  },
  {
    question: "Can I export reports?",
    answer:
      "Yes. You can export detailed reports in CSV and PDF formats. Reports can be generated for any date range and filtered by agent, call type, sentiment, or outcome. You can also schedule automated reports to be sent to your email on a daily, weekly, or monthly basis.",
  },
  {
    question: "Can I set up alerts?",
    answer:
      "Absolutely. You can configure alerts for a wide range of conditions, such as when call volume exceeds a threshold, when sentiment drops below a certain level, or when resolution rates fall outside your target range. Alerts can be sent via email or displayed directly on your dashboard.",
  },
  {
    question: "What is sentiment analysis?",
    answer:
      "Sentiment analysis is the process of using AI to determine the emotional tone of a conversation. GoRigo analyses the language used during each call and assigns a sentiment score ranging from very negative to very positive. This helps you understand how callers feel about their experience without having to listen to every single call.",
  },
  {
    question: "Do I need technical skills to use the dashboard?",
    answer:
      "Not at all. The dashboard is designed for business users, not engineers. Everything is presented in clear, visual charts and plain language summaries. If you can read a bar chart and click a button, you have all the technical skills you need.",
  },
];

export default function AnalyticsPage() {
  return (
    <PublicLayout>
    <div className="min-h-screen bg-background" data-testid="page-analytics">
      <WebPageJsonLd title="Real-Time Analytics" description="See what is happening across your AI call centre as it happens. Live dashboards, sentiment analysis, call quality scoring, and actionable insights to improve every interaction." url="/features/analytics" />
      <BreadcrumbJsonLd items={[{ name: "Home", url: "/" }, { name: "Capabilities", url: "/capabilities" }, { name: "Real-Time Analytics", url: "/features/analytics" }]} />
      <FAQJsonLd items={faqs.map(f => ({ question: f.question, answer: f.answer }))} />
      <Navbar />
      <Breadcrumbs items={[{ label: "Capabilities", href: "/capabilities" }, { label: "Real-Time Analytics" }]} />

      <section className="relative" data-testid="section-hero">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.06),transparent_60%)]" />
        <div className="relative max-w-6xl mx-auto px-6 pt-28 pb-20">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
            <div className="w-full lg:w-1/2 flex-shrink-0">
              <div className="rounded-md overflow-hidden border border-border/50 shadow-lg">
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-auto object-cover"
                  data-testid="video-feature-intro"
                >
                  <source src="/features/analytics-intro.mp4" type="video/mp4" />
                </video>
              </div>
            </div>
            <div className="w-full lg:w-1/2 text-center lg:text-left">
              <p className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-6" data-testid="badge-feature">
                Feature
              </p>
              <h1
                className="text-4xl sm:text-5xl lg:text-5xl font-light tracking-tight leading-[1.1]"
                data-testid="text-hero-title"
              >
                Real-Time Analytics
              </h1>
              <p
                className="mt-4 text-xl text-muted-foreground font-light"
                data-testid="text-hero-subtitle"
              >
                See What's Happening, As It Happens
              </p>
              <p
                className="mt-6 text-base text-muted-foreground leading-relaxed"
                data-testid="text-hero-intro"
              >
                Every call that passes through GoRigo generates valuable data. Our analytics
                dashboard turns that data into live insights you can act on immediately. See call
                volumes, track quality scores, monitor customer sentiment, and spot trends as they
                develop, all from a single, easy-to-use dashboard.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 border-t border-border/50" data-testid="section-how-it-works">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-16">
            <p className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-3">
              How It Works
            </p>
            <h2 className="text-3xl font-light tracking-tight" data-testid="text-how-title">
              From call to insight in seconds
            </h2>
          </div>

          <div className="flex flex-col lg:flex-row items-stretch gap-0" data-testid="diagram-flow">
            {flowSteps.map((step, index) => (
              <div key={step.label} className="flex flex-col lg:flex-row items-center flex-1">
                <div
                  className="flex flex-col items-center text-center p-6 rounded-md border border-border/50 bg-background w-full lg:w-auto lg:min-w-[160px]"
                  data-testid={`flow-step-${index}`}
                >
                  <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center mb-3">
                    <step.icon className={`h-5 w-5 ${step.color}`} />
                  </div>
                  <p className="font-medium text-sm mb-1">{step.label}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
                </div>
                {index < flowSteps.length - 1 && (
                  <>
                    <div className="hidden lg:flex items-center px-2">
                      <ArrowRight className="h-5 w-5 text-muted-foreground/50" />
                    </div>
                    <div className="flex lg:hidden items-center py-2">
                      <ChevronDown className="h-5 w-5 text-muted-foreground/50" />
                    </div>
                  </>
                )}
              </div>
            ))}
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
              Why real-time data matters
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
            Ready to see your data in real time?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            Start making data-driven decisions today. Book a demo to see the
            analytics dashboard in action.
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
          <div className="flex items-center justify-between gap-4">
            <Link href="/features/compliance" data-testid="link-prev-feature">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                UK Compliant
              </Button>
            </Link>
            <Link href="/features/multi-language" data-testid="link-next-feature">
              <Button variant="ghost" size="sm">
                Multi-Language Support
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <ConversionCta talkToAiMessage="Talk to AI about our Analytics" />
      <Footer />
    </div>
    </PublicLayout>
  );
}
