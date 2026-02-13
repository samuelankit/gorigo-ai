import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/get-user";
import { getLastHealthReport, getHealthHistory, getMetricsHistory, startAutopilotMonitor, runHealthCheck } from "@/lib/autopilot";
import { getLLMRouterStats, resetCircuitBreaker } from "@/lib/llm-router";
import { getRecentErrors, clearErrorLog, handleApiError } from "@/lib/error-handler";

startAutopilotMonitor();

export async function GET(request: Request) {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth || auth.globalRole !== "SUPERADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const section = searchParams.get("section");

    if (section === "health") {
      const health = getLastHealthReport() || await runHealthCheck();
      return NextResponse.json(health);
    }

    if (section === "llm") {
      const stats = getLLMRouterStats();
      return NextResponse.json(stats);
    }

    if (section === "errors") {
      const errors = getRecentErrors();
      return NextResponse.json({ errors, count: errors.length });
    }

    if (section === "events") {
      const limit = parseInt(searchParams.get("limit") || "50");
      const events = getHealthHistory(limit);
      return NextResponse.json({ events, count: events.length });
    }

    const health = getLastHealthReport() || await runHealthCheck();
    const llm = getLLMRouterStats();
    const events = getHealthHistory(50);
    const errors = getRecentErrors().slice(-20);
    const metrics = getMetricsHistory(60);

    return NextResponse.json({
      health,
      llm,
      events,
      errors: { count: errors.length, recent: errors },
      metrics,
    });
  } catch (error) {
    return handleApiError(error, request);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth || auth.globalRole !== "SUPERADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const action = body.action;

    if (action === "reset-circuit-breaker") {
      const provider = body.provider;
      if (!provider) {
        return NextResponse.json({ error: "Provider required" }, { status: 400 });
      }
      resetCircuitBreaker(provider);
      return NextResponse.json({ success: true, message: `Circuit breaker reset for ${provider}` });
    }

    if (action === "clear-errors") {
      clearErrorLog();
      return NextResponse.json({ success: true, message: "Error log cleared" });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return handleApiError(error, request);
  }
}
