import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

interface ServiceStatus {
  name: string;
  status: "operational" | "degraded" | "outage";
  latencyMs?: number;
  message?: string;
}

export async function GET() {
  const services: ServiceStatus[] = [];
  const startTime = Date.now();

  const dbStart = Date.now();
  try {
    await db.execute(sql`SELECT 1`);
    services.push({ name: "Database", status: "operational", latencyMs: Date.now() - dbStart });
  } catch {
    services.push({ name: "Database", status: "outage", latencyMs: Date.now() - dbStart, message: "Database connection failed" });
  }

  services.push({ name: "API Server", status: "operational", latencyMs: Date.now() - startTime });

  const aiConfigured = !!(process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY);
  services.push({
    name: "AI Services",
    status: aiConfigured ? "operational" : "degraded",
    message: aiConfigured ? undefined : "AI provider not configured",
  });

  const stripeConfigured = !!process.env.STRIPE_SECRET_KEY;
  services.push({
    name: "Payment Processing",
    status: stripeConfigured ? "operational" : "degraded",
    message: stripeConfigured ? undefined : "Stripe not configured",
  });

  const emailConfigured = !!(process.env.AWS_SES_ACCESS_KEY_ID && process.env.AWS_SES_SECRET_ACCESS_KEY);
  services.push({
    name: "Email Service",
    status: emailConfigured ? "operational" : "degraded",
    message: emailConfigured ? undefined : "AWS SES not configured",
  });

  const telnyxConfigured = !!process.env.TELNYX_API_KEY;
  services.push({
    name: "Telephony",
    status: telnyxConfigured ? "operational" : "degraded",
    message: telnyxConfigured ? undefined : "Telnyx not configured",
  });

  const overallStatus = services.some((s) => s.status === "outage")
    ? "outage"
    : services.some((s) => s.status === "degraded")
      ? "degraded"
      : "operational";

  return NextResponse.json({
    status: overallStatus,
    services,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
}
