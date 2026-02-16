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
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Building2,
  Users,
  Palette,
  UserPlus,
  Phone,
  Receipt,
  CreditCard,
  TrendingUp,
  Zap,
  Crown,
  RefreshCw,
  Target,
  Rocket,
  LayoutDashboard,
  Bot,
  BookOpen,
  BarChart3,
  DollarSign,
  Code,
  Headphones,
  GraduationCap,
  FileText,
  Wifi,
  Megaphone,
  Briefcase,
  Monitor,
  ClipboardCheck,
  Scale,
  Shield,
  Lock,
  Calendar,
  Eye,
  Handshake,
  Clock,
  Smartphone,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Whitelabel & Reseller Programme | GoRigo Partner",
  description:
    "Launch your own AI call centre brand with GoRigo whitelabel. Your branding, your clients, our technology. Set your own prices, manage your clients, and earn recurring revenue with zero development cost.",
  openGraph: {
    title: "Whitelabel & Reseller Programme | GoRigo Partner",
    description:
      "Launch your own AI call centre brand with GoRigo whitelabel. Your branding, your clients, our technology. Set your own prices, manage your clients, and earn recurring revenue with zero development cost.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Whitelabel & Reseller Programme | GoRigo Partner",
    description:
      "Launch your own AI call centre brand with GoRigo whitelabel. Your branding, your clients, our technology. Set your own prices, manage your clients, and earn recurring revenue with zero development cost.",
  },
  alternates: {
    canonical: "/partners/whitelabel",
  },
};

const flowSteps = [
  { icon: UserPlus, label: "You Sign Up", description: "Apply as a whitelabel partner", color: "text-pink-500" },
  { icon: Palette, label: "We Brand It", description: "Your logo, colours, and domain", color: "text-fuchsia-500" },
  { icon: Users, label: "You Add Clients", description: "Onboard your clients to your platform", color: "text-violet-500" },
  { icon: Phone, label: "Clients Use AI", description: "AI call centre under your brand", color: "text-cyan-500" },
  { icon: Receipt, label: "You Bill Clients", description: "At your own rates", color: "text-indigo-500" },
  { icon: CreditCard, label: "We Bill You", description: "At partner rates", color: "text-orange-500" },
  { icon: TrendingUp, label: "You Keep the Margin", description: "The difference is your profit", color: "text-emerald-500" },
];

const included = [
  { icon: LayoutDashboard, title: "Fully branded dashboard", description: "Your logo, colours, and custom domain on every screen", color: "text-sky-500" },
  { icon: Users, title: "Client management portal", description: "Add, remove, and manage all your clients from one place", color: "text-pink-500" },
  { icon: Bot, title: "AI agent configuration", description: "Set up and customise AI agents for each of your clients", color: "text-teal-500" },
  { icon: BookOpen, title: "Knowledge base management", description: "Upload documents and training materials per client", color: "text-indigo-500" },
  { icon: BarChart3, title: "Call analytics and reporting", description: "Per-client and aggregate reporting dashboards", color: "text-violet-500" },
  { icon: DollarSign, title: "Billing management", description: "Set your own rates and track usage across all clients", color: "text-orange-500" },
  { icon: Code, title: "API access", description: "Full API access for custom integrations and automation", color: "text-slate-500" },
  { icon: Headphones, title: "Dedicated partner support", description: "Priority support channel for partners only", color: "text-cyan-500" },
  { icon: GraduationCap, title: "Training materials", description: "Comprehensive documentation and video walkthroughs", color: "text-yellow-500" },
  { icon: RefreshCw, title: "Regular platform updates", description: "Automatic updates with no downtime for your clients", color: "text-emerald-500" },
  { icon: Rocket, title: "White-glove onboarding", description: "Hands-on setup assistance for your first 3 clients", color: "text-rose-500" },
  { icon: FileText, title: "Marketing templates", description: "Ready-to-use sales collateral and pitch materials", color: "text-amber-500" },
  { icon: Smartphone, title: "Branded mobile app", description: "Your clients get a mobile app with your logo, name, and colours via a simple partner code at login", color: "text-green-500" },
];

const benefits = [
  {
    icon: Zap,
    title: "Zero Development Cost",
    description:
      "There is no need to spend months and hundreds of thousands building your own AI platform. GoRigo gives you a fully built, tested, and maintained product that you can start selling immediately.",
    color: "text-emerald-500",
  },
  {
    icon: Crown,
    title: "Your Brand, Your Rules",
    description:
      "You have complete control over your branding, pricing, and client relationships. Your clients interact with your brand, your support team, and your sales process. GoRigo stays invisible.",
    color: "text-yellow-500",
  },
  {
    icon: TrendingUp,
    title: "Recurring Revenue",
    description:
      "Every client you add generates ongoing monthly revenue. You set the price, we charge you the partner rate, and you keep the margin. The more clients you add, the more you earn.",
    color: "text-violet-500",
  },
  {
    icon: Rocket,
    title: "Scale Without Limits",
    description:
      "Add as many clients as you want. The platform scales automatically to handle increased call volumes, new clients, and growing businesses without any additional infrastructure work on your part.",
    color: "text-rose-500",
  },
  {
    icon: RefreshCw,
    title: "Stay Ahead",
    description:
      "Access the latest AI features, voice models, and platform improvements without building them yourself. When we release new capabilities, your whitelabel platform gets them automatically.",
    color: "text-teal-500",
  },
  {
    icon: Target,
    title: "Focus on Sales",
    description:
      "We handle all the technology, hosting, updates, security, and compliance. You focus on what you do best: finding clients, building relationships, and growing your business.",
    color: "text-orange-500",
  },
];

const idealPartners = [
  {
    icon: Phone,
    title: "BPO and Call Centre Operators",
    description:
      "You already manage call centre operations for businesses. Adding AI call handling to your service offering lets you serve more clients with lower overheads while offering a cutting-edge solution that differentiates you from competitors.",
    color: "text-cyan-500",
  },
  {
    icon: Wifi,
    title: "Telecoms Companies",
    description:
      "You provide phone lines and connectivity to businesses. Bundling an AI call centre platform with your existing services creates a compelling package that increases customer retention and average revenue per account.",
    color: "text-fuchsia-500",
  },
  {
    icon: Megaphone,
    title: "Digital and Marketing Agencies",
    description:
      "Your clients already trust you with their marketing. Offering AI call handling as a value-add service means you can capture more of their budget while solving a real business problem they face every day.",
    color: "text-red-500",
  },
  {
    icon: Briefcase,
    title: "Business Consultants",
    description:
      "You advise businesses on how to improve their operations. Recommending and reselling an AI call centre platform under your own brand positions you as a solutions provider, not just an advisor.",
    color: "text-purple-500",
  },
  {
    icon: Monitor,
    title: "IT Managed Service Providers",
    description:
      "You already manage IT infrastructure for business clients. Adding AI-powered communications to your portfolio is a natural extension that creates new recurring revenue streams and deepens client relationships.",
    color: "text-sky-500",
  },
];

const requirements = [
  "Must be a registered business (sole traders welcome)",
  "Minimum commitment of 3 clients within the first 6 months",
  "Must maintain GoRigo's service quality standards",
  "Must comply with GDPR and UK data protection regulations",
  "Must not misrepresent the capabilities of the platform",
  "Must have a professional website and business email",
  "Must complete partner onboarding training",
];

const termsData = [
  {
    icon: Calendar,
    title: "Agreement Duration",
    description: "Initial 12-month term, auto-renewing annually. Either party may choose not to renew by providing notice before the renewal date.",
    color: "text-rose-500",
  },
  {
    icon: Palette,
    title: "Branding",
    description: "Partners may use their own branding on the platform but must not claim ownership of the underlying technology. All marketing materials must be accurate and not misleading.",
    color: "text-pink-500",
  },
  {
    icon: Shield,
    title: "Data Ownership",
    description: "Client data belongs to the client. Partners act as data processors under GDPR. GoRigo acts as a sub-processor. All parties must comply with applicable data protection legislation.",
    color: "text-blue-500",
  },
  {
    icon: Clock,
    title: "Service Level",
    description: "GoRigo commits to 99.5% platform uptime. Partners must communicate SLAs accurately to their clients and must not promise uptime guarantees beyond what GoRigo provides.",
    color: "text-amber-500",
  },
  {
    icon: Receipt,
    title: "Billing",
    description: "Partners are invoiced monthly based on aggregate client usage at partner rates. Detailed usage breakdowns are available through the partner dashboard.",
    color: "text-indigo-500",
  },
  {
    icon: CreditCard,
    title: "Payment Terms",
    description: "Net 30 days from invoice date. Late payments may incur interest at the statutory rate. Persistent non-payment may result in service suspension.",
    color: "text-orange-500",
  },
  {
    icon: Lock,
    title: "IP Rights",
    description: "All GoRigo technology, code, and AI models remain the property of International Business Exchange Limited. Partners receive a licence to use the platform, not ownership of it.",
    color: "text-slate-500",
  },
  {
    icon: Handshake,
    title: "Non-Compete",
    description: "Partners are not restricted from offering competing products. The partnership is non-exclusive. GoRigo may also appoint other partners in the same market.",
    color: "text-purple-500",
  },
  {
    icon: Eye,
    title: "Termination",
    description: "Either party may terminate with 60 days written notice. Upon termination, client data will be made available for export for a period of 30 days.",
    color: "text-sky-500",
  },
  {
    icon: Scale,
    title: "Liability",
    description: "GoRigo's liability is limited to the total fees paid by the partner in the preceding 12 months. Neither party is liable for indirect, consequential, or incidental damages.",
    color: "text-violet-500",
  },
  {
    icon: Building2,
    title: "Governing Law",
    description: "This agreement is governed by the laws of England and Wales. GoRigo is operated by International Business Exchange Limited, Company No. 15985956.",
    color: "text-teal-500",
  },
];

const faqs = [
  {
    question: "How long does it take to set up my whitelabel platform?",
    answer:
      "Most whitelabel platforms are fully configured and ready to use within 5 to 10 business days. This includes setting up your custom branding, domain, and initial configuration. If you have specific integration requirements, it may take a few additional days.",
  },
  {
    question: "Can I customise the AI agent voices and behaviour?",
    answer:
      "Yes. You and your clients can configure AI agent personas, voices, tone of conversation, and call handling rules through the dashboard. Each client can have their own unique agent configuration tailored to their business needs.",
  },
  {
    question: "What happens if I need technical help?",
    answer:
      "Whitelabel partners have access to a dedicated partner support channel with priority response times. You also receive a dedicated partner manager who can help with technical questions, onboarding new clients, and resolving any platform issues.",
  },
  {
    question: "Can my clients see that GoRigo is behind the platform?",
    answer:
      "No. The whitelabel platform is fully branded with your identity. Your logo, your colours, your domain. There is no GoRigo branding visible to your clients or their callers. As far as your clients are concerned, this is your product.",
  },
  {
    question: "How do I set my own pricing?",
    answer:
      "You have complete freedom to set your own pricing structure. You might charge per minute, per agent, a monthly subscription, or any combination. We bill you at the agreed partner rate, and the difference between what you charge your clients and what we charge you is your margin.",
  },
  {
    question: "What if a client wants to leave?",
    answer:
      "You manage the client relationship directly. If a client wants to leave your platform, you handle the offboarding process. Client data can be exported through the dashboard. There are no lock-in penalties for your clients.",
  },
  {
    question: "Do I need to handle billing myself?",
    answer:
      "Yes, you bill your clients directly at whatever rates you set. We bill you separately at partner rates based on aggregate usage. The partner dashboard provides detailed usage data per client so you can generate accurate invoices.",
  },
  {
    question: "Can I start with just one client?",
    answer:
      "You can start with one client, but the partner agreement requires a minimum of 3 clients within the first 6 months. We recommend starting with a pilot client to learn the platform, then scaling from there.",
  },
  {
    question: "Do my clients get a branded mobile app?",
    answer:
      "Yes. When you enable the mobile app in your partner settings, your clients can download the GoRigo app and enter your unique partner code at login. The app automatically loads your branding, including your logo, name, and brand colour. Your clients see your brand throughout the entire mobile experience.",
  },
];

export default function WhitelabelPage() {
  return (
    <PublicLayout>
    <div className="min-h-screen bg-background" data-testid="page-whitelabel">
      <WebPageJsonLd
        title="Whitelabel & Reseller Programme | GoRigo Partner"
        description="Launch your own AI call centre brand with GoRigo whitelabel. Your branding, your clients, our technology. Set your own prices, manage your clients, and earn recurring revenue with zero development cost."
        url="/partners/whitelabel"
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Partners", url: "/partners" },
          { name: "Whitelabel", url: "/partners/whitelabel" },
        ]}
      />
      <FAQJsonLd items={faqs} />
      <Navbar />
      <Breadcrumbs items={[{ label: "Partners", href: "/partners" }, { label: "Whitelabel" }]} />

      <section className="relative" data-testid="section-hero">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.06),transparent_60%)]" />
        <div className="relative max-w-5xl mx-auto px-6 pt-28 pb-20 text-center">
          <Link
            href="/partners"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground mb-6"
            data-testid="link-back-partners"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            All Partnerships
          </Link>
          <p
            className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-6"
            data-testid="badge-whitelabel"
          >
            Whitelabel Programme
          </p>
          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-light tracking-tight leading-[1.1]"
            data-testid="text-hero-title"
          >
            Whitelabel and Reseller Programme
          </h1>
          <p
            className="mt-4 text-xl text-muted-foreground font-light"
            data-testid="text-hero-subtitle"
          >
            Your Brand. Your Clients. Our Technology.
          </p>
          <p
            className="mt-6 text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed"
            data-testid="text-hero-intro"
          >
            Whitelabelling means taking GoRigo's AI call centre technology and
            putting your own brand on it. Your logo, your colours, your domain,
            and even a branded mobile app for your clients.
            Your clients use the platform under your name and never know that
            GoRigo exists behind the scenes. You sell it, you support it, you
            set the price, and you keep the margin.
          </p>
        </div>
      </section>

      <section className="py-24 border-t border-border/50" data-testid="section-what-is">
        <div className="max-w-3xl mx-auto px-6">
          <div className="mb-12">
            <p className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-3">
              Simply Explained
            </p>
            <h2
              className="text-3xl font-light tracking-tight"
              data-testid="text-what-is-title"
            >
              What is whitelabelling?
            </h2>
          </div>
          <div className="space-y-6">
            <p className="text-muted-foreground leading-relaxed" data-testid="text-what-is-analogy">
              Think of it like a supermarket's own-brand products. The product
              is made by someone else, but it carries your name. Customers buy
              it from you, trust your brand, and come back to you for more.
              The manufacturer stays behind the scenes.
            </p>
            <p className="text-muted-foreground leading-relaxed" data-testid="text-what-is-gorigo">
              With GoRigo whitelabel, you get a fully functional AI call centre
              platform under your brand. Everything your clients see and
              interact with carries your name, your logo, and your identity.
            </p>
            <p className="text-muted-foreground leading-relaxed" data-testid="text-what-is-control">
              You set your own prices, manage your own clients, and keep the
              margin between what you charge and what we charge you. You are
              in control of the business relationship.
            </p>
            <p className="text-muted-foreground leading-relaxed" data-testid="text-what-is-backend">
              We handle all the technology, updates, hosting, security, and
              platform support behind the scenes. You never need to worry about
              servers, code, or infrastructure. When we improve the platform,
              your whitelabel version improves automatically.
            </p>
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
              From sign-up to profit in seven steps
            </h2>
          </div>

          <div className="flex flex-col lg:flex-row items-stretch gap-0" data-testid="diagram-flow">
            {flowSteps.map((step, index) => (
              <div key={step.label} className="flex flex-col lg:flex-row items-center flex-1">
                <div
                  className="flex flex-col items-center text-center p-5 rounded-md border border-border/50 bg-background w-full lg:w-auto lg:min-w-[140px]"
                  data-testid={`flow-step-${index}`}
                >
                  <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center mb-3">
                    <step.icon className={`h-4 w-4 ${step.color}`} />
                  </div>
                  <p className="font-medium text-sm mb-1">{step.label}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
                {index < flowSteps.length - 1 && (
                  <>
                    <div className="hidden lg:flex items-center px-1">
                      <ArrowRight className="h-4 w-4 text-muted-foreground/50" />
                    </div>
                    <div className="flex lg:hidden items-center py-2">
                      <ChevronDown className="h-4 w-4 text-muted-foreground/50" />
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 border-t border-border/50" data-testid="section-included">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-16">
            <p className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-3">
              Platform Features
            </p>
            <h2
              className="text-3xl font-light tracking-tight"
              data-testid="text-included-title"
            >
              What is included
            </h2>
            <p className="mt-4 text-muted-foreground max-w-2xl leading-relaxed">
              Every whitelabel partner receives a complete platform with all
              the tools needed to manage and grow a successful AI call centre
              business.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {included.map((item) => (
              <div
                key={item.title}
                className="p-6 rounded-md border border-border/50"
                data-testid={`included-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <item.icon className={`h-5 w-5 ${item.color} mb-4`} />
                <h3 className="font-medium mb-1.5">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
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
            <h2
              className="text-3xl font-light tracking-tight"
              data-testid="text-benefits-title"
            >
              Why partners choose GoRigo whitelabel
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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

      <section className="py-24 border-t border-border/50" data-testid="section-who">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-16">
            <p className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-3">
              Ideal Partners
            </p>
            <h2
              className="text-3xl font-light tracking-tight"
              data-testid="text-who-title"
            >
              Who is this for?
            </h2>
            <p className="mt-4 text-muted-foreground max-w-2xl leading-relaxed">
              The whitelabel programme is designed for businesses that already
              serve other businesses and want to add AI call centre capabilities
              to their offering.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {idealPartners.map((partner) => (
              <Card
                key={partner.title}
                data-testid={`card-partner-${partner.title.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <CardContent className="p-8">
                  <partner.icon className={`h-5 w-5 ${partner.color} mb-5`} />
                  <h3 className="font-medium text-lg mb-2">{partner.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {partner.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 border-t border-border/50" data-testid="section-requirements">
        <div className="max-w-3xl mx-auto px-6">
          <div className="mb-12">
            <p className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-3">
              Eligibility
            </p>
            <h2
              className="text-3xl font-light tracking-tight"
              data-testid="text-requirements-title"
            >
              Requirements and eligibility
            </h2>
            <p className="mt-4 text-muted-foreground max-w-2xl leading-relaxed">
              We want every whitelabel partner to succeed. The following
              requirements help ensure a productive and professional
              partnership.
            </p>
          </div>
          <ul className="space-y-3" data-testid="list-requirements">
            {requirements.map((req, index) => (
              <li
                key={index}
                className="flex items-start gap-3 text-sm"
                data-testid={`requirement-${index}`}
              >
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                <span className="text-muted-foreground leading-relaxed">{req}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="py-24 border-t border-border/50" data-testid="section-terms">
        <div className="max-w-4xl mx-auto px-6">
          <div className="mb-16">
            <p className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-3">
              Legal
            </p>
            <h2
              className="text-3xl font-light tracking-tight"
              data-testid="text-terms-title"
            >
              Terms and conditions
            </h2>
            <p className="mt-4 text-muted-foreground max-w-2xl leading-relaxed">
              The following is a summary of the key terms that govern the
              whitelabel partnership. Full terms are provided upon application
              approval.
            </p>
          </div>
          <div className="space-y-4">
            {termsData.map((term) => (
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
            Ready to Launch Your Own AI Call Centre Brand?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            Get in touch to discuss how the whitelabel programme can work for
            your business. We will walk you through the platform, answer your
            questions, and help you get started.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link href="/contact" data-testid="link-cta-contact">
              <Button size="lg" data-testid="button-cta-contact">
                Get in Touch
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/partners/affiliate" data-testid="link-cta-affiliate">
              <Button variant="outline" size="lg" data-testid="button-cta-affiliate">
                View Affiliate Programme
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-border/50" data-testid="section-nav">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <Link href="/partners" data-testid="link-nav-partners">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                All Partnerships
              </Button>
            </Link>
            <Link href="/partners/affiliate" data-testid="link-nav-affiliate">
              <Button variant="ghost" size="sm">
                Affiliate Programme
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <ConversionCta talkToAiMessage="Talk to AI about White Label solutions" />
      <Footer />
    </div>
    </PublicLayout>
  );
}
