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
  Shield,
  Phone,
  Bot,
  FileCheck,
  Eye,
  Lock,
  ClipboardList,
  UserX,
  ShieldCheck,
  FileSearch,
  Landmark,
  Stethoscope,
  Heart,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  CheckCircle2,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Global Compliance | GoRigo.ai",
  description:
    "Per-country compliance across 20 countries. GoRigo handles DNC registries, calling hours by timezone, AI disclosure in 12 languages, consent management, and PII redaction automatically on every call.",
  openGraph: {
    title: "Global Compliance | GoRigo.ai",
    description:
      "Per-country compliance across 20 countries. GoRigo handles DNC registries, calling hours by timezone, AI disclosure in 12 languages, consent management, and PII redaction automatically on every call.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Global Compliance | GoRigo.ai",
    description:
      "Per-country compliance across 20 countries. GoRigo handles DNC registries, calling hours by timezone, AI disclosure in 12 languages, consent management, and PII redaction automatically on every call.",
  },
  alternates: {
    canonical: "/features/compliance",
  },
};

const flowSteps = [
  { icon: Phone, label: "Call Starts", description: "An inbound or outbound call begins", color: "text-cyan-500" },
  { icon: Bot, label: "AI Discloses", description: "The agent tells the caller they are speaking with an AI", color: "text-teal-500" },
  { icon: UserX, label: "Checks DNC Registry", description: "Outbound calls are screened against the Do Not Call list", color: "text-pink-500" },
  { icon: FileCheck, label: "Records Consent", description: "Caller consent is captured and stored securely", color: "text-green-500" },
  { icon: Eye, label: "Auto-Redacts PII", description: "Personal data is scrubbed from transcripts and logs", color: "text-sky-500" },
  { icon: Lock, label: "Encrypted Storage", description: "All data is encrypted at rest and in transit", color: "text-blue-500" },
  { icon: ClipboardList, label: "Audit Trail Created", description: "A complete compliance record is generated", color: "text-indigo-500" },
];

const benefits = [
  {
    icon: ShieldCheck,
    title: "No Manual Compliance Work",
    color: "text-blue-500",
    description:
      "Compliance happens automatically on every single call. Your team does not need to remember checklists, fill in forms, or manually scrub data. The system handles it all in real time.",
  },
  {
    icon: Bot,
    title: "Automatic AI Disclosure",
    color: "text-teal-500",
    description:
      "Regulations across multiple jurisdictions require that callers are informed when they are speaking with an AI. GoRigo delivers this disclosure automatically in 12 languages at the start of every call, keeping you compliant from the first second.",
  },
  {
    icon: UserX,
    title: "DNC Registry Checking",
    color: "text-pink-500",
    description:
      "Before any outbound call is placed, GoRigo automatically checks the number against the relevant national Do-Not-Call registry for that country (e.g. TPS in the UK, National DNC in the US, Robinson List in Germany). Numbers on the list are blocked from being called.",
  },
  {
    icon: Eye,
    title: "PII Auto-Scrubbed from Transcripts",
    color: "text-sky-500",
    description:
      "Personal information such as names, addresses, dates of birth, and payment details are automatically detected and redacted from call transcripts and logs, reducing your data exposure risk.",
  },
];

const useCases = [
  {
    icon: Landmark,
    title: "Financial Services and FCA Compliance",
    color: "text-purple-500",
    scenario:
      "A financial advisory firm needs to ensure every client call meets FCA record-keeping requirements. GoRigo automatically logs all interactions, records consent for advice given, redacts sensitive financial details from transcripts, and produces audit-ready reports that regulators can review.",
  },
  {
    icon: Stethoscope,
    title: "Healthcare Provider Handling Patient Data",
    color: "text-rose-500",
    scenario:
      "A private clinic manages hundreds of patient calls daily. GoRigo ensures that patient health information is handled according to local data protection standards (e.g. NHS in the UK, HIPAA in the US), PII is redacted from accessible logs, and all call records are encrypted and stored securely.",
  },
  {
    icon: Heart,
    title: "Charity Managing Donor Calls",
    color: "text-pink-500",
    scenario:
      "A charity running a fundraising campaign must comply with Fundraising Regulator standards. GoRigo checks donor numbers against the Fundraising Preference Service, records opt-in consent before discussing donations, and creates a transparent audit trail of every interaction.",
  },
];

const faqs = [
  {
    question: "Does GoRigo handle GDPR automatically?",
    answer:
      "Yes. GoRigo is designed with GDPR compliance built in. Personal data is processed only for the purposes you define, consent is recorded and stored, data retention policies are enforced automatically, and individuals can exercise their right to access or delete their data through your dashboard.",
  },
  {
    question: "What is the DNC registry check?",
    answer:
      "The DNC (Do Not Call) registry check screens phone numbers against the UK Telephone Preference Service (TPS) and Corporate TPS registers before any outbound call is placed. If a number is registered, the call is automatically blocked, protecting you from regulatory penalties.",
  },
  {
    question: "How does PII redaction work?",
    answer:
      "GoRigo uses pattern recognition and natural language understanding to identify personal information in call transcripts, such as names, addresses, dates of birth, NHS numbers, and payment card details. This information is automatically replaced with redaction markers before the transcript is stored or displayed.",
  },
  {
    question: "Is my data stored in the UK?",
    answer:
      "Yes. All call data, transcripts, and customer information are stored in UK-based data centres. Data does not leave the UK unless you explicitly configure cross-border data flows, which are also managed in compliance with GDPR requirements.",
  },
  {
    question: "Can I get an audit trail for regulators?",
    answer:
      "Absolutely. GoRigo generates a complete audit trail for every call, including timestamps, consent records, agent actions, compliance checks performed, and any data redaction applied. You can export these records at any time for regulatory review.",
  },
  {
    question: "What compliance certifications does GoRigo have?",
    answer:
      "GoRigo is built to meet UK GDPR, Data Protection Act 2018, TPS/CTPS regulations, and ICO guidance. The platform infrastructure is hosted on SOC 2 and ISO 27001 certified providers. We regularly review our compliance posture and work with external auditors to maintain the highest standards.",
  },
];

export default function CompliancePage() {
  return (
    <PublicLayout>
    <div className="min-h-screen bg-background" data-testid="page-compliance">
      <WebPageJsonLd title="Global Compliance" description="Per-country compliance across 20 countries. GoRigo handles DNC registries, calling hours by timezone, AI disclosure in 12 languages, consent management, and PII redaction automatically on every call." url="/features/compliance" />
      <BreadcrumbJsonLd items={[{ name: "Home", url: "/" }, { name: "Capabilities", url: "/capabilities" }, { name: "Global Compliance", url: "/features/compliance" }]} />
      <FAQJsonLd items={faqs.map(f => ({ question: f.question, answer: f.answer }))} />
      <Navbar />
      <Breadcrumbs items={[{ label: "Capabilities", href: "/capabilities" }, { label: "Global Compliance" }]} />

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
                  <source src="/features/compliance-intro.mp4" type="video/mp4" />
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
                Globally Compliant
              </h1>
              <p
                className="mt-4 text-xl text-muted-foreground font-light"
                data-testid="text-hero-subtitle"
              >
                Per-Country Compliance Across 20 Countries
              </p>
              <p
                className="mt-6 text-base text-muted-foreground leading-relaxed"
                data-testid="text-hero-intro"
              >
                Compliance is not an add-on with GoRigo. It is built into every call from the
                very first second. Per-country DNC registries, calling hours enforcement by
                timezone, AI disclosure in 12 languages, consent management, and PII redaction
                all happen automatically across 20 countries without any extra effort from your team.
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
              Compliance on every call, automatically
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="diagram-flow">
            {flowSteps.map((step, index) => (
              <div key={step.label} className="relative">
                <div
                  className="flex flex-col items-center text-center p-5 rounded-md border border-border/50 bg-background h-full"
                  data-testid={`flow-step-${index}`}
                >
                  <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center mb-2">
                    <span className="text-xs font-medium text-muted-foreground">{index + 1}</span>
                  </div>
                  <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center mb-3">
                    <step.icon className={`h-4 w-4 ${step.color}`} />
                  </div>
                  <p className="font-medium text-sm mb-1">{step.label}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
                </div>
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
              Compliance without the headaches
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
            Stay compliant without the complexity
          </h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            Let GoRigo handle the regulatory heavy lifting. Every call is
            compliant from the first ring, with a full audit trail ready
            whenever you need it.
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
            <Link href="/features/call-handling" data-testid="link-prev-feature">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                24/7 Call Handling
              </Button>
            </Link>
            <Link href="/features/analytics" data-testid="link-next-feature">
              <Button variant="ghost" size="sm">
                Real-Time Analytics
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <ConversionCta talkToAiMessage="Talk to AI about Compliance features" />
      <Footer />
    </div>
    </PublicLayout>
  );
}
