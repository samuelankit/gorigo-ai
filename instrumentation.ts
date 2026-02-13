export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startPeriodicCleanup } = await import("@/lib/cleanup");
    startPeriodicCleanup(5 * 60 * 1000);
    console.log("[GoRigo] Background cleanup started (5 min interval)");

    const { startAutomationEngine } = await import("@/lib/automation-engine");
    startAutomationEngine(10 * 60 * 1000);
    console.log("[GoRigo] Automation engine started (10 min interval)");
  }
}
