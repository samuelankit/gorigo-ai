import { getAuthenticatedUser, requireSuperAdmin } from "@/lib/get-user";
import { getLastAutomationResult, runAutomationCycle, isAutomationRunning } from "@/lib/automation-engine";
import { NextRequest, NextResponse } from "next/server";
import { adminLimiter } from "@/lib/rate-limit";
import { z } from "zod";

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
    console.error("Admin automation status error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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
    console.error("Admin automation trigger error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
