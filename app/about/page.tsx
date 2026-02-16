import type { Metadata } from "next";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { PublicLayout } from "@/components/public-layout";
import { WebPageJsonLd, BreadcrumbJsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { ConversionCta } from "@/components/seo/conversion-cta";
import { Card, CardContent } from "@/components/ui/card";
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

export const metadata: Metadata = {
  title: "About GoRigo | International Business Exchange Limited",
  description:
    "GoRigo is built by International Business Exchange Limited, a UK-registered company. Learn about our mission to reimagine the call centre with AI-powered voice agents.",
  openGraph: {
    title: "About GoRigo | International Business Exchange Limited",
    description:
      "GoRigo is built by International Business Exchange Limited, a UK-registered company. Learn about our mission to reimagine the call centre with AI-powered voice agents.",
  },
  twitter: {
    card: "summary_large_image",
    title: "About GoRigo | International Business Exchange Limited",
    description:
      "GoRigo is built by International Business Exchange Limited, a UK-registered company. Learn about our mission to reimagine the call centre with AI-powered voice agents.",
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
      "We believe the best call centre is one that runs itself. Every feature is designed to reduce manual work.",
    color: "text-emerald-500",
  },
  {
    icon: Eye,
    title: "Transparency",
    description:
      "No hidden fees, no lock-in contracts, no surprises. Talk-time billing means you only pay for what you use.",
    color: "text-sky-500",
  },
  {
    icon: Shield,
    title: "Compliance by Design",
    description:
      "From DNC registries to PII redaction, compliance isn\u2019t an afterthought \u2014 it\u2019s built into the platform from the ground up.",
    color: "text-blue-500",
  },
];

const partners = [
  {
    icon: Building2,
    title: "Business Partners",
    description:
      "White-label GoRigo under your own brand. Resell AI call centre capabilities to your clients with full platform access and dedicated support.",
    color: "text-violet-500",
  },
  {
    icon: Users,
    title: "Direct-to-Consumer",
    description:
      "Sign up directly and deploy your own AI agents. Ideal for businesses that want to manage their call centre operations in-house.",
    color: "text-pink-500",
  },
  {
    icon: Handshake,
    title: "Affiliate Partners",
    description:
      "Refer businesses to GoRigo and earn commissions on every customer you bring to the platform. Simple tracking, transparent payouts.",
    color: "text-amber-500",
  },
];

export default function AboutPage() {
  return (
    <PublicLayout>
    <div className="min-h-screen bg-background" data-testid="page-about">
      <WebPageJsonLd
        title="About GoRigo | International Business Exchange Limited"
        description="GoRigo is built by International Business Exchange Limited, a UK-registered company. Learn about our mission to reimagine the call centre with AI-powered voice agents."
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
        className="relative"
        data-testid="section-about-hero"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.06),transparent_60%)]" />
        <div className="relative max-w-5xl mx-auto px-6 pt-28 pb-20 text-center">
          <p className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-6" data-testid="badge-about">
            About
          </p>
          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-light tracking-tight leading-[1.1]"
            data-testid="text-about-hero-title"
          >
            Reimagining the call centre
            <br />
            <span className="font-normal">for the AI era</span>
          </h1>
        </div>
      </section>

      <section className="py-20" data-testid="section-mission">
        <div className="max-w-2xl mx-auto px-6">
          <p
            className="text-lg leading-relaxed text-muted-foreground"
            data-testid="text-mission"
          >
            GoRigo was built to solve a real problem &mdash; traditional call
            centres are expensive, hard to scale, and deliver inconsistent
            experiences. We believe AI can do better. GoRigo gives businesses of
            any size the power to deploy intelligent voice agents that handle
            calls with human-like understanding, 24/7, at a fraction of the
            cost.
          </p>
        </div>
      </section>

      <section
        className="py-20 border-t border-border/50"
        data-testid="section-company"
      >
        <div className="max-w-2xl mx-auto px-6 text-center">
          <Building2 className="h-6 w-6 text-muted-foreground mx-auto mb-6" />
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
            Wales (Company No. 15985956). Headquartered in the United Kingdom,
            we build technology that meets the highest standards of UK and
            European compliance, including GDPR, DNC regulations, and data
            protection requirements.
          </p>
        </div>
      </section>

      <section className="py-24 border-t border-border/50" data-testid="section-values">
        <div className="max-w-6xl mx-auto px-6">
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
                  <value.icon className={`h-5 w-5 ${value.color} mb-5`} />
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
        className="py-24 border-t border-border/50"
        data-testid="section-partners"
      >
        <div className="max-w-6xl mx-auto px-6">
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
                <CardContent className="p-8">
                  <partner.icon className={`h-5 w-5 ${partner.color} mb-5`} />
                  <h3 className="font-medium text-lg mb-2">
                    {partner.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {partner.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 border-t border-border/50" data-testid="section-about-cta">
        <div className="max-w-2xl mx-auto px-6 text-center">
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
