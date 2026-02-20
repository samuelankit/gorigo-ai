import { Metadata } from "next";
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
  BookOpen,
  Code2,
  Plug,
  Package,
  Brain,
  Shield,
  ArrowRight,
  HelpCircle,
} from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Documentation | GoRigo API & Integration Guides",
  description:
    "Complete API reference, integration guides, SDKs, and tutorials for the GoRigo AI call centre platform.",
  openGraph: {
    title: "Documentation | GoRigo API & Integration Guides",
    description:
      "Complete API reference, integration guides, SDKs, and tutorials for the GoRigo AI call centre platform.",
    siteName: "GoRigo",
  },
  twitter: {
    card: "summary_large_image",
    title: "Documentation | GoRigo API & Integration Guides",
    description:
      "Complete API reference, integration guides, SDKs, and tutorials for the GoRigo AI call centre platform.",
  },
  alternates: {
    canonical: "/docs",
  },
};

const docCategories = [
  {
    icon: Code2,
    title: "API Reference",
    description:
      "RESTful API documentation for managing agents, calls, campaigns, and analytics.",
    links: [
      "Authentication",
      "Agents API",
      "Calls API",
      "Campaigns API",
      "Webhooks",
    ],
    href: "/docs",
    color: "text-[#2DD4A8]",
  },
  {
    icon: BookOpen,
    title: "Getting Started",
    description:
      "Step-by-step tutorials for setting up your AI call centre.",
    links: [],
    href: "/guide",
    color: "text-[#2DD4A8]",
  },
  {
    icon: Plug,
    title: "Integration Guides",
    description:
      "Connect GoRigo with your existing tools and workflows.",
    links: ["CRM Integration", "Telephony Setup", "Webhook Configuration"],
    href: "/docs",
    color: "text-[#2DD4A8]",
  },
  {
    icon: Package,
    title: "SDKs & Libraries",
    description:
      "Official client libraries for popular programming languages.",
    links: ["Node.js", "Python", "REST"],
    href: "/docs",
    color: "text-[#2DD4A8]",
  },
  {
    icon: Brain,
    title: "Knowledge Base",
    description:
      "Learn how to upload, manage, and optimise your AI agent's knowledge.",
    links: [],
    href: "/guide/knowledge-base",
    color: "text-[#2DD4A8]",
  },
  {
    icon: Shield,
    title: "Compliance",
    description: "GDPR, DNC, and data protection documentation.",
    links: [],
    href: "/guide/compliance",
    color: "text-[#2DD4A8]",
  },
];

const codeExample = `const response = await fetch("https://api.gorigo.ai/api/v1/agents", {
  method: "GET",
  headers: {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json"
  }
});

const agents = await response.json();
console.log(agents);`;

export default function DocsPage() {
  return (
    <PublicLayout>
    <div className="min-h-screen bg-background" data-testid="page-docs">
      <WebPageJsonLd
        title="Documentation | GoRigo API & Integration Guides"
        description="Complete API reference, integration guides, SDKs, and tutorials for the GoRigo AI call centre platform."
        url="/docs"
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Documentation", url: "/docs" },
        ]}
      />
      <Navbar />
      <Breadcrumbs items={[{ label: "Documentation" }]} />

      <section className="relative" data-testid="section-docs-hero">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.06),transparent_60%)]" />
        <div className="relative max-w-5xl mx-auto px-6 pt-28 pb-20 text-center">
          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-light tracking-tight"
            data-testid="text-docs-title"
          >
            Documentation
          </h1>
          <p
            className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto"
            data-testid="text-docs-subtitle"
          >
            Everything you need to integrate with GoRigo
          </p>
        </div>
      </section>

      <section className="py-20" data-testid="section-docs-categories">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {docCategories.map((cat) => (
              <Link
                key={cat.title}
                href={cat.href}
                data-testid={`link-doc-${cat.title.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <Card className="h-full hover-elevate">
                  <CardContent className="p-8">
                    <cat.icon className={`h-5 w-5 ${cat.color} mb-5`} />
                    <h3 className="font-medium text-lg mb-2 text-foreground">
                      {cat.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                      {cat.description}
                    </p>
                    {cat.links.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {cat.links.map((link) => (
                          <span
                            key={link}
                            className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md"
                          >
                            {link}
                          </span>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section
        className="py-20 border-t border-border/50"
        data-testid="section-api-quickstart"
      >
        <div className="max-w-4xl mx-auto px-6">
          <div className="mb-8">
            <p className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-3">
              Quick Start
            </p>
            <h2
              className="text-2xl font-light tracking-tight text-foreground"
              data-testid="text-quickstart-title"
            >
              Make your first API call
            </h2>
          </div>
          <Card>
            <CardContent className="p-6">
              <pre className="overflow-x-auto text-sm leading-relaxed">
                <code className="font-mono text-muted-foreground">
                  {codeExample}
                </code>
              </pre>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="py-20 border-t border-border/50" data-testid="section-docs-cta">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <HelpCircle className="h-6 w-6 text-muted-foreground mx-auto mb-4" />
          <h2
            className="text-2xl font-light tracking-tight mb-3 text-foreground"
            data-testid="text-need-help"
          >
            Need help?
          </h2>
          <p className="text-muted-foreground mb-6">
            Our team is here to help you get the most out of GoRigo.
          </p>
          <Link href="/contact">
            <Button data-testid="button-docs-contact">
              Contact Support
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      <ConversionCta talkToAiMessage="Talk to AI for guidance and support" />
      <Footer />
    </div>
    </PublicLayout>
  );
}
