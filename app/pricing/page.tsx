import { Metadata } from "next";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { WebPageJsonLd, BreadcrumbJsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { ConversionCta } from "@/components/seo/conversion-cta";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { CheckCircle2, Minus, ArrowRight } from "lucide-react";
import { PricingFaq } from "./faq";

export const metadata: Metadata = {
  title: "Pricing - Flexible AI Call Centre Packages | GoRigo",
  description:
    "Choose the right GoRigo deployment for your business. Talk-time only billing with no subscriptions. Managed, Bring Your Own Key, or Self-Hosted packages available.",
  openGraph: {
    title: "Pricing - Flexible AI Call Centre Packages | GoRigo",
    description:
      "Choose the right GoRigo deployment for your business. Talk-time only billing with no subscriptions.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pricing - Flexible AI Call Centre Packages | GoRigo",
    description:
      "Choose the right GoRigo deployment for your business. Talk-time only billing with no subscriptions. Managed, Bring Your Own Key, or Self-Hosted packages available.",
  },
  alternates: {
    canonical: "/pricing",
  },
};

const packages = [
  {
    name: "Managed",
    description: "We run everything. You focus on your business while our team handles the entire AI call centre stack.",
    features: [
      "Fully managed AI agents",
      "Dedicated account manager",
      "Custom voice configuration",
      "Priority support",
      "SLA guarantees",
      "Custom integrations",
    ],
    bestFor: "Businesses that want zero technical overhead.",
    cta: "Book a Demo",
    href: "/contact",
    featured: false,
  },
  {
    name: "Bring Your Own Key",
    description: "Use your own OpenAI or Anthropic API keys with our platform for maximum cost control.",
    features: [
      "Full platform access",
      "Lower per-minute costs",
      "Self-service dashboard",
      "Community support",
      "All platform features",
      "Use your own API keys",
    ],
    bestFor: "Tech-savvy teams wanting cost control.",
    cta: "Get Started",
    href: "/register",
    featured: true,
  },
  {
    name: "Self-Hosted",
    description: "Deploy on your own infrastructure with complete control over data and operations.",
    features: [
      "On-premise or private cloud",
      "Complete data sovereignty",
      "Custom SLAs",
      "White-label option",
      "Enterprise support",
      "Full source access",
    ],
    bestFor: "Enterprises with strict data requirements.",
    cta: "Contact Sales",
    href: "/contact",
    featured: false,
  },
];

const comparisonFeatures = [
  { name: "AI Agent Management", managed: true, byok: true, selfHosted: true },
  { name: "Knowledge Base", managed: true, byok: true, selfHosted: true },
  { name: "Real-Time Analytics", managed: true, byok: true, selfHosted: true },
  { name: "Call Recording", managed: true, byok: true, selfHosted: true },
  { name: "Multi-Language", managed: true, byok: true, selfHosted: true },
  { name: "DNC Management", managed: true, byok: true, selfHosted: true },
  { name: "API Access", managed: true, byok: true, selfHosted: true },
  { name: "Custom Integrations", managed: true, byok: false, selfHosted: true },
  { name: "Dedicated Account Manager", managed: true, byok: false, selfHosted: true },
  { name: "SLA Guarantee", managed: true, byok: false, selfHosted: true },
  { name: "White Label", managed: false, byok: false, selfHosted: true },
  { name: "On-Premise Deployment", managed: false, byok: false, selfHosted: true },
];

function FeatureIcon({ included }: { included: boolean }) {
  if (included) {
    return <CheckCircle2 className="h-4 w-4 text-foreground/60 mx-auto" />;
  }
  return <Minus className="h-4 w-4 text-muted-foreground/40 mx-auto" />;
}

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background" data-testid="page-pricing">
      <WebPageJsonLd
        title="Pricing - Flexible AI Call Centre Packages | GoRigo"
        description="Choose the right GoRigo deployment for your business. Talk-time only billing with no subscriptions. Managed, Bring Your Own Key, or Self-Hosted packages available."
        url="/pricing"
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Pricing", url: "/pricing" },
        ]}
      />
      <Navbar />
      <Breadcrumbs items={[{ label: "Pricing" }]} />

      <section className="relative" data-testid="section-pricing-hero">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.06),transparent_60%)]" />
        <div className="relative max-w-5xl mx-auto px-6 pt-28 pb-20 text-center">
          <p className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-6" data-testid="badge-pricing">
            Talk-Time Only Billing
          </p>
          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-light tracking-tight leading-[1.1]"
            data-testid="text-pricing-hero-title"
          >
            Flexible pricing for
            <br />
            <span className="font-normal">every business</span>
          </h1>
          <p
            className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed"
            data-testid="text-pricing-hero-subtitle"
          >
            No subscriptions. No seat fees. Pay only for the actual minutes your
            AI agents spend on calls.
          </p>
        </div>
      </section>

      <section className="py-20" data-testid="section-packages">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {packages.map((pkg) => (
              <Card
                key={pkg.name}
                className={pkg.featured ? "border-primary/40" : ""}
                data-testid={`card-package-${pkg.name.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <CardContent className="p-8">
                  {pkg.featured && (
                    <p className="text-xs font-medium tracking-widest uppercase text-primary mb-4" data-testid="badge-most-popular">
                      Most Popular
                    </p>
                  )}
                  <h3 className="font-medium text-xl mb-2">{pkg.name}</h3>
                  <p className="text-sm text-muted-foreground mb-2">{pkg.description}</p>
                  <p className="text-xs text-muted-foreground mb-6">
                    Pay per minute of AI agent call time
                  </p>
                  <ul className="space-y-2.5 mb-6">
                    {pkg.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-muted-foreground mb-6">
                    <span className="font-medium text-foreground">Best for:</span> {pkg.bestFor}
                  </p>
                  <Link href={pkg.href}>
                    <Button
                      variant={pkg.featured ? "default" : "outline"}
                      className="w-full"
                      data-testid={`button-package-${pkg.name.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      {pkg.cta}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 border-t border-border/50" data-testid="section-comparison">
        <div className="max-w-4xl mx-auto px-6">
          <div className="mb-12">
            <p className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-3">
              Comparison
            </p>
            <h2 className="text-3xl font-light tracking-tight" data-testid="text-comparison-title">
              Feature comparison
            </h2>
          </div>
          <Card data-testid="card-comparison-table">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left p-4 font-medium text-muted-foreground">Feature</th>
                      <th className="text-center p-4 font-medium text-muted-foreground">Managed</th>
                      <th className="text-center p-4 font-medium text-foreground">BYOK</th>
                      <th className="text-center p-4 font-medium text-muted-foreground">Self-Hosted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonFeatures.map((feature, index) => (
                      <tr
                        key={feature.name}
                        className={index < comparisonFeatures.length - 1 ? "border-b border-border/50" : ""}
                        data-testid={`row-feature-${feature.name.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        <td className="p-4 text-foreground">{feature.name}</td>
                        <td className="p-4">
                          <FeatureIcon included={feature.managed} />
                        </td>
                        <td className="p-4">
                          <FeatureIcon included={feature.byok} />
                        </td>
                        <td className="p-4">
                          <FeatureIcon included={feature.selfHosted} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="py-20 border-t border-border/50" data-testid="section-faq">
        <div className="max-w-3xl mx-auto px-6">
          <div className="mb-12">
            <p className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-3">
              FAQ
            </p>
            <h2 className="text-3xl font-light tracking-tight" data-testid="text-faq-title">
              Frequently asked questions
            </h2>
          </div>
          <PricingFaq />
        </div>
      </section>

      <section className="py-20 border-t border-border/50" data-testid="section-pricing-cta">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-light tracking-tight mb-4" data-testid="text-pricing-cta-title">
            Not sure which package is right?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            Our team can help you choose the best deployment option for your
            business.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link href="/contact">
              <Button size="lg" data-testid="button-cta-book-demo">
                Book a Demo
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button variant="outline" size="lg" data-testid="button-cta-contact-sales">
                Contact Sales
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
