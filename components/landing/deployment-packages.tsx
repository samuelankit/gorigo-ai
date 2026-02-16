"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { CheckCircle2, ArrowRight, Smartphone } from "lucide-react";

interface PackageVisibility {
  managed: boolean;
  byok: boolean;
  selfHosted: boolean;
}

const allPackages = [
  {
    key: "managed" as const,
    name: "Managed",
    description: "We handle everything. You focus on your business.",
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
  },
  {
    key: "byok" as const,
    name: "Bring Your Own Key",
    description: "Use your own AI provider keys with our engine.",
    highlights: [
      "Your own API keys",
      "Full engine access",
      "Lower per-minute costs",
      "Self-service setup",
      "Mobile app included",
    ],
    cta: "Get Started",
    href: "/register",
    mobileApp: true,
  },
  {
    key: "selfHosted" as const,
    name: "Self-Hosted",
    description: "Deploy on your own infrastructure with full control.",
    highlights: [
      "On-premise deployment",
      "Complete data sovereignty",
      "Custom SLAs",
      "Enterprise support",
    ],
    cta: "Contact Sales",
    href: "/contact",
  },
  {
    key: "custom" as const,
    name: "Custom",
    description: "Tailored solution built around your exact requirements.",
    highlights: [
      "Bespoke configuration",
      "Custom billing rates",
      "Dedicated onboarding",
      "Negotiated SLAs",
    ],
    cta: "Contact Sales",
    href: "/contact",
  },
];

export function DeploymentPackages() {
  const [visibility, setVisibility] = useState<PackageVisibility>({
    managed: true,
    byok: true,
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
    <section className="py-24 border-t border-border/50" data-testid="section-pricing-preview">
      <div className="max-w-6xl mx-auto px-6">
        <div className="mb-16">
          <p className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-3">
            Deployment
          </p>
          <h2 className="text-3xl sm:text-4xl font-light tracking-tight" data-testid="text-pricing-title">
            Choose how you deploy
          </h2>
        </div>
        <div className={`grid ${gridCols} gap-6`}>
          {visiblePackages.map((pkg) => (
            <Card
              key={pkg.name}
              className={pkg.featured ? "border-primary/40" : ""}
              data-testid={`card-package-${pkg.name.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <CardContent className="p-8">
                {pkg.featured && (
                  <p className="text-xs font-medium tracking-widest uppercase text-primary mb-4">
                    Most Popular
                  </p>
                )}
                <h3 className="font-medium text-xl mb-2">{pkg.name}</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  {pkg.description}
                </p>
                <ul className="space-y-2.5 mb-8">
                  {pkg.highlights.map((h) => (
                    <li
                      key={h}
                      className="flex items-start gap-2 text-sm"
                    >
                      {h === "Mobile app included" ? (
                        <Smartphone className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      )}
                      <span className={h === "Mobile app included" ? "text-primary font-medium" : "text-muted-foreground"}>{h}</span>
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
