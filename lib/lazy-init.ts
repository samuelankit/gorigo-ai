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

  try {
    const { db } = await import("@/lib/db");
    const { sql } = await import("drizzle-orm");
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_call_logs_transcript_fts ON call_logs USING gin (to_tsvector('english'::regconfig, COALESCE(transcript, ''::text)))`);
  } catch (e) {
    console.error("[GoRigo] FTS index creation skipped:", e instanceof Error ? e.message : e);
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
    const jobInterval = isProduction ? 30_000 : 60_000;
    const { startJobProcessor } = await import("@/lib/jobs");
    startJobProcessor(jobInterval);
    console.log(`[GoRigo] Job processor started (${jobInterval / 1000}s interval)`);
  } catch (e) {
    console.error("[GoRigo] Job processor init failed:", e);
  }

  try {
    const campaignInterval = isProduction ? 15_000 : 30_000;
    const { startCampaignEngine } = await import("@/lib/campaign-executor");
    startCampaignEngine(campaignInterval);
    console.log(`[GoRigo] Campaign engine started (${campaignInterval / 1000}s interval)`);
  } catch (e) {
    console.error("[GoRigo] Campaign engine init failed:", e);
  }

  try {
    const { restoreCallBilling } = await import("@/lib/mid-call-billing");
    const restored = await restoreCallBilling();
    if (restored > 0) {
      console.log(`[GoRigo] Restored ${restored} active call billing sessions`);
    }
  } catch (e) {
    console.error("[GoRigo] Billing restore failed:", e);
  }

  try {
    const { startHealthAlerts } = await import("@/lib/health-alerts");
    startHealthAlerts();
    console.log("[GoRigo] Health alert system started (5 min interval)");
  } catch (e) {
    console.error("[GoRigo] Health alerts init failed:", e);
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

  try {
    const { isStripeConnectorConfigured, getStripeSync } = await import("@/lib/stripe-client");
    const hasConnector = await isStripeConnectorConfigured();
    if (hasConnector) {
      const { runMigrations } = await import("stripe-replit-sync");
      await runMigrations({ databaseUrl: process.env.DATABASE_URL! });
      console.log("[GoRigo] Stripe schema ready");

      const stripeSync = await getStripeSync();

      const domain = process.env.REPLIT_DOMAINS?.split(",")[0] || process.env.REPLIT_DEV_DOMAIN;
      if (domain) {
        try {
          const result = await stripeSync.findOrCreateManagedWebhook(
            `https://${domain}/api/billing/stripe-webhook`
          );
          if (result?.webhook?.url) {
            console.log(`[GoRigo] Stripe webhook configured: ${result.webhook.url}`);
          } else {
            console.log("[GoRigo] Stripe webhook: auto-setup unavailable — configure manually in Stripe Dashboard");
          }
        } catch (whErr) {
          console.warn("[GoRigo] Stripe webhook auto-setup failed — configure manually in Stripe Dashboard:", whErr instanceof Error ? whErr.message : whErr);
        }
      }

      stripeSync.syncBackfill()
        .then(() => console.log("[GoRigo] Stripe data synced"))
        .catch((err: any) => console.error("[GoRigo] Stripe sync failed:", err));
    } else {
      console.log("[GoRigo] Stripe connector not configured - skipping sync");
    }
  } catch (e) {
    console.error("[GoRigo] Stripe init failed:", e);
  }
}
