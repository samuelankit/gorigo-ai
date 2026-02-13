import { getAuthenticatedUser, requireSuperAdmin } from "@/lib/get-user";
import { getLastAutomationResult, runAutomationCycle, isAutomationRunning } from "@/lib/automation-engine";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
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
    const auth = await getAuthenticatedUser();
    const access = requireSuperAdmin(auth);
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const result = await runAutomationCycle();
    return NextResponse.json({ result });
  } catch (error) {
    console.error("Admin automation trigger error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
