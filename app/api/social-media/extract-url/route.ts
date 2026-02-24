import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/get-user";
import { handleRouteError } from "@/lib/api-error";
import { validateUrlForFetch, safeFetch } from "@/lib/ssrf-guard";
import { z } from "zod";

const extractSchema = z.object({
  url: z.string().url(),
});

async function extractOpenGraphData(url: string) {
  const res = await safeFetch(url, { timeoutMs: 10000 });

  if (!res.ok) {
    throw new Error(`Failed to fetch URL: ${res.status}`);
  }

  const html = await res.text();

  const getMetaContent = (nameOrProp: string): string | null => {
    const patterns = [
      new RegExp(`<meta[^>]+(?:property|name)=["']${nameOrProp}["'][^>]+content=["']([^"']+)["']`, "i"),
      new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${nameOrProp}["']`, "i"),
    ];
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match?.[1]) return match[1].trim();
    }
    return null;
  };

  const title = getMetaContent("og:title")
    || getMetaContent("twitter:title")
    || html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim()
    || null;

  const description = getMetaContent("og:description")
    || getMetaContent("twitter:description")
    || getMetaContent("description")
    || null;

  const ogImage = getMetaContent("og:image");
  const twitterImage = getMetaContent("twitter:image");

  const imageMatches = html.match(/<img[^>]+src=["']([^"']+)["']/gi) || [];
  const allImageSrcs = imageMatches
    .map((tag: string) => {
      const srcMatch = tag.match(/src=["']([^"']+)["']/i);
      return srcMatch?.[1] || null;
    })
    .filter((src): src is string => !!src);

  const resolveUrl = (src: string) => {
    if (src.startsWith("http")) return src;
    if (src.startsWith("//")) return `https:${src}`;
    try {
      return new URL(src, url).href;
    } catch {
      return null;
    }
  };

  const images: string[] = [];
  const seen = new Set<string>();

  const addImage = (src: string | null) => {
    if (!src) return;
    const resolved = resolveUrl(src);
    if (!resolved || seen.has(resolved)) return;
    const check = validateUrlForFetch(resolved);
    if (!check.valid) return;
    if (resolved.match(/\.(svg|ico|gif)$/i)) return;
    if (resolved.includes("logo") || resolved.includes("favicon") || resolved.includes("icon")) return;
    seen.add(resolved);
    images.push(resolved);
  };

  addImage(ogImage);
  addImage(twitterImage);

  for (const src of allImageSrcs.slice(0, 30)) {
    if (images.length >= 20) break;
    addImage(src);
  }

  const siteName = getMetaContent("og:site_name") || null;
  const price = getMetaContent("product:price:amount")
    || html.match(/["']price["']\s*:\s*["']?([£$€]?[\d,]+(?:\.\d{2})?)["']?/i)?.[1]
    || null;

  return {
    title,
    description,
    images,
    siteName,
    price,
    url,
  };
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = extractSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Please provide a valid URL" }, { status: 400 });
    }

    const urlCheck = validateUrlForFetch(parsed.data.url);
    if (!urlCheck.valid) {
      return NextResponse.json({ error: urlCheck.error || "Invalid URL" }, { status: 400 });
    }

    const data = await extractOpenGraphData(parsed.data.url);
    return NextResponse.json(data);
  } catch (err) {
    return handleRouteError(err, "Failed to extract content from URL");
  }
}
