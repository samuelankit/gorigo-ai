let initialized = false;

export async function ensureServicesStarted() {
  if (initialized) return;
  initialized = true;

  try {
    const { validateEnvironment } = await import("@/lib/env-check");
    validateEnvironment();
  } catch (e) {
    console.error("[GoRigo] Environment validation failed:", e);
  }

  const isProduction = process.env.NODE_ENV === "production";

  try {
    const cleanupInterval = isProduction ? 30 * 60 * 1000 : 5 * 60 * 1000;
    const { startPeriodicCleanup } = await import("@/lib/cleanup");
    startPeriodicCleanup(cleanupInterval);
    console.log(`[GoRigo] Background cleanup started (${cleanupInterval / 60000} min interval)`);
  } catch (e) {
    console.error("[GoRigo] Cleanup init failed:", e);
  }

  try {
    const automationInterval = isProduction ? 30 * 60 * 1000 : 10 * 60 * 1000;
    const { startAutomationEngine } = await import("@/lib/automation-engine");
    startAutomationEngine(automationInterval);
    console.log(`[GoRigo] Automation engine started (${automationInterval / 60000} min interval)`);
  } catch (e) {
    console.error("[GoRigo] Automation engine init failed:", e);
  }

  try {
    const { setupGracefulShutdown } = await import("@/lib/shutdown");
    setupGracefulShutdown([
      () => console.info("[Shutdown] Stopping background services..."),
    ]);
    console.log("[GoRigo] Graceful shutdown handler registered");
  } catch (e) {
    console.error("[GoRigo] Shutdown handler failed:", e);
  }

  if (!isProduction) {
    try {
      const { seedPlatformKnowledge } = await import("@/lib/platform-knowledge");
      const result = await seedPlatformKnowledge();
      if (result.skipped) {
        console.log("[GoRigo] Platform knowledge base already seeded");
      } else {
        console.log(`[GoRigo] Platform knowledge base seeded: ${result.seeded} chunks`);
      }
    } catch (e) {
      console.error("[GoRigo] Platform knowledge seed failed:", e);
    }
  }
}
