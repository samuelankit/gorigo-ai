import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, requireSuperAdmin } from "@/lib/get-user";
import { cleanupExpiredSessions, cleanupExpiredCache, retryFailedDocuments } from "@/lib/cleanup";
import { adminLimiter } from "@/lib/rate-limit";
import { z } from "zod";
import { handleRouteError } from "@/lib/api-error";

const bodySchema = z.object({
  type: z.string().min(1).optional(),
}).strict();

export async function POST(request: NextRequest) {
  try {
    const rl = await adminLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const auth = await getAuthenticatedUser();
    const access = requireSuperAdmin(auth);
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = bodySchema.parse(body);

    const [expiredSessions, expiredCache, retriedDocs] = await Promise.all([
      cleanupExpiredSessions(),
      cleanupExpiredCache(),
      retryFailedDocuments(),
    ]);

    return NextResponse.json({
      success: true,
      cleaned: {
        expiredSessions,
        expiredCache,
        retriedDocs,
      },
    });
  } catch (error) {
    return handleRouteError(error, "AdminCleanup");
  }
}
