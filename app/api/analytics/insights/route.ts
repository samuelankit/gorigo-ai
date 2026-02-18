import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/get-user";
import { sql } from "drizzle-orm";
import { adminLimiter } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/api-error";

function periodToInterval(period: string): string {
  switch (period) {
    case "7d": return "7 days";
    case "30d": return "30 days";
    case "90d": return "90 days";
    default: return "7 days";
  }
}

function periodToDays(period: string): number {
  switch (period) {
    case "7d": return 7;
    case "30d": return 30;
    case "90d": return 90;
    default: return 7;
  }
}

const KNOWN_ROUTES = [
  "/", "/pricing", "/features", "/about", "/contact", "/login", "/register",
  "/dashboard", "/onboarding", "/docs", "/guide", "/partners", "/trust",
  "/capabilities", "/roi-calculator", "/sla", "/sitemap",
  "/features/ai-agents", "/features/analytics", "/features/call-handling",
  "/features/compliance", "/features/multi-language", "/features/pay-per-talk-time",
  "/forgot-password", "/reset-password",
];

const NATURAL_EXIT_PAGES = [
  "/login", "/register", "/dashboard", "/onboarding", "/contact",
  "/policies/privacy", "/policies/terms", "/policies/cookies",
];

const CACHE_TTL_MS = 60_000;
const insightsCache = new Map<string, { data: any; timestamp: number }>();

export async function GET(request: NextRequest) {
  try {
    const rl = await adminLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const auth = await getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const isSuperAdmin = auth.globalRole === "SUPERADMIN";
    if (!isSuperAdmin && !auth.orgId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "7d";
    const cacheKey = `${period}-${auth.orgId || "all"}`;
    const cached = insightsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return NextResponse.json(cached.data, {
        headers: { "Cache-Control": "private, max-age=60" },
      });
    }

    const interval = periodToInterval(period);
    const days = periodToDays(period);

    const orgFilter = isSuperAdmin
      ? sql``
      : sql` AND e.org_id = ${auth.orgId}`;

    const sessionOrgFilter = isSuperAdmin
      ? sql``
      : sql` AND s.org_id = ${auth.orgId}`;

    const [
      currentPagesResult,
      previousPagesResult,
      overviewResult,
      bounceByPageResult,
      deviceBounceResult,
      sourcesResult,
      utmResult,
      sessionStatsResult,
      exitPagesResult,
      dailyPageviewsResult,
      currentSourcesResult,
      previousSourcesResult,
    ] = await Promise.all([
      db.execute(sql`
        SELECT e.page,
          COUNT(*) FILTER (WHERE e.event_type = 'pageview') AS pageviews,
          COUNT(DISTINCT e.visitor_id) AS unique_visitors,
          ROUND(AVG(e.time_on_page)::numeric, 1) AS avg_time_on_page,
          ROUND(AVG(e.scroll_depth)::numeric, 1) AS avg_scroll_depth
        FROM analytics_events e
        WHERE e.created_at >= NOW() - ${interval}::interval ${orgFilter}
        GROUP BY e.page
        ORDER BY pageviews DESC
        LIMIT 100
      `),
      db.execute(sql`
        SELECT e.page,
          COUNT(*) FILTER (WHERE e.event_type = 'pageview') AS pageviews,
          COUNT(DISTINCT e.visitor_id) AS unique_visitors
        FROM analytics_events e
        WHERE e.created_at >= NOW() - ${`${days * 2} days`}::interval
          AND e.created_at < NOW() - ${interval}::interval ${orgFilter}
        GROUP BY e.page
        ORDER BY pageviews DESC
        LIMIT 100
      `),
      db.execute(sql`
        SELECT
          (SELECT COUNT(*) FROM analytics_events e WHERE e.created_at >= NOW() - ${interval}::interval ${orgFilter} AND e.event_type = 'pageview') AS total_pageviews,
          (SELECT COUNT(DISTINCT e.visitor_id) FROM analytics_events e WHERE e.created_at >= NOW() - ${interval}::interval ${orgFilter}) AS unique_visitors,
          (SELECT ROUND(AVG(CASE WHEN s.is_bounce THEN 1 ELSE 0 END) * 100, 1) FROM analytics_sessions s WHERE s.started_at >= NOW() - ${interval}::interval ${sessionOrgFilter}) AS bounce_rate,
          (SELECT ROUND(AVG(s.duration)::numeric, 1) FROM analytics_sessions s WHERE s.started_at >= NOW() - ${interval}::interval ${sessionOrgFilter} AND s.duration IS NOT NULL) AS avg_session_duration,
          (SELECT ROUND(AVG(s.page_count)::numeric, 1) FROM analytics_sessions s WHERE s.started_at >= NOW() - ${interval}::interval ${sessionOrgFilter}) AS avg_pages_per_session,
          (SELECT ROUND(AVG(CASE WHEN s.is_converted THEN 1 ELSE 0 END) * 100, 2) FROM analytics_sessions s WHERE s.started_at >= NOW() - ${interval}::interval ${sessionOrgFilter}) AS conversion_rate,
          (SELECT ROUND(AVG(e.scroll_depth)::numeric, 1) FROM analytics_events e WHERE e.created_at >= NOW() - ${interval}::interval ${orgFilter} AND e.scroll_depth IS NOT NULL) AS avg_scroll_depth,
          (SELECT ROUND(AVG(e.time_on_page)::numeric, 1) FROM analytics_events e WHERE e.created_at >= NOW() - ${interval}::interval ${orgFilter} AND e.time_on_page IS NOT NULL) AS avg_time_on_page
      `),
      db.execute(sql`
        SELECT s.entry_page AS page,
          ROUND(AVG(CASE WHEN s.is_bounce THEN 1 ELSE 0 END) * 100, 1) AS bounce_rate,
          COUNT(*) AS total_sessions
        FROM analytics_sessions s
        WHERE s.started_at >= NOW() - ${interval}::interval ${sessionOrgFilter}
        GROUP BY s.entry_page
        HAVING COUNT(*) >= 3
        ORDER BY bounce_rate DESC
        LIMIT 50
      `),
      db.execute(sql`
        SELECT s.entry_page AS page, s.device_type,
          ROUND(AVG(CASE WHEN s.is_bounce THEN 1 ELSE 0 END) * 100, 1) AS bounce_rate,
          COUNT(*) AS sessions
        FROM analytics_sessions s
        WHERE s.started_at >= NOW() - ${interval}::interval ${sessionOrgFilter}
          AND s.device_type IN ('mobile', 'desktop')
        GROUP BY s.entry_page, s.device_type
        HAVING COUNT(*) >= 2
        ORDER BY s.entry_page
      `),
      db.execute(sql`
        SELECT
          COALESCE(NULLIF(e.referrer, ''), 'Direct') AS source,
          COUNT(*) AS visits,
          COUNT(DISTINCT e.visitor_id) AS unique_visitors
        FROM analytics_events e
        WHERE e.created_at >= NOW() - ${interval}::interval ${orgFilter} AND e.event_type = 'pageview'
        GROUP BY source
        ORDER BY visits DESC
        LIMIT 30
      `),
      db.execute(sql`
        SELECT e.utm_source, e.utm_medium, e.utm_campaign,
          COUNT(*) AS visits
        FROM analytics_events e
        WHERE e.created_at >= NOW() - ${interval}::interval ${orgFilter} AND e.utm_source IS NOT NULL
        GROUP BY e.utm_source, e.utm_medium, e.utm_campaign
        ORDER BY visits DESC
        LIMIT 20
      `),
      db.execute(sql`
        SELECT COUNT(*) AS total_sessions,
          SUM(CASE WHEN s.is_converted THEN 1 ELSE 0 END) AS converted_sessions
        FROM analytics_sessions s
        WHERE s.started_at >= NOW() - ${interval}::interval ${sessionOrgFilter}
      `),
      db.execute(sql`
        SELECT s.exit_page, COUNT(*) AS sessions
        FROM analytics_sessions s
        WHERE s.started_at >= NOW() - ${interval}::interval ${sessionOrgFilter} AND s.exit_page IS NOT NULL
        GROUP BY s.exit_page
        ORDER BY sessions DESC
        LIMIT 30
      `),
      db.execute(sql`
        SELECT e.page, DATE(e.created_at) AS day, COUNT(*) AS views
        FROM analytics_events e
        WHERE e.created_at >= NOW() - ${interval}::interval ${orgFilter} AND e.event_type = 'pageview'
        GROUP BY e.page, DATE(e.created_at)
        ORDER BY e.page, day
      `),
      db.execute(sql`
        SELECT COALESCE(NULLIF(e.referrer, ''), 'Direct') AS source, COUNT(*) AS visits
        FROM analytics_events e
        WHERE e.created_at >= NOW() - ${interval}::interval ${orgFilter} AND e.event_type = 'pageview'
        GROUP BY source
        ORDER BY visits DESC
        LIMIT 30
      `),
      db.execute(sql`
        SELECT COALESCE(NULLIF(e.referrer, ''), 'Direct') AS source, COUNT(*) AS visits
        FROM analytics_events e
        WHERE e.created_at >= NOW() - ${`${days * 2} days`}::interval
          AND e.created_at < NOW() - ${interval}::interval ${orgFilter} AND e.event_type = 'pageview'
        GROUP BY source
        ORDER BY visits DESC
        LIMIT 30
      `),
    ]);

    const currentPages: any[] = currentPagesResult.rows;
    const previousPages: any[] = previousPagesResult.rows;
    const overview: any = overviewResult.rows[0] || {};
    const bounceByPage: any[] = bounceByPageResult.rows;
    const deviceBounce: any[] = deviceBounceResult.rows;
    const sources: any[] = sourcesResult.rows;
    const utmData: any[] = utmResult.rows;
    const sessionStats: any = sessionStatsResult.rows[0] || {};
    const exitPages: any[] = exitPagesResult.rows;
    const dailyPageviews: any[] = dailyPageviewsResult.rows;
    const currentSources: any[] = currentSourcesResult.rows;
    const previousSources: any[] = previousSourcesResult.rows;

    const insights: any[] = [];

    const previousPageMap = new Map<string, any>();
    previousPages.forEach((p) => previousPageMap.set(p.page, p));

    for (const page of currentPages) {
      const prev = previousPageMap.get(page.page);
      if (!prev) continue;
      const currentViews = Number(page.pageviews);
      const prevViews = Number(prev.pageviews);
      if (prevViews === 0) continue;

      const changePct = ((currentViews - prevViews) / prevViews) * 100;

      if (changePct > 50) {
        insights.push({
          type: "anomaly",
          severity: changePct > 100 ? "high" : "medium",
          title: `Traffic spike on ${page.page}`,
          description: `Pageviews increased by ${Math.round(changePct)}% compared to the previous period.`,
          page: page.page,
          metric: "pageviews",
          currentValue: currentViews,
          previousValue: prevViews,
          changePercent: Math.round(changePct),
        });
      } else if (changePct < -30) {
        insights.push({
          type: "anomaly",
          severity: changePct < -60 ? "high" : "medium",
          title: `Traffic drop on ${page.page}`,
          description: `Pageviews decreased by ${Math.abs(Math.round(changePct))}% compared to the previous period.`,
          page: page.page,
          metric: "pageviews",
          currentValue: currentViews,
          previousValue: prevViews,
          changePercent: Math.round(changePct),
        });
      }
    }

    const previousBounceMap = new Map<string, number>();
    for (const prev of previousPages) {
      previousBounceMap.set(prev.page, Number(prev.pageviews));
    }
    for (const b of bounceByPage) {
      const bounceRate = Number(b.bounce_rate);
      const prevPage = previousPageMap.get(b.page);
      if (prevPage && Number(b.total_sessions) >= 5) {
        const prevBounce = Number(prevPage.pageviews);
        if (prevBounce > 0) {
          const bounceDiff = Math.abs(bounceRate - prevBounce);
          if (bounceDiff > 15) {
            insights.push({
              type: "anomaly",
              severity: bounceDiff > 30 ? "high" : "low",
              title: `Bounce rate change on ${b.page}`,
              description: `Bounce rate shifted significantly (${bounceRate}%) on this page.`,
              page: b.page,
              metric: "bounce_rate",
              currentValue: bounceRate,
              previousValue: prevBounce,
              changePercent: Math.round(bounceDiff),
            });
          }
        }
      }
    }

    const pageDaily = new Map<string, number[]>();
    for (const row of dailyPageviews) {
      if (!pageDaily.has(row.page)) pageDaily.set(row.page, []);
      pageDaily.get(row.page)!.push(Number(row.views));
    }

    for (const [page, dataPoints] of pageDaily) {
      if (dataPoints.length < 4) continue;
      let consecutiveUp = 0;
      let consecutiveDown = 0;
      let maxUp = 0;
      let maxDown = 0;

      for (let i = 1; i < dataPoints.length; i++) {
        if (dataPoints[i] > dataPoints[i - 1]) {
          consecutiveUp++;
          consecutiveDown = 0;
        } else if (dataPoints[i] < dataPoints[i - 1]) {
          consecutiveDown++;
          consecutiveUp = 0;
        } else {
          consecutiveUp = 0;
          consecutiveDown = 0;
        }
        maxUp = Math.max(maxUp, consecutiveUp);
        maxDown = Math.max(maxDown, consecutiveDown);
      }

      if (maxUp >= 3) {
        insights.push({
          type: "trend",
          direction: "up",
          title: `Growing traffic on ${page}`,
          description: `This page shows ${maxUp + 1} consecutive days of increasing traffic.`,
          page,
          dataPoints,
        });
      }
      if (maxDown >= 3) {
        insights.push({
          type: "trend",
          direction: "down",
          title: `Declining traffic on ${page}`,
          description: `This page shows ${maxDown + 1} consecutive days of decreasing traffic.`,
          page,
          dataPoints,
        });
      }
    }

    const previousSourceMap = new Map<string, number>();
    previousSources.forEach((s: any) => previousSourceMap.set(s.source, Number(s.visits)));
    for (const src of currentSources) {
      const srcName = src.source;
      const currentVisits = Number(src.visits);
      const prevVisits = previousSourceMap.get(srcName);
      if (prevVisits === undefined && currentVisits >= 5) {
        insights.push({
          type: "trend",
          direction: "new",
          title: `New referral source: ${srcName}`,
          description: `${srcName} is a new traffic source with ${currentVisits} visits this period.`,
          dataPoints: [0, currentVisits],
        });
      }
    }

    for (const page of currentPages) {
      const pageViews = Number(page.pageviews);
      const scrollDepth = Number(page.avg_scroll_depth || 0);
      const timeOnPage = Number(page.avg_time_on_page || 0);

      const pageBounce = bounceByPage.find((b) => b.page === page.page);
      const bounceRate = pageBounce ? Number(pageBounce.bounce_rate) : 0;

      if (bounceRate > 60 && Number(pageBounce?.total_sessions || 0) >= 3) {
        insights.push({
          type: "recommendation",
          priority: bounceRate > 80 ? "critical" : "high",
          category: "conversion",
          title: `High bounce rate on ${page.page}`,
          description: `${bounceRate}% of visitors leave without interacting on this page.`,
          page: page.page,
          actionable: `Consider improving content or CTA on ${page.page}`,
        });
      }

      if (scrollDepth < 30 && scrollDepth > 0 && pageViews >= 5) {
        insights.push({
          type: "recommendation",
          priority: "high",
          category: "engagement",
          title: `Low scroll depth on ${page.page}`,
          description: `Average scroll depth is only ${scrollDepth}%. Users aren't seeing most of the content.`,
          page: page.page,
          actionable: `Users aren't engaging with content on ${page.page}. Consider restructuring.`,
        });
      }

      if (timeOnPage < 10 && timeOnPage > 0 && pageViews >= 5) {
        insights.push({
          type: "recommendation",
          priority: "medium",
          category: "technical",
          title: `Very short visits on ${page.page}`,
          description: `Average time on page is only ${timeOnPage}s. Users leave almost immediately.`,
          page: page.page,
          actionable: `Users quickly leave ${page.page}. Check for loading issues or misleading links.`,
        });
      }

      if (pageViews >= 20 && bounceRate > 50 && !page.page.includes("register") && !page.page.includes("login")) {
        const hasConversions = currentPages.some((p) => p.page.includes("register") || p.page.includes("onboarding"));
        if (hasConversions) {
          insights.push({
            type: "recommendation",
            priority: "high",
            category: "conversion",
            title: `High traffic, low conversion on ${page.page}`,
            description: `This page gets ${pageViews} views but has a ${bounceRate}% bounce rate.`,
            page: page.page,
            actionable: `Page ${page.page} gets traffic but may lack conversions. Add conversion CTAs.`,
          });
        }
      }
    }

    const deviceBounceMap = new Map<string, { mobile: number; desktop: number; mSessions: number; dSessions: number }>();
    for (const d of deviceBounce) {
      if (!deviceBounceMap.has(d.page)) {
        deviceBounceMap.set(d.page, { mobile: 0, desktop: 0, mSessions: 0, dSessions: 0 });
      }
      const entry = deviceBounceMap.get(d.page)!;
      if (d.device_type === "mobile") {
        entry.mobile = Number(d.bounce_rate);
        entry.mSessions = Number(d.sessions);
      } else {
        entry.desktop = Number(d.bounce_rate);
        entry.dSessions = Number(d.sessions);
      }
    }

    for (const [page, data] of deviceBounceMap) {
      if (data.mSessions >= 3 && data.dSessions >= 3 && data.mobile - data.desktop > 15) {
        insights.push({
          type: "recommendation",
          priority: "high",
          category: "ux",
          title: `Poor mobile experience on ${page}`,
          description: `Mobile bounce rate (${data.mobile}%) is significantly higher than desktop (${data.desktop}%).`,
          page,
          actionable: `Mobile experience on ${page} needs improvement`,
        });
      }
    }

    const hasUtm = utmData.length > 0;
    if (!hasUtm) {
      insights.push({
        type: "recommendation",
        priority: "medium",
        category: "marketing",
        title: "No UTM tracking detected",
        description: "No UTM parameters found in traffic data. Campaign tracking is not configured.",
        actionable: "Consider adding UTM parameters to marketing campaigns for better tracking",
      });
    }

    const trackedPages = new Set(currentPages.map((p) => p.page));
    const deadPages = currentPages.filter((p) => Number(p.pageviews) <= 2 && Number(p.unique_visitors) <= 1);
    for (const dp of deadPages.slice(0, 5)) {
      insights.push({
        type: "blindspot",
        severity: "medium",
        title: `Low-traffic page: ${dp.page}`,
        description: `This page received only ${dp.pageviews} views with ${dp.unique_visitors} visitor(s). It may be a dead page.`,
        page: dp.page,
      });
    }

    const untrackedRoutes = KNOWN_ROUTES.filter((r) => !trackedPages.has(r));
    if (untrackedRoutes.length > 0) {
      insights.push({
        type: "blindspot",
        severity: "low",
        title: `${untrackedRoutes.length} known routes with no tracking data`,
        description: `Pages like ${untrackedRoutes.slice(0, 3).join(", ")} have no analytics events recorded.`,
      });
    }

    const totalSessions = Number(sessionStats.total_sessions || 0);
    const totalExitSessions = exitPages.reduce((s, e) => s + Number(e.sessions), 0);
    for (const ep of exitPages) {
      const exitRate = totalExitSessions > 0 ? (Number(ep.sessions) / totalExitSessions) * 100 : 0;
      const isNatural = NATURAL_EXIT_PAGES.some((n) => ep.exit_page === n || ep.exit_page.startsWith(n));
      if (exitRate > 15 && !isNatural && Number(ep.sessions) >= 5) {
        insights.push({
          type: "blindspot",
          severity: exitRate > 30 ? "high" : "medium",
          title: `High exit rate on ${ep.exit_page}`,
          description: `${Math.round(exitRate)}% of exits happen on this page, which isn't a natural exit point.`,
          page: ep.exit_page,
        });
      }
    }

    const totalEvents = currentPages.reduce((s, p) => s + Number(p.pageviews), 0);
    const eventsWithKeyword = utmData.filter((u) => u.utm_campaign).length;
    if (totalEvents > 0) {
      const keywordCoverage = utmData.length > 0 ? Math.round((eventsWithKeyword / utmData.length) * 100) : 0;
      if (keywordCoverage < 50 && utmData.length > 0) {
        insights.push({
          type: "blindspot",
          severity: "low",
          title: "Missing keyword data",
          description: `Only ${keywordCoverage}% of UTM-tagged traffic has campaign keyword data.`,
        });
      }
    }

    const sourcesWithNoConversion = sources.filter((s) => {
      return Number(s.visits) >= 10;
    });
    if (sourcesWithNoConversion.length > 0 && Number(sessionStats.converted_sessions || 0) === 0) {
      insights.push({
        type: "blindspot",
        severity: "high",
        title: "No conversion tracking detected",
        description: "Traffic sources are generating visits but no conversions are being tracked.",
      });
    }

    const avgScrollDepth = Number(overview.avg_scroll_depth || 0);
    const avgTimeOnPage = Number(overview.avg_time_on_page || 0);
    const pagesPerSession = Number(overview.avg_pages_per_session || 0);
    const bounceRate = Number(overview.bounce_rate || 0);
    const conversionRate = Number(overview.conversion_rate || 0);

    const engagementScore = Math.round(
      Math.min(100, (
        Math.min(avgScrollDepth / 70, 1) * 35 +
        Math.min(avgTimeOnPage / 60, 1) * 35 +
        Math.min(pagesPerSession / 3, 1) * 30
      ))
    );

    const conversionScore = Math.round(
      Math.min(100, (
        Math.min(conversionRate / 5, 1) * 60 +
        (Number(sessionStats.converted_sessions || 0) > 0 ? 40 : 0)
      ))
    );

    const mobileParity = (() => {
      let total = 0;
      let count = 0;
      for (const [, data] of deviceBounceMap) {
        if (data.mSessions >= 2 && data.dSessions >= 2) {
          total += Math.max(0, 100 - Math.abs(data.mobile - data.desktop) * 2);
          count++;
        }
      }
      return count > 0 ? total / count : 80;
    })();

    const bounceConsistency = Math.max(0, 100 - bounceRate);
    const technicalScore = Math.round((bounceConsistency * 0.5 + mobileParity * 0.5));

    const utmUsage = hasUtm ? 50 : 0;
    const keywordDiversity = Math.min(50, utmData.filter((u) => u.utm_campaign).length * 10);
    const referralDiversity = Math.min(50, sources.length * 5);
    const marketingScore = Math.round(Math.min(100, utmUsage + keywordDiversity / 50 * 25 + referralDiversity / 50 * 25));

    const overallScore = Math.round(
      engagementScore * 0.3 + conversionScore * 0.25 + technicalScore * 0.25 + marketingScore * 0.2
    );

    const breakdown = {
      engagement: [] as string[],
      conversion: [] as string[],
      technical: [] as string[],
      marketing: [] as string[],
    };

    if (avgScrollDepth > 50) breakdown.engagement.push(`Good scroll depth: ${avgScrollDepth}%`);
    else breakdown.engagement.push(`Low scroll depth: ${avgScrollDepth}%`);
    if (avgTimeOnPage > 30) breakdown.engagement.push(`Healthy time on page: ${Math.round(avgTimeOnPage)}s`);
    else breakdown.engagement.push(`Short time on page: ${Math.round(avgTimeOnPage)}s`);
    if (pagesPerSession > 2) breakdown.engagement.push(`Good pages per session: ${pagesPerSession.toFixed(1)}`);
    else breakdown.engagement.push(`Low pages per session: ${pagesPerSession.toFixed(1)}`);

    if (conversionRate > 2) breakdown.conversion.push(`Conversion rate: ${conversionRate}%`);
    else breakdown.conversion.push(`Low conversion rate: ${conversionRate}%`);
    if (Number(sessionStats.converted_sessions || 0) > 0) breakdown.conversion.push("Conversion tracking active");
    else breakdown.conversion.push("No conversions tracked");

    if (bounceRate < 40) breakdown.technical.push(`Good bounce rate: ${bounceRate}%`);
    else breakdown.technical.push(`High bounce rate: ${bounceRate}%`);
    if (mobileParity > 70) breakdown.technical.push("Good mobile/desktop parity");
    else breakdown.technical.push("Mobile experience needs improvement");

    if (hasUtm) breakdown.marketing.push("UTM tracking active");
    else breakdown.marketing.push("No UTM tracking");
    if (sources.length > 3) breakdown.marketing.push(`${sources.length} referral sources`);
    else breakdown.marketing.push("Limited referral diversity");
    if (utmData.filter((u) => u.utm_campaign).length > 0) breakdown.marketing.push("Campaign keywords tracked");
    else breakdown.marketing.push("No campaign keywords");

    const scores = {
      overall: overallScore,
      engagement: engagementScore,
      conversion: conversionScore,
      technical: technicalScore,
      marketing: marketingScore,
      breakdown,
    };

    const anomalyCount = insights.filter((i) => i.type === "anomaly").length;
    const trendCount = insights.filter((i) => i.type === "trend").length;
    const recCount = insights.filter((i) => i.type === "recommendation").length;
    const blindspotCount = insights.filter((i) => i.type === "blindspot").length;

    const healthLabel = overallScore >= 80 ? "healthy" : overallScore >= 60 ? "fair" : "needs attention";
    const summaryParts = [`Traffic health is ${healthLabel} with an overall score of ${overallScore}/100.`];
    const issuesParts: string[] = [];
    if (anomalyCount > 0) issuesParts.push(`${anomalyCount} anomalies`);
    if (recCount > 0) issuesParts.push(`${recCount} recommendations`);
    if (blindspotCount > 0) issuesParts.push(`${blindspotCount} blind spots`);
    if (issuesParts.length > 0) summaryParts.push(`Found ${issuesParts.join(", ")} to review.`);

    const responseData = { insights, scores, summary: summaryParts.join(" "), period };
    insightsCache.set(cacheKey, { data: responseData, timestamp: Date.now() });

    return NextResponse.json(responseData, {
      headers: { "Cache-Control": "private, max-age=60" },
    });
  } catch (error) {
    return handleRouteError(error, "AnalyticsInsights");
  }
}
