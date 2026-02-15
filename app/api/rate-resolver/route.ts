import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { countries, countryRateCards } from "@/shared/schema";
import { eq, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const countryCode = searchParams.get("countryCode");
    const deploymentModel = searchParams.get("deploymentModel");
    const direction = searchParams.get("direction") || "outbound";
    const numberType = searchParams.get("numberType") || "mobile";

    if (!countryCode || !deploymentModel) {
      return NextResponse.json(
        { error: "Missing required params: countryCode, deploymentModel" },
        { status: 400 }
      );
    }

    const [country] = await db
      .select()
      .from(countries)
      .where(eq(countries.isoCode, countryCode.toUpperCase()))
      .limit(1);

    if (!country) {
      return NextResponse.json({ error: "Country not found" }, { status: 404 });
    }

    const [rateCard] = await db
      .select()
      .from(countryRateCards)
      .where(
        and(
          eq(countryRateCards.countryId, country.id),
          eq(countryRateCards.deploymentModel, deploymentModel),
          eq(countryRateCards.direction, direction),
          eq(countryRateCards.numberType, numberType),
          eq(countryRateCards.isActive, true)
        )
      )
      .limit(1);

    if (!rateCard) {
      return NextResponse.json(
        { error: "No rate card found for this combination" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      country: {
        id: country.id,
        isoCode: country.isoCode,
        name: country.name,
        callingCode: country.callingCode,
        tier: country.tier,
        status: country.status,
      },
      rate: {
        surchargePerMinute: rateCard.surchargePerMinute,
        twilioEstimatedCost: rateCard.twilioEstimatedCost,
        marginPercent: rateCard.marginPercent,
        deploymentModel: rateCard.deploymentModel,
        direction: rateCard.direction,
        numberType: rateCard.numberType,
        effectiveFrom: rateCard.effectiveFrom,
        effectiveUntil: rateCard.effectiveUntil,
      },
    });
  } catch (error) {
    console.error("Rate resolver error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
