import type { Metadata } from "next";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Clock,
  Phone,
  Bot,
  CalendarCheck,
  ClipboardList,
  BellRing,
  PhoneOff,
  Zap,
  Users,
  TrendingUp,
  Stethoscope,
  ShoppingCart,
  Home,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  CheckCircle2,
} from "lucide-react";

export const metadata: Metadata = {
  title: "24/7 Call Handling | GoRigo.ai",
  description:
    "Never miss a call, day or night. GoRigo AI agents answer every call instantly, handle bookings, enquiries, and support requests around the clock without breaks or downtime.",
  openGraph: {
    title: "24/7 Call Handling | GoRigo.ai",
    description:
      "Never miss a call, day or night. GoRigo AI agents answer every call instantly, handle bookings, enquiries, and support requests around the clock without breaks or downtime.",
  },
};

const flowSteps = [
  { icon: Phone, label: "Customer Calls Any Time", description: "Day, night, weekend, or bank holiday", color: "text-cyan-500" },
  { icon: Bot, label: "AI Agent Answers Instantly", description: "Zero wait time, no hold music", color: "text-teal-500" },
  { icon: CalendarCheck, label: "Handles Request", description: "Booking, enquiry, or support handled on the spot", color: "text-rose-500" },
  { icon: ClipboardList, label: "Confirms and Logs", description: "Caller gets confirmation, you get a full record", color: "text-indigo-500" },
  { icon: BellRing, label: "Follow-up Scheduled", description: "Reminders and next steps are set automatically", color: "text-amber-500" },
];

const benefits = [
  {
    icon: PhoneOff,
    title: "Zero Missed Calls",
    color: "text-cyan-500",
    description:
      "Every call is answered, no matter when it comes in. No voicemail, no call-back queues. Your customers always reach someone who can help them right away.",
  },
  {
    icon: Zap,
    title: "Instant Response",
    color: "text-emerald-500",
    description:
      "There is no hold time. The AI agent picks up within a single ring, greets the caller by name if their number is recognised, and gets straight to helping them.",
  },
  {
    icon: CheckCircle2,
    title: "Consistent Experience",
    color: "text-green-500",
    description:
      "Whether a customer calls at 3am or 3pm, they get the same professional, friendly service. No tired voices, no rushed responses during busy periods.",
  },
  {
    icon: TrendingUp,
    title: "Handles Volume Spikes",
    color: "text-violet-500",
    description:
      "Unexpected rush of calls? Seasonal peak? Product launch day? Your AI agents scale up automatically to handle any volume without degradation in service quality.",
  },
];

const useCases = [
  {
    icon: Stethoscope,
    title: "After-Hours Medical Clinic",
    color: "text-rose-500",
    scenario:
      "A GP practice closes at 6pm, but patients still need to book appointments, request repeat prescriptions, and get advice on whether to visit A&E. The AI agent handles these calls after hours, triaging urgency levels and booking morning appointments so the surgery opens with a full, organised schedule.",
  },
  {
    icon: ShoppingCart,
    title: "Holiday Season Retail Overflow",
    color: "text-orange-500",
    scenario:
      "An online retailer sees call volume triple during Black Friday and Christmas. Rather than hiring and training temporary staff, their AI agents absorb the entire spike, handling order tracking, returns, and gift card queries without a single customer waiting on hold.",
  },
  {
    icon: Home,
    title: "Property Viewing Requests at Midnight",
    color: "text-purple-500",
    scenario:
      "Potential buyers often browse property listings in the evening. When they call an estate agency at 11pm to arrange a viewing, the AI agent takes their details, checks the diary, confirms a viewing slot, and sends a follow-up email, all while the human team sleeps.",
  },
];

const faqs = [
  {
    question: "What if call volume suddenly spikes?",
    answer:
      "GoRigo automatically scales to handle any number of concurrent calls. Whether you receive 10 calls or 10,000 at the same time, every caller gets the same instant response. There is no need to plan capacity in advance or worry about busy signals.",
  },
  {
    question: "Do agents handle weekends differently?",
    answer:
      "You have full control over how your agents behave at different times. You can set different greetings, response scripts, and escalation rules for weekdays, weekends, bank holidays, or any custom schedule. The AI adapts its behaviour based on your settings.",
  },
  {
    question: "Can I set different responses for different hours?",
    answer:
      "Yes. You can create time-based rules in your dashboard. For example, during business hours the agent might transfer complex calls to your team, while after hours it handles everything independently and queues follow-ups for the morning.",
  },
  {
    question: "What happens during system updates?",
    answer:
      "GoRigo is built with redundancy across multiple data centres. System updates happen in the background with zero downtime. Your AI agents continue taking calls throughout any maintenance window without interruption.",
  },
  {
    question: "How many calls can run at once?",
    answer:
      "There is no practical limit. GoRigo's cloud infrastructure scales dynamically based on demand. Whether you need to handle 5 concurrent calls or 5,000, the system adjusts automatically and you only pay for the talk time used.",
  },
  {
    question: "Is there a backup if something fails?",
    answer:
      "Yes. GoRigo has built-in failover across multiple regions. If one server has an issue, calls are instantly routed to another. You can also set up fallback rules such as forwarding to a mobile number or sending an SMS notification if a call cannot be completed.",
  },
];

export default function CallHandlingPage() {
  return (
    <div className="min-h-screen bg-background" data-testid="page-call-handling">
      <Navbar />

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
                  <source src="/features/call-handling-intro.mp4" type="video/mp4" />
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
                24/7 Call Handling
              </h1>
              <p
                className="mt-4 text-xl text-muted-foreground font-light"
                data-testid="text-hero-subtitle"
              >
                Never Miss a Call, Day or Night
              </p>
              <p
                className="mt-6 text-base text-muted-foreground leading-relaxed"
                data-testid="text-hero-intro"
              >
                Your AI agents do not sleep, take breaks, or call in sick. Every call to your
                business is answered instantly, whether it arrives at midday on a Tuesday or
                2am on a bank holiday. Your customers always get the help they need, and you
                never lose business to a missed call again.
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
              From call to resolution, any hour
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
              Always on, always ready
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
            Stop missing calls today
          </h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            Set up 24/7 call handling in minutes. Your AI agents are ready to
            answer every call, around the clock, starting today.
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
            <Link href="/features/ai-agents" data-testid="link-prev-feature">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                AI-Powered Agents
              </Button>
            </Link>
            <Link href="/features/compliance" data-testid="link-next-feature">
              <Button variant="ghost" size="sm">
                UK Compliant
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
