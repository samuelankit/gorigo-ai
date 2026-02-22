"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { CheckCircle2, ArrowRight, Smartphone, Crown } from "lucide-react";

interface PackageVisibility {
  managed: boolean;
  selfHosted: boolean;
}

const allPackages = [
  {
    key: "managed" as const,
    name: "Managed",
    description: "We handle everything. You focus on your business. The fastest way to launch your AI call centre.",
    highlights: [
      "Fully managed AI agents",
      "Dedicated account manager",
      "Custom integrations",
      "Priority support",
      "Mobile app included",
    ],
    cta: "Book a Demo",
    href: "/contact",
    featured: true,
    mobileApp: true,
    gradient: "from-[#E8604C]/10 to-[#F5A623]/10",
    borderColor: "border-[#E8604C]/30",
  },
  {
    key: "selfHosted" as const,
    name: "Self-Hosted",
    description: "Deploy on your own infrastructure with complete data sovereignty and custom SLAs.",
    highlights: [
      "On-premise deployment",
      "Complete data sovereignty",
      "Custom SLAs",
      "Enterprise support",
    ],
    cta: "Contact Sales",
    href: "/contact",
    gradient: "from-violet-500/10 to-purple-500/10",
    borderColor: "border-violet-500/20",
  },
  {
    key: "custom" as const,
    name: "Custom",
    description: "Tailored solution built around your exact requirements with bespoke configuration.",
    highlights: [
      "Bespoke configuration",
      "Custom billing rates",
      "Dedicated onboarding",
      "Negotiated SLAs",
    ],
    cta: "Contact Sales",
    href: "/contact",
    gradient: "from-amber-500/10 to-orange-500/10",
    borderColor: "border-amber-500/20",
  },
];

export function DeploymentPackages() {
  const [visibility, setVisibility] = useState<PackageVisibility>({
    managed: true,
    selfHosted: false,
  });

  useEffect(() => {
    fetch("/api/public/deployment-packages")
      .then((r) => r.json())
      .then((data) => setVisibility(data))
      .catch(() => {});
  }, []);

  const visiblePackages = allPackages.filter((pkg) => {
    if (pkg.key === "custom") return true;
    return visibility[pkg.key as keyof PackageVisibility];
  });

  const gridCols =
    visiblePackages.length <= 2
      ? "grid-cols-1 md:grid-cols-2"
      : visiblePackages.length === 3
        ? "grid-cols-1 md:grid-cols-3"
        : "grid-cols-1 md:grid-cols-2 lg:grid-cols-4";

  return (
    <section className="py-20 relative" data-testid="section-pricing-preview">
      <div className="absolute inset-0 bg-gradient-to-b from-muted/30 via-transparent to-muted/30" />
      <div className="relative max-w-6xl mx-auto px-6">
        <div className="text-center mb-14">
          <Badge variant="outline" className="mb-4 px-3 py-1 text-xs border-violet-500/30 text-violet-600 dark:text-violet-400">
            Deployment Options
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight" data-testid="text-pricing-title">
            Choose how
            <span className="bg-gradient-to-r from-violet-500 to-purple-500 bg-clip-text text-transparent"> you deploy</span>
          </h2>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
            From fully managed to self-hosted, pick the deployment model that fits your business. All options include talk-time-only billing.
          </p>
        </div>
        <div className={`grid ${gridCols} gap-5`}>
          {visiblePackages.map((pkg) => (
            <Card
              key={pkg.name}
              className={`relative overflow-visible ${pkg.featured ? pkg.borderColor : ""}`}
              data-testid={`card-package-${pkg.name.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <div className={`absolute inset-0 rounded-md bg-gradient-to-br ${pkg.gradient} opacity-50`} />
              <CardContent className="relative p-7">
                {pkg.featured && (
                  <div className="flex items-center gap-1.5 mb-4">
                    <Crown className="h-3.5 w-3.5 text-[#E8604C]" />
                    <span className="text-xs font-semibold tracking-widest uppercase text-[#E8604C] dark:text-[#F5A623]">
                      Most Popular
                    </span>
                  </div>
                )}
                <h3 className="font-semibold text-xl mb-2">{pkg.name}</h3>
                <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                  {pkg.description}
                </p>
                <ul className="space-y-2.5 mb-8">
                  {pkg.highlights.map((h) => (
                    <li
                      key={h}
                      className="flex items-start gap-2 text-sm"
                    >
                      {h === "Mobile app included" ? (
                        <Smartphone className="h-4 w-4 text-[#E8604C] shrink-0 mt-0.5" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      )}
                      <span className={h === "Mobile app included" ? "text-[#E8604C] dark:text-[#F5A623] font-medium" : "text-muted-foreground"}>{h}</span>
                    </li>
                  ))}
                </ul>
                <Link href={pkg.href}>
                  <Button
                    variant={pkg.featured ? "default" : "outline"}
                    className="w-full"
                    data-testid={`button-package-${pkg.name.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    {pkg.cta}
                    {pkg.featured && <ArrowRight className="ml-2 h-4 w-4" />}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="text-center mt-8">
          <Link href="/pricing">
            <Button variant="ghost" size="sm" data-testid="link-view-pricing">
              View full pricing details
              <ArrowRight className="ml-2 h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
