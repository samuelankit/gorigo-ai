"use client";

import { Fragment, useEffect, useState } from "react";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { PublicLayout } from "@/components/public-layout";
import { WebPageJsonLd, BreadcrumbJsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { ConversionCta } from "@/components/seo/conversion-cta";
import { TalkTimeInfo } from "@/components/talk-time-info";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { CheckCircle2, Minus, ArrowRight, MessageSquare, Users } from "lucide-react";
import { PricingFaq } from "./faq";

interface PackageVisibility {
  individual: boolean;
  team: boolean;
}

const allPackages = [
  {
    key: "individual" as const,
    name: "Individual",
    rate: "From 20p",
    rateUnit: "/min",
    description: "Everything you need to run your own AI-powered operation. One person, full control, zero complexity.",
    features: [
      "Fully managed AI agents",
      "Custom voice configuration",
      "Priority support",
      "SLA guarantees",
      "Custom integrations",
      "Analytics dashboards",
      "Mobile app included",
    ],
    bestFor: "Individual operators who want a complete AI solution.",
    cta: "Get Started",
    href: "/register",
    featured: false,
    mobileApp: true,
    themeColor: "blue",
    borderClass: "border-t-4 border-t-blue-500",
    badgeClass: "text-blue-600 dark:text-blue-400",
    checkClass: "text-blue-500 dark:text-blue-400",
    accentBg: "bg-blue-500/10",
  },
  {
    key: "team" as const,
    name: "Team",
    rate: "From 18p",
    rateUnit: "/min",
    subtitle: "For your whole company",
    description: "Bring your whole company together with shared AI agents, team dashboard, and department budgets. No per-seat fees.",
    features: [
      "Unlimited team members (employees + board)",
      "Shared AI agents across the company",
      "Shared knowledge base",
      "Team dashboard with usage analytics",
      "Per-department budgets",
      "Individual + bulk CSV invites",
      "Team activity log",
      "99.9% uptime SLA",
      "30-minute critical response time",
      "Priority support (Phone, Email, Chat, Slack, Video)",
      "Mobile app",
    ],
    bestFor: "Companies needing shared access for their whole team.",
    cta: "Get Started",
    href: "/contact",
    featured: true,
    themeColor: "indigo",
    borderClass: "border-t-4 border-t-indigo-500",
    badgeClass: "text-indigo-600 dark:text-indigo-400",
    checkClass: "text-indigo-500 dark:text-indigo-400",
    accentBg: "bg-indigo-500/10",
    minimumSpend: true,
  },
];

type ComparisonRow = {
  name: string;
  individual: boolean | string;
  team: boolean | string;
  custom: boolean | string;
};

type ComparisonSection = {
  title: string;
  subtitle: string;
  rows: ComparisonRow[];
};

const comparisonSections: ComparisonSection[] = [
  {
    title: "Free for Everyone",
    subtitle: "Included with every account, no matter which tier you choose",
    rows: [
      { name: "Rigo productivity tools (reminders, notes, follow-ups, briefings)", individual: true, team: true, custom: true },
      { name: "No setup or onboarding costs", individual: true, team: true, custom: true },
      { name: "Pay-as-you-go prepaid wallet", individual: true, team: true, custom: true },
      { name: "Go live in under 5 minutes", individual: true, team: true, custom: true },
      { name: "Analytics dashboards", individual: true, team: true, custom: true },
      { name: "Compliance tools", individual: true, team: true, custom: true },
      { name: "Server infrastructure included", individual: true, team: true, custom: true },
      { name: "Mobile app", individual: true, team: true, custom: true },
      { name: "Multi-language support", individual: true, team: true, custom: true },
    ],
  },
  {
    title: "What's Included",
    subtitle: "Features and support levels per tier",
    rows: [
      { name: "Talk-time rate", individual: "20p/min", team: "18p/min", custom: "Negotiated" },
      { name: "Minimum monthly spend", individual: "None", team: "£50", custom: "Custom" },
      { name: "Team members", individual: "1", team: "Unlimited (no seat fees)", custom: "Unlimited" },
      { name: "Departments", individual: false, team: true, custom: true },
      { name: "Department budget caps", individual: false, team: true, custom: true },
      { name: "Shared agents", individual: false, team: true, custom: true },
      { name: "Agent visibility", individual: "Private only", team: "Private / Dept / Company", custom: "Custom" },
      { name: "Board member role", individual: false, team: true, custom: true },
      { name: "Bulk CSV invites", individual: false, team: true, custom: true },
      { name: "Team activity log", individual: false, team: "90-day retention", custom: "Custom" },
      { name: "Team dashboard", individual: false, team: true, custom: true },
      { name: "SLA critical response", individual: "1 hour", team: "30 min", custom: "15 min" },
      { name: "Service credits", individual: "10–50%", team: "15–100%", custom: "Custom" },
      { name: "Dedicated escalation path", individual: false, team: true, custom: true },
      { name: "48hr post-mortems", individual: false, team: true, custom: true },
      { name: "White-label (add-on)", individual: true, team: true, custom: true },
      { name: "Custom billing rates", individual: false, team: false, custom: true },
      { name: "Dedicated onboarding", individual: false, team: false, custom: true },
    ],
  },
  {
    title: "Limits",
    subtitle: "Usage caps per tier",
    rows: [
      { name: "Concurrent calls", individual: "5", team: "25", custom: "Custom" },
      { name: "AI agents", individual: "3", team: "Unlimited", custom: "Unlimited" },
      { name: "Knowledge documents", individual: "10", team: "Unlimited", custom: "Unlimited" },
      { name: "Active campaigns", individual: "3", team: "Unlimited", custom: "Unlimited" },
      { name: "Data connectors", individual: "2", team: "Unlimited", custom: "Unlimited" },
    ],
  },
];

function FeatureIcon({ included }: { included: boolean | string }) {
  if (typeof included === "string") {
    return <span className="text-xs text-muted-foreground text-center block">{included}</span>;
  }
  if (included) {
    return <CheckCircle2 className="h-4 w-4 text-emerald-500 dark:text-emerald-400 mx-auto" />;
  }
  return <Minus className="h-4 w-4 text-muted-foreground/40 mx-auto" />;
}

export function PricingContent() {
  const [visibility, setVisibility] = useState<PackageVisibility>({
    individual: true,
    team: true,
  });

  useEffect(() => {
    fetch("/api/public/deployment-packages")
      .then((r) => r.json())
      .then((data) => setVisibility(data))
      .catch((error) => { console.error("Fetch deployment packages failed:", error); });
  }, []);

  const visiblePackages = allPackages.filter((pkg) => visibility[pkg.key]);

  const gridCols = visiblePackages.length + 1;
  const gridClass =
    gridCols <= 2
      ? "grid-cols-1 md:grid-cols-2"
      : gridCols <= 3
        ? "grid-cols-1 md:grid-cols-3"
        : "grid-cols-1 md:grid-cols-2 lg:grid-cols-4";

  return (
    <PublicLayout>
      <div className="min-h-screen bg-background" data-testid="page-pricing">
        <WebPageJsonLd
          title="Pricing - Flexible AI Call Centre Packages | GoRigo"
          description="Choose the right GoRigo deployment for your business. Talk-time only billing with no subscriptions."
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

        <section className="relative overflow-hidden" data-testid="section-pricing-hero">
          <div className="absolute inset-0 bg-gradient-to-br from-teal-500/8 via-transparent to-emerald-500/8 dark:from-teal-500/5 dark:to-emerald-500/5" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.12),transparent_65%)]" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.06),transparent_70%)]" />

          <div className="relative max-w-5xl mx-auto px-6 pt-28 pb-20 text-center">
            <Badge variant="outline" className="mb-6 px-4 py-1.5 text-xs font-medium tracking-wide border-teal-500/30" data-testid="badge-pricing">
              <span className="relative flex h-2 w-2 mr-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-500 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-gradient-to-r from-teal-500 to-emerald-500" />
              </span>
              <span className="bg-gradient-to-r from-teal-500 to-emerald-500 bg-clip-text text-transparent font-semibold">Talk-Time Only Billing</span>
              <TalkTimeInfo />
            </Badge>
            <h1
              className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]"
              data-testid="text-pricing-hero-title"
            >
              Flexible pricing for
              <br />
              <span className="bg-gradient-to-r from-teal-500 via-emerald-500 to-green-500 bg-clip-text text-transparent">every business</span>
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

        <section className="py-20 relative" data-testid="section-packages">
          <div className="absolute inset-0 bg-gradient-to-b from-teal-500/[0.03] via-transparent to-transparent dark:from-teal-500/[0.02]" />
          <div className="relative max-w-7xl mx-auto px-6">
            <div className={`grid ${gridClass} gap-6`}>
              {visiblePackages.map((pkg) => (
                <Card
                  key={pkg.name}
                  className={`${pkg.borderClass} overflow-visible`}
                  data-testid={`card-package-${pkg.name.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <CardContent className="p-8">
                    {pkg.featured && (
                      <Badge className={`mb-4 ${pkg.accentBg} ${pkg.badgeClass} border-current/20 no-default-hover-elevate no-default-active-elevate`} data-testid="badge-most-popular">
                        Most Popular
                      </Badge>
                    )}
                    <h3 className="font-medium text-xl mb-2">{pkg.name}</h3>
                    {"subtitle" in pkg && pkg.subtitle && (
                      <p className={`text-sm font-medium ${pkg.badgeClass} mb-1`} data-testid={`text-subtitle-${pkg.name.toLowerCase().replace(/\s+/g, "-")}`}>{pkg.subtitle}</p>
                    )}
                    <div className="mb-3" data-testid={`text-rate-${pkg.name.toLowerCase().replace(/\s+/g, "-")}`}>
                      <span className="text-2xl font-semibold">{pkg.rate}</span>
                      <span className="text-sm text-muted-foreground">{pkg.rateUnit}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{pkg.description}</p>
                    <p className="text-xs text-muted-foreground mb-2">
                      Talk-time only. No subscriptions or seat fees.
                    </p>
                    {"minimumSpend" in pkg && pkg.minimumSpend && (
                      <p className="text-xs text-muted-foreground mb-4">
                        <span className="font-medium text-foreground">Minimum:</span> £50/month usage
                      </p>
                    )}
                    <ul className="space-y-2.5 mb-6">
                      {pkg.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className={`h-4 w-4 ${pkg.checkClass} shrink-0 mt-0.5`} />
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

              <Card
                className="border-t-4 border-t-amber-500 overflow-visible"
                data-testid="card-package-custom"
              >
                <CardContent className="p-8">
                  <Badge className="mb-4 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 no-default-hover-elevate no-default-active-elevate" data-testid="badge-enterprise">
                    Enterprise
                  </Badge>
                  <h3 className="font-medium text-xl mb-2">Custom Plan</h3>
                  <div className="mb-3" data-testid="text-rate-custom">
                    <span className="text-2xl font-semibold">Custom</span>
                    <span className="text-sm text-muted-foreground"> rates</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Need something different? We will build a bespoke package tailored to your exact requirements.
                  </p>
                  <p className="text-xs text-muted-foreground mb-6">
                    Negotiated rates with volume discounts
                  </p>
                  <ul className="space-y-2.5 mb-6">
                    <li className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">Pick and choose features</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">Custom billing rates</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">Dedicated onboarding</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">Bespoke SLAs</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">Priority engineering support</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">Volume discounts</span>
                    </li>
                  </ul>
                  <p className="text-xs text-muted-foreground mb-6">
                    <span className="font-medium text-foreground">Best for:</span> Businesses needing a tailored solution.
                  </p>
                  <Link href="/contact">
                    <Button
                      variant="outline"
                      className="w-full"
                      data-testid="button-package-custom"
                    >
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Contact Sales
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>

            <div className="mt-8 flex flex-col items-center gap-3" data-testid="text-team-vs-partner">
              <Card className="inline-block overflow-visible">
                <CardContent className="p-4 flex items-center gap-3 flex-wrap justify-center">
                  <Users className="h-5 w-5 text-indigo-500 dark:text-indigo-400 shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Team vs Partner:</span> Partners manage external clients. Team manages your internal company.
                  </p>
                </CardContent>
              </Card>
              <Card className="inline-block overflow-visible border-violet-500/20" data-testid="card-whitelabel-addon">
                <CardContent className="p-4 flex items-center gap-3 flex-wrap justify-center">
                  <Badge variant="outline" className="border-violet-500/30 text-violet-600 dark:text-violet-400 text-xs no-default-hover-elevate no-default-active-elevate">Add-on</Badge>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">White-label available</span> — Brand the platform as your own. Available on Individual and Team tiers.{" "}
                    <Link href="/partners/whitelabel" className="text-primary underline underline-offset-4" data-testid="link-whitelabel-addon">Learn more</Link>
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-20 relative" data-testid="section-comparison">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/[0.03] to-transparent dark:via-emerald-500/[0.02]" />
          <div className="relative max-w-4xl mx-auto px-6">
            <div className="mb-12">
              <Badge variant="outline" className="mb-4 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 no-default-hover-elevate no-default-active-elevate" data-testid="badge-comparison">
                Full Comparison
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight" data-testid="text-comparison-title">
                Everything at a <span className="bg-gradient-to-r from-teal-500 to-emerald-500 bg-clip-text text-transparent">glance</span>
              </h2>
              <p className="mt-3 text-muted-foreground max-w-xl">
                Freebies, features, and limits — side by side so you can pick the right tier in seconds.
              </p>
            </div>
            <Card data-testid="card-comparison-table">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/50 bg-muted/30">
                        <th className="text-left p-4 font-medium text-muted-foreground min-w-[200px]"></th>
                        <th className="text-center p-4 font-medium text-blue-600 dark:text-blue-400 min-w-[120px]">Individual</th>
                        <th className="text-center p-4 font-medium text-indigo-600 dark:text-indigo-400 min-w-[140px]">Team</th>
                        <th className="text-center p-4 font-medium text-amber-600 dark:text-amber-400 min-w-[120px]">Custom</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparisonSections.map((section) => (
                        <Fragment key={`section-${section.title}`}>
                          <tr className="bg-muted/40 border-y border-border/50">
                            <td colSpan={4} className="p-4" data-testid={`section-header-${section.title.toLowerCase().replace(/\s+/g, "-")}`}>
                              <span className="font-semibold text-foreground">{section.title}</span>
                              <span className="ml-2 text-xs text-muted-foreground">{section.subtitle}</span>
                            </td>
                          </tr>
                          {section.rows.map((row, idx) => (
                            <tr
                              key={row.name}
                              className={`${idx < section.rows.length - 1 ? "border-b border-border/30" : ""} ${idx % 2 === 0 ? "bg-muted/10" : ""}`}
                              data-testid={`row-compare-${row.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").substring(0, 30)}`}
                            >
                              <td className="p-3 pl-4 text-foreground">{row.name}</td>
                              <td className="p-3 text-center">
                                <FeatureIcon included={row.individual} />
                              </td>
                              <td className="p-3 text-center">
                                <FeatureIcon included={row.team} />
                              </td>
                              <td className="p-3 text-center">
                                <FeatureIcon included={row.custom} />
                              </td>
                            </tr>
                          ))}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="py-12" data-testid="section-sla-link">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <p className="text-sm text-muted-foreground">
              All packages are backed by our{" "}
              <Link href="/sla" className="text-primary underline underline-offset-4" data-testid="link-sla">
                Service Level Agreement
              </Link>
              {" "}with uptime guarantees, support response times, and automatic compensation if we fall short.
            </p>
          </div>
        </section>

        <section className="py-20 relative" data-testid="section-faq">
          <div className="absolute inset-0 bg-gradient-to-b from-teal-500/[0.02] via-transparent to-emerald-500/[0.02] dark:from-teal-500/[0.01] dark:to-emerald-500/[0.01]" />
          <div className="relative max-w-3xl mx-auto px-6">
            <div className="mb-12">
              <Badge variant="outline" className="mb-4 border-teal-500/30 text-teal-600 dark:text-teal-400 no-default-hover-elevate no-default-active-elevate" data-testid="badge-faq">
                FAQ
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight" data-testid="text-faq-title">
                Frequently asked <span className="bg-gradient-to-r from-teal-500 to-emerald-500 bg-clip-text text-transparent">questions</span>
              </h2>
            </div>
            <PricingFaq />
          </div>
        </section>

        <section className="py-20 relative overflow-hidden" data-testid="section-pricing-cta">
          <div className="absolute inset-0 bg-gradient-to-br from-teal-500/[0.05] via-transparent to-emerald-500/[0.05] dark:from-teal-500/[0.03] dark:to-emerald-500/[0.03]" />
          <div className="relative max-w-2xl mx-auto px-6 text-center">
            <h2 className="text-3xl font-bold tracking-tight mb-4" data-testid="text-pricing-cta-title">
              Not sure which package is <span className="bg-gradient-to-r from-teal-500 to-emerald-500 bg-clip-text text-transparent">right?</span>
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

        <ConversionCta talkToAiMessage="Talk to AI to understand our Pricing" />
        <Footer />
      </div>
    </PublicLayout>
  );
}
