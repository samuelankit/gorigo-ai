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
import { CustomIcon } from "@/components/ui/custom-icon";
import {
  Bot,
  Phone,
  Brain,
  MessageSquare,
  ClipboardList,
  Zap,
  Users,
  RefreshCw,
  Layers,
  Stethoscope,
  Home,
  ShoppingCart,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  CheckCircle2,
} from "lucide-react";

export const metadata: Metadata = {
  title: "AI-Powered Agents | GoRigo.ai",
  description:
    "Deploy intelligent AI voice agents that listen, understand, and respond naturally to every call. Never tired, always consistent, handling thousands of calls simultaneously.",
  openGraph: {
    title: "AI-Powered Agents | GoRigo.ai",
    description:
      "Deploy intelligent AI voice agents that listen, understand, and respond naturally to every call. Never tired, always consistent, handling thousands of calls simultaneously.",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI-Powered Agents | GoRigo.ai",
    description:
      "Deploy intelligent AI voice agents that listen, understand, and respond naturally to every call. Never tired, always consistent, handling thousands of calls simultaneously.",
  },
  alternates: {
    canonical: "/features/ai-agents",
  },
};

const flowSteps = [
  { icon: Phone, customIcon: "vr-phone-mic", label: "Call Arrives", description: "A customer dials your business number", color: "text-[#2DD4A8]" },
  { icon: Bot, customIcon: "ai-voice-head", label: "AI Listens", description: "The agent picks up and actively listens", color: "text-[#2DD4A8]" },
  { icon: Brain, customIcon: "ai-voice-chip", label: "Understands Intent", description: "Natural language processing identifies what the caller needs", color: "text-[#2DD4A8]" },
  { icon: MessageSquare, customIcon: "vr-voice-chat", label: "Responds Naturally", description: "The agent speaks back in a natural, conversational tone", color: "text-[#2DD4A8]" },
  { icon: ClipboardList, label: "Logs Everything", description: "Every detail is recorded for your review", color: "text-[#2DD4A8]" },
];

const benefits = [
  {
    icon: Zap,
    title: "Never Tired",
    color: "text-[#2DD4A8]",
    description:
      "Your AI agents do not fatigue, lose focus, or have bad days. Every single call gets the same level of attention and care, whether it is the first call of the day or the ten-thousandth.",
  },
  {
    icon: CheckCircle2,
    title: "Consistent Quality",
    color: "text-[#2DD4A8]",
    description:
      "Human agents have good days and bad days. AI agents deliver the same professional, friendly experience on every call, following your exact scripts and guidelines without deviation.",
  },
  {
    icon: RefreshCw,
    title: "Instant Training Updates",
    color: "text-[#2DD4A8]",
    description:
      "Need to change a response or add a new product to your knowledge base? Updates go live instantly across all your agents. No retraining sessions or team meetings required.",
  },
  {
    icon: Layers,
    title: "Handles Thousands Simultaneously",
    color: "text-[#2DD4A8]",
    description:
      "While a human agent handles one call at a time, your AI agents can manage thousands of concurrent conversations without any drop in quality or increase in wait times.",
  },
];

const useCases = [
  {
    icon: Stethoscope,
    title: "Dental Clinic Booking",
    color: "text-[#2DD4A8]",
    scenario:
      "A busy dental practice receives dozens of booking calls daily. Their AI agent handles appointment scheduling, confirms availability, sends reminders, and answers common questions about treatments and pricing, freeing up reception staff to focus on patients in the clinic.",
  },
  {
    icon: Home,
    title: "Estate Agent Enquiries",
    color: "text-[#2DD4A8]",
    scenario:
      "An estate agency gets calls about property viewings at all hours. The AI agent provides property details, schedules viewings, qualifies potential buyers by asking key questions, and routes serious enquiries to the right agent with a full summary.",
  },
  {
    icon: ShoppingCart,
    title: "E-Commerce Order Status",
    color: "text-[#2DD4A8]",
    scenario:
      "An online retailer receives hundreds of calls about order tracking, returns, and delivery updates. The AI agent instantly looks up order information, provides real-time status updates, and processes simple return requests without any human involvement.",
  },
];

const faqs = [
  {
    question: "Are callers talking to a robot?",
    answer:
      "Not in the way you might imagine. GoRigo agents use advanced voice synthesis that sounds natural and conversational. Most callers find the experience very similar to speaking with a well-trained human agent. The AI is also required to disclose that it is an AI assistant at the start of each call, keeping things transparent.",
  },
  {
    question: "Can the AI handle complex questions?",
    answer:
      "Yes. Your AI agent draws from your custom knowledge base, which can include FAQs, product catalogues, pricing information, policies, and more. For truly complex or sensitive situations, the agent can seamlessly transfer the call to a human team member.",
  },
  {
    question: "How do I train my agent?",
    answer:
      "There is no coding involved. You upload your knowledge base documents, set up your call handling rules, and define your agent's persona through our simple dashboard. The AI learns from your materials and is ready to take calls within minutes.",
  },
  {
    question: "Can it transfer to a human?",
    answer:
      "Absolutely. You set the rules for when a call should be escalated. Whether it is a specific request type, caller sentiment, or a direct request to speak with a person, the AI will warm-transfer the call with a full summary so the human agent is up to speed.",
  },
  {
    question: "How natural does it sound?",
    answer:
      "GoRigo uses the latest voice synthesis technology to produce speech that includes natural pauses, intonation, and conversational flow. The result is a voice that callers find easy to understand and comfortable to interact with.",
  },
  {
    question: "What if the AI does not understand?",
    answer:
      "If the AI cannot confidently determine what a caller needs, it will politely ask clarifying questions. If the situation remains unclear, the agent follows your escalation rules, which might include transferring to a human, taking a message, or offering to call back.",
  },
];

export default function AIAgentsPage() {
  return (
    <PublicLayout>
    <div className="min-h-screen bg-background" data-testid="page-ai-agents">
      <WebPageJsonLd title="AI-Powered Agents" description="Deploy intelligent AI voice agents that listen, understand, and respond naturally to every call. Never tired, always consistent, handling thousands of calls simultaneously." url="/features/ai-agents" />
      <BreadcrumbJsonLd items={[{ name: "Home", url: "/" }, { name: "Capabilities", url: "/capabilities" }, { name: "AI-Powered Agents", url: "/features/ai-agents" }]} />
      <FAQJsonLd items={faqs.map(f => ({ question: f.question, answer: f.answer }))} />
      <Navbar />
      <Breadcrumbs items={[{ label: "Capabilities", href: "/capabilities" }, { label: "AI-Powered Agents" }]} />

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
                  <source src="/features/ai-agents-intro.mp4" type="video/mp4" />
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
                AI-Powered Agents
              </h1>
              <p
                className="mt-4 text-xl text-muted-foreground font-light"
                data-testid="text-hero-subtitle"
              >
                Your Tireless Team of Virtual Call Handlers
              </p>
              <p
                className="mt-6 text-base text-muted-foreground leading-relaxed"
                data-testid="text-hero-intro"
              >
                GoRigo AI voice agents work just like your best human agents, but they never
                take breaks, never call in sick, and can handle thousands of calls at the same
                time. They listen to what callers say, understand what they need, and respond
                in a natural, conversational way.
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
              What happens when a call comes in
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
                    {step.customIcon ? (
                      <CustomIcon name={step.customIcon} size={20} className={step.color} />
                    ) : (
                      <step.icon className={`h-5 w-5 ${step.color}`} />
                    )}
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
              Why businesses choose AI agents
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
            Ready to deploy your AI agents?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            Get started in minutes. No coding required, no long-term contracts.
            See how AI agents can transform your call handling.
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
          <div className="flex items-center justify-end gap-4">
            <Link href="/features/call-handling" data-testid="link-next-feature">
              <Button variant="ghost" size="sm">
                24/7 Call Handling
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <ConversionCta talkToAiMessage="Talk to AI about our AI Agents" />
      <Footer />
    </div>
    </PublicLayout>
  );
}
