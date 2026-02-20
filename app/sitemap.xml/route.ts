import { NextResponse } from "next/server";

const BASE_URL = "https://gorigo.ai";

const staticPages: { path: string; priority: number; changefreq: string }[] = [
  { path: "/", priority: 1.0, changefreq: "daily" },

  { path: "/capabilities", priority: 0.9, changefreq: "weekly" },
  { path: "/features/ai-agents", priority: 0.9, changefreq: "weekly" },
  { path: "/features/call-handling", priority: 0.9, changefreq: "weekly" },
  { path: "/features/compliance", priority: 0.9, changefreq: "weekly" },
  { path: "/features/analytics", priority: 0.9, changefreq: "weekly" },
  { path: "/features/multi-language", priority: 0.9, changefreq: "weekly" },
  { path: "/features/pay-per-talk-time", priority: 0.9, changefreq: "weekly" },

  { path: "/pricing", priority: 0.85, changefreq: "weekly" },
  { path: "/about", priority: 0.8, changefreq: "monthly" },
  { path: "/contact", priority: 0.8, changefreq: "monthly" },
  { path: "/docs", priority: 0.8, changefreq: "weekly" },
  { path: "/blog", priority: 0.85, changefreq: "daily" },
  { path: "/case-studies", priority: 0.85, changefreq: "weekly" },
  { path: "/roi-calculator", priority: 0.8, changefreq: "monthly" },
  { path: "/ai-transparency", priority: 0.7, changefreq: "monthly" },
  { path: "/trust", priority: 0.7, changefreq: "monthly" },
  { path: "/sla", priority: 0.6, changefreq: "monthly" },

  { path: "/partners", priority: 0.8, changefreq: "monthly" },
  { path: "/partners/whitelabel", priority: 0.7, changefreq: "monthly" },
  { path: "/partners/affiliate", priority: 0.7, changefreq: "monthly" },

  { path: "/guide", priority: 0.6, changefreq: "monthly" },
  { path: "/guide/overview", priority: 0.6, changefreq: "monthly" },
  { path: "/guide/agents", priority: 0.6, changefreq: "monthly" },
  { path: "/guide/knowledge-base", priority: 0.6, changefreq: "monthly" },
  { path: "/guide/clients", priority: 0.6, changefreq: "monthly" },
  { path: "/guide/billing", priority: 0.6, changefreq: "monthly" },
  { path: "/guide/campaigns", priority: 0.6, changefreq: "monthly" },
  { path: "/guide/monitoring", priority: 0.6, changefreq: "monthly" },
  { path: "/guide/compliance", priority: 0.6, changefreq: "monthly" },

  { path: "/policies/privacy", priority: 0.4, changefreq: "yearly" },
  { path: "/policies/terms", priority: 0.4, changefreq: "yearly" },
  { path: "/policies/cookies", priority: 0.4, changefreq: "yearly" },
  { path: "/policies/acceptable-use", priority: 0.4, changefreq: "yearly" },

  { path: "/sitemap", priority: 0.2, changefreq: "monthly" },
];

const blogSlugs = [
  "ai-call-centre-revolution",
  "talk-time-billing-explained",
  "gdpr-compliant-ai-calls",
  "multi-language-ai-agents",
  "roi-ai-call-centre",
  "human-handoff-best-practices",
  "ai-voice-agents-2026",
  "compliance-automation",
  "pay-per-talk-pricing",
  "knowledge-base-management",
];

const caseStudySlugs = [
  "healthcare-nhs-ai-receptionist",
  "legal-firm-ai-intake",
  "real-estate-lead-qualification",
  "financial-services-compliance",
  "ecommerce-customer-support",
  "hospitality-booking-management",
  "insurance-claims-processing",
  "recruitment-candidate-screening",
  "automotive-service-booking",
  "education-admissions",
  "telecommunications-support",
  "property-management",
  "dental-practice",
  "accounting-firm",
  "travel-agency",
];

export async function GET() {
  const lastmod = new Date().toISOString().split("T")[0];

  const allPages = [
    ...staticPages,
    ...blogSlugs.map((slug) => ({
      path: `/blog/${slug}`,
      priority: 0.7,
      changefreq: "weekly",
    })),
    ...caseStudySlugs.map((slug) => ({
      path: `/case-studies/${slug}`,
      priority: 0.7,
      changefreq: "monthly",
    })),
  ];

  const urls = allPages
    .map(
      (page) => `  <url>
    <loc>${BASE_URL}${page.path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority.toFixed(1)}</priority>
  </url>`
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${urls}
</urlset>`;

  return new NextResponse(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
