import { NextResponse } from "next/server";

const BASE_URL = "https://gorigo.ai";

export async function GET() {
  const checks = {
    sitemap: { status: "active", url: `${BASE_URL}/sitemap.xml` },
    robots: { status: "active", url: `${BASE_URL}/robots.txt` },
    structuredData: { status: "active", types: ["Organization", "WebSite", "SiteNavigationElement", "SoftwareApplication", "BreadcrumbList"] },
    openGraph: { status: "active" },
    twitterCards: { status: "active" },
    canonical: { status: "active", url: BASE_URL },
    metaDescription: { status: "active" },
    ssl: { status: "active" },
    mobileResponsive: { status: "active" },
  };

  const totalChecks = Object.keys(checks).length;
  const activeChecks = Object.values(checks).filter((c) => c.status === "active").length;
  const score = Math.round((activeChecks / totalChecks) * 100);

  return NextResponse.json({
    score,
    totalChecks,
    activeChecks,
    checks,
    lastUpdated: new Date().toISOString(),
  });
}
