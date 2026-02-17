const REQUIRED_VARS = [
  "DATABASE_URL",
  "SESSION_SECRET",
] as const;

const OPTIONAL_VARS = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "OPENAI_API_KEY",
] as const;

export function validateEnvironment(): void {
  const missing: string[] = [];

  for (const key of REQUIRED_VARS) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    console.error(
      `[GoRigo] FATAL: Missing required environment variables: ${missing.join(", ")}`
    );
    console.error(
      "[GoRigo] The application cannot start without these. Please configure them in your environment."
    );
    process.exit(1);
  }

  const warnings: string[] = [];
  for (const key of OPTIONAL_VARS) {
    if (!process.env[key]) {
      warnings.push(key);
    }
  }

  if (warnings.length > 0) {
    console.warn(
      `[GoRigo] Optional environment variables not set: ${warnings.join(", ")}. Some features may be unavailable.`
    );
  }

  console.info("[GoRigo] Environment validation passed");
}
