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
  ArrowLeft,
  ChevronDown,
  CheckCircle2,
  Link2,
  BarChart3,
  MousePointerClick,
  FileText,
  Image,
  HeadphonesIcon,
  Infinity,
  Cookie,
  Network,
  BookOpen,
  DollarSign,
  Gift,
  Laptop,
  Eye,
  Timer,
  Users,
  Briefcase,
  PenTool,
  Share2,
  UserCheck,
  Calculator,
  UsersRound,
  Phone,
  TrendingUp,
  CreditCard,
  Calendar,
  Shield,
  Scale,
  Building2,
  AlertTriangle,
  Ban,
  Handshake,
  Gavel,
  Globe,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Affiliate Programme | GoRigo Partner",
  description:
    "Join the GoRigo affiliate programme and earn recurring commissions by referring businesses to our AI call centre engine. No cost to join, no technical skills needed, and no cap on earnings.",
  openGraph: {
    title: "Affiliate Programme | GoRigo Partner",
    description:
      "Join the GoRigo affiliate programme and earn recurring commissions by referring businesses to our AI call centre engine. No cost to join, no technical skills needed, and no cap on earnings.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Affiliate Programme | GoRigo Partner",
    description:
      "Join the GoRigo affiliate programme and earn recurring commissions by referring businesses to our AI call centre engine. No cost to join, no technical skills needed, and no cap on earnings.",
  },
  alternates: {
    canonical: "/partners/affiliate",
  },
};

const howItWorksSteps = [
  {
    number: "1",
    label: "Sign Up",
    description: "Create your free affiliate account",
  },
  {
    number: "2",
    label: "Get Your Link",
    description: "Receive your unique referral link and tracking code",
  },
  {
    number: "3",
    label: "Share",
    description: "Post it on your website, social media, email, or share directly",
  },
  {
    number: "4",
    label: "Someone Signs Up",
    description: "A business clicks your link and creates a GoRigo account",
  },
  {
    number: "5",
    label: "They Start Using GoRigo",
    description: "They set up AI agents and handle calls",
  },
  {
    number: "6",
    label: "You Get Paid",
    description: "Earn a percentage of their monthly usage, every month",
  },
];

const includedItems = [
  { icon: Link2, label: "Unique referral link with tracking", color: "text-fuchsia-500" },
  { icon: BarChart3, label: "Real-time affiliate dashboard", color: "text-violet-500" },
  { icon: MousePointerClick, label: "Click and conversion tracking", color: "text-sky-500" },
  { icon: FileText, label: "Monthly commission reports", color: "text-indigo-500" },
  { icon: Image, label: "Marketing materials (banners, copy, templates)", color: "text-pink-500" },
  { icon: HeadphonesIcon, label: "Dedicated affiliate support", color: "text-cyan-500" },
  { icon: Infinity, label: "No cap on earnings", color: "text-emerald-500" },
  { icon: Cookie, label: "Cookie tracking (90-day attribution window)", color: "text-amber-500" },
  { icon: Network, label: "Multi-tier commission potential (earn from sub-affiliates)", color: "text-teal-500" },
  { icon: BookOpen, label: "Promotional guidelines and brand assets", color: "text-orange-500" },
];

const benefits = [
  {
    icon: DollarSign,
    title: "Passive Income",
    description:
      "Earn recurring commissions month after month. Every time your referred client uses GoRigo for their calls, you earn a percentage of their usage. This is not a one-off payment — it continues for as long as they remain an active customer.",
    color: "text-orange-500",
  },
  {
    icon: Gift,
    title: "Zero Cost to Join",
    description:
      "There are no signup fees, no monthly fees, and no hidden charges. Creating your affiliate account is completely free, and you will never be asked to pay anything to participate in the programme.",
    color: "text-emerald-500",
  },
  {
    icon: Laptop,
    title: "No Technical Skills Needed",
    description:
      "You do not need to understand AI, call centres, or any technical systems. All you need to do is share your referral link. We handle everything else, from onboarding the client to managing their account.",
    color: "text-sky-500",
  },
  {
    icon: Eye,
    title: "Real-Time Tracking",
    description:
      "See every click, signup, and commission in your affiliate dashboard. You will always know exactly how your referrals are performing and how much you have earned, updated in real time.",
    color: "text-violet-500",
  },
  {
    icon: Timer,
    title: "Long Cookie Window",
    description:
      "Our 90-day attribution window means that if someone clicks your link today but does not sign up until three months later, you still earn the commission. No rushed decisions needed.",
    color: "text-rose-500",
  },
  {
    icon: Users,
    title: "Grow Your Network",
    description:
      "Earn from sub-affiliates you bring into the programme. When you refer other affiliates who then refer clients, you can earn additional commissions from their activity as well.",
    color: "text-pink-500",
  },
];

const affiliateProfiles = [
  {
    icon: Briefcase,
    title: "Business Consultants and Advisors",
    description:
      "You already advise businesses on how to operate more efficiently. Recommending GoRigo as part of your service offering is a natural fit. Help your clients reduce call handling costs while earning a commission for every referral.",
    color: "text-purple-500",
  },
  {
    icon: PenTool,
    title: "Industry Bloggers and Content Creators",
    description:
      "If you write about business technology, customer service, or operational efficiency, your audience is already looking for solutions like GoRigo. Share your referral link in your content and earn from every reader who signs up.",
    color: "text-pink-500",
  },
  {
    icon: Share2,
    title: "Social Media Influencers",
    description:
      "Share GoRigo with your business-focused followers. Whether you create short-form content, host webinars, or run a professional community, your recommendation carries weight and can generate ongoing commissions.",
    color: "text-fuchsia-500",
  },
  {
    icon: UserCheck,
    title: "Existing GoRigo Clients",
    description:
      "Love the product? You are in the best position to recommend it. Refer other businesses and earn commissions while helping them discover a tool you already use and trust. Your firsthand experience makes you the most credible advocate.",
    color: "text-green-500",
  },
  {
    icon: Calculator,
    title: "Accountants and Financial Advisors",
    description:
      "Help your clients save money on call handling by recommending GoRigo. You understand their costs and can demonstrate the savings. Earn a recurring commission every time a client you refer uses the platform.",
    color: "text-orange-500",
  },
  {
    icon: UsersRound,
    title: "Networking Groups and Business Communities",
    description:
      "If you run or participate in business networking groups, chambers of commerce, or professional associations, sharing GoRigo with your network is an easy way to add value for members while earning for every signup.",
    color: "text-amber-500",
  },
];

const commissionSteps = [
  {
    number: "1",
    label: "You refer a business",
    description: "Share your unique referral link with a business that could benefit from AI call handling",
  },
  {
    number: "2",
    label: "They sign up",
    description: "The business clicks your link, creates a GoRigo account, and starts setting up their AI agents",
  },
  {
    number: "3",
    label: "They use GoRigo",
    description: "Their monthly talk-time usage on the platform generates your commission automatically",
  },
  {
    number: "4",
    label: "You get paid",
    description: "Commissions are calculated monthly and paid out on the 15th of the following month",
  },
];

const termsItems = [
  {
    icon: Globe,
    title: "Eligibility",
    description:
      "The affiliate programme is open to individuals and businesses worldwide, subject to applicable sanctions and legal restrictions in your jurisdiction.",
    color: "text-amber-500",
  },
  {
    icon: TrendingUp,
    title: "Commission Structure",
    description:
      "You earn a percentage of your referred client's monthly platform usage. Exact commission rates are provided upon approval of your affiliate application.",
    color: "text-violet-500",
  },
  {
    icon: Cookie,
    title: "Attribution",
    description:
      "A 90-day cookie window applies from the first click on your referral link. If the visitor signs up within 90 days, the referral is attributed to you.",
    color: "text-rose-500",
  },
  {
    icon: CreditCard,
    title: "Payment",
    description:
      "Commissions are paid monthly via bank transfer. A minimum payout threshold applies. Details are provided upon approval.",
    color: "text-orange-500",
  },
  {
    icon: Ban,
    title: "Prohibited Activities",
    description:
      "Affiliates must not engage in spam, make misleading claims about GoRigo, or bid on GoRigo-branded keywords in paid advertising without prior written approval.",
    color: "text-red-500",
  },
  {
    icon: Image,
    title: "Brand Usage",
    description:
      "Affiliates may only use approved GoRigo marketing materials. Custom creative must be submitted for approval before use. Unauthorised use of the GoRigo brand is not permitted.",
    color: "text-pink-500",
  },
  {
    icon: Shield,
    title: "Data Protection",
    description:
      "Affiliates must comply with GDPR and all applicable data protection regulations when handling any personal data in connection with referral activities.",
    color: "text-blue-500",
  },
  {
    icon: AlertTriangle,
    title: "Fraud",
    description:
      "Any fraudulent activity, including fake signups, click fraud, or artificial inflation of metrics, will result in immediate termination of your affiliate account and forfeiture of all unpaid commissions.",
    color: "text-yellow-500",
  },
  {
    icon: Handshake,
    title: "Termination",
    description:
      "Either party may end the affiliate arrangement with 14 days written notice. Any commissions already earned up to the termination date will still be paid out in the normal payment cycle.",
    color: "text-purple-500",
  },
  {
    icon: Calendar,
    title: "Modifications",
    description:
      "GoRigo reserves the right to modify commission rates, programme terms, or the structure of the affiliate programme with 30 days notice to all active affiliates.",
    color: "text-sky-500",
  },
  {
    icon: Gavel,
    title: "Governing Law",
    description:
      "This affiliate programme is governed by the laws of England and Wales. Any disputes will be subject to the exclusive jurisdiction of the courts of England and Wales.",
    color: "text-indigo-500",
  },
  {
    icon: Building2,
    title: "Company",
    description:
      "The affiliate programme is operated by International Business Exchange Limited, registered in England and Wales, Company No. 15985956.",
    color: "text-teal-500",
  },
];

const faqs = [
  {
    question: "How do I sign up as an affiliate?",
    answer:
      "You can apply to join the affiliate programme by contacting us through our website. Once your application is reviewed and approved, you will receive access to your affiliate dashboard and your unique referral link.",
  },
  {
    question: "Is there a cost to join the programme?",
    answer:
      "No. Joining the GoRigo affiliate programme is completely free. There are no signup fees, no monthly charges, and no hidden costs. You will never be asked to pay to participate.",
  },
  {
    question: "How much can I earn?",
    answer:
      "There is no cap on your earnings. You earn a percentage of every referred client's monthly usage for as long as they remain active on the platform. The more businesses you refer, and the more they use GoRigo, the more you earn.",
  },
  {
    question: "When do I get paid?",
    answer:
      "Commissions are calculated at the end of each calendar month and paid out on the 15th of the following month via bank transfer. A minimum payout threshold applies, with details provided when you join.",
  },
  {
    question: "What if someone clicks my link but signs up later?",
    answer:
      "Our 90-day cookie window ensures you are credited for the referral. If a visitor clicks your link today and creates their GoRigo account any time within the next 90 days, the referral is attributed to you and you earn the commission.",
  },
  {
    question: "Can I promote GoRigo on social media?",
    answer:
      "Yes. You are welcome to share your referral link on social media, in blog posts, newsletters, and on your website. The only restriction is that you must not make misleading claims or bid on GoRigo-branded keywords in paid advertising without approval.",
  },
  {
    question: "What counts as a successful referral?",
    answer:
      "A successful referral is when someone clicks your unique link, creates a GoRigo account, and starts using the platform for their calls. Once they begin generating talk-time usage, your commissions start accruing.",
  },
  {
    question: "Can I be an affiliate and a whitelabel partner at the same time?",
    answer:
      "Yes. The affiliate and whitelabel programmes are separate. You can participate in both simultaneously. Many partners find that combining both programmes allows them to maximise their revenue from different types of client relationships.",
  },
];

const whatIsPoints = [
  "It is a referral scheme — you recommend GoRigo, we pay you for it",
  "No selling required — just share your link and we handle everything else",
  "You earn recurring commissions, not just a one-off payment",
  "Perfect for people who know business owners looking for better call handling",
];

export default function AffiliatePartnerPage() {
  return (
    <div className="min-h-screen bg-background" data-testid="page-affiliate">
      <WebPageJsonLd
        title="Affiliate Programme | GoRigo Partner"
        description="Join the GoRigo affiliate programme and earn recurring commissions by referring businesses to our AI call centre engine. No cost to join, no technical skills needed, and no cap on earnings."
        url="/partners/affiliate"
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Partners", url: "/partners" },
          { name: "Affiliate", url: "/partners/affiliate" },
        ]}
      />
      <FAQJsonLd items={faqs} />
      <Navbar />
      <Breadcrumbs items={[{ label: "Partners", href: "/partners" }, { label: "Affiliate" }]} />

      <section className="relative" data-testid="section-hero">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.06),transparent_60%)]" />
        <div className="relative max-w-5xl mx-auto px-6 pt-28 pb-20 text-center">
          <div className="mb-6">
            <Link href="/partners" data-testid="link-back-partners">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                All Partnerships
              </Button>
            </Link>
          </div>
          <p
            className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-6"
            data-testid="badge-affiliate"
          >
            Partner Programme
          </p>
          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-light tracking-tight leading-[1.1]"
            data-testid="text-hero-title"
          >
            Affiliate Programme
          </h1>
          <p
            className="mt-4 text-xl text-muted-foreground font-light"
            data-testid="text-hero-subtitle"
          >
            Earn by Sharing. Refer Businesses. Get Paid.
          </p>
          <p
            className="mt-6 text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed"
            data-testid="text-hero-intro"
          >
            The GoRigo affiliate programme lets you earn money by recommending
            GoRigo to businesses. You get a unique referral link, share it with
            people you know, and when someone signs up and starts using GoRigo
            for their calls, you earn a commission on their usage — every month,
            for as long as they stay.
          </p>
        </div>
      </section>

      <section className="py-24 border-t border-border/50" data-testid="section-what-is">
        <div className="max-w-3xl mx-auto px-6">
          <div className="mb-12">
            <p className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-3">
              Overview
            </p>
            <h2
              className="text-3xl font-light tracking-tight"
              data-testid="text-what-is-title"
            >
              What Is the Affiliate Programme?
            </h2>
          </div>
          <div className="space-y-4">
            {whatIsPoints.map((point, index) => (
              <div
                key={index}
                className="flex items-start gap-3"
                data-testid={`what-is-point-${index}`}
              >
                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                <p className="text-muted-foreground leading-relaxed">{point}</p>
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
              data-testid="text-how-it-works-title"
            >
              Six simple steps to earning
            </h2>
          </div>
          <div className="flex flex-col lg:flex-row items-stretch gap-0" data-testid="diagram-how-it-works">
            {howItWorksSteps.map((step, index) => (
              <div key={step.number} className="flex flex-col lg:flex-row items-center flex-1">
                <div
                  className="flex flex-col items-center text-center p-6 rounded-md border border-border/50 bg-background w-full lg:w-auto lg:min-w-[150px]"
                  data-testid={`how-step-${step.number}`}
                >
                  <span className="text-2xl font-light text-muted-foreground/40 mb-2">
                    {step.number}
                  </span>
                  <p className="font-medium text-sm mb-1">{step.label}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
                {index < howItWorksSteps.length - 1 && (
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

      <section className="py-24 border-t border-border/50" data-testid="section-whats-included">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-16">
            <p className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-3">
              Everything You Get
            </p>
            <h2
              className="text-3xl font-light tracking-tight"
              data-testid="text-included-title"
            >
              What is included
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {includedItems.map((item, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-5 rounded-md border border-border/50"
                data-testid={`included-item-${index}`}
              >
                <item.icon className={`h-5 w-5 ${item.color} shrink-0 mt-0.5`} />
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item.label}
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
              Why join the affiliate programme
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

      <section className="py-24 border-t border-border/50" data-testid="section-who-is-this-for">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-16">
            <p className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-3">
              Ideal Affiliates
            </p>
            <h2
              className="text-3xl font-light tracking-tight"
              data-testid="text-who-title"
            >
              Who is this for?
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {affiliateProfiles.map((profile) => (
              <Card
                key={profile.title}
                data-testid={`card-profile-${profile.title.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <CardContent className="p-8">
                  <profile.icon className={`h-5 w-5 ${profile.color} mb-5`} />
                  <h3 className="font-medium text-lg mb-2">{profile.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {profile.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 border-t border-border/50" data-testid="section-commissions">
        <div className="max-w-4xl mx-auto px-6">
          <div className="mb-16">
            <p className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-3">
              Commissions
            </p>
            <h2
              className="text-3xl font-light tracking-tight"
              data-testid="text-commissions-title"
            >
              How commissions work
            </h2>
          </div>
          <div className="space-y-0" data-testid="diagram-commissions">
            {commissionSteps.map((step, index) => (
              <div key={step.number} className="flex flex-col items-center">
                <div
                  className="w-full flex items-start gap-4 p-6 rounded-md border border-border/50 bg-background"
                  data-testid={`commission-step-${step.number}`}
                >
                  <span className="text-2xl font-light text-muted-foreground/40 shrink-0">
                    {step.number}
                  </span>
                  <div>
                    <p className="font-medium text-sm mb-1">{step.label}</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
                {index < commissionSteps.length - 1 && (
                  <div className="flex items-center py-2">
                    <ChevronDown className="h-5 w-5 text-muted-foreground/50" />
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-8 space-y-3">
            <div className="flex items-start gap-3" data-testid="commission-note-threshold">
              <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground leading-relaxed">
                Minimum payout threshold: details available upon signup
              </p>
            </div>
            <div className="flex items-start gap-3" data-testid="commission-note-ongoing">
              <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground leading-relaxed">
                Commissions continue for as long as the referred client remains active
              </p>
            </div>
          </div>
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
              Terms and Conditions
            </h2>
          </div>
          <div className="space-y-4">
            {termsItems.map((item, index) => (
              <div
                key={index}
                className="flex items-start gap-4 p-5 rounded-md border border-border/50"
                data-testid={`terms-item-${index}`}
              >
                <item.icon className={`h-5 w-5 ${item.color} shrink-0 mt-0.5`} />
                <div>
                  <p className="font-medium text-sm mb-1">{item.title}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.description}
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
            Start Earning Today
          </h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            Join the GoRigo affiliate programme and earn recurring commissions
            by sharing our AI call centre engine with businesses in your
            network. No cost, no risk, no cap on what you can earn.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link href="/contact" data-testid="link-cta-contact">
              <Button size="lg" data-testid="button-cta-apply">
                Apply Now
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/partners/whitelabel" data-testid="link-cta-whitelabel">
              <Button variant="outline" size="lg" data-testid="button-cta-whitelabel">
                Explore Whitelabel Partnership
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
            <Link href="/partners/whitelabel" data-testid="link-nav-whitelabel">
              <Button variant="ghost" size="sm">
                Whitelabel Partnership
                <ArrowRight className="ml-2 h-4 w-4" />
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
