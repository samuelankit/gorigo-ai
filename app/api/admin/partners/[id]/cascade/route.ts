import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, requireSuperAdmin, requireEmailVerified } from "@/lib/get-user";
import { adminLimiter } from "@/lib/rate-limit";
import { executePartnerCascade, reversePartnerCascade } from "@/lib/partner-cascade";
import { z } from "zod";
import { handleRouteError } from "@/lib/api-error";

const cascadeSchema = z.object({
  action: z.enum(["suspend", "terminate", "reactivate"]),
  reason: z.string().min(1).max(2000),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rl = await adminLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const auth = await getAuthenticatedUser();
    const access = requireSuperAdmin(auth);
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const emailCheck = requireEmailVerified(auth);
    if (!emailCheck.allowed) {
      return NextResponse.json({ error: emailCheck.error }, { status: emailCheck.status || 403 });
    }

    const { id } = await params;
    const partnerId = parseInt(id, 10);
    if (isNaN(partnerId)) {
      return NextResponse.json({ error: "Invalid partner ID" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = cascadeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.issues }, { status: 400 });
    }

    const { action, reason } = parsed.data;

    if (action === "reactivate") {
      const result = await reversePartnerCascade(partnerId, auth!.user.id);
      return NextResponse.json({
        ok: true,
        action: "reactivate",
        result,
        message: `Reactivated partner and ${result.clientsPaused} clients`,
      });
    }

    const result = await executePartnerCascade(partnerId, action, auth!.user.id, reason);

    return NextResponse.json({
      ok: true,
      action,
      result,
      message: `Cascade ${action} completed. ${result.clientsPaused} clients affected, ${result.resellersCascaded} resellers cascaded.`,
    });
  } catch (error) {
    return handleRouteError(error, "PartnerCascade");
  }
}
