export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    process.on("unhandledRejection", (reason) => {
      console.error("[process] Unhandled rejection:", reason);
    });

    process.on("uncaughtException", (err) => {
      console.error("[process] Uncaught exception:", err.message, err.stack);
    });

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.warn("[GoRigo] ⚠ STRIPE_WEBHOOK_SECRET is not set. Stripe webhooks will be rejected in production. Set this secret before going live.");
    }

    if (process.env.NODE_ENV === "production") {
      const { ensureServicesStarted } = await import("@/lib/lazy-init");
      ensureServicesStarted().catch((err) => {
        console.error("[GoRigo] Failed to start background services:", err);
      });
      console.log("[GoRigo] Production instrumentation: starting background services");
    } else {
      console.log("[GoRigo] Dev instrumentation registered (services start on first API request)");
    }
  }
}
