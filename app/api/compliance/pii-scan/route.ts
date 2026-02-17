import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/get-user";
import { redactPII, hasPII } from "@/lib/pii-redaction";
import { generalLimiter } from "@/lib/rate-limit";
import { checkBodySize, BODY_LIMITS } from "@/lib/body-limit";
import { z } from "zod";

const bodySchema = z.object({
  text: z.string().min(1),
}).strict();

export async function POST(request: NextRequest) {
  try {
    const rl = await generalLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    const sizeError = checkBodySize(request, BODY_LIMITS.admin);
    if (sizeError) return sizeError;

    const auth = await getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = bodySchema.parse(body);

    const result = redactPII(parsed.text);

    return NextResponse.json({
      hasPII: result.piiCount > 0,
      piiCount: result.piiCount,
      redactedText: result.redactedText,
      piiTypes: result.piiFound.map(p => p.type),
    });
  } catch (error) {
    console.error("PII scan error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
