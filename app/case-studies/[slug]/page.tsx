import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { caseStudies, industries } from "@/shared/schema";
import { eq, and } from "drizzle-orm";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { PublicLayout } from "@/components/public-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, Phone, Star, Percent, ArrowLeft, ArrowRight, Quote, Target, Lightbulb, BarChart3 } from "lucide-react";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const [study] = await db
    .select({ title: caseStudies.title, subtitle: caseStudies.subtitle, metaTitle: caseStudies.metaTitle, metaDescription: caseStudies.metaDescription })
    .from(caseStudies)
    .where(and(eq(caseStudies.slug, resolvedParams.slug), eq(caseStudies.published, true)))
    .limit(1);
  if (!study) return { title: "Case Study Not Found | GoRigo" };
  return {
    title: study.metaTitle || `${study.title} — Case Study | GoRigo`,
    description: study.metaDescription || study.subtitle || "Discover how this organisation transformed their call centre with GoRigo AI automation.",
    openGraph: {
      title: study.metaTitle || study.title,
      description: study.metaDescription || study.subtitle || "",
      type: "article",
    },
    alternates: { canonical: `/case-studies/${resolvedParams.slug}` },
  };
}

export default async function CaseStudyPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;

  const [study] = await db
    .select({
      id: caseStudies.id,
      slug: caseStudies.slug,
      title: caseStudies.title,
      subtitle: caseStudies.subtitle,
      challenge: caseStudies.challenge,
      solution: caseStudies.solution,
      results: caseStudies.results,
      testimonialQuote: caseStudies.testimonialQuote,
      testimonialAuthor: caseStudies.testimonialAuthor,
      testimonialRole: caseStudies.testimonialRole,
      roiPercentage: caseStudies.roiPercentage,
      costReduction: caseStudies.costReduction,
      callsHandled: caseStudies.callsHandled,
      customerSatisfaction: caseStudies.customerSatisfaction,
      metaTitle: caseStudies.metaTitle,
      metaDescription: caseStudies.metaDescription,
      industryName: industries.name,
      industrySlug: industries.slug,
    })
    .from(caseStudies)
    .leftJoin(industries, eq(caseStudies.industryId, industries.id))
    .where(and(eq(caseStudies.slug, resolvedParams.slug), eq(caseStudies.published, true)))
    .limit(1);

  if (!study) {
    notFound();
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: study.title,
    description: study.metaDescription || study.subtitle || "",
    url: `https://gorigo.ai/case-studies/${study.slug}`,
    publisher: { "@type": "Organization", name: "GoRigo" },
  };

  const stats = [
    study.roiPercentage != null ? { label: "Return on Investment", value: `${study.roiPercentage}%`, icon: TrendingUp, colour: "text-green-600" } : null,
    study.costReduction != null ? { label: "Cost Reduction", value: `${study.costReduction}%`, icon: Percent, colour: "text-foreground" } : null,
    study.callsHandled != null ? { label: "Calls Handled", value: study.callsHandled.toLocaleString(), icon: Phone, colour: "text-foreground" } : null,
    study.customerSatisfaction != null ? { label: "Customer Satisfaction", value: `${study.customerSatisfaction}/5`, icon: Star, colour: "text-foreground" } : null,
  ].filter(Boolean) as { label: string; value: string; icon: typeof TrendingUp; colour: string }[];

  return (
    <PublicLayout>
      <div className="min-h-screen bg-background" data-testid="page-case-study">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <Navbar />

        <section className="relative" data-testid="section-case-study-hero">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.06),transparent_60%)]" />
          <div className="relative max-w-4xl mx-auto px-6 pt-20 pb-16">
            <Link
              href="/case-studies"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
              data-testid="link-back-to-case-studies"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Case Studies
            </Link>
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              {study.industryName && (
                <Badge variant="outline" className="no-default-hover-elevate no-default-active-elevate">
                  {study.industryName}
                </Badge>
              )}
            </div>
            <h1
              className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight mb-4"
              data-testid="text-case-study-title"
            >
              {study.title}
            </h1>
            {study.subtitle && (
              <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl" data-testid="text-case-study-subtitle">
                {study.subtitle}
              </p>
            )}
          </div>
        </section>

        {stats.length > 0 && (
          <section className="py-8 border-y border-border/50" data-testid="section-stats-bar">
            <div className="max-w-4xl mx-auto px-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                {stats.map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <div key={stat.label} className="text-center" data-testid={`stat-${stat.label.toLowerCase().replace(/\s+/g, "-")}`}>
                      <Icon className={`h-5 w-5 mx-auto mb-2 ${stat.colour}`} />
                      <p className={`text-2xl font-bold ${stat.colour}`}>{stat.value}</p>
                      <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        <section className="py-12" data-testid="section-case-study-content">
          <div className="max-w-4xl mx-auto px-6 space-y-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-muted-foreground" />
                  The Challenge
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed" data-testid="text-challenge">{study.challenge}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-muted-foreground" />
                  The Solution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed" data-testid="text-solution">{study.solution}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-muted-foreground" />
                  The Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed" data-testid="text-results">{study.results}</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {study.testimonialQuote && (
          <section className="py-12 border-t border-border/50" data-testid="section-testimonial">
            <div className="max-w-3xl mx-auto px-6 text-center">
              <Quote className="h-8 w-8 mx-auto mb-6 text-muted-foreground/40" />
              <blockquote className="text-xl font-medium leading-relaxed mb-6" data-testid="text-testimonial-quote">
                &ldquo;{study.testimonialQuote}&rdquo;
              </blockquote>
              {(study.testimonialAuthor || study.testimonialRole) && (
                <div className="text-sm text-muted-foreground">
                  {study.testimonialAuthor && (
                    <p className="font-medium text-foreground" data-testid="text-testimonial-author">{study.testimonialAuthor}</p>
                  )}
                  {study.testimonialRole && (
                    <p data-testid="text-testimonial-role">{study.testimonialRole}</p>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        <section className="py-16 border-t border-border/50" data-testid="section-cta">
          <div className="max-w-3xl mx-auto px-6 text-center">
            <h2 className="text-2xl font-semibold tracking-tight mb-4">Ready to achieve similar results?</h2>
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
              Discover how GoRigo AI call centre automation can transform your business operations and deliver measurable returns.
            </p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <Link href="/contact" data-testid="link-contact-cta">
                <Button>
                  Get in Touch
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/roi-calculator" data-testid="link-roi-cta">
                <Button variant="outline">
                  Calculate Your ROI
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </PublicLayout>
  );
}
