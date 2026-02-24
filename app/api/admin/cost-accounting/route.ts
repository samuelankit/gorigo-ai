import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/get-user";
import { handleRouteError } from "@/lib/api-error";
import { adminLimiter } from "@/lib/rate-limit";
import {
  generateProfitAndLoss,
  getCOGSBreakdown,
  getFixedCostsSummary,
  generatePricingRecommendations,
  generateBreakEvenAnalysis,
  calculateCorporationTax,
  categoriseExpensesForTax,
  UK_TAX,
} from "@/lib/cost-accounting";
import { CUSTOMER_TIERS, AFFILIATE_COMMISSION_RATE, INTERNAL_COSTS as PRICING_COSTS } from "@/lib/pricing-config";

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
    const tab = searchParams.get("tab") || "pnl";
    const days = parseInt(searchParams.get("days") || "30");
    const dateFrom = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const dateTo = new Date();

    if (tab === "pnl") {
      const pnl = await generateProfitAndLoss(dateFrom, dateTo);
      return NextResponse.json({ pnl, period: { days, dateFrom, dateTo } });
    }

    if (tab === "cogs") {
      const cogs = await getCOGSBreakdown(dateFrom, dateTo);
      return NextResponse.json({ cogs, period: { days, dateFrom, dateTo } });
    }

    if (tab === "fixed") {
      const fixed = getFixedCostsSummary();
      const { amortisedPerMinute, ...serializableFixed } = fixed;
      return NextResponse.json({ fixed: serializableFixed });
    }

    if (tab === "pricing") {
      const rawMinutes = parseInt(searchParams.get("minutes") || "5000");
      const estimatedMonthlyMinutes = Number.isFinite(rawMinutes) && rawMinutes > 0 ? rawMinutes : 5000;
      const fixed = getFixedCostsSummary();
      const variableCostPerMinute = PRICING_COSTS.totalPerMin - PRICING_COSTS.azureHostingAmortisedPerMin;

      const recommendations = generatePricingRecommendations({
        actualCostPerMinute: variableCostPerMinute,
        fixedCostsMonthly: fixed.totalMonthly,
        estimatedMonthlyMinutes,
        partnerCommissionRate: 0.10,
        affiliateCommissionRate: AFFILIATE_COMMISSION_RATE,
      });

      const breakEven = generateBreakEvenAnalysis({
        fixedCostsMonthly: fixed.totalMonthly,
        variableCostPerMinute,
        ratePerMinute: CUSTOMER_TIERS.individual.ratePerMinute,
        partnerCommissionRate: 0,
      });

      return NextResponse.json({
        recommendations,
        breakEven,
        currentTiers: CUSTOMER_TIERS,
        internalCosts: PRICING_COSTS,
        fixedCosts: fixed,
      });
    }

    if (tab === "tax") {
      const pnl = await generateProfitAndLoss(dateFrom, dateTo);
      const annualisedProfit = pnl.operatingProfit.amount * (12 / pnl.period.months);
      const annualisedRevenue = pnl.revenue.talkTimeRevenue * (12 / pnl.period.months);
      const tax = calculateCorporationTax(annualisedProfit > 0 ? annualisedProfit : 0);

      const expenses = categoriseExpensesForTax({
        llmCosts: pnl.cogs.llmCosts * (12 / pnl.period.months),
        telephonyCosts: pnl.cogs.telephonyCosts * (12 / pnl.period.months),
        stripeFees: pnl.cogs.stripeFees * (12 / pnl.period.months),
        infrastructureCosts: getFixedCostsSummary().totalAnnual,
        domainCosts: 30,
        commissions: pnl.operatingExpenses.commissions * (12 / pnl.period.months),
      });

      const totalDeductible = expenses.reduce((sum, cat) => sum + cat.subtotal, 0);

      return NextResponse.json({
        tax,
        expenses,
        totalDeductible,
        annualisedRevenue,
        annualisedProfit,
        vatStatus: {
          registered: UK_TAX.vatCurrentlyRegistered,
          threshold: UK_TAX.vatRegistrationThreshold,
          currentTurnover: annualisedRevenue,
          needsRegistration: annualisedRevenue >= UK_TAX.vatRegistrationThreshold,
          note: annualisedRevenue >= UK_TAX.vatRegistrationThreshold
            ? "Your turnover has exceeded the VAT registration threshold. You must register for VAT."
            : `You are below the VAT threshold (£${UK_TAX.vatRegistrationThreshold.toLocaleString()}). No VAT registration required yet. Prices are VAT-exclusive.`,
        },
        ukTaxConfig: UK_TAX,
        period: { days, dateFrom, dateTo },
      });
    }

    return NextResponse.json({ error: "Invalid tab parameter" }, { status: 400 });
  } catch (error: any) {
    return handleRouteError(error, "Cost Accounting");
  }
}
