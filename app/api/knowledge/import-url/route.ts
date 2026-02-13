import { getAuthenticatedUser } from "@/lib/get-user";
import { validateAudioUrl, importAudioFromUrl } from "@/lib/rag";
import { NextRequest, NextResponse } from "next/server";
import { knowledgeLimiter } from "@/lib/rate-limit";
import { checkBodySize, BODY_LIMITS } from "@/lib/body-limit";
import { hasInsufficientBalance } from "@/lib/wallet";

export async function POST(request: NextRequest) {
  try {
    const rl = await knowledgeLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const sizeError = checkBodySize(request, BODY_LIMITS.admin);
    if (sizeError) return sizeError;

    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (auth.isDemo) {
      return NextResponse.json({ error: "Demo accounts cannot import audio" }, { status: 403 });
    }

    const insufficient = await hasInsufficientBalance(auth.orgId, 0.50);
    if (insufficient) {
      return NextResponse.json({
        error: "Insufficient wallet balance for transcription. Please top up your wallet.",
        code: "INSUFFICIENT_BALANCE",
      }, { status: 402 });
    }

    const body = await request.json();
    const { urls } = body;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ error: "At least one URL is required" }, { status: 400 });
    }

    if (urls.length > 10) {
      return NextResponse.json({ error: "Maximum 10 URLs per batch" }, { status: 400 });
    }

    const results: { url: string; title: string; documentId?: number; status: string; error?: string }[] = [];

    for (const entry of urls) {
      const url = typeof entry === "string" ? entry : entry.url;
      const title = typeof entry === "string" ? extractTitleFromUrl(url) : (entry.title || extractTitleFromUrl(url));

      const validation = validateAudioUrl(url);
      if (!validation.valid) {
        results.push({ url, title, status: "error", error: validation.error });
        continue;
      }

      try {
        const { documentId } = await importAudioFromUrl(url, title, auth.orgId);
        results.push({ url, title, documentId, status: "success" });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Import failed";
        results.push({ url, title, status: "error", error: errorMessage });
      }
    }

    const successCount = results.filter((r) => r.status === "success").length;
    const errorCount = results.filter((r) => r.status === "error").length;

    return NextResponse.json({
      results,
      summary: { total: urls.length, success: successCount, errors: errorCount },
    });
  } catch (error) {
    console.error("Import audio URL error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function extractTitleFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const filename = pathname.split("/").pop() || "audio";
    const name = filename.replace(/\.[^.]+$/, "");
    return decodeURIComponent(name).replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim() || "Imported Audio";
  } catch {
    return "Imported Audio";
  }
}
