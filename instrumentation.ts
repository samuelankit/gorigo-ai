export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateEnvironment } = await import("@/lib/env-check");
    validateEnvironment();

    const isProduction = process.env.NODE_ENV === "production";

    const cleanupInterval = isProduction ? 30 * 60 * 1000 : 5 * 60 * 1000;
    const { startPeriodicCleanup } = await import("@/lib/cleanup");
    startPeriodicCleanup(cleanupInterval);
    console.log(`[GoRigo] Background cleanup started (${cleanupInterval / 60000} min interval)`);

    const automationInterval = isProduction ? 30 * 60 * 1000 : 10 * 60 * 1000;
    const { startAutomationEngine } = await import("@/lib/automation-engine");
    startAutomationEngine(automationInterval);
    console.log(`[GoRigo] Automation engine started (${automationInterval / 60000} min interval)`);

    const { setupGracefulShutdown } = await import("@/lib/shutdown");
    setupGracefulShutdown([
      () => console.info("[Shutdown] Stopping background services..."),
    ]);
    console.log("[GoRigo] Graceful shutdown handler registered");

    process.on("unhandledRejection", (reason) => {
      console.error("[process] Unhandled rejection:", reason);
    });

    process.on("uncaughtException", (err) => {
      console.error("[process] Uncaught exception:", err.message, err.stack);
    });

    if (!isProduction) {
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
    } else {
      console.log("[GoRigo] Skipping knowledge seed in production (run manually if needed)");
    }
  }
}
