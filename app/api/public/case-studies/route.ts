import { NextRequest, NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api-error";
import { db } from "@/lib/db";
import { caseStudies, industries } from "@/shared/schema";
import { eq, and, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get("slug");

    if (slug) {
      const [caseStudy] = await db
        .select({
          id: caseStudies.id,
          industryId: caseStudies.industryId,
          slug: caseStudies.slug,
          title: caseStudies.title,
          subtitle: caseStudies.subtitle,
          heroImage: caseStudies.heroImage,
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
          keyMetrics: caseStudies.keyMetrics,
          metaTitle: caseStudies.metaTitle,
          metaDescription: caseStudies.metaDescription,
          published: caseStudies.published,
          featured: caseStudies.featured,
          createdAt: caseStudies.createdAt,
          updatedAt: caseStudies.updatedAt,
          industryName: industries.name,
          industrySlug: industries.slug,
          industryIcon: industries.icon,
        })
        .from(caseStudies)
        .innerJoin(industries, eq(caseStudies.industryId, industries.id))
        .where(and(eq(caseStudies.slug, slug), eq(caseStudies.published, true)))
        .limit(1);

      if (!caseStudy) {
        return NextResponse.json({ error: "Case study not found" }, { status: 404 });
      }

      return NextResponse.json({ caseStudy });
    }

    const allCaseStudies = await db
      .select({
        id: caseStudies.id,
        slug: caseStudies.slug,
        title: caseStudies.title,
        subtitle: caseStudies.subtitle,
        heroImage: caseStudies.heroImage,
        roiPercentage: caseStudies.roiPercentage,
        costReduction: caseStudies.costReduction,
        callsHandled: caseStudies.callsHandled,
        customerSatisfaction: caseStudies.customerSatisfaction,
        featured: caseStudies.featured,
        createdAt: caseStudies.createdAt,
        industryName: industries.name,
        industrySlug: industries.slug,
        industryIcon: industries.icon,
      })
      .from(caseStudies)
      .innerJoin(industries, eq(caseStudies.industryId, industries.id))
      .where(eq(caseStudies.published, true))
      .orderBy(desc(caseStudies.featured), desc(caseStudies.createdAt));

    return NextResponse.json({ caseStudies: allCaseStudies });
  } catch (error: any) {
    return handleRouteError(error, "Case Studies");
  }
}
