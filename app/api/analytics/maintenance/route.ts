import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/get-user";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { settingsLimiter } from "@/lib/rate-limit";

const RETENTION_DAYS = 90;

const maintenanceSchema = z.object({
  action: z.enum(["rollup", "cleanup"]),
});

export async function POST(request: NextRequest) {
  try {
    const rl = await settingsLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const auth = await getAuthenticatedUser();
    if (!auth || auth.globalRole !== "SUPERADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = maintenanceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid action. Use 'rollup' or 'cleanup'.", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { action } = parsed.data;

    if (action === "rollup") {
      await db.transaction(async (tx) => {
        await tx.execute(sql`
          DELETE FROM analytics_daily_rollups
          WHERE day < CURRENT_DATE
        `);

        await tx.execute(sql`
          INSERT INTO analytics_daily_rollups (org_id, day, pageviews, unique_visitors, unique_sessions, total_time_on_page, bounces, conversions, top_page, top_referrer)
          SELECT
            COALESCE(e.org_id, 0),
            DATE(e.created_at) AS day,
            COUNT(*) FILTER (WHERE e.event_type = 'pageview'),
            COUNT(DISTINCT e.visitor_id),
            COUNT(DISTINCT e.session_id),
            COALESCE(SUM(e.time_on_page) FILTER (WHERE e.time_on_page IS NOT NULL), 0)::integer,
            (SELECT COUNT(*) FROM analytics_sessions s WHERE COALESCE(s.org_id, 0) = COALESCE(e.org_id, 0) AND DATE(s.started_at) = DATE(e.created_at) AND s.is_bounce = true),
            COUNT(*) FILTER (WHERE e.event_type = 'conversion'),
            (SELECT sub.page FROM analytics_events sub WHERE COALESCE(sub.org_id, 0) = COALESCE(e.org_id, 0) AND DATE(sub.created_at) = DATE(e.created_at) AND sub.event_type = 'pageview' GROUP BY sub.page ORDER BY COUNT(*) DESC LIMIT 1),
            (SELECT COALESCE(NULLIF(sub.referrer, ''), 'Direct') FROM analytics_events sub WHERE COALESCE(sub.org_id, 0) = COALESCE(e.org_id, 0) AND DATE(sub.created_at) = DATE(e.created_at) AND sub.event_type = 'pageview' GROUP BY sub.referrer ORDER BY COUNT(*) DESC LIMIT 1)
          FROM analytics_events e
          WHERE DATE(e.created_at) < CURRENT_DATE
          GROUP BY COALESCE(e.org_id, 0), DATE(e.created_at)
        `);
      });

      return NextResponse.json({
        ok: true,
        action: "rollup",
        message: "Daily rollup completed",
      });
    }

    if (action === "cleanup") {
      const cutoff = `${RETENTION_DAYS} days`;

      const eventsResult = await db.execute(sql`
        DELETE FROM analytics_events
        WHERE created_at < NOW() - ${cutoff}::interval
      `);

      const sessionsResult = await db.execute(sql`
        DELETE FROM analytics_sessions
        WHERE started_at < NOW() - ${cutoff}::interval
      `);

      return NextResponse.json({
        ok: true,
        action: "cleanup",
        message: `Cleaned up data older than ${RETENTION_DAYS} days`,
        eventsDeleted: eventsResult.rowCount || 0,
        sessionsDeleted: sessionsResult.rowCount || 0,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Analytics maintenance error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
