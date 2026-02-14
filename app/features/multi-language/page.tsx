import type { Metadata } from "next";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Globe,
  Phone,
  Ear,
  Languages,
  MessageCircle,
  FileText,
  Users,
  UserCheck,
  Mic,
  BookOpen,
  Plane,
  ShoppingCart,
  HeartPulse,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Multi-Language Support | GoRigo.ai",
  description:
    "AI agents that detect and respond in your caller's preferred language. Automatic accent adaptation, multilingual transcripts, and seamless conversations in dozens of languages.",
  openGraph: {
    title: "Multi-Language Support | GoRigo.ai",
    description:
      "AI agents that detect and respond in your caller's preferred language. Automatic accent adaptation, multilingual transcripts, and seamless conversations in dozens of languages.",
  },
};

const flowSteps = [
  { icon: Phone, label: "Customer Calls", description: "A caller dials your business number in any language", color: "text-cyan-500" },
  { icon: Ear, label: "Language Detected", description: "The AI automatically identifies the caller's language", color: "text-rose-500" },
  { icon: Languages, label: "AI Switches Language", description: "The agent seamlessly transitions to that language", color: "text-amber-500" },
  { icon: MessageCircle, label: "Conversation Flows", description: "The call continues naturally in the caller's language", color: "text-emerald-500" },
  { icon: FileText, label: "Transcript Available", description: "Full transcript provided in original language and English", color: "text-indigo-500" },
];

const benefits = [
  {
    icon: Globe,
    title: "Serve Global Customers",
    color: "text-amber-500",
    description:
      "Whether your customers speak French, Spanish, Mandarin, or Arabic, your AI agents can handle the conversation. Expand your reach to international markets without any additional setup or infrastructure.",
  },
  {
    icon: UserCheck,
    title: "No Multilingual Staff Needed",
    color: "text-pink-500",
    description:
      "Hiring and retaining staff who speak multiple languages is expensive and difficult. With GoRigo, a single AI agent can communicate fluently in dozens of languages, eliminating the need for specialist recruitment.",
  },
  {
    icon: Mic,
    title: "Automatic Accent Adaptation",
    color: "text-cyan-500",
    description:
      "Our AI does not just understand standard dialects. It adapts to regional accents, colloquial expressions, and speech patterns, ensuring that callers from different regions are understood clearly and responded to appropriately.",
  },
  {
    icon: BookOpen,
    title: "Transcripts in Any Language",
    color: "text-indigo-500",
    description:
      "Every call is transcribed in the original language it was conducted in, with an automatic English translation available alongside. This means your team can review any call regardless of the language it was handled in.",
  },
];

const useCases = [
  {
    icon: Plane,
    title: "UK Tourism Business",
    color: "text-sky-500",
    scenario:
      "A tourism company in London serves visitors from across Europe. French and German tourists call to book tours, ask about schedules, and request directions. The AI agent detects their language within seconds and handles the entire conversation fluently, providing a welcoming experience that builds trust and drives bookings.",
  },
  {
    icon: ShoppingCart,
    title: "International E-Commerce",
    color: "text-orange-500",
    scenario:
      "An online retailer ships to multiple countries and receives order enquiries in a variety of languages. Instead of routing calls to different language teams, a single GoRigo agent handles calls in Spanish, Italian, Portuguese, and more. Order details, delivery updates, and return requests are all managed seamlessly.",
  },
  {
    icon: HeartPulse,
    title: "Diverse Community Services",
    color: "text-rose-500",
    scenario:
      "A healthcare-adjacent service supports a diverse community where callers speak Urdu, Bengali, Polish, and other languages. The AI agent ensures every caller can access important information in their own language, removing language barriers that might otherwise prevent people from getting the help they need.",
  },
];

const faqs = [
  {
    question: "Which languages are supported?",
    answer:
      "GoRigo supports over 30 languages including English, Spanish, French, German, Italian, Portuguese, Mandarin, Cantonese, Japanese, Korean, Arabic, Hindi, Urdu, Bengali, Polish, Romanian, Turkish, Dutch, Swedish, and many more. We are continuously adding new languages based on customer demand.",
  },
  {
    question: "How does accent detection work?",
    answer:
      "Our AI uses advanced speech recognition models that have been trained on diverse speech patterns from around the world. When a caller speaks, the system analyses pronunciation, intonation, and speech rhythm to adapt its understanding. This means it can handle a Scottish English accent just as well as an Indian English accent, or distinguish between European and Latin American Spanish.",
  },
  {
    question: "Can one agent speak multiple languages?",
    answer:
      "Yes. A single AI agent can switch between languages during a call if needed. For example, if a caller starts in English but switches to French mid-conversation, the agent will follow along and respond in French. There is no need to set up separate agents for each language.",
  },
  {
    question: "Are transcripts translated?",
    answer:
      "Yes. Every call transcript is available in the original language it was conducted in, and an English translation is automatically generated alongside it. This means your team can review and understand any call, even if they do not speak the language the call was handled in.",
  },
  {
    question: "How accurate is the translation?",
    answer:
      "GoRigo uses state-of-the-art language models for both real-time conversation and transcript translation. Accuracy rates are consistently above 95 percent for supported languages. For specialised terminology, you can add custom vocabulary to your knowledge base to further improve accuracy in your specific industry.",
  },
  {
    question: "Can I add custom phrases in other languages?",
    answer:
      "Absolutely. Your knowledge base supports multilingual content. You can add product names, brand terms, industry jargon, and custom greetings in any supported language. This ensures the AI uses the exact phrasing you prefer when speaking with customers in different languages.",
  },
];

export default function MultiLanguagePage() {
  return (
    <div className="min-h-screen bg-background" data-testid="page-multi-language">
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
            Multi-Language Support
          </h1>
          <p
            className="mt-4 text-xl text-muted-foreground font-light"
            data-testid="text-hero-subtitle"
          >
            Speak Your Customer's Language
          </p>
          <p
            className="mt-6 text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed"
            data-testid="text-hero-intro"
          >
            Your customers speak different languages, and now your AI agents can too. GoRigo
            automatically detects the language a caller is speaking, switches to that language
            in real time, and handles the entire conversation naturally. Accents, dialects,
            and regional expressions are all understood and responded to with ease.
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
              From detection to conversation
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
              Why multi-language matters
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
            Ready to speak every language?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            Remove language barriers and serve customers around the world.
            See multi-language support in action with a live demo.
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
            <Link href="/features/analytics" data-testid="link-prev-feature">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Real-Time Analytics
              </Button>
            </Link>
            <Link href="/features/pay-per-talk-time" data-testid="link-next-feature">
              <Button variant="ghost" size="sm">
                Pay Per Talk Time
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
