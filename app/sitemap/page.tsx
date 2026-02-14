import { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { Card, CardContent } from "@/components/ui/card";
import { WebPageJsonLd, BreadcrumbJsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";

export const metadata: Metadata = {
  title: "Sitemap | GoRigo",
  description: "Find your way around GoRigo. Browse all pages including platform features, getting started guides, legal policies, and account pages.",
  openGraph: {
    title: "Sitemap | GoRigo",
    description: "Find your way around GoRigo. Browse all pages including platform features, getting started guides, legal policies, and account pages.",
    siteName: "GoRigo",
  },
  twitter: {
    card: "summary",
    title: "Sitemap | GoRigo",
    description: "Find your way around GoRigo. Browse all pages including platform features, getting started guides, legal policies, and account pages.",
  },
  alternates: {
    canonical: "/sitemap",
  },
};

const sections = [
  {
    title: "Main Pages",
    links: [
      { label: "Home", href: "/" },
      { label: "Pricing", href: "/pricing" },
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
      { label: "Documentation", href: "/docs" },
    ],
  },
  {
    title: "Getting Started Guide",
    links: [
      { label: "Overview", href: "/guide/overview" },
      { label: "AI Agents", href: "/guide/agents" },
      { label: "Knowledge Base", href: "/guide/knowledge-base" },
      { label: "Clients & Partners", href: "/guide/clients" },
      { label: "Billing & Wallets", href: "/guide/billing" },
      { label: "Outbound Campaigns", href: "/guide/campaigns" },
      { label: "Call Monitoring", href: "/guide/monitoring" },
      { label: "Compliance & DNC", href: "/guide/compliance" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "/policies/privacy" },
      { label: "Terms of Service", href: "/policies/terms" },
      { label: "Cookie Policy", href: "/policies/cookies" },
      { label: "Acceptable Use", href: "/policies/acceptable-use" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Login", href: "/login" },
      { label: "Register", href: "/register" },
    ],
  },
];

export default function SitemapPage() {
  return (
    <div className="min-h-screen bg-background" data-testid="page-sitemap">
      <WebPageJsonLd
        title="Sitemap | GoRigo"
        description="Find your way around GoRigo. Browse all pages including platform features, getting started guides, legal policies, and account pages."
        url="/sitemap"
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Sitemap", url: "/sitemap" },
        ]}
      />
      <Navbar />

      <Breadcrumbs items={[{ label: "Sitemap" }]} />

      <section className="relative overflow-hidden" data-testid="section-sitemap-hero">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.06),transparent_60%)]" />
        <div className="relative max-w-4xl mx-auto px-6 pt-24 pb-16 text-center">
          <p className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-6">Navigation</p>
          <h1
            className="text-4xl sm:text-5xl font-light tracking-tight"
            data-testid="text-sitemap-title"
          >
            Sitemap
          </h1>
          <p
            className="mt-4 text-lg text-muted-foreground"
            data-testid="text-sitemap-subtitle"
          >
            Find your way around GoRigo
          </p>
        </div>
      </section>

      <section className="pb-20" data-testid="section-sitemap-content">
        <div className="max-w-4xl mx-auto px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {sections.map((section) => (
              <Card key={section.title} data-testid={`card-sitemap-${section.title.toLowerCase().replace(/\s+/g, "-")}`}>
                <CardContent className="p-6">
                  <h2
                    className="font-medium text-lg mb-4"
                    data-testid={`text-section-${section.title.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    {section.title}
                  </h2>
                  <ul className="flex flex-col gap-2">
                    {section.links.map((link) => (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                          data-testid={`link-sitemap-${link.label.toLowerCase().replace(/[\s&]+/g, "-")}`}
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
