import { getAuthenticatedUser } from "@/lib/get-user";
import { createJob } from "@/lib/jobs";
import { NextRequest, NextResponse } from "next/server";
import { knowledgeLimiter } from "@/lib/rate-limit";
import { checkBodySize, BODY_LIMITS } from "@/lib/body-limit";
import { z } from "zod";

const bodySchema = z.object({
  documentId: z.union([z.number(), z.string().min(1)]),
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

    if (auth.isDemo) {
      return NextResponse.json({ error: "Demo accounts cannot process documents" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = bodySchema.parse(body);

    await createJob("DOCUMENT_PROCESS", { documentId: parsed.documentId, orgId: auth.orgId });

    return NextResponse.json({ 
      success: true, 
      message: "Document processing started",
      documentId: parsed.documentId,
    });
  } catch (error) {
    console.error("Process document error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
