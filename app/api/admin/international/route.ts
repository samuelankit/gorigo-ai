import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { callLogs, countries, campaigns, countryRateCards } from "@/shared/schema";
import { sql, count, avg, desc, gte } from "drizzle-orm";
import { getAuthenticatedUser, requireSuperAdmin } from "@/lib/get-user";
import { adminLimiter } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/api-error";

export async function GET(request: NextRequest) {
  try {
    const rl = await adminLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    const auth = await getAuthenticatedUser();
    const access = requireSuperAdmin(auth);
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "30", 10);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const countryStats = await db
      .select({
        countryCode: callLogs.destinationCountry,
        totalCalls: count(),
        avgDuration: avg(callLogs.duration),
      })
      .from(callLogs)
      .where(gte(callLogs.startedAt, since))
      .groupBy(callLogs.destinationCountry)
      .orderBy(desc(count()));

    const activeCountries = await db
      .select({
        id: countries.id,
        name: countries.name,
        isoCode: countries.isoCode,
        callingCode: countries.callingCode,
        status: countries.status,
        tier: countries.tier,
        region: countries.region,
      })
      .from(countries)
      .orderBy(countries.name);

    const campaignStats = await db
      .select({
        country: campaigns.countryCode,
        totalCampaigns: count(),
      })
      .from(campaigns)
      .where(sql`${campaigns.countryCode} IS NOT NULL`)
      .groupBy(campaigns.countryCode)
      .orderBy(desc(count()));

    const rateCardStats = await db
      .select({
        countryId: countryRateCards.countryId,
        totalCards: count(),
      })
      .from(countryRateCards)
      .groupBy(countryRateCards.countryId);

    const complianceMetrics = await db
      .select({
        totalCalls: count(),
        dncBlocked: sql<number>`COUNT(CASE WHEN ${callLogs.complianceDncChecked} = true AND ${callLogs.complianceDncResult} = 'blocked' THEN 1 END)`,
        disclosurePlayed: sql<number>`COUNT(CASE WHEN ${callLogs.complianceDisclosurePlayed} = true THEN 1 END)`,
        consentObtained: sql<number>`COUNT(CASE WHEN ${callLogs.complianceRecordingConsent} IS NOT NULL AND ${callLogs.complianceRecordingConsent} != '' THEN 1 END)`,
        optOuts: sql<number>`COUNT(CASE WHEN ${callLogs.complianceOptOutDetected} = true THEN 1 END)`,
      })
      .from(callLogs)
      .where(gte(callLogs.startedAt, since));

    return NextResponse.json({
      period: { days, since: since.toISOString() },
      countryStats,
      activeCountries,
      subAccounts: [],
      campaignStats,
      rateCardStats,
      compliance: complianceMetrics[0] || { totalCalls: 0, dncBlocked: 0, disclosurePlayed: 0, consentObtained: 0, optOuts: 0 },
    });
  } catch (error) {
    return handleRouteError(error, "AdminInternational");
  }
}
