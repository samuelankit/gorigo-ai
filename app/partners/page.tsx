import type { Metadata } from "next";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { WebPageJsonLd, BreadcrumbJsonLd, FAQJsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { ConversionCta } from "@/components/seo/conversion-cta";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  TrendingUp,
  Building2,
  Users,
  Handshake,
  Code,
  LayoutDashboard,
  GraduationCap,
  FileText,
  Headphones,
  Rocket,
  BarChart3,
  ClipboardCheck,
  DollarSign,
  Phone,
  Wifi,
  Briefcase,
  Megaphone,
  Monitor,
  Pen,
  Scale,
  Shield,
  Lock,
  CreditCard,
  Calendar,
  Eye,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Partner with GoRigo | Grow Your Business with AI",
  description:
    "Explore partnership opportunities with GoRigo.ai. Resell, whitelabel, or refer clients to the AI call centre engine and grow your revenue with dedicated support, training, and transparent commissions.",
  openGraph: {
    title: "Partner with GoRigo | Grow Your Business with AI",
    description:
      "Explore partnership opportunities with GoRigo.ai. Resell, whitelabel, or refer clients to the AI call centre engine and grow your revenue with dedicated support, training, and transparent commissions.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Partner with GoRigo | Grow Your Business with AI",
    description:
      "Explore partnership opportunities with GoRigo.ai. Resell, whitelabel, or refer clients to the AI call centre engine and grow your revenue with dedicated support, training, and transparent commissions.",
  },
  alternates: {
    canonical: "/partners",
  },
};

const opportunityStats = [
  {
    icon: TrendingUp,
    stat: "$12.9 billion",
    label: "AI call centre market projected value by 2032",
    color: "text-violet-500",
  },
  {
    icon: Users,
    stat: "64%",
    label: "of businesses exploring AI for customer service",
    color: "text-pink-500",
  },
  {
    icon: Rocket,
    stat: "3x",
    label: "year-on-year growth in AI voice solution adoption",
    color: "text-emerald-500",
  },
];

const partnershipModels = [
  {
    icon: Building2,
    title: "Business Partner / Whitelabel",
    description:
      "Rebrand GoRigo as your own product. Full whitelabel solution with your branding, your clients, our technology.",
    href: "/partners/whitelabel",
    bullets: [
      "Your brand, your pricing, your clients",
      "Full platform access with custom domain",
      "Dedicated account manager and priority support",
      "Revenue share model with no upfront fees",
    ],
    color: "text-purple-500",
  },
  {
    icon: Handshake,
    title: "Affiliate Partner",
    description:
      "Earn commissions by referring businesses to GoRigo. Share your unique link, we handle the rest.",
    href: "/partners/affiliate",
    bullets: [
      "Unique referral link with real-time tracking",
      "Recurring commissions on referred clients",
      "Marketing materials and landing page templates",
      "Monthly payouts with transparent reporting",
    ],
    color: "text-amber-500",
  },
  {
    icon: Code,
    title: "Technology Partner",
    description:
      "Integrate GoRigo into your existing platform or workflow. API access, webhooks, and dedicated support.",
    href: "/contact",
    bullets: [
      "RESTful API and webhook integrations",
      "Sandbox environment for development and testing",
      "Dedicated technical account manager",
      "Co-marketing and joint go-to-market opportunities",
    ],
    color: "text-teal-500",
  },
];

const partnerBenefits = [
  {
    icon: LayoutDashboard,
    title: "Partner Dashboard",
    description: "Dedicated dashboard with real-time analytics, client management, and performance tracking.",
    color: "text-sky-500",
  },
  {
    icon: GraduationCap,
    title: "Training and Onboarding",
    description: "Structured onboarding programme with product training, sales enablement, and certification.",
    color: "text-yellow-500",
  },
  {
    icon: FileText,
    title: "Marketing Materials",
    description: "Ready-to-use sales collateral, pitch decks, case studies, and co-branded content.",
    color: "text-indigo-500",
  },
  {
    icon: Headphones,
    title: "Technical Support",
    description: "Priority access to our support team, comprehensive documentation, and integration guides.",
    color: "text-cyan-500",
  },
  {
    icon: Rocket,
    title: "Product Updates",
    description: "Regular product roadmap access, early feature previews, and beta programme invitations.",
    color: "text-emerald-500",
  },
  {
    icon: BarChart3,
    title: "Transparent Reporting",
    description: "Clear commission tracking, detailed revenue reports, and automated monthly statements.",
    color: "text-violet-500",
  },
];

const steps = [
  {
    number: "1",
    title: "Apply",
    description: "Fill in your details and tell us about your business. We review every application within 48 hours.",
    icon: ClipboardCheck,
    color: "text-green-500",
  },
  {
    number: "2",
    title: "Onboard",
    description: "We set up your partner account, provide product training, and equip you with everything you need.",
    icon: GraduationCap,
    color: "text-yellow-500",
  },
  {
    number: "3",
    title: "Launch",
    description: "Start selling, referring, or integrating GoRigo. Use our materials or create your own approach.",
    icon: Rocket,
    color: "text-emerald-500",
  },
  {
    number: "4",
    title: "Earn",
    description: "Track your revenue and commissions in real-time through your partner dashboard.",
    icon: DollarSign,
    color: "text-orange-500",
  },
];

const idealPartners = [
  {
    icon: Phone,
    title: "BPO and Call Centre Operators",
    description: "Enhance your existing operations with AI-powered agents that scale without adding headcount.",
    color: "text-cyan-500",
  },
  {
    icon: Wifi,
    title: "Telecoms Companies and ISPs",
    description: "Bundle AI call centre capabilities with your connectivity products for added value.",
    color: "text-fuchsia-500",
  },
  {
    icon: Briefcase,
    title: "Business Consultants and Advisors",
    description: "Recommend GoRigo to clients seeking to modernise their customer service operations.",
    color: "text-purple-500",
  },
  {
    icon: Megaphone,
    title: "Digital Agencies and Marketing Firms",
    description: "Add AI voice solutions to your service portfolio and deliver more value to your clients.",
    color: "text-red-500",
  },
  {
    icon: Monitor,
    title: "IT Service Providers and MSPs",
    description: "Integrate AI call handling into your managed service offerings for business clients.",
    color: "text-sky-500",
  },
  {
    icon: Pen,
    title: "Industry Influencers and Bloggers",
    description: "Earn commissions by sharing GoRigo with your audience through authentic content and reviews.",
    color: "text-pink-500",
  },
];

const terms = [
  {
    icon: Scale,
    title: "Governing Law",
    description:
      "All partnerships are governed by UK law. GoRigo is operated by International Business Exchange Limited, registered in England and Wales (Company No. 15985956).",
    color: "text-blue-500",
  },
  {
    icon: Handshake,
    title: "Non-Exclusive Agreements",
    description:
      "Partnership agreements are non-exclusive. Partners are free to work with other providers and offer competing products alongside GoRigo.",
    color: "text-purple-500",
  },
  {
    icon: CheckCircle2,
    title: "Minimum Standards",
    description:
      "Partners must represent GoRigo professionally and accurately. Misleading claims, spam, or unethical marketing practices are not permitted.",
    color: "text-green-500",
  },
  {
    icon: Shield,
    title: "Data Protection",
    description:
      "Partners must comply with GDPR and UK data protection laws. Any client data shared during the partnership must be handled in accordance with applicable regulations.",
    color: "text-sky-500",
  },
  {
    icon: Lock,
    title: "Intellectual Property",
    description:
      "The GoRigo brand, technology, and platform remain the property of International Business Exchange Limited. Partners receive a licence to use approved branding materials.",
    color: "text-slate-500",
  },
  {
    icon: CreditCard,
    title: "Commission Payments",
    description:
      "Commissions are processed monthly. A minimum payout threshold applies. Detailed commission statements are available through the partner dashboard.",
    color: "text-orange-500",
  },
  {
    icon: Calendar,
    title: "Termination",
    description:
      "Either party can end the partnership with 30 days written notice. Outstanding commissions earned before termination will be paid in the next billing cycle.",
    color: "text-rose-500",
  },
  {
    icon: Eye,
    title: "Confidentiality",
    description:
      "Partners must keep commercial terms, pricing structures, and client data confidential. This obligation survives the termination of the partnership.",
    color: "text-amber-500",
  },
];

const faqs = [
  {
    question: "Is there a cost to become a partner?",
    answer:
      "No. There is no fee to join any of our partnership programmes. We invest in your success because we earn when you earn. All training, marketing materials, and dashboard access are provided at no cost.",
  },
  {
    question: "How long does the onboarding process take?",
    answer:
      "Most partners are fully onboarded within 5 to 7 business days. This includes account setup, product training, and access to all partner resources. Whitelabel partners may require a few additional days for custom branding and domain configuration.",
  },
  {
    question: "Do I need technical skills?",
    answer:
      "Not for affiliate or business partnerships. GoRigo is designed so that non-technical partners can confidently sell and demonstrate the platform. Technology partners will need development resources for API integrations, but we provide comprehensive documentation and support.",
  },
  {
    question: "Can I partner from outside the UK?",
    answer:
      "Yes. We welcome partners from any country. Our partnership agreements are governed by UK law, but there are no geographical restrictions on who can join. We have partners across Europe, North America, and Asia-Pacific.",
  },
  {
    question: "How do I track my earnings?",
    answer:
      "Every partner receives access to a dedicated dashboard where you can track referrals, conversions, active clients, and commission earnings in real-time. Monthly statements are generated automatically and available for download.",
  },
  {
    question: "What support do partners receive?",
    answer:
      "All partners receive priority access to our support team, a dedicated partner manager, product training sessions, and a library of sales and marketing materials. Whitelabel and technology partners also receive technical integration support.",
  },
  {
    question: "Can I be both an affiliate and a whitelabel partner?",
    answer:
      "Yes. You can participate in multiple partnership programmes simultaneously. For example, you might whitelabel GoRigo for your own clients while also earning affiliate commissions by referring businesses that prefer to use GoRigo directly.",
  },
  {
    question: "What happens if I want to end the partnership?",
    answer:
      "Either party can terminate the partnership with 30 days written notice. Any commissions earned before the termination date will be paid out in the next billing cycle. There are no exit fees or penalties.",
  },
];

export default function PartnersPage() {
  return (
    <div className="min-h-screen bg-background" data-testid="page-partners">
      <WebPageJsonLd
        title="Partner with GoRigo | Grow Your Business with AI"
        description="Explore partnership opportunities with GoRigo.ai. Resell, whitelabel, or refer clients to the AI call centre engine and grow your revenue with dedicated support, training, and transparent commissions."
        url="/partners"
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Partners", url: "/partners" },
        ]}
      />
      <FAQJsonLd items={faqs} />
      <Navbar />
      <Breadcrumbs items={[{ label: "Partners" }]} />

      <section className="relative" data-testid="section-hero">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.06),transparent_60%)]" />
        <div className="relative max-w-5xl mx-auto px-6 pt-28 pb-20 text-center">
          <p
            className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-6"
            data-testid="badge-partners"
          >
            Partnership Programme
          </p>
          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-light tracking-tight leading-[1.1]"
            data-testid="text-hero-title"
          >
            Partner with GoRigo
          </h1>
          <p
            className="mt-4 text-xl text-muted-foreground font-light"
            data-testid="text-hero-subtitle"
          >
            Build, Grow, and Earn with the AI Call Centre Engine
          </p>
          <p
            className="mt-6 text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed"
            data-testid="text-hero-intro"
          >
            GoRigo offers multiple ways to collaborate and grow your business.
            Whether you want to resell our AI call centre platform under your own
            brand, earn commissions by referring clients, or integrate our
            technology into your existing workflow, we have a partnership model
            designed for you.
          </p>
        </div>
      </section>

      <section className="py-24 border-t border-border/50" data-testid="section-opportunity">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-16">
            <p className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-3">
              The Opportunity
            </p>
            <h2
              className="text-3xl font-light tracking-tight"
              data-testid="text-opportunity-title"
            >
              Why now is the time to partner
            </h2>
            <p className="mt-4 text-muted-foreground max-w-2xl leading-relaxed">
              The AI call centre market is growing rapidly. Businesses of every
              size are actively looking for AI voice solutions to reduce costs,
              improve customer experience, and scale their operations. GoRigo
              removes the complexity so partners can focus on what they do best
              &mdash; selling, advising, and building relationships.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {opportunityStats.map((item) => (
              <Card
                key={item.label}
                data-testid={`card-stat-${item.stat.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}
              >
                <CardContent className="p-8 text-center">
                  <item.icon className={`h-5 w-5 ${item.color} mx-auto mb-4`} />
                  <p className="text-2xl font-semibold mb-2" data-testid={`text-stat-value-${item.stat.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}>
                    {item.stat}
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.label}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 border-t border-border/50" data-testid="section-models">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-16">
            <p className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-3">
              Partnership Models
            </p>
            <h2
              className="text-3xl font-light tracking-tight"
              data-testid="text-models-title"
            >
              Three ways to partner
            </h2>
            <p className="mt-4 text-muted-foreground max-w-2xl leading-relaxed">
              Choose the partnership model that fits your business. Each
              programme is designed to help you succeed with dedicated support,
              transparent terms, and competitive rewards.
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {partnershipModels.map((model) => (
              <Card
                key={model.title}
                className="hover-elevate"
                data-testid={`card-model-${model.title.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <CardContent className="p-8 flex flex-col h-full">
                  <model.icon className={`h-5 w-5 ${model.color} mb-5`} />
                  <h3 className="font-medium text-lg mb-2">{model.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                    {model.description}
                  </p>
                  <ul className="space-y-2.5 mb-8 flex-1">
                    {model.bullets.map((bullet) => (
                      <li
                        key={bullet}
                        className="flex items-start gap-2 text-sm"
                      >
                        <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{bullet}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href={model.href} data-testid={`link-model-${model.title.toLowerCase().replace(/\s+/g, "-")}`}>
                    <Button variant="outline" className="w-full">
                      Learn More
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 border-t border-border/50" data-testid="section-benefits">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-16">
            <p className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-3">
              Partner Support
            </p>
            <h2
              className="text-3xl font-light tracking-tight"
              data-testid="text-benefits-title"
            >
              What GoRigo provides to all partners
            </h2>
            <p className="mt-4 text-muted-foreground max-w-2xl leading-relaxed">
              Regardless of which partnership model you choose, every GoRigo
              partner receives a comprehensive set of tools, resources, and
              support to help you succeed.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {partnerBenefits.map((benefit) => (
              <div
                key={benefit.title}
                className="p-6 rounded-md border border-border/50"
                data-testid={`benefit-${benefit.title.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <benefit.icon className={`h-5 w-5 ${benefit.color} mb-4`} />
                <h3 className="font-medium mb-1.5">{benefit.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {benefit.description}
                </p>
              </div>
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
            <h2
              className="text-3xl font-light tracking-tight"
              data-testid="text-how-title"
            >
              Four steps to get started
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step) => (
              <Card key={step.number} data-testid={`step-${step.number}`}>
                <CardContent className="p-8">
                  <div className="flex items-center gap-4 mb-6">
                    <span className="text-3xl font-light text-muted-foreground/40">
                      {step.number}
                    </span>
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

      <section className="py-24 border-t border-border/50" data-testid="section-ideal-partners">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-16">
            <p className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-3">
              Ideal Partners
            </p>
            <h2
              className="text-3xl font-light tracking-tight"
              data-testid="text-ideal-partners-title"
            >
              Who partners with GoRigo
            </h2>
            <p className="mt-4 text-muted-foreground max-w-2xl leading-relaxed">
              Our partners come from a wide range of industries and backgrounds.
              If your business serves companies that handle customer calls, GoRigo
              can be a valuable addition to your portfolio.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {idealPartners.map((partner) => (
              <div
                key={partner.title}
                className="p-6 rounded-md border border-border/50"
                data-testid={`partner-profile-${partner.title.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <partner.icon className={`h-5 w-5 ${partner.color} mb-4`} />
                <h3 className="font-medium mb-1.5">{partner.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {partner.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 border-t border-border/50" data-testid="section-terms">
        <div className="max-w-4xl mx-auto px-6">
          <div className="mb-16">
            <p className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-3">
              Partnership Terms
            </p>
            <h2
              className="text-3xl font-light tracking-tight"
              data-testid="text-terms-title"
            >
              General partnership terms
            </h2>
            <p className="mt-4 text-muted-foreground max-w-2xl leading-relaxed">
              All GoRigo partnerships operate under clear, fair terms. Below is a
              summary of the key provisions that apply to every partnership
              programme.
            </p>
          </div>
          <div className="space-y-4">
            {terms.map((term) => (
              <div
                key={term.title}
                className="flex items-start gap-4 p-5 rounded-md border border-border/50"
                data-testid={`term-${term.title.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <term.icon className={`h-5 w-5 ${term.color} shrink-0 mt-0.5`} />
                <div>
                  <h3 className="font-medium text-sm mb-1">{term.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {term.description}
                  </p>
                </div>
              </div>
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
            <h2
              className="text-3xl font-light tracking-tight"
              data-testid="text-faq-title"
            >
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
            Ready to partner?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            Join our growing network of partners and start earning with the AI
            call centre engine trusted by businesses across the UK and beyond.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link href="/contact" data-testid="link-cta-apply">
              <Button size="lg" data-testid="button-cta-apply">
                Apply to Partner
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/contact" data-testid="link-cta-contact">
              <Button variant="outline" size="lg" data-testid="button-cta-contact">
                Talk to Us
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <ConversionCta />
      <Footer />
    </div>
  );
}
