import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orgs } from "@/shared/schema";
import { eq, sql } from "drizzle-orm";
import { resolveRate, type UsageCategory } from "@/lib/rate-resolver";
import { deductFromWallet, hasInsufficientBalance } from "@/lib/wallet";
import { roundMoney } from "@/lib/money";
import { getAuthenticatedUser, requireApiKeyScope } from "@/lib/get-user";
import { apiKeyLimiter } from "@/lib/rate-limit";
import { withCors, corsOptionsResponse } from "@/lib/v1-cors";
import { handleRouteError } from "@/lib/api-error";

const VALID_CATEGORIES = ["voice_inbound", "voice_outbound", "ai_chat"] as const;

export async function OPTIONS(request: NextRequest) {
  return corsOptionsResponse(request);
}

export async function POST(request: NextRequest) {
  try {
    const rl = await apiKeyLimiter(request);
    if (!rl.allowed) {
      return withCors(NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 }), request);
    }

    const auth = await getAuthenticatedUser();
    if (!auth) {
      return withCors(NextResponse.json({ error: "Not authenticated. Provide a valid API key via X-Api-Key header." }, { status: 401 }), request);
    }
    if (!auth.orgId) {
      return withCors(NextResponse.json({ error: "No organization found" }, { status: 404 }), request);
    }

    const scopeCheck = requireApiKeyScope(auth, "usage:write");
    if (!scopeCheck.allowed) {
      return withCors(NextResponse.json({ error: scopeCheck.error }, { status: scopeCheck.status || 403 }), request);
    }

    const orgId = auth.orgId;

    const [org] = await db
      .select({ id: orgs.id, deploymentModel: orgs.deploymentModel, status: orgs.status })
      .from(orgs)
      .where(eq(orgs.id, orgId))
      .limit(1);

    if (!org) {
      return withCors(NextResponse.json({ error: "Organization not found" }, { status: 404 }), request);
    }

    if (org.status === "suspended" || org.status === "terminated") {
      return withCors(NextResponse.json({ error: "Organisation account is suspended. Please contact support." }, { status: 403 }), request);
    }

    if (org.deploymentModel !== "self_hosted") {
      return withCors(NextResponse.json({ error: "Usage reporting is only available for Self-Hosted deployments" }, { status: 403 }), request);
    }

    const zeroBalance = await hasInsufficientBalance(orgId, 0.01);
    if (zeroBalance) {
      return withCors(NextResponse.json({ error: "Wallet balance depleted. Top up to continue service.", walletDepleted: true }, { status: 402 }), request);
    }

    const body = await request.json();
    const { events } = body;

    if (!Array.isArray(events) || events.length === 0) {
      return withCors(NextResponse.json({ error: "events array is required and must not be empty" }, { status: 400 }), request);
    }

    if (events.length > 100) {
      return withCors(NextResponse.json({ error: "Maximum 100 events per report" }, { status: 400 }), request);
    }

    const results: Array<{
      index: number;
      category: string;
      durationSeconds: number;
      cost: number;
      status: string;
      error?: string;
    }> = [];

    let totalCost = 0;
    let totalDeducted = 0;

    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const category = (event.category || "voice_inbound") as UsageCategory;
      const durationSeconds = Math.max(0, parseInt(event.durationSeconds || event.duration_seconds || "0", 10));
      const minCharge = Math.max(durationSeconds, 30);

      if (!VALID_CATEGORIES.includes(category as typeof VALID_CATEGORIES[number])) {
        results.push({ index: i, category, durationSeconds, cost: 0, status: "error", error: "Invalid category. Must be one of: voice_inbound, voice_outbound, ai_chat" });
        continue;
      }

      if (durationSeconds <= 0) {
        results.push({ index: i, category, durationSeconds: 0, cost: 0, status: "skipped", error: "No duration" });
        continue;
      }

      try {
        const rate = await resolveRate(orgId, category);
        const cost = roundMoney((minCharge / 60) * rate.ratePerMinute);
        totalCost += cost;

        await deductFromWallet(
          orgId,
          cost,
          `Self-hosted usage: ${Math.ceil(minCharge / 60)} min (${category})`,
          "call",
          `usage-report-${Date.now()}-${i}`
        );

        totalDeducted += cost;

        const now = new Date();
        const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        const minutesUsed = roundMoney(minCharge / 60);

        await db.execute(sql`
          INSERT INTO usage_records (user_id, org_id, month, minutes_used, call_count)
          VALUES (${auth.user.id}, ${orgId}, ${month}, ${minutesUsed}, 1)
          ON CONFLICT (org_id, month) DO UPDATE
          SET minutes_used = usage_records.minutes_used + ${minutesUsed},
              call_count = usage_records.call_count + 1
        `).catch((error) => { console.error("Update usage records failed:", error); });

        results.push({ index: i, category, durationSeconds, cost, status: "billed" });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Billing failed";
        if (message.includes("Insufficient balance")) {
          results.push({ index: i, category, durationSeconds, cost: 0, status: "error", error: "Insufficient wallet balance" });
          for (let j = i + 1; j < events.length; j++) {
            results.push({ index: j, category: events[j]?.category || "voice_inbound", durationSeconds: 0, cost: 0, status: "skipped", error: "Skipped due to insufficient balance" });
          }
          break;
        }
        results.push({ index: i, category, durationSeconds, cost: 0, status: "error", error: message });
      }
    }

    return withCors(NextResponse.json({
      processed: events.length,
      billed: results.filter(r => r.status === "billed").length,
      failed: results.filter(r => r.status === "error").length,
      skipped: results.filter(r => r.status === "skipped").length,
      totalCost: roundMoney(totalCost),
      totalDeducted: roundMoney(totalDeducted),
      results,
    }), request);
  } catch (error) {
    return handleRouteError(error, "V1UsageReport");
  }
}
