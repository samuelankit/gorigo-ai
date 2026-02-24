import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/get-user";
import { handleRouteError } from "@/lib/api-error";
import { validateUrlForFetch } from "@/lib/ssrf-guard";
import { z } from "zod";

const validateSchema = z.object({
  urls: z.array(z.string().url()).min(1).max(20),
});

async function checkUrl(url: string): Promise<{ url: string; accessible: boolean; error?: string }> {
  const ssrfCheck = validateUrlForFetch(url);
  if (!ssrfCheck.valid) {
    return { url, accessible: false, error: ssrfCheck.error || "Blocked URL" };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      headers: { "User-Agent": "GoRigoBot/1.0" },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return { url, accessible: false, error: `HTTP ${res.status}` };
    }
    return { url, accessible: true };
  } catch (err: any) {
    return { url, accessible: false, error: err.message || "Unreachable" };
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = validateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Provide an array of URLs to validate" }, { status: 400 });
    }

    const results = await Promise.all(parsed.data.urls.map(checkUrl));
    const allAccessible = results.every(r => r.accessible);

    return NextResponse.json({ results, allAccessible });
  } catch (err) {
    return handleRouteError(err, "Failed to validate URLs");
  }
}
