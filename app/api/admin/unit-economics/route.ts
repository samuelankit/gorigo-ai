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

export async function GET(request: NextRequest) {
  try {
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
    const user = await getAuthenticatedUser();
    if (!user || user.globalRole !== "SUPERADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { action } = body;

    if (action === "simulate") {
      const result = simulatePricing({
        callsPerMonth: body.callsPerMonth || 1000,
        avgCallDurationMinutes: body.avgCallDurationMinutes || 3,
        avgLLMTokensPerCall: body.avgLLMTokensPerCall || 2000,
        ratePerMinuteCharged: body.ratePerMinuteCharged || 0.15,
        llmModel: body.llmModel || "gpt-4o-mini",
        countryCode: body.countryCode || "GB",
        partnerCommissionPercent: body.partnerCommissionPercent || 10,
        affiliateCommissionPercent: body.affiliateCommissionPercent || 5,
        topUpAmountAvg: body.topUpAmountAvg || 50,
      });
      return NextResponse.json({ simulation: result });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return handleRouteError(error);
  }
}
