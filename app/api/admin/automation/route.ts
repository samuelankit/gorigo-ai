import { getAuthenticatedUser, requireSuperAdmin } from "@/lib/get-user";
import { getLastAutomationResult, runAutomationCycle, isAutomationRunning } from "@/lib/automation-engine";
import { NextRequest, NextResponse } from "next/server";
import { adminLimiter } from "@/lib/rate-limit";
import { z } from "zod";
import { handleRouteError } from "@/lib/api-error";

const bodySchema = z.object({
  trigger: z.string().optional(),
}).strict();

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
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

    const lastResult = getLastAutomationResult();
    return NextResponse.json({
      lastRun: lastResult,
      engineRunning: true,
      currentlyProcessing: isAutomationRunning(),
    });
  } catch (error) {
    return handleRouteError(error, "AdminAutomation");
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json().catch(() => ({}));
    const parsed = bodySchema.parse(body);

    const result = await runAutomationCycle();
    return NextResponse.json({ result });
  } catch (error) {
    return handleRouteError(error, "AdminAutomation");
  }
}
