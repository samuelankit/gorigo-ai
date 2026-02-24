import type { Metadata } from "next";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { PublicLayout } from "@/components/public-layout";
import { WebPageJsonLd, BreadcrumbJsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { ConversionCta } from "@/components/seo/conversion-cta";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Building2,
  Users,
  Handshake,
  ArrowRight,
  Zap,
  Eye,
  Shield,
} from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "About GoRigo | International Business Exchange Limited",
  description:
    "GoRigo is built by International Business Exchange Limited, a UK-registered company. Learn about our mission to reimagine business operations with AI.",
  openGraph: {
    title: "About GoRigo | International Business Exchange Limited",
    description:
      "GoRigo is built by International Business Exchange Limited, a UK-registered company. Learn about our mission to reimagine business operations with AI.",
  },
  twitter: {
    card: "summary_large_image",
    title: "About GoRigo | International Business Exchange Limited",
    description:
      "GoRigo is built by International Business Exchange Limited, a UK-registered company. Learn about our mission to reimagine business operations with AI.",
  },
  alternates: {
    canonical: "/about",
  },
};

const values = [
  {
    icon: Zap,
    title: "Automation First",
    description:
      "We believe the best business platform is one that runs itself. Every feature is designed to reduce manual work.",
    iconBg: "bg-amber-500/10 dark:bg-amber-500/15",
    iconColor: "text-amber-500",
  },
  {
    icon: Eye,
    title: "Transparency",
    description:
      "No hidden fees, no lock-in contracts, no surprises. Talk-time billing means you only pay for what you use.",
    iconBg: "bg-emerald-500/10 dark:bg-emerald-500/15",
    iconColor: "text-emerald-500",
  },
  {
    icon: Shield,
    title: "Compliance by Design",
    description:
      "From DNC registries to PII redaction, compliance isn\u2019t an afterthought \u2014 it\u2019s built into the platform from the ground up.",
    iconBg: "bg-blue-500/10 dark:bg-blue-500/15",
    iconColor: "text-blue-500",
  },
];

const partners = [
  {
    icon: Building2,
    title: "Business Partners",
    description:
      "White-label GoRigo under your own brand. Resell AI business platform capabilities to your clients with full platform access and dedicated support.",
    iconBg: "bg-blue-500/10 dark:bg-blue-500/15",
    iconColor: "text-blue-500",
    href: "/partners/whitelabel",
    linkLabel: "Explore Whitelabel",
  },
  {
    icon: Users,
    title: "Direct-to-Consumer",
    description:
      "Sign up directly and deploy your own AI agents. Ideal for businesses that want to manage their operations from one platform.",
    iconBg: "bg-emerald-500/10 dark:bg-emerald-500/15",
    iconColor: "text-emerald-500",
    href: "/register",
    linkLabel: "Get Started",
  },
  {
    icon: Handshake,
    title: "Affiliate Partners",
    description:
      "Refer businesses to GoRigo and earn commissions on every customer you bring to the platform. Simple tracking, transparent payouts.",
    iconBg: "bg-violet-500/10 dark:bg-violet-500/15",
    iconColor: "text-violet-500",
    href: "/partners/affiliate",
    linkLabel: "Become an Affiliate",
  },
];

export default function AboutPage() {
  return (
    <PublicLayout>
    <div className="min-h-screen bg-background" data-testid="page-about">
      <WebPageJsonLd
        title="About GoRigo | International Business Exchange Limited"
        description="GoRigo is built by International Business Exchange Limited, a UK-registered company. Learn about our mission to reimagine business operations with AI."
        url="/about"
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "About", url: "/about" },
        ]}
      />
      <Navbar />
      <Breadcrumbs items={[{ label: "About" }]} />

      <section
        className="relative overflow-hidden"
        data-testid="section-about-hero"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#E8604C]/8 via-transparent to-[#F5A623]/8 dark:from-[#E8604C]/5 dark:to-[#F5A623]/5" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.12),transparent_65%)]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.06),transparent_70%)]" />

        <div className="relative max-w-5xl mx-auto px-6 pt-28 pb-20 text-center">
          <Badge variant="outline" className="mb-6 px-4 py-1.5 text-xs font-medium tracking-wide border-[#E8604C]/30 text-[#E8604C] dark:text-[#F5A623]" data-testid="badge-about">
            <span className="relative flex h-2 w-2 mr-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#E8604C] opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#E8604C]" />
            </span>
            About GoRigo
          </Badge>
          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]"
            data-testid="text-about-hero-title"
          >
            Reimagining business operations
            <br />
            <span className="bg-gradient-to-r from-[#E8604C] via-[#F09040] to-[#F5A623] bg-clip-text text-transparent">for the AI era</span>
          </h1>
        </div>
      </section>

      <section className="py-20" data-testid="section-mission">
        <div className="max-w-2xl mx-auto px-6">
          <p
            className="text-lg leading-relaxed text-muted-foreground"
            data-testid="text-mission"
          >
            GoRigo started with a simple idea &mdash; what if AI could answer
            every call your business receives, 24/7, in any language? That
            idea quickly grew into something bigger. Today, GoRigo is a
            complete AI business platform that handles voice agents, outbound
            campaigns, team management, finance, knowledge bases, and
            compliance &mdash; all from your phone. We believe businesses
            shouldn&rsquo;t need five different tools to operate. One platform,
            one wallet, one dashboard. No more missed calls, no more scattered
            tools, no more compliance gaps.
          </p>
          <Badge variant="outline" className="mt-10 px-4 py-1.5 text-xs font-medium tracking-wide border-emerald-500/30 text-emerald-600 dark:text-emerald-400" data-testid="text-social-proof">
            <span className="relative flex h-2 w-2 mr-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Trusted by businesses across 15+ industries
          </Badge>
        </div>
      </section>

      <section
        className="py-20 border-t border-border/50"
        data-testid="section-company"
      >
        <div className="max-w-2xl mx-auto px-6 text-center">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-md bg-blue-500/10 dark:bg-blue-500/15 mb-6">
            <Building2 className="h-6 w-6 text-blue-500" />
          </div>
          <h2
            className="text-3xl font-light tracking-tight mb-4"
            data-testid="text-company-title"
          >
            A UK Company
          </h2>
          <p
            className="text-muted-foreground leading-relaxed"
            data-testid="text-company-description"
          >
            International Business Exchange Limited is registered in England and
            Wales (Company No. 15985956). Based at Cotton Court Business Centre, Cotton Ct, Preston PR1 3BY, England,
            we build technology that meets the highest standards of UK and
            European compliance, including GDPR, DNC regulations, and data
            protection requirements.
          </p>
        </div>
      </section>

      <section className="relative py-24 border-t border-border/50" data-testid="section-values">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-500/[0.03] via-transparent to-emerald-500/[0.03] dark:from-amber-500/[0.02] dark:to-emerald-500/[0.02]" />
        <div className="relative max-w-6xl mx-auto px-6">
          <div className="mb-16">
            <p className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-3">
              Values
            </p>
            <h2
              className="text-3xl font-light tracking-tight"
              data-testid="text-values-title"
            >
              What drives us
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {values.map((value) => (
              <Card
                key={value.title}
                data-testid={`card-value-${value.title.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <CardContent className="p-8">
                  <div className={`inline-flex items-center justify-center h-10 w-10 rounded-md ${value.iconBg} mb-5`}>
                    <value.icon className={`h-5 w-5 ${value.iconColor}`} />
                  </div>
                  <h3 className="font-medium text-lg mb-2">{value.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {value.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section
        className="relative py-24 border-t border-border/50"
        data-testid="section-partners"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-violet-500/[0.03] via-transparent to-blue-500/[0.03] dark:from-violet-500/[0.02] dark:to-blue-500/[0.02]" />
        <div className="relative max-w-6xl mx-auto px-6">
          <div className="mb-16">
            <p className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-3">
              Partnership
            </p>
            <h2
              className="text-3xl font-light tracking-tight"
              data-testid="text-partners-title"
            >
              Partner with us
            </h2>
            <p className="mt-3 text-muted-foreground max-w-lg">
              GoRigo supports a three-tier partnership model designed to fit your
              business.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {partners.map((partner) => (
              <Card
                key={partner.title}
                data-testid={`card-partner-${partner.title.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <CardContent className="p-8 flex flex-col h-full">
                  <div className={`inline-flex items-center justify-center h-10 w-10 rounded-md ${partner.iconBg} mb-5`}>
                    <partner.icon className={`h-5 w-5 ${partner.iconColor}`} />
                  </div>
                  <h3 className="font-medium text-lg mb-2">
                    {partner.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-5 flex-1">
                    {partner.description}
                  </p>
                  <Link href={partner.href}>
                    <Button
                      variant="outline"
                      size="sm"
                      data-testid={`link-partner-${partner.title.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      {partner.linkLabel}
                      <ArrowRight className="ml-2 h-3 w-3" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="relative py-24 border-t border-border/50" data-testid="section-about-cta">
        <div className="absolute inset-0 bg-gradient-to-br from-[#E8604C]/[0.04] via-transparent to-[#F5A623]/[0.04] dark:from-[#E8604C]/[0.03] dark:to-[#F5A623]/[0.03]" />
        <div className="relative max-w-2xl mx-auto px-6 text-center">
          <h2
            className="text-3xl font-light tracking-tight mb-4"
            data-testid="text-about-cta-title"
          >
            Ready to work with us?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            Whether you want to deploy AI agents for your own business or
            partner with us to serve your clients, we would love to hear from
            you.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link href="/register">
              <Button size="lg" data-testid="button-about-get-started">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button variant="outline" size="lg" data-testid="button-about-contact">
                Contact Us
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <ConversionCta talkToAiMessage="We want to hear your story — Talk to our AI" />
      <Footer />
    </div>
    </PublicLayout>
  );
}
