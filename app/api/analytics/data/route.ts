import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/get-user";
import { sql } from "drizzle-orm";
import { adminLimiter } from "@/lib/rate-limit";

function periodToInterval(period: string): string {
  switch (period) {
    case "7d": return "7 days";
    case "30d": return "30 days";
    case "90d": return "90 days";
    default: return "30 days";
  }
}

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
    const period = searchParams.get("period") || "30d";
    const metric = searchParams.get("metric") || "overview";
    const interval = periodToInterval(period);

    const orgFilter = isSuperAdmin
      ? sql``
      : sql` AND e.org_id = ${auth.orgId}`;

    const sessionOrgFilter = isSuperAdmin
      ? sql``
      : sql` AND s.org_id = ${auth.orgId}`;

    const sinceFilter = sql`e.created_at >= NOW() - ${interval}::interval`;
    const sessionSinceFilter = sql`s.started_at >= NOW() - ${interval}::interval`;

    let data: any;

    switch (metric) {
      case "overview": {
        const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;
        const prevInterval = `${days * 2} days`;
        const prevOrgFilter = isSuperAdmin ? sql`` : sql` AND e.org_id = ${auth.orgId}`;
        const prevSessionOrgFilter = isSuperAdmin ? sql`` : sql` AND s.org_id = ${auth.orgId}`;

        const [currentResult, previousResult] = await Promise.all([
          db.execute(sql`
            SELECT
              (SELECT COUNT(*) FROM analytics_events e WHERE ${sinceFilter} ${orgFilter} AND e.event_type = 'pageview') AS total_pageviews,
              (SELECT COUNT(DISTINCT e.visitor_id) FROM analytics_events e WHERE ${sinceFilter} ${orgFilter}) AS unique_visitors,
              (SELECT COUNT(DISTINCT e.session_id) FROM analytics_events e WHERE ${sinceFilter} ${orgFilter}) AS unique_sessions,
              (SELECT ROUND(AVG(CASE WHEN s.is_bounce THEN 1 ELSE 0 END) * 100, 1) FROM analytics_sessions s WHERE ${sessionSinceFilter} ${sessionOrgFilter}) AS bounce_rate,
              (SELECT ROUND(AVG(s.duration)::numeric, 1) FROM analytics_sessions s WHERE ${sessionSinceFilter} ${sessionOrgFilter} AND s.duration IS NOT NULL) AS avg_session_duration,
              (SELECT ROUND(AVG(s.page_count)::numeric, 1) FROM analytics_sessions s WHERE ${sessionSinceFilter} ${sessionOrgFilter}) AS avg_pages_per_session,
              (SELECT s.conversion_page FROM analytics_sessions s WHERE ${sessionSinceFilter} ${sessionOrgFilter} AND s.is_converted = true GROUP BY s.conversion_page ORDER BY COUNT(*) DESC LIMIT 1) AS top_conversion_page
          `),
          db.execute(sql`
            SELECT
              (SELECT COUNT(*) FROM analytics_events e WHERE e.created_at >= NOW() - ${prevInterval}::interval AND e.created_at < NOW() - ${interval}::interval ${prevOrgFilter} AND e.event_type = 'pageview') AS total_pageviews,
              (SELECT COUNT(DISTINCT e.visitor_id) FROM analytics_events e WHERE e.created_at >= NOW() - ${prevInterval}::interval AND e.created_at < NOW() - ${interval}::interval ${prevOrgFilter}) AS unique_visitors,
              (SELECT COUNT(DISTINCT e.session_id) FROM analytics_events e WHERE e.created_at >= NOW() - ${prevInterval}::interval AND e.created_at < NOW() - ${interval}::interval ${prevOrgFilter}) AS unique_sessions,
              (SELECT ROUND(AVG(CASE WHEN s.is_bounce THEN 1 ELSE 0 END) * 100, 1) FROM analytics_sessions s WHERE s.started_at >= NOW() - ${prevInterval}::interval AND s.started_at < NOW() - ${interval}::interval ${prevSessionOrgFilter}) AS bounce_rate,
              (SELECT ROUND(AVG(s.duration)::numeric, 1) FROM analytics_sessions s WHERE s.started_at >= NOW() - ${prevInterval}::interval AND s.started_at < NOW() - ${interval}::interval ${prevSessionOrgFilter} AND s.duration IS NOT NULL) AS avg_session_duration,
              (SELECT ROUND(AVG(s.page_count)::numeric, 1) FROM analytics_sessions s WHERE s.started_at >= NOW() - ${prevInterval}::interval AND s.started_at < NOW() - ${interval}::interval ${prevSessionOrgFilter}) AS avg_pages_per_session
          `),
        ]);

        data = {
          current: currentResult.rows[0] || {},
          previous: previousResult.rows[0] || {},
        };
        break;
      }

      case "pages": {
        const result = await db.execute(sql`
          SELECT
            e.page,
            COUNT(*) FILTER (WHERE e.event_type = 'pageview') AS pageviews,
            COUNT(DISTINCT e.visitor_id) AS unique_visitors,
            ROUND(AVG(e.time_on_page)::numeric, 1) AS avg_time_on_page,
            ROUND(AVG(e.scroll_depth)::numeric, 1) AS avg_scroll_depth
          FROM analytics_events e
          WHERE ${sinceFilter} ${orgFilter}
          GROUP BY e.page
          ORDER BY pageviews DESC
          LIMIT 50
        `);
        data = result.rows;
        break;
      }

      case "sources": {
        const referrers = await db.execute(sql`
          SELECT
            COALESCE(NULLIF(e.referrer, ''), 'Direct') AS source,
            COUNT(*) AS visits,
            COUNT(DISTINCT e.visitor_id) AS unique_visitors
          FROM analytics_events e
          WHERE ${sinceFilter} ${orgFilter} AND e.event_type = 'pageview'
          GROUP BY source
          ORDER BY visits DESC
          LIMIT 20
        `);

        const utmCampaigns = await db.execute(sql`
          SELECT
            e.utm_source,
            e.utm_medium,
            e.utm_campaign,
            COUNT(*) AS visits,
            COUNT(DISTINCT e.visitor_id) AS unique_visitors
          FROM analytics_events e
          WHERE ${sinceFilter} ${orgFilter} AND e.utm_source IS NOT NULL
          GROUP BY e.utm_source, e.utm_medium, e.utm_campaign
          ORDER BY visits DESC
          LIMIT 20
        `);

        data = { referrers: referrers.rows, utmCampaigns: utmCampaigns.rows };
        break;
      }

      case "devices": {
        const deviceTypes = await db.execute(sql`
          SELECT e.device_type, COUNT(DISTINCT e.visitor_id) AS visitors
          FROM analytics_events e
          WHERE ${sinceFilter} ${orgFilter}
          GROUP BY e.device_type
          ORDER BY visitors DESC
        `);

        const browsers = await db.execute(sql`
          SELECT e.browser, COUNT(DISTINCT e.visitor_id) AS visitors
          FROM analytics_events e
          WHERE ${sinceFilter} ${orgFilter} AND e.browser IS NOT NULL
          GROUP BY e.browser
          ORDER BY visitors DESC
          LIMIT 10
        `);

        const operatingSystems = await db.execute(sql`
          SELECT e.os, COUNT(DISTINCT e.visitor_id) AS visitors
          FROM analytics_events e
          WHERE ${sinceFilter} ${orgFilter} AND e.os IS NOT NULL
          GROUP BY e.os
          ORDER BY visitors DESC
          LIMIT 10
        `);

        const screenSizes = await db.execute(sql`
          SELECT
            e.screen_width || 'x' || e.screen_height AS resolution,
            COUNT(DISTINCT e.visitor_id) AS visitors
          FROM analytics_events e
          WHERE ${sinceFilter} ${orgFilter} AND e.screen_width IS NOT NULL
          GROUP BY resolution
          ORDER BY visitors DESC
          LIMIT 10
        `);

        data = {
          deviceTypes: deviceTypes.rows,
          browsers: browsers.rows,
          operatingSystems: operatingSystems.rows,
          screenSizes: screenSizes.rows,
        };
        break;
      }

      case "locations": {
        const countriesResult = await db.execute(sql`
          SELECT e.country, COUNT(DISTINCT e.visitor_id) AS visitors
          FROM analytics_events e
          WHERE ${sinceFilter} ${orgFilter} AND e.country IS NOT NULL
          GROUP BY e.country
          ORDER BY visitors DESC
          LIMIT 30
        `);

        const cities = await db.execute(sql`
          SELECT e.city, e.country, COUNT(DISTINCT e.visitor_id) AS visitors
          FROM analytics_events e
          WHERE ${sinceFilter} ${orgFilter} AND e.city IS NOT NULL
          GROUP BY e.city, e.country
          ORDER BY visitors DESC
          LIMIT 30
        `);

        data = { countries: countriesResult.rows, cities: cities.rows };
        break;
      }

      case "timeseries": {
        const result = await db.execute(sql`
          SELECT
            DATE(e.created_at) AS day,
            COUNT(*) FILTER (WHERE e.event_type = 'pageview') AS pageviews,
            COUNT(DISTINCT e.visitor_id) AS visitors,
            COUNT(DISTINCT e.session_id) AS sessions
          FROM analytics_events e
          WHERE ${sinceFilter} ${orgFilter}
          GROUP BY DATE(e.created_at)
          ORDER BY day ASC
        `);
        data = result.rows;
        break;
      }

      case "funnel": {
        const funnelStages = [
          { label: "Landing Page", paths: ["/", "/home"] },
          { label: "Pricing", paths: ["/pricing"] },
          { label: "Features", paths: ["/features", "/capabilities"] },
          { label: "Register", paths: ["/register"] },
          { label: "Onboarding", paths: ["/onboarding"] },
          { label: "Dashboard", paths: ["/dashboard"] },
        ];

        const stagePathChecks = funnelStages.map((stage) => {
          const checks = stage.paths.map((p) =>
            p === "/" ? `e.page = '/'` : `e.page LIKE '${p}%'`
          );
          return `(${checks.join(" OR ")})`;
        });

        const result = await db.execute(sql.raw(`
          WITH session_stages AS (
            SELECT
              e.session_id,
              ${stagePathChecks.map((check, i) =>
                `MIN(CASE WHEN ${check} THEN e.id END) AS stage_${i}_first`
              ).join(",\n              ")}
            FROM analytics_events e
            WHERE e.created_at >= NOW() - '${interval}'::interval
              AND e.event_type = 'pageview'
              ${isSuperAdmin ? "" : `AND e.org_id = ${auth.orgId}`}
            GROUP BY e.session_id
          )
          SELECT
            ${stagePathChecks.map((_, i) => {
              if (i === 0) {
                return `COUNT(CASE WHEN stage_0_first IS NOT NULL THEN 1 END) AS stage_${i}_count`;
              }
              const conditions = Array.from({ length: i + 1 }, (__, j) => `stage_${j}_first IS NOT NULL`).join(" AND ");
              const ordering = Array.from({ length: i }, (__, j) => `stage_${j}_first < stage_${j + 1}_first`).join(" AND ");
              return `COUNT(CASE WHEN ${conditions} AND ${ordering} THEN 1 END) AS stage_${i}_count`;
            }).join(",\n            ")}
          FROM session_stages
        `));

        const row = result.rows[0] || {};
        data = funnelStages.map((stage, i) => ({
          label: stage.label,
          sessions: Number(row[`stage_${i}_count`] || 0),
        }));
        break;
      }

      case "journeys": {
        const entryPages = await db.execute(sql`
          SELECT s.entry_page, COUNT(*) AS sessions
          FROM analytics_sessions s
          WHERE ${sessionSinceFilter} ${sessionOrgFilter}
          GROUP BY s.entry_page
          ORDER BY sessions DESC
          LIMIT 20
        `);

        const exitPages = await db.execute(sql`
          SELECT s.exit_page, COUNT(*) AS sessions
          FROM analytics_sessions s
          WHERE ${sessionSinceFilter} ${sessionOrgFilter} AND s.exit_page IS NOT NULL
          GROUP BY s.exit_page
          ORDER BY sessions DESC
          LIMIT 20
        `);

        const bounceByPage = await db.execute(sql`
          SELECT
            s.entry_page,
            COUNT(*) AS total_sessions,
            ROUND(AVG(CASE WHEN s.is_bounce THEN 1 ELSE 0 END) * 100, 1) AS bounce_rate
          FROM analytics_sessions s
          WHERE ${sessionSinceFilter} ${sessionOrgFilter}
          GROUP BY s.entry_page
          ORDER BY total_sessions DESC
          LIMIT 20
        `);

        const pageFlows = await db.execute(sql`
          SELECT
            e1.page AS from_page,
            e2.page AS to_page,
            COUNT(*) AS transitions
          FROM analytics_events e1
          INNER JOIN analytics_events e2
            ON e1.session_id = e2.session_id
            AND e2.id = (
              SELECT MIN(e3.id) FROM analytics_events e3
              WHERE e3.session_id = e1.session_id AND e3.id > e1.id AND e3.event_type = 'pageview'
            )
          WHERE e1.event_type = 'pageview'
            AND e1.created_at >= NOW() - ${interval}::interval
            ${orgFilter}
          GROUP BY e1.page, e2.page
          ORDER BY transitions DESC
          LIMIT 20
        `);

        data = {
          entryPages: entryPages.rows,
          exitPages: exitPages.rows,
          bounceByPage: bounceByPage.rows,
          pageFlows: pageFlows.rows,
        };
        break;
      }

      default:
        return NextResponse.json({ error: "Invalid metric" }, { status: 400 });
    }

    return NextResponse.json({ data, period, metric });
  } catch (error) {
    console.error("Analytics data error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
