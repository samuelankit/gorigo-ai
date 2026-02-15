import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";

const COUNTRY_NAMES: Record<string, string> = {
  GB: "United Kingdom", US: "United States", FR: "France", DE: "Germany",
  IN: "India", CA: "Canada", AU: "Australia", ES: "Spain", IT: "Italy",
  NL: "Netherlands", JP: "Japan", BR: "Brazil", MX: "Mexico",
  AE: "United Arab Emirates", SG: "Singapore", ZA: "South Africa",
  IE: "Ireland", SE: "Sweden", CH: "Switzerland", PL: "Poland",
};

const COUNTRY_CURRENCIES: Record<string, string> = {
  GB: "GBP", US: "USD", CA: "CAD", AU: "AUD", IE: "EUR",
  FR: "EUR", DE: "EUR", ES: "EUR", IT: "EUR", NL: "EUR",
  IN: "INR", JP: "JPY", BR: "BRL", MX: "MXN",
  AE: "AED", SG: "SGD", ZA: "ZAR", SE: "SEK", CH: "CHF", PL: "PLN",
};

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const days = parseInt(request.nextUrl.searchParams.get("days") || "30", 10);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const endDate = new Date();

    const [summaryResult, byCountryResult, trendsResult, complianceResult, campaignResult] = await Promise.all([
      db.execute(sql`
        SELECT 
          COUNT(*) as total_calls,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as answered,
          COUNT(CASE WHEN status IN ('failed', 'no-answer', 'busy') THEN 1 END) as failed,
          COALESCE(AVG(duration), 0) as avg_duration,
          COALESCE(SUM(call_cost), 0) as total_cost,
          COUNT(DISTINCT destination_country) as countries_active,
          COALESCE(AVG(quality_score), 0) as avg_quality,
          COALESCE(AVG(sentiment_score), 0) as avg_sentiment
        FROM call_logs
        WHERE org_id = ${auth.orgId} AND created_at >= ${startDate}
      `),
      db.execute(sql`
        SELECT 
          destination_country as country_code,
          COUNT(*) as calls,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as answered,
          COUNT(CASE WHEN status IN ('failed', 'no-answer', 'busy') THEN 1 END) as failed,
          COALESCE(AVG(duration), 0) as avg_duration,
          COALESCE(SUM(call_cost), 0) as total_cost,
          COALESCE(AVG(quality_score), 0) as avg_quality,
          COALESCE(AVG(sentiment_score), 0) as avg_sentiment,
          COUNT(CASE WHEN compliance_dnc_result = 'blocked' THEN 1 END) as dnc_hits,
          COUNT(CASE WHEN compliance_disclosure_played = true THEN 1 END) as disclosure_played,
          COUNT(CASE WHEN compliance_opt_out_detected = true THEN 1 END) as opt_outs,
          COUNT(DISTINCT campaign_id) as campaigns
        FROM call_logs
        WHERE org_id = ${auth.orgId} AND created_at >= ${startDate} AND destination_country IS NOT NULL
        GROUP BY destination_country
        ORDER BY calls DESC
      `),
      db.execute(sql`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as calls,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as answered,
          COUNT(CASE WHEN status IN ('failed', 'no-answer', 'busy') THEN 1 END) as failed,
          COALESCE(SUM(call_cost), 0) as cost
        FROM call_logs
        WHERE org_id = ${auth.orgId} AND created_at >= ${startDate}
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `),
      db.execute(sql`
        SELECT 
          destination_country as country_code,
          COUNT(CASE WHEN compliance_dnc_checked = true THEN 1 END) as dnc_checked,
          COUNT(CASE WHEN compliance_dnc_result = 'blocked' THEN 1 END) as dnc_blocked,
          COUNT(CASE WHEN compliance_disclosure_played = true THEN 1 END) as disclosure_played,
          COUNT(CASE WHEN compliance_opt_out_detected = true THEN 1 END) as opt_outs,
          COUNT(CASE WHEN compliance_recording_consent IS NOT NULL THEN 1 END) as consent_recorded
        FROM call_logs
        WHERE org_id = ${auth.orgId} AND created_at >= ${startDate} AND destination_country IS NOT NULL
        GROUP BY destination_country
        ORDER BY dnc_checked DESC
      `),
      db.execute(sql`
        SELECT 
          c.id as campaign_id,
          c.name as campaign_name,
          c.country_code,
          c.status,
          c.total_contacts,
          COUNT(cl.id) as calls,
          COUNT(CASE WHEN cl.status = 'completed' THEN 1 END) as answered,
          c.converted_count as converted,
          c.opt_out_count as opt_outs,
          COALESCE(AVG(cl.duration), 0) as avg_duration,
          COALESCE(SUM(cl.call_cost), 0) as total_cost
        FROM campaigns c
        LEFT JOIN call_logs cl ON c.id = cl.campaign_id AND cl.created_at >= ${startDate}
        WHERE c.org_id = ${auth.orgId} AND c.status != 'archived'
        GROUP BY c.id, c.name, c.country_code, c.status, c.total_contacts, c.converted_count, c.opt_out_count
        ORDER BY calls DESC
      `),
    ]);

    const summary = summaryResult.rows[0] || {};

    const byCountry = byCountryResult.rows.map((row: any) => ({
      countryCode: row.country_code,
      countryName: COUNTRY_NAMES[row.country_code] || row.country_code,
      currency: COUNTRY_CURRENCIES[row.country_code] || "USD",
      calls: Number(row.calls) || 0,
      answered: Number(row.answered) || 0,
      failed: Number(row.failed) || 0,
      avgDuration: Math.round(Number(row.avg_duration) || 0),
      totalCost: Number(Number(row.total_cost || 0).toFixed(2)),
      avgQualityScore: Number(Number(row.avg_quality || 0).toFixed(2)),
      avgSentimentScore: Number(Number(row.avg_sentiment || 0).toFixed(2)),
      dncHits: Number(row.dnc_hits) || 0,
      complianceDisclosurePlayed: Number(row.disclosure_played) || 0,
      optOutsDetected: Number(row.opt_outs) || 0,
      campaigns: Number(row.campaigns) || 0,
    }));

    const trends = trendsResult.rows.map((row: any) => ({
      date: row.date instanceof Date ? row.date.toISOString().split("T")[0] : String(row.date),
      calls: Number(row.calls) || 0,
      answered: Number(row.answered) || 0,
      failed: Number(row.failed) || 0,
      cost: Number(Number(row.cost || 0).toFixed(2)),
    }));

    const complianceByCountry = complianceResult.rows.map((row: any) => ({
      countryCode: row.country_code,
      countryName: COUNTRY_NAMES[row.country_code] || row.country_code,
      dncChecked: Number(row.dnc_checked) || 0,
      dncBlocked: Number(row.dnc_blocked) || 0,
      disclosurePlayed: Number(row.disclosure_played) || 0,
      optOuts: Number(row.opt_outs) || 0,
      consentRecorded: Number(row.consent_recorded) || 0,
    }));

    const compliance = {
      totalDncChecked: complianceByCountry.reduce((sum, c) => sum + c.dncChecked, 0),
      totalDncBlocked: complianceByCountry.reduce((sum, c) => sum + c.dncBlocked, 0),
      totalDisclosuresPlayed: complianceByCountry.reduce((sum, c) => sum + c.disclosurePlayed, 0),
      totalOptOuts: complianceByCountry.reduce((sum, c) => sum + c.optOuts, 0),
      byCountry: complianceByCountry,
    };

    const campaignPerformance = campaignResult.rows.map((row: any) => ({
      campaignId: Number(row.campaign_id),
      campaignName: row.campaign_name,
      countryCode: row.country_code || null,
      status: row.status,
      totalContacts: Number(row.total_contacts) || 0,
      calls: Number(row.calls) || 0,
      answered: Number(row.answered) || 0,
      converted: Number(row.converted) || 0,
      optOuts: Number(row.opt_outs) || 0,
      avgDuration: Math.round(Number(row.avg_duration) || 0),
      totalCost: Number(Number(row.total_cost || 0).toFixed(2)),
    }));

    return NextResponse.json({
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        days,
      },
      summary: {
        totalCalls: Number(summary.total_calls) || 0,
        totalAnswered: Number(summary.answered) || 0,
        totalFailed: Number(summary.failed) || 0,
        avgDuration: Math.round(Number(summary.avg_duration) || 0),
        totalCost: Number(Number(summary.total_cost || 0).toFixed(2)),
        countriesActive: Number(summary.countries_active) || 0,
        avgQualityScore: Number(Number(summary.avg_quality || 0).toFixed(2)),
        avgSentimentScore: Number(Number(summary.avg_sentiment || 0).toFixed(2)),
      },
      byCountry,
      trends,
      compliance,
      campaignPerformance,
    });
  } catch (error) {
    console.error("International analytics error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
