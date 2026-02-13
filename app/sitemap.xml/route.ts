import { NextResponse } from "next/server";

const BASE_URL = "https://gorigo.ai";

const pages: { path: string; priority: number; changefreq: string }[] = [
  { path: "/", priority: 1.0, changefreq: "daily" },

  { path: "/pricing", priority: 0.8, changefreq: "weekly" },
  { path: "/about", priority: 0.8, changefreq: "monthly" },
  { path: "/contact", priority: 0.8, changefreq: "monthly" },
  { path: "/docs", priority: 0.8, changefreq: "weekly" },

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

  { path: "/login", priority: 0.3, changefreq: "yearly" },
  { path: "/register", priority: 0.3, changefreq: "yearly" },
  { path: "/sitemap", priority: 0.2, changefreq: "monthly" },
];

export async function GET() {
  const lastmod = new Date().toISOString().split("T")[0];

  const urls = pages
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
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  return new NextResponse(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml",
    },
  });
}
