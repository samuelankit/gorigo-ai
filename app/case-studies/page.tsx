export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { caseStudies, industries } from "@/shared/schema";
import { eq, desc, and } from "drizzle-orm";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { PublicLayout } from "@/components/public-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, Phone, Star, ArrowRight, Percent } from "lucide-react";

export const metadata: Metadata = {
  title: "Case Studies — AI Call Centre Automation Results | GoRigo",
  description: "Real results from real businesses using AI call centre automation. Explore how organisations across industries have improved ROI, reduced costs, and enhanced customer satisfaction with GoRigo.",
  openGraph: {
    title: "Case Studies — AI Call Centre Results | GoRigo",
    description: "Real results from real businesses using AI call centre automation. See proven ROI, cost reductions, and customer satisfaction improvements.",
  },
  alternates: { canonical: "/case-studies" },
};

export default async function CaseStudiesPage() {
  const studies = await db
    .select({
      id: caseStudies.id,
      slug: caseStudies.slug,
      title: caseStudies.title,
      subtitle: caseStudies.subtitle,
      roiPercentage: caseStudies.roiPercentage,
      costReduction: caseStudies.costReduction,
      callsHandled: caseStudies.callsHandled,
      customerSatisfaction: caseStudies.customerSatisfaction,
      featured: caseStudies.featured,
      industryId: caseStudies.industryId,
      industryName: industries.name,
      industrySlug: industries.slug,
    })
    .from(caseStudies)
    .leftJoin(industries, eq(caseStudies.industryId, industries.id))
    .where(eq(caseStudies.published, true))
    .orderBy(desc(caseStudies.featured), desc(caseStudies.createdAt));

  const grouped = studies.reduce<Record<string, typeof studies>>((acc, study) => {
    const key = study.industryName || "Other";
    if (!acc[key]) acc[key] = [];
    acc[key].push(study);
    return acc;
  }, {});

  return (
    <PublicLayout>
      <div className="min-h-screen bg-background" data-testid="page-case-studies">
        <Navbar />

        <section className="relative" data-testid="section-case-studies-hero">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.06),transparent_60%)]" />
          <div className="relative max-w-4xl mx-auto px-6 pt-28 pb-20 text-center">
            <p className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-6">
              PROVEN RESULTS
            </p>
            <h1
              className="text-4xl sm:text-5xl font-light tracking-tight leading-[1.1]"
              data-testid="text-case-studies-hero-title"
            >
              Case
              <br />
              <span className="font-normal">Studies</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Real results from real businesses using AI call centre automation.
            </p>
          </div>
        </section>

        <section className="pb-16" data-testid="section-case-studies-list">
          <div className="max-w-6xl mx-auto px-6">
            {studies.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <TrendingUp className="h-12 w-12 text-muted-foreground/40 mb-4" />
                <h2 className="text-xl font-semibold mb-2">No case studies yet</h2>
                <p className="text-muted-foreground max-w-md">
                  We are preparing detailed case studies showcasing results from our AI call centre automation. Check back soon.
                </p>
              </div>
            ) : (
              <div className="space-y-12">
                {Object.entries(grouped).map(([industryName, industryStudies]) => (
                  <div key={industryName} data-testid={`section-industry-${industryName.toLowerCase().replace(/\s+/g, "-")}`}>
                    <h2 className="text-xl font-semibold tracking-tight mb-4">{industryName}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {industryStudies.map((study) => (
                        <Link
                          key={study.slug}
                          href={`/case-studies/${study.slug}`}
                          data-testid={`card-case-study-${study.slug}`}
                        >
                          <Card className="hover-elevate h-full">
                            <CardContent className="p-6 flex flex-col h-full">
                              <div className="flex items-center gap-2 mb-3 flex-wrap">
                                {study.industryName && (
                                  <Badge variant="outline" className="no-default-hover-elevate no-default-active-elevate">
                                    {study.industryName}
                                  </Badge>
                                )}
                                {study.featured && (
                                  <Badge className="no-default-hover-elevate no-default-active-elevate">Featured</Badge>
                                )}
                              </div>
                              <h3
                                className="text-lg font-semibold tracking-tight mb-2"
                                data-testid={`text-case-study-title-${study.slug}`}
                              >
                                {study.title}
                              </h3>
                              {study.subtitle && (
                                <p
                                  className="text-muted-foreground text-sm leading-relaxed line-clamp-2 flex-1 mb-4"
                                  data-testid={`text-case-study-subtitle-${study.slug}`}
                                >
                                  {study.subtitle}
                                </p>
                              )}
                              <div className="grid grid-cols-2 gap-2 mt-auto">
                                {study.roiPercentage != null && (
                                  <div className="flex items-center gap-1.5 text-sm" data-testid={`stat-roi-${study.slug}`}>
                                    <TrendingUp className="h-3.5 w-3.5 text-green-600" />
                                    <span className="text-green-600 font-medium">{study.roiPercentage}% ROI</span>
                                  </div>
                                )}
                                {study.costReduction != null && (
                                  <div className="flex items-center gap-1.5 text-sm" data-testid={`stat-cost-${study.slug}`}>
                                    <Percent className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span className="text-muted-foreground">{study.costReduction}% cost reduction</span>
                                  </div>
                                )}
                                {study.callsHandled != null && (
                                  <div className="flex items-center gap-1.5 text-sm" data-testid={`stat-calls-${study.slug}`}>
                                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span className="text-muted-foreground">{study.callsHandled.toLocaleString()} calls handled</span>
                                  </div>
                                )}
                                {study.customerSatisfaction != null && (
                                  <div className="flex items-center gap-1.5 text-sm" data-testid={`stat-satisfaction-${study.slug}`}>
                                    <Star className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span className="text-muted-foreground">{study.customerSatisfaction}/5</span>
                                  </div>
                                )}
                              </div>
                              <div className="mt-4 flex items-center gap-1 text-sm font-medium text-foreground">
                                Read case study
                                <ArrowRight className="h-3.5 w-3.5" />
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <Footer />
      </div>
    </PublicLayout>
  );
}
