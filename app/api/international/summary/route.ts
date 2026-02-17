import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { countries, callLogs } from "@/shared/schema";
import { eq, sql, count, avg, desc, gte, and } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";
import { settingsLimiter } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  try {
    const rl = await settingsLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const availableCountries = await db
      .select({
        id: countries.id,
        name: countries.name,
        isoCode: countries.isoCode,
        callingCode: countries.callingCode,
        region: countries.region,
        tier: countries.tier,
        status: countries.status,
      })
      .from(countries)
      .where(eq(countries.status, "active"))
      .orderBy(countries.name);

    const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const countryCallStats = await db
      .select({
        countryCode: callLogs.destinationCountry,
        totalCalls: count(),
        avgDuration: avg(callLogs.duration),
      })
      .from(callLogs)
      .where(
        and(
          eq(callLogs.orgId, auth.orgId),
          gte(callLogs.startedAt, since30)
        )
      )
      .groupBy(callLogs.destinationCountry)
      .orderBy(desc(count()));

    const complianceStats = await db
      .select({
        totalCalls: count(),
        dncBlocked: sql<number>`COUNT(CASE WHEN ${callLogs.complianceDncChecked} = true AND ${callLogs.complianceDncResult} = 'blocked' THEN 1 END)`,
        disclosurePlayed: sql<number>`COUNT(CASE WHEN ${callLogs.complianceDisclosurePlayed} = true THEN 1 END)`,
        consentObtained: sql<number>`COUNT(CASE WHEN ${callLogs.complianceRecordingConsent} IS NOT NULL AND ${callLogs.complianceRecordingConsent} != '' THEN 1 END)`,
      })
      .from(callLogs)
      .where(
        and(
          eq(callLogs.orgId, auth.orgId),
          gte(callLogs.startedAt, since30)
        )
      );

    const compliance = complianceStats[0] || { totalCalls: 0, dncBlocked: 0, disclosurePlayed: 0, consentObtained: 0 };
    const complianceRate = Number(compliance.totalCalls) > 0
      ? Math.round((Number(compliance.disclosurePlayed) / Number(compliance.totalCalls)) * 100)
      : 100;

    const countriesUsedByOrg = countryCallStats
      .map((s) => s.countryCode)
      .filter(Boolean);

    const orgCountries = countriesUsedByOrg.length > 0
      ? availableCountries.filter((c) => countriesUsedByOrg.includes(c.isoCode))
      : availableCountries;

    return NextResponse.json({
      activeCountries: orgCountries,
      allAvailableCountries: availableCountries,
      countryCallStats,
      compliance: {
        ...compliance,
        rate: complianceRate,
      },
      totalCountries: availableCountries.length,
      countriesWithCalls: countryCallStats.length,
      hasCallHistory: countriesUsedByOrg.length > 0,
    });
  } catch (error) {
    console.error("International summary error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
