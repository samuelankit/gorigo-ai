export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateEnvironment } = await import("@/lib/env-check");
    validateEnvironment();

    const { startPeriodicCleanup } = await import("@/lib/cleanup");
    startPeriodicCleanup(5 * 60 * 1000);
    console.log("[GoRigo] Background cleanup started (5 min interval)");

    const { startAutomationEngine } = await import("@/lib/automation-engine");
    startAutomationEngine(10 * 60 * 1000);
    console.log("[GoRigo] Automation engine started (10 min interval)");

    const { setupGracefulShutdown } = await import("@/lib/shutdown");
    setupGracefulShutdown([
      () => console.info("[Shutdown] Stopping background services..."),
    ]);
    console.log("[GoRigo] Graceful shutdown handler registered");

    const { seedPlatformKnowledge } = await import("@/lib/platform-knowledge");
    seedPlatformKnowledge()
      .then((result) => {
        if (result.skipped) {
          console.log("[GoRigo] Platform knowledge base already seeded");
        } else {
          console.log(`[GoRigo] Platform knowledge base seeded: ${result.seeded} chunks`);
        }
      })
      .catch((err) => {
        console.error("[GoRigo] Platform knowledge seed failed:", err);
      });
  }
}
