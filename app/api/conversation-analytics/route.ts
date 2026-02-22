import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { callLogs, agents } from "@/shared/schema";
import { eq, and, sql, gte, isNotNull, desc, asc } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";
import { settingsLimiter } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/api-error";

function getDateRange(days: number) {
  const now = new Date();
  const start = new Date();
  start.setDate(now.getDate() - days);
  const prevStart = new Date();
  prevStart.setDate(start.getDate() - days);
  return { now, start, prevStart };
}

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

    const tab = request.nextUrl.searchParams.get("tab") || "kpis";
    const daysParam = parseInt(request.nextUrl.searchParams.get("days") || "30", 10);
    const days = Math.min(365, Math.max(1, isNaN(daysParam) ? 30 : daysParam));
    const { start, prevStart } = getDateRange(days);

    if (tab === "kpis") {
      const [current] = await db
        .select({
          totalCalls: sql<number>`COUNT(*)`,
          avgDuration: sql<number>`COALESCE(AVG(${callLogs.duration}), 0)`,
          avgQuality: sql<number>`AVG(${callLogs.qualityScore})`,
          avgCsat: sql<number>`AVG(${callLogs.csatPrediction})`,
          avgSentiment: sql<number>`AVG(${callLogs.sentimentScore})`,
          resolvedCalls: sql<number>`SUM(CASE WHEN ${callLogs.resolutionStatus} = 'resolved' THEN 1 ELSE 0 END)`,
          escalatedCalls: sql<number>`SUM(CASE WHEN ${callLogs.handoffTriggered} = true THEN 1 ELSE 0 END)`,
          totalCost: sql<number>`COALESCE(SUM(${callLogs.callCost}::numeric), 0)`,
          avgTurns: sql<number>`COALESCE(AVG(${callLogs.turnCount}), 0)`,
          leadsCaptured: sql<number>`SUM(CASE WHEN ${callLogs.leadCaptured} = true THEN 1 ELSE 0 END)`,
        })
        .from(callLogs)
        .where(and(eq(callLogs.orgId, auth.orgId), gte(callLogs.createdAt, start)));

      const [previous] = await db
        .select({
          totalCalls: sql<number>`COUNT(*)`,
          avgDuration: sql<number>`COALESCE(AVG(${callLogs.duration}), 0)`,
          avgQuality: sql<number>`AVG(${callLogs.qualityScore})`,
          avgCsat: sql<number>`AVG(${callLogs.csatPrediction})`,
          avgSentiment: sql<number>`AVG(${callLogs.sentimentScore})`,
          resolvedCalls: sql<number>`SUM(CASE WHEN ${callLogs.resolutionStatus} = 'resolved' THEN 1 ELSE 0 END)`,
          escalatedCalls: sql<number>`SUM(CASE WHEN ${callLogs.handoffTriggered} = true THEN 1 ELSE 0 END)`,
        })
        .from(callLogs)
        .where(and(
          eq(callLogs.orgId, auth.orgId),
          gte(callLogs.createdAt, prevStart),
          sql`${callLogs.createdAt} < ${start}`
        ));

      const dailyTrend = await db
        .select({
          day: sql<string>`TO_CHAR(${callLogs.createdAt}, 'YYYY-MM-DD')`,
          calls: sql<number>`COUNT(*)`,
          avgQuality: sql<number>`AVG(${callLogs.qualityScore})`,
          avgSentiment: sql<number>`AVG(${callLogs.sentimentScore})`,
          avgCsat: sql<number>`AVG(${callLogs.csatPrediction})`,
          resolved: sql<number>`SUM(CASE WHEN ${callLogs.resolutionStatus} = 'resolved' THEN 1 ELSE 0 END)`,
        })
        .from(callLogs)
        .where(and(eq(callLogs.orgId, auth.orgId), gte(callLogs.createdAt, start)))
        .groupBy(sql`TO_CHAR(${callLogs.createdAt}, 'YYYY-MM-DD')`)
        .orderBy(sql`TO_CHAR(${callLogs.createdAt}, 'YYYY-MM-DD')`);

      const pctChange = (curr: number | null, prev: number | null) => {
        if (!prev || prev === 0) return curr && curr > 0 ? 100 : 0;
        return Math.round(((((curr || 0) - prev) / prev) * 100) * 10) / 10;
      };

      const round = (v: number | null) => v !== null && v !== undefined ? Math.round(v * 100) / 100 : null;

      return NextResponse.json({
        current: {
          totalCalls: current.totalCalls || 0,
          avgDuration: Math.round(current.avgDuration || 0),
          avgQuality: round(current.avgQuality),
          avgCsat: round(current.avgCsat),
          avgSentiment: round(current.avgSentiment),
          resolutionRate: current.totalCalls > 0
            ? Math.round(((current.resolvedCalls || 0) / current.totalCalls) * 100)
            : 0,
          escalationRate: current.totalCalls > 0
            ? Math.round(((current.escalatedCalls || 0) / current.totalCalls) * 100)
            : 0,
          totalCost: round(current.totalCost),
          avgTurns: Math.round((current.avgTurns || 0) * 10) / 10,
          leadsCaptured: current.leadsCaptured || 0,
        },
        changes: {
          totalCalls: pctChange(current.totalCalls, previous.totalCalls),
          avgDuration: pctChange(current.avgDuration, previous.avgDuration),
          avgQuality: pctChange(current.avgQuality, previous.avgQuality),
          avgCsat: pctChange(current.avgCsat, previous.avgCsat),
          avgSentiment: pctChange(current.avgSentiment, previous.avgSentiment),
          resolutionRate: pctChange(
            current.totalCalls > 0 ? (current.resolvedCalls || 0) / current.totalCalls : 0,
            previous.totalCalls > 0 ? (previous.resolvedCalls || 0) / previous.totalCalls : 0
          ),
          escalationRate: pctChange(
            current.totalCalls > 0 ? (current.escalatedCalls || 0) / current.totalCalls : 0,
            previous.totalCalls > 0 ? (previous.escalatedCalls || 0) / previous.totalCalls : 0
          ),
        },
        dailyTrend,
      });
    }

    if (tab === "sentiment") {
      const distribution = await db
        .select({
          label: callLogs.sentimentLabel,
          count: sql<number>`COUNT(*)`,
          avgScore: sql<number>`AVG(${callLogs.sentimentScore})`,
        })
        .from(callLogs)
        .where(and(
          eq(callLogs.orgId, auth.orgId),
          gte(callLogs.createdAt, start),
          isNotNull(callLogs.sentimentLabel)
        ))
        .groupBy(callLogs.sentimentLabel);

      const agentSentiment = await db
        .select({
          agentId: callLogs.agentId,
          agentName: agents.name,
          avgSentiment: sql<number>`AVG(${callLogs.sentimentScore})`,
          callCount: sql<number>`COUNT(*)`,
          negativeCalls: sql<number>`SUM(CASE WHEN ${callLogs.sentimentScore}::numeric < -0.3 THEN 1 ELSE 0 END)`,
        })
        .from(callLogs)
        .innerJoin(agents, eq(agents.id, callLogs.agentId))
        .where(and(
          eq(callLogs.orgId, auth.orgId),
          gte(callLogs.createdAt, start),
          isNotNull(callLogs.sentimentScore)
        ))
        .groupBy(callLogs.agentId, agents.name);

      const negativeCalls = await db
        .select({
          id: callLogs.id,
          callerNumber: callLogs.callerNumber,
          duration: callLogs.duration,
          sentimentScore: callLogs.sentimentScore,
          sentimentLabel: callLogs.sentimentLabel,
          summary: callLogs.summary,
          agentName: agents.name,
          createdAt: callLogs.createdAt,
        })
        .from(callLogs)
        .innerJoin(agents, eq(agents.id, callLogs.agentId))
        .where(and(
          eq(callLogs.orgId, auth.orgId),
          gte(callLogs.createdAt, start),
          sql`${callLogs.sentimentScore}::numeric < -0.3`
        ))
        .orderBy(asc(callLogs.sentimentScore))
        .limit(20);

      const trend = await db
        .select({
          day: sql<string>`TO_CHAR(${callLogs.createdAt}, 'YYYY-MM-DD')`,
          avgScore: sql<number>`AVG(${callLogs.sentimentScore})`,
          callCount: sql<number>`COUNT(*)`,
        })
        .from(callLogs)
        .where(and(
          eq(callLogs.orgId, auth.orgId),
          gte(callLogs.createdAt, start),
          isNotNull(callLogs.sentimentScore)
        ))
        .groupBy(sql`TO_CHAR(${callLogs.createdAt}, 'YYYY-MM-DD')`)
        .orderBy(sql`TO_CHAR(${callLogs.createdAt}, 'YYYY-MM-DD')`);

      return NextResponse.json({ distribution, agentSentiment, negativeCalls, trend });
    }

    if (tab === "quality") {
      const [overall] = await db
        .select({
          avgScore: sql<number>`AVG(${callLogs.qualityScore})`,
          avgCsat: sql<number>`AVG(${callLogs.csatPrediction})`,
          totalCalls: sql<number>`COUNT(*)`,
          scoredCalls: sql<number>`COUNT(${callLogs.qualityScore})`,
          avgGreeting: sql<number>`AVG((${callLogs.qualityBreakdown}->>'greeting')::numeric)`,
          avgUnderstanding: sql<number>`AVG((${callLogs.qualityBreakdown}->>'understanding')::numeric)`,
          avgAccuracy: sql<number>`AVG((${callLogs.qualityBreakdown}->>'accuracy')::numeric)`,
          avgProfessionalism: sql<number>`AVG((${callLogs.qualityBreakdown}->>'professionalism')::numeric)`,
          avgResolution: sql<number>`AVG((${callLogs.qualityBreakdown}->>'resolution')::numeric)`,
          avgEfficiency: sql<number>`AVG((${callLogs.qualityBreakdown}->>'efficiency')::numeric)`,
        })
        .from(callLogs)
        .where(and(eq(callLogs.orgId, auth.orgId), gte(callLogs.createdAt, start)));

      const worstCalls = await db
        .select({
          id: callLogs.id,
          callerNumber: callLogs.callerNumber,
          duration: callLogs.duration,
          qualityScore: callLogs.qualityScore,
          csatPrediction: callLogs.csatPrediction,
          resolutionStatus: callLogs.resolutionStatus,
          summary: callLogs.summary,
          agentName: agents.name,
          createdAt: callLogs.createdAt,
          qualityBreakdown: callLogs.qualityBreakdown,
        })
        .from(callLogs)
        .innerJoin(agents, eq(agents.id, callLogs.agentId))
        .where(and(
          eq(callLogs.orgId, auth.orgId),
          gte(callLogs.createdAt, start),
          isNotNull(callLogs.qualityScore)
        ))
        .orderBy(asc(callLogs.qualityScore))
        .limit(15);

      const qualityDistribution = await db
        .select({
          range: sql<string>`CASE
            WHEN ${callLogs.qualityScore} >= 80 THEN 'excellent'
            WHEN ${callLogs.qualityScore} >= 65 THEN 'good'
            WHEN ${callLogs.qualityScore} >= 50 THEN 'average'
            WHEN ${callLogs.qualityScore} >= 35 THEN 'below_average'
            ELSE 'poor'
          END`,
          count: sql<number>`COUNT(*)`,
        })
        .from(callLogs)
        .where(and(
          eq(callLogs.orgId, auth.orgId),
          gte(callLogs.createdAt, start),
          sql`${callLogs.qualityScore} IS NOT NULL`
        ))
        .groupBy(sql`CASE
          WHEN ${callLogs.qualityScore} >= 80 THEN 'excellent'
          WHEN ${callLogs.qualityScore} >= 65 THEN 'good'
          WHEN ${callLogs.qualityScore} >= 50 THEN 'average'
          WHEN ${callLogs.qualityScore} >= 35 THEN 'below_average'
          ELSE 'poor'
        END`);

      const trend = await db
        .select({
          day: sql<string>`TO_CHAR(${callLogs.createdAt}, 'YYYY-MM-DD')`,
          avgScore: sql<number>`AVG(${callLogs.qualityScore})`,
          avgCsat: sql<number>`AVG(${callLogs.csatPrediction})`,
          callCount: sql<number>`COUNT(*)`,
        })
        .from(callLogs)
        .where(and(
          eq(callLogs.orgId, auth.orgId),
          gte(callLogs.createdAt, start),
          sql`${callLogs.qualityScore} IS NOT NULL`
        ))
        .groupBy(sql`TO_CHAR(${callLogs.createdAt}, 'YYYY-MM-DD')`)
        .orderBy(sql`TO_CHAR(${callLogs.createdAt}, 'YYYY-MM-DD')`);

      const round = (v: number | null) => v !== null && v !== undefined ? Math.round(v * 100) / 100 : null;

      return NextResponse.json({
        overall: {
          averageScore: round(overall.avgScore),
          averageCsat: round(overall.avgCsat),
          totalCalls: overall.totalCalls,
          scoredCalls: overall.scoredCalls,
        },
        breakdown: {
          greeting: round(overall.avgGreeting),
          understanding: round(overall.avgUnderstanding),
          accuracy: round(overall.avgAccuracy),
          professionalism: round(overall.avgProfessionalism),
          resolution: round(overall.avgResolution),
          efficiency: round(overall.avgEfficiency),
        },
        qualityDistribution,
        worstCalls,
        trend,
      });
    }

    if (tab === "scorecards") {
      const orgAgents = await db
        .select({ id: agents.id, name: agents.name })
        .from(agents)
        .where(eq(agents.orgId, auth.orgId));

      const agentMetrics = await db
        .select({
          agentId: callLogs.agentId,
          totalCalls: sql<number>`COUNT(*)`,
          avgDuration: sql<number>`AVG(${callLogs.duration})`,
          avgQuality: sql<number>`AVG(${callLogs.qualityScore})`,
          avgSentiment: sql<number>`AVG(${callLogs.sentimentScore})`,
          avgCsat: sql<number>`AVG(${callLogs.csatPrediction})`,
          avgTurns: sql<number>`AVG(${callLogs.turnCount})`,
          resolvedCalls: sql<number>`SUM(CASE WHEN ${callLogs.resolutionStatus} = 'resolved' THEN 1 ELSE 0 END)`,
          escalatedCalls: sql<number>`SUM(CASE WHEN ${callLogs.handoffTriggered} = true THEN 1 ELSE 0 END)`,
          leadsCaptured: sql<number>`SUM(CASE WHEN ${callLogs.leadCaptured} = true THEN 1 ELSE 0 END)`,
          totalCost: sql<number>`COALESCE(SUM(${callLogs.callCost}::numeric), 0)`,
        })
        .from(callLogs)
        .where(and(eq(callLogs.orgId, auth.orgId), gte(callLogs.createdAt, start)))
        .groupBy(callLogs.agentId);

      const scorecards = orgAgents.map((agent) => {
        const m = agentMetrics.find((am) => am.agentId === agent.id);
        const total = m?.totalCalls || 0;
        return {
          agentId: agent.id,
          agentName: agent.name,
          totalCalls: total,
          avgHandleTime: m?.avgDuration ? Math.round(m.avgDuration) : 0,
          avgQualityScore: m?.avgQuality ? Math.round(m.avgQuality * 10) / 10 : 0,
          avgSentimentScore: m?.avgSentiment ? Math.round(m.avgSentiment * 100) / 100 : 0,
          avgCsatPrediction: m?.avgCsat ? Math.round(m.avgCsat * 10) / 10 : 0,
          avgTurns: m?.avgTurns ? Math.round(m.avgTurns * 10) / 10 : 0,
          resolutionRate: total > 0 ? Math.round(((m?.resolvedCalls || 0) / total) * 100) : 0,
          escalationRate: total > 0 ? Math.round(((m?.escalatedCalls || 0) / total) * 100) : 0,
          leadsCaptured: m?.leadsCaptured || 0,
          totalCost: m?.totalCost ? Math.round(m.totalCost * 100) / 100 : 0,
        };
      }).sort((a, b) => b.avgQualityScore - a.avgQualityScore);

      return NextResponse.json({ scorecards });
    }

    if (tab === "topics") {
      const recentCalls = await db
        .select({
          id: callLogs.id,
          summary: callLogs.summary,
          tags: callLogs.tags,
          sentimentLabel: callLogs.sentimentLabel,
          resolutionStatus: callLogs.resolutionStatus,
          finalOutcome: callLogs.finalOutcome,
          handoffTriggered: callLogs.handoffTriggered,
          complianceOptOutDetected: callLogs.complianceOptOutDetected,
          createdAt: callLogs.createdAt,
        })
        .from(callLogs)
        .where(and(eq(callLogs.orgId, auth.orgId), gte(callLogs.createdAt, start)))
        .orderBy(desc(callLogs.createdAt))
        .limit(500);

      const topicCounts: Record<string, { count: number; sentiment: number[]; resolutions: Record<string, number> }> = {};
      const commonPhrases: Record<string, number> = {};

      const TOPIC_KEYWORDS: Record<string, string[]> = {
        "Billing & Payment": ["bill", "pay", "charge", "invoice", "refund", "price", "cost", "fee", "wallet", "credit"],
        "Technical Support": ["error", "bug", "crash", "fix", "issue", "problem", "broken", "not working", "technical"],
        "Account Management": ["account", "login", "password", "profile", "register", "sign up", "access", "permissions"],
        "Product Inquiry": ["product", "feature", "demo", "trial", "plan", "upgrade", "subscription"],
        "Complaint": ["complaint", "unhappy", "dissatisfied", "frustrated", "angry", "terrible", "worst", "unacceptable"],
        "General Inquiry": ["question", "information", "help", "assist", "need", "want", "looking for"],
        "Appointment": ["appointment", "book", "schedule", "meeting", "calendar", "availability"],
        "Cancellation": ["cancel", "terminate", "close", "end", "stop", "unsubscribe"],
      };

      for (const call of recentCalls) {
        const text = (call.summary || "").toLowerCase();
        const tags = Array.isArray(call.tags) ? call.tags : [];

        for (const tag of tags) {
          const tagStr = String(tag).toLowerCase().trim();
          if (tagStr) {
            commonPhrases[tagStr] = (commonPhrases[tagStr] || 0) + 1;
          }
        }

        for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
          const matched = keywords.some((kw) => text.includes(kw));
          if (matched) {
            if (!topicCounts[topic]) {
              topicCounts[topic] = { count: 0, sentiment: [], resolutions: {} };
            }
            topicCounts[topic].count++;
          }
        }
      }

      const topics = Object.entries(topicCounts)
        .map(([name, data]) => ({
          name,
          count: data.count,
          percentage: recentCalls.length > 0
            ? Math.round((data.count / recentCalls.length) * 1000) / 10
            : 0,
        }))
        .sort((a, b) => b.count - a.count);

      const topPhrases = Object.entries(commonPhrases)
        .map(([phrase, count]) => ({ phrase, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);

      const alerts: { type: string; severity: string; message: string; count: number; timestamp: string | null }[] = [];

      const optOutCount = recentCalls.filter((c) => c.complianceOptOutDetected).length;
      if (optOutCount > 0) {
        alerts.push({
          type: "compliance",
          severity: "high",
          message: `${optOutCount} opt-out requests detected in ${days}-day period`,
          count: optOutCount,
          timestamp: recentCalls.find((c) => c.complianceOptOutDetected)?.createdAt?.toISOString() || null,
        });
      }

      const escalationCount = recentCalls.filter((c) => c.handoffTriggered).length;
      const escalationRate = recentCalls.length > 0 ? (escalationCount / recentCalls.length) * 100 : 0;
      if (escalationRate > 20) {
        alerts.push({
          type: "performance",
          severity: "medium",
          message: `High escalation rate: ${Math.round(escalationRate)}% of calls require human handoff`,
          count: escalationCount,
          timestamp: null,
        });
      }

      const negativeCalls = recentCalls.filter((c) => c.sentimentLabel === "very_negative" || c.sentimentLabel === "negative");
      const negativeRate = recentCalls.length > 0 ? (negativeCalls.length / recentCalls.length) * 100 : 0;
      if (negativeRate > 15) {
        alerts.push({
          type: "sentiment",
          severity: "medium",
          message: `${Math.round(negativeRate)}% of calls have negative sentiment (${negativeCalls.length} calls)`,
          count: negativeCalls.length,
          timestamp: null,
        });
      }

      const unresolvedCalls = recentCalls.filter((c) => c.resolutionStatus === "unresolved");
      if (unresolvedCalls.length > 5) {
        alerts.push({
          type: "resolution",
          severity: "low",
          message: `${unresolvedCalls.length} unresolved calls in the period`,
          count: unresolvedCalls.length,
          timestamp: null,
        });
      }

      return NextResponse.json({
        topics,
        topPhrases,
        alerts: alerts.sort((a, b) => {
          const sev = { high: 3, medium: 2, low: 1 };
          return (sev[b.severity as keyof typeof sev] || 0) - (sev[a.severity as keyof typeof sev] || 0);
        }),
        totalCalls: recentCalls.length,
      });
    }

    return NextResponse.json({ error: "Invalid tab parameter" }, { status: 400 });
  } catch (error) {
    return handleRouteError(error, "ConversationAnalytics");
  }
}
