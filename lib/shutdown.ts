import { db } from "@/lib/db";

let shutdownInProgress = false;

export function setupGracefulShutdown(cleanupFns: Array<() => Promise<void> | void>) {
  const shutdown = async (signal: string) => {
    if (shutdownInProgress) return;
    shutdownInProgress = true;
    console.info(`[Shutdown] Received ${signal}, starting graceful shutdown...`);
    
    for (const fn of cleanupFns) {
      try {
        await fn();
      } catch (err) {
        console.error("[Shutdown] Cleanup error:", err);
      }
    }
    
    console.info("[Shutdown] Graceful shutdown complete");
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}
