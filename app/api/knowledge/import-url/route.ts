import { getAuthenticatedUser, requireOrgActive } from "@/lib/get-user";
import { validateAudioUrl, importAudioFromUrl } from "@/lib/rag";
import { NextRequest, NextResponse } from "next/server";
import { knowledgeLimiter } from "@/lib/rate-limit";
import { checkBodySize, BODY_LIMITS } from "@/lib/body-limit";
import { hasInsufficientBalance } from "@/lib/wallet";
import { z } from "zod";
import { handleRouteError } from "@/lib/api-error";

const urlEntrySchema = z.union([
  z.string().url(),
  z.object({ url: z.string().url(), title: z.string().optional() }).strict(),
]);

const bodySchema = z.object({
  urls: z.array(urlEntrySchema).min(1).max(10),
}).strict();

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

    const orgActiveCheck = await requireOrgActive(auth.orgId);
    if (!orgActiveCheck.allowed) {
      return NextResponse.json({ error: orgActiveCheck.error }, { status: orgActiveCheck.status || 403 });
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
    const parsed = bodySchema.parse(body);

    const results: { url: string; title: string; documentId?: number; status: string; error?: string }[] = [];

    for (const entry of parsed.urls) {
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
      summary: { total: parsed.urls.length, success: successCount, errors: errorCount },
    });
  } catch (error) {
    return handleRouteError(error, "KnowledgeImportUrl");
  }
}

function extractTitleFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const filename = pathname.split("/").pop() || "audio";
    const name = filename.replace(/\.[^.]+$/, "");
    return decodeURIComponent(name).replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim() || "Imported Audio";
  } catch (error) {
    return "Imported Audio";
  }
}
