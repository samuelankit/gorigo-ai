import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/get-user";
import {
  getUnitEconomicsSummary,
  getCostTrends,
  getPerCallEconomics,
  getRevenueFromBilling,
  getDistributionSummary,
  simulatePricing,
  LLM_PRICING,
  PLATFORM_COSTS,
} from "@/lib/unit-economics";
import { handleRouteError } from "@/lib/api-error";
import { adminLimiter } from "@/lib/rate-limit";
import { z } from "zod";

const simulateSchema = z.object({
  action: z.literal("simulate"),
  callsPerMonth: z.number().int().min(1).max(1_000_000).optional(),
  avgCallDurationMinutes: z.number().min(0.1).max(120).optional(),
  avgLLMTokensPerCall: z.number().int().min(1).max(100_000).optional(),
  ratePerMinuteCharged: z.number().min(0.01).max(100).optional(),
  llmModel: z.string().min(1).max(100).optional(),
  countryCode: z.string().length(2).optional(),
  partnerCommissionPercent: z.number().min(0).max(100).optional(),
  affiliateCommissionPercent: z.number().min(0).max(100).optional(),
  topUpAmountAvg: z.number().min(0).max(100_000).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const rl = await adminLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const user = await getAuthenticatedUser();
    if (!user || user.globalRole !== "SUPERADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const view = searchParams.get("view") || "summary";
    const dateFromStr = searchParams.get("dateFrom");
    const dateToStr = searchParams.get("dateTo");
    const days = parseInt(searchParams.get("days") || "30");

    const dateFrom = dateFromStr ? new Date(dateFromStr) : undefined;
    const dateTo = dateToStr ? new Date(dateToStr) : undefined;

    if (view === "summary") {
      const [summary, revenue, distribution] = await Promise.all([
        getUnitEconomicsSummary(dateFrom, dateTo),
        getRevenueFromBilling(dateFrom, dateTo),
        getDistributionSummary(dateFrom, dateTo),
      ]);
      return NextResponse.json({ summary, revenue, distribution });
    }

    if (view === "trends") {
      const trends = await getCostTrends(days, dateFrom, dateTo);
      return NextResponse.json({ trends });
    }

    if (view === "per-call") {
      const limit = parseInt(searchParams.get("limit") || "50");
      const calls = await getPerCallEconomics(limit);
      return NextResponse.json({ calls });
    }

    if (view === "config") {
      return NextResponse.json({
        llmPricing: LLM_PRICING,
        platformCosts: PLATFORM_COSTS,
      });
    }

    return NextResponse.json({ error: "Invalid view parameter" }, { status: 400 });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const rl = await adminLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const user = await getAuthenticatedUser();
    if (!user || user.globalRole !== "SUPERADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = simulateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.errors }, { status: 400 });
    }
    const { action, ...params } = parsed.data;

    if (action === "simulate") {
      const result = simulatePricing({
        callsPerMonth: params.callsPerMonth || 1000,
        avgCallDurationMinutes: params.avgCallDurationMinutes || 3,
        avgLLMTokensPerCall: params.avgLLMTokensPerCall || 2000,
        ratePerMinuteCharged: params.ratePerMinuteCharged || 0.15,
        llmModel: params.llmModel || "gpt-4o-mini",
        countryCode: params.countryCode || "GB",
        partnerCommissionPercent: params.partnerCommissionPercent || 10,
        affiliateCommissionPercent: params.affiliateCommissionPercent || 5,
        topUpAmountAvg: params.topUpAmountAvg || 50,
      });
      return NextResponse.json({ simulation: result });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return handleRouteError(error);
  }
}
