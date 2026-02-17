"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Lightbulb,
  Eye,
  Brain,
  Search,
  Sparkles,
  Activity,
  Target,
  Monitor,
  Megaphone,
  ArrowUpRight,
  ArrowDownRight,
  Star,
} from "lucide-react";

import { PERIODS } from "@/lib/analytics-shared";

interface AnomalyInsight {
  type: "anomaly";
  severity: "high" | "medium" | "low";
  title: string;
  description: string;
  page?: string;
  metric: string;
  currentValue: number;
  previousValue: number;
  changePercent: number;
}

interface TrendInsight {
  type: "trend";
  direction: "up" | "down" | "new";
  title: string;
  description: string;
  page?: string;
  dataPoints: number[];
}

interface RecommendationInsight {
  type: "recommendation";
  priority: "critical" | "high" | "medium" | "low";
  category: "conversion" | "engagement" | "technical" | "marketing" | "ux";
  title: string;
  description: string;
  page?: string;
  actionable: string;
}

interface BlindspotInsight {
  type: "blindspot";
  severity: "high" | "medium" | "low";
  title: string;
  description: string;
  page?: string;
}

type Insight = AnomalyInsight | TrendInsight | RecommendationInsight | BlindspotInsight;

interface Scores {
  overall: number;
  engagement: number;
  conversion: number;
  technical: number;
  marketing: number;
  breakdown: {
    engagement: string[];
    conversion: string[];
    technical: string[];
    marketing: string[];
  };
}

interface InsightsData {
  insights: Insight[];
  scores: Scores;
  summary: string;
  period: string;
}

const FILTER_OPTIONS = ["all", "anomaly", "trend", "recommendation", "blindspot"] as const;
type FilterType = (typeof FILTER_OPTIONS)[number];

const filterLabels: Record<FilterType, string> = {
  all: "All",
  anomaly: "Anomalies",
  trend: "Trends",
  recommendation: "Recommendations",
  blindspot: "Blind Spots",
};

const scoreColor = (score: number) => {
  if (score >= 80) return "text-green-600 dark:text-green-400";
  if (score >= 60) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
};

const scoreRingColor = (score: number) => {
  if (score >= 80) return "stroke-green-500";
  if (score >= 60) return "stroke-amber-500";
  return "stroke-red-500";
};

const scoreBgColor = (score: number) => {
  if (score >= 80) return "bg-green-500/10";
  if (score >= 60) return "bg-amber-500/10";
  return "bg-red-500/10";
};

const scoreBarColor = (score: number) => {
  if (score >= 80) return "bg-green-500";
  if (score >= 60) return "bg-amber-500";
  return "bg-red-500";
};

const severityBadge = (severity: string) => {
  switch (severity) {
    case "critical": return "destructive" as const;
    case "high": return "destructive" as const;
    case "medium": return "secondary" as const;
    case "low": return "outline" as const;
    default: return "secondary" as const;
  }
};

const categoryColor = (category: string) => {
  switch (category) {
    case "conversion": return "bg-purple-500/10 text-purple-700 dark:text-purple-300";
    case "engagement": return "bg-blue-500/10 text-blue-700 dark:text-blue-300";
    case "technical": return "bg-amber-500/10 text-amber-700 dark:text-amber-300";
    case "marketing": return "bg-green-500/10 text-green-700 dark:text-green-300";
    case "ux": return "bg-pink-500/10 text-pink-700 dark:text-pink-300";
    default: return "bg-muted text-muted-foreground";
  }
};

const insightIcon = (insight: Insight) => {
  switch (insight.type) {
    case "anomaly": return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    case "trend":
      return insight.direction === "up"
        ? <TrendingUp className="h-4 w-4 text-green-500" />
        : insight.direction === "down"
          ? <TrendingDown className="h-4 w-4 text-red-500" />
          : <Star className="h-4 w-4 text-blue-500" />;
    case "recommendation": return <Lightbulb className="h-4 w-4 text-purple-500" />;
    case "blindspot": return <Eye className="h-4 w-4 text-muted-foreground" />;
  }
};

function MiniSparkline({ data }: { data: number[] }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 120;
  const h = 32;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x},${y}`;
  });
  const isUp = data[data.length - 1] > data[0];
  const color = isUp ? "stroke-green-500" : "stroke-red-500";

  return (
    <svg width={w} height={h} className="shrink-0" data-testid="sparkline">
      <polyline
        points={points.join(" ")}
        fill="none"
        className={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CircularScore({ score, size = 120 }: { score: number; size?: number }) {
  const r = (size - 12) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }} data-testid="circular-score">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          className="stroke-muted"
          strokeWidth="8"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          className={scoreRingColor(score)}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.5s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-3xl font-bold ${scoreColor(score)}`} data-testid="text-overall-score">{score}</span>
        <span className="text-xs text-muted-foreground">/ 100</span>
      </div>
    </div>
  );
}

function ScoreBar({ label, score, icon }: { label: string; score: number; icon: React.ReactNode }) {
  return (
    <div className="flex-1 min-w-[120px]" data-testid={`score-bar-${label.toLowerCase()}`}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${scoreBarColor(score)}`}
            style={{ width: `${score}%` }}
          />
        </div>
        <span className={`text-sm font-semibold ${scoreColor(score)}`}>{score}</span>
      </div>
    </div>
  );
}

export default function InsightsPage() {
  const [period, setPeriod] = useState<string>("7d");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<InsightsData | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");

  const loadData = useCallback(async (p: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics/insights?period=${p}`);
      if (!res.ok) {
        setData(null);
        return;
      }
      const json = await res.json();
      setData(json);
    } catch (error) {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(period);
  }, [period, loadData]);

  const filteredInsights = data?.insights.filter((i) => filter === "all" || i.type === filter) || [];

  const anomalyCount = data?.insights.filter((i) => i.type === "anomaly").length || 0;
  const trendCount = data?.insights.filter((i) => i.type === "trend").length || 0;
  const recCount = data?.insights.filter((i) => i.type === "recommendation").length || 0;
  const blindspotCount = data?.insights.filter((i) => i.type === "blindspot").length || 0;

  const scoreDimensions = [
    { key: "engagement", label: "Engagement", icon: <Activity className="h-3.5 w-3.5 text-blue-500" /> },
    { key: "conversion", label: "Conversion", icon: <Target className="h-3.5 w-3.5 text-purple-500" /> },
    { key: "technical", label: "Technical", icon: <Monitor className="h-3.5 w-3.5 text-amber-500" /> },
    { key: "marketing", label: "Marketing", icon: <Megaphone className="h-3.5 w-3.5 text-green-500" /> },
  ] as const;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center gap-1 mb-2" data-testid="nav-sub-navigation">
        <Link href="/admin/web-traffic">
          <Button variant="outline" size="sm" data-testid="link-overview">
            Overview
          </Button>
        </Link>
        <Link href="/admin/web-traffic/journeys">
          <Button variant="outline" size="sm" data-testid="link-journeys">
            Journeys & Funnels
          </Button>
        </Link>
        <Button variant="default" size="sm" className="toggle-elevate toggle-elevated" data-testid="link-insights-active">
          AI Insights
        </Button>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-500/10">
            <Brain className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground" data-testid="text-insights-title">
              AI Traffic Insights
            </h1>
            <p className="text-sm text-muted-foreground">Algorithmic analysis of traffic patterns, anomalies, and opportunities.</p>
          </div>
        </div>
        <div className="flex items-center gap-1" data-testid="period-selector">
          {PERIODS.map((p) => (
            <Button
              key={p}
              variant={period === p ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriod(p)}
              data-testid={`button-period-${p}`}
              className={period === p ? "toggle-elevate toggle-elevated" : ""}
            >
              {p}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <Skeleton className="h-[120px] w-[120px] rounded-full" />
                <div className="flex-1 space-y-3 w-full">
                  <Skeleton className="h-4 w-48" />
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-4 w-full mb-3" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
          </Card>
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-5">
                  <Skeleton className="h-5 w-64 mb-2" />
                  <Skeleton className="h-4 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : !data ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Search className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-foreground mb-1" data-testid="text-no-data">No insights available</p>
            <p className="text-sm text-muted-foreground">Start tracking traffic to generate AI insights.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card data-testid="card-health-score">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className={`rounded-full p-3 ${scoreBgColor(data.scores.overall)}`}>
                  <CircularScore score={data.scores.overall} />
                </div>
                <div className="flex-1 w-full">
                  <h2 className="text-lg font-semibold text-foreground mb-1" data-testid="text-health-label">Traffic Health Score</h2>
                  <p className="text-sm text-muted-foreground mb-4">Overall platform traffic quality and performance</p>
                  <div className="flex flex-wrap gap-6">
                    {scoreDimensions.map((dim) => (
                      <ScoreBar
                        key={dim.key}
                        label={dim.label}
                        score={data.scores[dim.key as keyof Omit<Scores, "breakdown" | "overall">]}
                        icon={dim.icon}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-summary">
            <CardContent className="p-6">
              <div className="flex items-start gap-3 mb-4">
                <Sparkles className="h-5 w-5 text-purple-500 shrink-0 mt-0.5" />
                <p className="text-sm text-foreground" data-testid="text-summary">{data.summary}</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Badge variant="secondary" className="no-default-hover-elevate" data-testid="badge-anomaly-count">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {anomalyCount} Anomalies
                </Badge>
                <Badge variant="secondary" className="no-default-hover-elevate" data-testid="badge-trend-count">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {trendCount} Trends
                </Badge>
                <Badge variant="secondary" className="no-default-hover-elevate" data-testid="badge-rec-count">
                  <Lightbulb className="h-3 w-3 mr-1" />
                  {recCount} Recommendations
                </Badge>
                <Badge variant="secondary" className="no-default-hover-elevate" data-testid="badge-blindspot-count">
                  <Eye className="h-3 w-3 mr-1" />
                  {blindspotCount} Blind Spots
                </Badge>
              </div>
            </CardContent>
          </Card>

          <div>
            <div className="flex flex-wrap items-center gap-1 mb-4" data-testid="filter-buttons">
              {FILTER_OPTIONS.map((f) => (
                <Button
                  key={f}
                  variant={filter === f ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter(f)}
                  data-testid={`button-filter-${f}`}
                  className={filter === f ? "toggle-elevate toggle-elevated" : ""}
                >
                  {filterLabels[f]}
                  {f !== "all" && (
                    <Badge variant="secondary" className="no-default-hover-elevate ml-1.5 text-xs px-1.5">
                      {f === "anomaly" ? anomalyCount : f === "trend" ? trendCount : f === "recommendation" ? recCount : blindspotCount}
                    </Badge>
                  )}
                </Button>
              ))}
            </div>

            {filteredInsights.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Sparkles className="h-8 w-8 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground" data-testid="text-no-insights">No insights found for this filter.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3" data-testid="insights-feed">
                {filteredInsights.map((insight, idx) => (
                  <Card key={idx} data-testid={`insight-card-${idx}`}>
                    <CardContent className="p-5">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 shrink-0">{insightIcon(insight)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-foreground" data-testid={`insight-title-${idx}`}>
                              {insight.title}
                            </span>
                            {insight.type === "anomaly" && (
                              <Badge variant={severityBadge(insight.severity)} className="no-default-hover-elevate text-xs" data-testid={`insight-severity-${idx}`}>
                                {insight.severity}
                              </Badge>
                            )}
                            {insight.type === "recommendation" && (
                              <>
                                <Badge variant={severityBadge(insight.priority)} className="no-default-hover-elevate text-xs" data-testid={`insight-priority-${idx}`}>
                                  {insight.priority}
                                </Badge>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${categoryColor(insight.category)}`} data-testid={`insight-category-${idx}`}>
                                  {insight.category}
                                </span>
                              </>
                            )}
                            {insight.type === "blindspot" && (
                              <Badge variant={severityBadge(insight.severity)} className="no-default-hover-elevate text-xs" data-testid={`insight-severity-${idx}`}>
                                {insight.severity}
                              </Badge>
                            )}
                            {insight.type === "trend" && (
                              <Badge variant="secondary" className="no-default-hover-elevate text-xs" data-testid={`insight-direction-${idx}`}>
                                {insight.direction === "up" && <ArrowUpRight className="h-3 w-3 mr-0.5 inline" />}
                                {insight.direction === "down" && <ArrowDownRight className="h-3 w-3 mr-0.5 inline" />}
                                {insight.direction}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2" data-testid={`insight-description-${idx}`}>
                            {insight.description}
                          </p>
                          {"page" in insight && insight.page && (
                            <p className="text-xs text-muted-foreground font-mono mb-1" data-testid={`insight-page-${idx}`}>
                              {insight.page}
                            </p>
                          )}
                          {insight.type === "recommendation" && (
                            <div className="flex items-start gap-2 mt-2 p-2 rounded-md bg-muted/50">
                              <Lightbulb className="h-3.5 w-3.5 text-purple-500 shrink-0 mt-0.5" />
                              <p className="text-xs text-foreground" data-testid={`insight-action-${idx}`}>{insight.actionable}</p>
                            </div>
                          )}
                          {insight.type === "anomaly" && (
                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                              <span>Previous: {insight.previousValue}</span>
                              <span>Current: {insight.currentValue}</span>
                              <span className={insight.changePercent > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                                {insight.changePercent > 0 ? "+" : ""}{insight.changePercent}%
                              </span>
                            </div>
                          )}
                          {insight.type === "trend" && insight.dataPoints.length >= 2 && (
                            <div className="mt-2">
                              <MiniSparkline data={insight.dataPoints} />
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2" data-testid="score-breakdown-grid">
            {scoreDimensions.map((dim) => {
              const dimScore = data.scores[dim.key as keyof Omit<Scores, "breakdown" | "overall">];
              const factors = data.scores.breakdown[dim.key as keyof Scores["breakdown"]];
              return (
                <Card key={dim.key} data-testid={`card-breakdown-${dim.key}`}>
                  <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
                    <div className="flex items-center gap-2">
                      {dim.icon}
                      <CardTitle className="text-base">{dim.label}</CardTitle>
                    </div>
                    <span className={`text-lg font-bold ${scoreColor(dimScore)}`} data-testid={`text-score-${dim.key}`}>{dimScore}/100</span>
                  </CardHeader>
                  <CardContent>
                    <div className="h-2 rounded-full bg-muted overflow-hidden mb-4">
                      <div
                        className={`h-full rounded-full transition-all ${scoreBarColor(dimScore)}`}
                        style={{ width: `${dimScore}%` }}
                      />
                    </div>
                    <ul className="space-y-1.5">
                      {factors.map((factor, fi) => (
                        <li key={fi} className="flex items-start gap-2 text-sm text-muted-foreground" data-testid={`factor-${dim.key}-${fi}`}>
                          <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-muted-foreground/50 shrink-0" />
                          {factor}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
