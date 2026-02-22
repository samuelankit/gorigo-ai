"use client";

import { useState, createContext, useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/components/query-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  TrendingUp, BarChart3, Users, Clock, Heart, Shield, Activity,
  Smile, Frown, Meh, AlertTriangle, Target, DollarSign, ArrowUpRight,
} from "lucide-react";
import { CustomIcon } from "@/components/ui/custom-icon";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart as RechartsPie, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend,
} from "recharts";

const DateRangeContext = createContext<{ days: number }>({ days: 30 });

function daysLabel(days: number): string {
  if (days === 365) return "Last year";
  return `Last ${days} days`;
}

interface IntelligenceData {
  outcomes: { outcome: string; count: number }[];
  directions: { direction: string; count: number }[];
  resolutions: { status: string; count: number }[];
  hourlyVolume: { hour: number; count: number }[];
  stats: {
    avgDuration: number;
    maxDuration: number;
    totalCalls: number;
    avgTurns: number;
    handoffRate: number;
  };
}

interface SentimentData {
  distribution: { label: string; count: number; avgScore: number }[];
  trend: { day: string; avgScore: number; callCount: number }[];
  overall: {
    averageScore: number | null;
    totalCalls: number;
    analyzedCalls: number;
  };
}

interface QualityData {
  overall: {
    averageScore: number | null;
    averageCsat: number | null;
    totalCalls: number;
    scoredCalls: number;
  };
  averageBreakdown: {
    greeting: number | null;
    understanding: number | null;
    accuracy: number | null;
    professionalism: number | null;
    resolution: number | null;
    efficiency: number | null;
  };
  qualityDistribution: { range: string; count: number }[];
  resolutionDistribution: { status: string; count: number }[];
  trend: { day: string; avgScore: number; avgCsat: number; callCount: number }[];
}

interface AgentPerformance {
  agentId: number;
  agentName: string;
  totalCalls: number;
  avgHandleTime: number;
  avgQualityScore: number;
  avgSentimentScore: number;
  avgCsatPrediction: number;
  avgTurns: number;
  resolutionRate: number;
  escalationRate: number;
}

interface AgentData {
  agents: AgentPerformance[];
  orgSummary: {
    totalCalls: number;
    avgHandleTime: number;
    avgQualityScore: number;
    avgSentimentScore: number;
  };
}

const OUTCOME_COLORS: Record<string, string> = {
  completed_normally: "hsl(142, 71%, 45%)",
  handoff_to_human: "hsl(38, 92%, 50%)",
  max_turns_exceeded: "hsl(0, 84%, 60%)",
  voicemail: "hsl(221, 83%, 53%)",
  abandoned: "hsl(262, 83%, 58%)",
  failed: "hsl(0, 72%, 51%)",
};

const SENTIMENT_CONFIG: Record<string, { color: string; textClass: string; bgClass: string }> = {
  very_negative: { color: "hsl(0, 84%, 60%)", textClass: "text-red-500", bgClass: "bg-red-500/10" },
  negative: { color: "hsl(25, 95%, 53%)", textClass: "text-orange-500", bgClass: "bg-orange-500/10" },
  neutral: { color: "hsl(220, 9%, 46%)", textClass: "text-muted-foreground", bgClass: "bg-muted" },
  positive: { color: "hsl(142, 71%, 45%)", textClass: "text-green-500", bgClass: "bg-green-500/10" },
  very_positive: { color: "hsl(160, 84%, 39%)", textClass: "text-emerald-500", bgClass: "bg-emerald-500/10" },
};

const QUALITY_RANGE_CONFIG: Record<string, { label: string; color: string; bgClass: string }> = {
  excellent: { label: "Excellent (80+)", color: "hsl(142, 71%, 45%)", bgClass: "bg-green-500" },
  good: { label: "Good (65-79)", color: "hsl(160, 84%, 39%)", bgClass: "bg-emerald-500" },
  average: { label: "Average (50-64)", color: "hsl(38, 92%, 50%)", bgClass: "bg-yellow-500" },
  below_average: { label: "Below Avg (35-49)", color: "hsl(25, 95%, 53%)", bgClass: "bg-orange-500" },
  poor: { label: "Poor (<35)", color: "hsl(0, 84%, 60%)", bgClass: "bg-red-500" },
};

const RESOLUTION_COLORS: Record<string, string> = {
  resolved: "bg-green-500",
  partially_resolved: "bg-yellow-500",
  unresolved: "bg-red-500",
  escalated: "bg-orange-500",
};

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: "12px",
};

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

function formatLabel(str: string): string {
  return str.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-5">
        <Skeleton className="h-4 w-24 mb-2" />
        <Skeleton className="h-8 w-16" />
      </CardContent>
    </Card>
  );
}

function ChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-32" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[250px] w-full" />
      </CardContent>
    </Card>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-2">
          <Icon className={`w-4 h-4 ${color}`} />
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}

function OverviewTab() {
  const { days } = useContext(DateRangeContext);

  const { data, isLoading: loading, isError: error } = useQuery<IntelligenceData>({
    queryKey: ["/api/analytics/intelligence", { days }],
    queryFn: () => apiRequest(`/api/analytics/intelligence?days=${days}`),
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <StatCardSkeleton key={i} />)}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
        <ChartSkeleton />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm text-muted-foreground" data-testid="text-overview-no-data">No data available</p>
      </div>
    );
  }

  const { stats, outcomes, hourlyVolume, resolutions } = data;

  const hourlyData = Array.from({ length: 24 }, (_, i) => {
    const found = hourlyVolume.find((h) => Number(h.hour) === i);
    return { hour: `${i.toString().padStart(2, "0")}:00`, calls: found ? Number(found.count) : 0 };
  });

  const outcomeData = outcomes.map((o) => ({
    name: formatLabel(o.outcome || "Unknown"),
    value: Number(o.count),
    fill: OUTCOME_COLORS[o.outcome] || "hsl(var(--muted-foreground))",
  }));

  const totalResolutions = resolutions.reduce((sum, r) => sum + Number(r.count), 0);

  const statCards = [
    { title: "Total Calls", value: stats.totalCalls, icon: Activity, testId: "text-overview-total-calls" },
    { title: "Avg Duration", value: formatDuration(stats.avgDuration), icon: Clock, testId: "text-overview-avg-duration" },
    { title: "Avg Turns", value: stats.avgTurns, icon: BarChart3, testId: "text-overview-avg-turns" },
    { title: "Handoff Rate", value: `${stats.handoffRate}%`, icon: AlertTriangle, testId: "text-overview-handoff-rate" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.title}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">{card.title}</p>
                  <p className="text-2xl font-bold text-foreground" data-testid={card.testId}>{card.value}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                  <card.icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
            <CardTitle className="text-base">Outcome Distribution</CardTitle>
            <Badge variant="secondary" className="no-default-hover-elevate text-xs">{daysLabel(days)}</Badge>
          </CardHeader>
          <CardContent>
            {outcomeData.length === 0 ? (
              <div className="flex items-center justify-center h-[250px]">
                <p className="text-sm text-muted-foreground" data-testid="text-no-outcomes">No outcome data</p>
              </div>
            ) : (
              <div className="h-[250px] w-full" data-testid="chart-outcome-distribution">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={outcomeData} margin={{ top: 5, right: 5, left: -10, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      angle={-35}
                      textAnchor="end"
                    />
                    <YAxis tick={{ fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "hsl(var(--foreground))" }} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {outcomeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
            <CardTitle className="text-base">Hourly Call Volume</CardTitle>
            <Badge variant="secondary" className="no-default-hover-elevate text-xs">24h pattern</Badge>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full" data-testid="chart-hourly-volume">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourlyData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="hourlyGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="hour"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    interval={2}
                  />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "hsl(var(--foreground))" }} />
                  <Area type="monotone" dataKey="calls" stroke="hsl(221, 83%, 53%)" strokeWidth={2} fill="url(#hourlyGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resolution Status</CardTitle>
        </CardHeader>
        <CardContent>
          {totalResolutions === 0 ? (
            <p className="text-sm text-muted-foreground" data-testid="text-no-resolutions">No resolution data</p>
          ) : (
            <div className="space-y-3" data-testid="chart-resolution-status">
              <div className="flex h-4 w-full rounded-full overflow-hidden">
                {resolutions.map((r) => {
                  const pct = (Number(r.count) / totalResolutions) * 100;
                  return (
                    <div
                      key={r.status}
                      className={`${RESOLUTION_COLORS[r.status] || "bg-muted-foreground"} transition-all`}
                      style={{ width: `${pct}%` }}
                      title={`${formatLabel(r.status)}: ${r.count} (${pct.toFixed(1)}%)`}
                    />
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-4">
                {resolutions.map((r) => {
                  const pct = ((Number(r.count) / totalResolutions) * 100).toFixed(1);
                  return (
                    <div key={r.status} className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${RESOLUTION_COLORS[r.status] || "bg-muted-foreground"}`} />
                      <span className="text-sm text-muted-foreground">
                        {formatLabel(r.status)}: {r.count} ({pct}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SentimentTab() {
  const { days } = useContext(DateRangeContext);

  const { data, isLoading: loading, isError: error } = useQuery<SentimentData>({
    queryKey: ["/api/analytics/sentiment", { days }],
    queryFn: () => apiRequest(`/api/analytics/sentiment?days=${days}`),
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm text-muted-foreground" data-testid="text-sentiment-no-data">No data available</p>
      </div>
    );
  }

  const { overall, distribution, trend } = data;
  const totalDistribution = distribution.reduce((sum, d) => sum + Number(d.count), 0);

  const trendData = trend.map((t) => ({
    day: t.day.substring(5),
    score: Math.round(Number(t.avgScore) * 100) / 100,
    calls: Number(t.callCount),
  }));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Average Sentiment Score</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-sentiment-avg-score">
                  {overall.averageScore !== null ? overall.averageScore.toFixed(2) : "N/A"}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-pink-500/10 flex items-center justify-center shrink-0">
                <Heart className="h-5 w-5 text-pink-600 dark:text-pink-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Total Analyzed Calls</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-sentiment-analyzed-calls">
                  {overall.analyzedCalls}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-violet-500/10 flex items-center justify-center shrink-0">
                <Activity className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sentiment Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          {distribution.length === 0 ? (
            <p className="text-sm text-muted-foreground" data-testid="text-no-sentiment-dist">No sentiment data</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" data-testid="chart-sentiment-distribution">
              {["very_negative", "negative", "neutral", "positive", "very_positive"].map((label) => {
                const item = distribution.find((d) => d.label === label);
                const config = SENTIMENT_CONFIG[label] || SENTIMENT_CONFIG.neutral;
                const count = item ? Number(item.count) : 0;
                const pct = totalDistribution > 0 ? ((count / totalDistribution) * 100).toFixed(1) : "0.0";
                const IconComponent = label === "very_negative" || label === "negative" ? Frown
                  : label === "neutral" ? Meh : Smile;
                return (
                  <Card key={label} className={config.bgClass}>
                    <CardContent className="p-4 text-center">
                      <IconComponent className={`h-6 w-6 mx-auto mb-2 ${config.textClass}`} />
                      <p className="text-xs font-medium text-muted-foreground mb-1">{formatLabel(label)}</p>
                      <p className={`text-xl font-bold ${config.textClass}`} data-testid={`text-sentiment-${label}-count`}>
                        {count}
                      </p>
                      <p className="text-xs text-muted-foreground">{pct}%</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
          <CardTitle className="text-base">Daily Sentiment Trend</CardTitle>
          <Badge variant="secondary" className="no-default-hover-elevate text-xs">{daysLabel(days)}</Badge>
        </CardHeader>
        <CardContent>
          {trendData.length === 0 ? (
            <div className="flex items-center justify-center h-[250px]">
              <p className="text-sm text-muted-foreground" data-testid="text-no-sentiment-trend">No trend data</p>
            </div>
          ) : (
            <div className="h-[250px] w-full" data-testid="chart-sentiment-trend">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="day"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "hsl(var(--foreground))" }} />
                  <Line type="monotone" dataKey="score" stroke="hsl(142, 71%, 45%)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function QualityTab() {
  const { days } = useContext(DateRangeContext);

  const { data, isLoading: loading, isError: error } = useQuery<QualityData>({
    queryKey: ["/api/analytics/quality", { days }],
    queryFn: () => apiRequest(`/api/analytics/quality?days=${days}`),
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
        <ChartSkeleton />
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm text-muted-foreground" data-testid="text-quality-no-data">No data available</p>
      </div>
    );
  }

  const { overall, averageBreakdown, qualityDistribution, resolutionDistribution, trend } = data;

  const totalQualityDist = qualityDistribution.reduce((sum, q) => sum + Number(q.count), 0);
  const totalResolutionDist = resolutionDistribution.reduce((sum, r) => sum + Number(r.count), 0);

  const breakdownData = [
    { name: "Greeting", score: averageBreakdown.greeting ?? 0 },
    { name: "Understanding", score: averageBreakdown.understanding ?? 0 },
    { name: "Accuracy", score: averageBreakdown.accuracy ?? 0 },
    { name: "Professionalism", score: averageBreakdown.professionalism ?? 0 },
    { name: "Resolution", score: averageBreakdown.resolution ?? 0 },
    { name: "Efficiency", score: averageBreakdown.efficiency ?? 0 },
  ];

  const trendData = trend.map((t) => ({
    day: t.day.substring(5),
    score: Math.round(Number(t.avgScore) * 10) / 10,
    csat: Math.round(Number(t.avgCsat) * 10) / 10,
  }));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Average Quality Score</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-quality-avg-score">
                  {overall.averageScore !== null ? `${overall.averageScore}/100` : "N/A"}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                <Shield className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Average CSAT</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-quality-avg-csat">
                  {overall.averageCsat !== null ? `${overall.averageCsat}/5` : "N/A"}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                <TrendingUp className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quality Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          {totalQualityDist === 0 ? (
            <p className="text-sm text-muted-foreground" data-testid="text-no-quality-dist">No quality data</p>
          ) : (
            <div className="space-y-3" data-testid="chart-quality-distribution">
              <div className="flex h-4 w-full rounded-full overflow-hidden">
                {["excellent", "good", "average", "below_average", "poor"].map((range) => {
                  const item = qualityDistribution.find((q) => q.range === range);
                  const count = item ? Number(item.count) : 0;
                  const pct = (count / totalQualityDist) * 100;
                  const config = QUALITY_RANGE_CONFIG[range];
                  return pct > 0 ? (
                    <div
                      key={range}
                      className={`${config.bgClass} transition-all`}
                      style={{ width: `${pct}%` }}
                      title={`${config.label}: ${count} (${pct.toFixed(1)}%)`}
                    />
                  ) : null;
                })}
              </div>
              <div className="flex flex-wrap gap-4">
                {["excellent", "good", "average", "below_average", "poor"].map((range) => {
                  const item = qualityDistribution.find((q) => q.range === range);
                  const count = item ? Number(item.count) : 0;
                  const pct = totalQualityDist > 0 ? ((count / totalQualityDist) * 100).toFixed(1) : "0.0";
                  const config = QUALITY_RANGE_CONFIG[range];
                  return (
                    <div key={range} className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${config.bgClass}`} />
                      <span className="text-sm text-muted-foreground">
                        {config.label}: {count} ({pct}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quality Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] w-full" data-testid="chart-quality-breakdown">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={breakdownData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "hsl(var(--foreground))" }} />
                <Bar dataKey="score" fill="hsl(221, 83%, 53%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resolution Status</CardTitle>
        </CardHeader>
        <CardContent>
          {totalResolutionDist === 0 ? (
            <p className="text-sm text-muted-foreground" data-testid="text-no-quality-resolution">No resolution data</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" data-testid="chart-quality-resolution">
              {resolutionDistribution.map((r) => {
                const pct = ((Number(r.count) / totalResolutionDist) * 100).toFixed(1);
                return (
                  <Card key={r.status}>
                    <CardContent className="p-4 text-center">
                      <div className={`w-3 h-3 rounded-full mx-auto mb-2 ${RESOLUTION_COLORS[r.status] || "bg-muted-foreground"}`} />
                      <p className="text-xs font-medium text-muted-foreground mb-1">{formatLabel(r.status)}</p>
                      <p className="text-xl font-bold text-foreground">{r.count}</p>
                      <p className="text-xs text-muted-foreground">{pct}%</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
          <CardTitle className="text-base">30-Day Quality Trend</CardTitle>
          <Badge variant="secondary" className="no-default-hover-elevate text-xs">{daysLabel(days)}</Badge>
        </CardHeader>
        <CardContent>
          {trendData.length === 0 ? (
            <div className="flex items-center justify-center h-[250px]">
              <p className="text-sm text-muted-foreground" data-testid="text-no-quality-trend">No trend data</p>
            </div>
          ) : (
            <div className="h-[250px] w-full" data-testid="chart-quality-trend">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="qualityGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="day"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "hsl(var(--foreground))" }} />
                  <Area type="monotone" dataKey="score" stroke="hsl(142, 71%, 45%)" strokeWidth={2} fill="url(#qualityGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AgentsTab() {
  const { days } = useContext(DateRangeContext);

  const { data, isLoading: loading, isError: error } = useQuery<AgentData>({
    queryKey: ["/api/analytics/agent-performance", { days }],
    queryFn: () => apiRequest(`/api/analytics/agent-performance?days=${days}`),
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <StatCardSkeleton key={i} />)}
        </div>
        <Card>
          <CardContent className="p-4">
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm text-muted-foreground" data-testid="text-agents-no-data">No data available</p>
      </div>
    );
  }

  const { orgSummary, agents } = data;

  const summaryCards = [
    { title: "Total Calls", value: orgSummary.totalCalls, icon: Activity, testId: "text-agents-total-calls" },
    { title: "Avg Handle Time", value: formatDuration(orgSummary.avgHandleTime), icon: Clock, testId: "text-agents-avg-handle" },
    { title: "Avg Quality", value: orgSummary.avgQualityScore, icon: Shield, testId: "text-agents-avg-quality" },
    { title: "Avg Sentiment", value: orgSummary.avgSentimentScore, icon: Heart, testId: "text-agents-avg-sentiment" },
  ];

  const getResolutionRateClass = (rate: number) => {
    if (rate > 80) return "text-green-500";
    if (rate >= 60) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <Card key={card.title}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">{card.title}</p>
                  <p className="text-2xl font-bold text-foreground" data-testid={card.testId}>{card.value}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                  <card.icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
          <CardTitle className="text-base">Agent Performance</CardTitle>
          <Badge variant="secondary" className="no-default-hover-elevate text-xs">{daysLabel(days)}</Badge>
        </CardHeader>
        <CardContent>
          {agents.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-sm text-muted-foreground" data-testid="text-no-agents">No agents found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table data-testid="table-agent-performance">
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent Name</TableHead>
                    <TableHead className="text-right">Calls</TableHead>
                    <TableHead className="text-right">Avg Handle Time</TableHead>
                    <TableHead className="text-right">Quality Score</TableHead>
                    <TableHead className="text-right">Sentiment</TableHead>
                    <TableHead className="text-right">CSAT</TableHead>
                    <TableHead className="text-right">Resolution Rate</TableHead>
                    <TableHead className="text-right">Escalation Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agents.map((agent) => (
                    <TableRow key={agent.agentId} data-testid={`row-agent-${agent.agentId}`}>
                      <TableCell className="font-medium" data-testid={`text-agent-name-${agent.agentId}`}>
                        {agent.agentName}
                      </TableCell>
                      <TableCell className="text-right">{agent.totalCalls}</TableCell>
                      <TableCell className="text-right">{formatDuration(agent.avgHandleTime)}</TableCell>
                      <TableCell className="text-right">{agent.avgQualityScore}</TableCell>
                      <TableCell className="text-right">{agent.avgSentimentScore}</TableCell>
                      <TableCell className="text-right">{agent.avgCsatPrediction}</TableCell>
                      <TableCell className={`text-right font-medium ${getResolutionRateClass(agent.resolutionRate)}`}>
                        {agent.resolutionRate}%
                      </TableCell>
                      <TableCell className="text-right">{agent.escalationRate}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const HEATMAP_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HEATMAP_HOURS = Array.from({ length: 24 }, (_, i) => i);
const PIE_COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

function TrendsTab() {
  const { days } = useContext(DateRangeContext);

  const { data, isLoading: loading, isError: error } = useQuery<any>({
    queryKey: ["/api/analytics/trends", { days }],
    queryFn: () => apiRequest(`/api/analytics/trends?days=${days}`),
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-md" />)}
        </div>
        <Skeleton className="h-80 rounded-md" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground" data-testid="text-trends-error">No trends data available yet.</p>
        </CardContent>
      </Card>
    );
  }

  const { summary, dailyVolume, successRate, durationTrend, peakHours } = data;

  const maxHeatVal = Math.max(...(peakHours || []).map((h: any) => h.count), 1);

  return (
    <div className="space-y-6" data-testid="trends-tab-content">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Activity} label="Total Calls" value={summary?.totalCalls ?? 0} color="text-blue-500" />
        <StatCard icon={TrendingUp} label="Success Rate" value={`${summary?.successRate ?? 0}%`} color="text-emerald-500" />
        <StatCard icon={Clock} label="Avg Duration" value={`${summary?.avgDuration ?? 0}s`} color="text-amber-500" />
        <StatCard icon={BarChart3} label="Total Minutes" value={summary?.totalMinutes ?? 0} color="text-violet-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base" data-testid="text-daily-volume-title">Daily Call Volume</CardTitle>
          </CardHeader>
          <CardContent>
            {dailyVolume?.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={dailyVolume}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px" }} />
                  <Area type="monotone" dataKey="completed" stackId="1" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1))" fillOpacity={0.4} name="Completed" />
                  <Area type="monotone" dataKey="failed" stackId="1" stroke="hsl(var(--chart-3))" fill="hsl(var(--chart-3))" fillOpacity={0.4} name="Failed" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-center py-8">No volume data yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base" data-testid="text-success-rate-title">Success Rate Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {successRate?.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={successRate}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px" }} formatter={(v: number) => [`${v}%`, "Success Rate"]} />
                  <Line type="monotone" dataKey="rate" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-center py-8">No success rate data yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base" data-testid="text-duration-trend-title">Duration Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {durationTrend?.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={durationTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px" }} />
                  <Bar dataKey="avgDuration" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} name="Avg Duration (s)" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-center py-8">No duration data yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base" data-testid="text-peak-hours-title">Peak Hours Heatmap</CardTitle>
          </CardHeader>
          <CardContent>
            {peakHours?.length > 0 ? (
              <div className="overflow-x-auto">
                <div className="min-w-[500px]">
                  <div className="flex gap-0.5 mb-1">
                    <div className="w-10 shrink-0" />
                    {HEATMAP_HOURS.map((h) => (
                      <div key={h} className="flex-1 text-center text-[10px] text-muted-foreground">{h}</div>
                    ))}
                  </div>
                  {HEATMAP_DAYS.map((dayLabel, dayIdx) => (
                    <div key={dayLabel} className="flex gap-0.5 mb-0.5">
                      <div className="w-10 shrink-0 text-xs text-muted-foreground flex items-center">{dayLabel}</div>
                      {HEATMAP_HOURS.map((hour) => {
                        const cell = peakHours.find((p: any) => p.dayOfWeek === dayIdx && p.hour === hour);
                        const count = cell?.count || 0;
                        const intensity = count / maxHeatVal;
                        return (
                          <div
                            key={hour}
                            className="flex-1 aspect-square rounded-sm"
                            style={{ backgroundColor: `hsl(var(--chart-1) / ${Math.max(0.05, intensity)})` }}
                            title={`${dayLabel} ${hour}:00 - ${count} calls`}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">No peak hours data yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ActivityTab() {
  const { days } = useContext(DateRangeContext);

  const { data, isLoading: loading, isError: error } = useQuery<any>({
    queryKey: ["/api/analytics/activity", { days }],
    queryFn: () => apiRequest(`/api/analytics/activity?days=${days}`),
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-md" />)}
        </div>
        <Skeleton className="h-80 rounded-md" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground" data-testid="text-activity-error">No activity data available yet.</p>
        </CardContent>
      </Card>
    );
  }

  const { summary, directionBreakdown, costBreakdown, leadMetrics, outcomeDistribution } = data;

  return (
    <div className="space-y-6" data-testid="activity-tab-content">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Activity} label="Total Calls" value={summary?.totalCalls ?? 0} color="text-blue-500" />
        <StatCard icon={DollarSign} label="Total Cost" value={`£${(summary?.totalCost ?? 0).toFixed(2)}`} color="text-emerald-500" />
        <StatCard icon={Target} label="Leads Captured" value={summary?.totalLeads ?? 0} color="text-amber-500" />
        <StatCard icon={ArrowUpRight} label="Cost / Minute" value={`£${(summary?.avgCostPerMinute ?? 0).toFixed(3)}`} color="text-violet-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base" data-testid="text-direction-title">Call Direction</CardTitle>
          </CardHeader>
          <CardContent>
            {directionBreakdown?.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <RechartsPie>
                  <Pie data={directionBreakdown} dataKey="count" nameKey="direction" cx="50%" cy="50%" outerRadius={100} label={({ direction, count }: any) => `${direction}: ${count}`}>
                    {directionBreakdown.map((_: any, idx: number) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px" }} />
                  <Legend />
                </RechartsPie>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-center py-8">No direction data yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base" data-testid="text-outcome-title">Outcome Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {outcomeDistribution?.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={outcomeDistribution} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="outcome" type="category" tick={{ fontSize: 11 }} width={100} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px" }} formatter={(v: number) => [v, "Calls"]} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {outcomeDistribution.map((_: any, idx: number) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-center py-8">No outcome data yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base" data-testid="text-cost-breakdown-title">Cost by Package</CardTitle>
          </CardHeader>
          <CardContent>
            {costBreakdown?.length > 0 ? (
              <div className="space-y-3">
                {costBreakdown.map((item: any) => (
                  <div key={item.deploymentModel} className="flex items-center justify-between gap-3 py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-medium capitalize">{item.deploymentModel || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">{item.callCount} calls</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">£{Number(item.totalCost).toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">£{Number(item.avgCostPerCall).toFixed(3)}/call</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">No cost data yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base" data-testid="text-leads-title">Lead Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 rounded-md bg-muted/50">
                <p className="text-2xl font-bold text-foreground">{leadMetrics?.totalLeads ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Total Leads</p>
              </div>
              <div className="text-center p-4 rounded-md bg-muted/50">
                <p className="text-2xl font-bold text-foreground">{leadMetrics?.conversionRate ?? 0}%</p>
                <p className="text-xs text-muted-foreground mt-1">Conversion Rate</p>
              </div>
              <div className="text-center p-4 rounded-md bg-muted/50">
                <p className="text-2xl font-bold text-foreground">{leadMetrics?.leadsWithEmail ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">With Email</p>
              </div>
              <div className="text-center p-4 rounded-md bg-muted/50">
                <p className="text-2xl font-bold text-foreground">{leadMetrics?.leadsWithPhone ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">With Phone</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function AnalyticsDashboardPage() {
  const [days, setDays] = useState(30);

  return (
    <DateRangeContext.Provider value={{ days }}>
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-violet-500/10">
              <CustomIcon name="vr-waveform-scan" size={20} className="text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground" data-testid="text-analytics-title">
                Analytics
              </h1>
              <p className="text-sm text-muted-foreground">Deep insights into your AI call center performance.</p>
            </div>
          </div>
          <Select value={String(days)} onValueChange={(v) => setDays(Number(v))} data-testid="select-date-range">
            <SelectTrigger className="w-[160px]" data-testid="select-trigger-date-range">
              <SelectValue placeholder="Date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7" data-testid="option-7-days">Last 7 days</SelectItem>
              <SelectItem value="14" data-testid="option-14-days">Last 14 days</SelectItem>
              <SelectItem value="30" data-testid="option-30-days">Last 30 days</SelectItem>
              <SelectItem value="90" data-testid="option-90-days">Last 90 days</SelectItem>
              <SelectItem value="365" data-testid="option-365-days">Last year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="overview" data-testid="tabs-analytics">
          <TabsList data-testid="tabslist-analytics">
            <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="trends" data-testid="tab-trends">Trends</TabsTrigger>
            <TabsTrigger value="activity" data-testid="tab-activity">Activity</TabsTrigger>
            <TabsTrigger value="sentiment" data-testid="tab-sentiment">Sentiment</TabsTrigger>
            <TabsTrigger value="quality" data-testid="tab-quality">Quality</TabsTrigger>
            <TabsTrigger value="agents" data-testid="tab-agents">Agents</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="mt-6">
            <OverviewTab />
          </TabsContent>
          <TabsContent value="trends" className="mt-6">
            <TrendsTab />
          </TabsContent>
          <TabsContent value="activity" className="mt-6">
            <ActivityTab />
          </TabsContent>
          <TabsContent value="sentiment" className="mt-6">
            <SentimentTab />
          </TabsContent>
          <TabsContent value="quality" className="mt-6">
            <QualityTab />
          </TabsContent>
          <TabsContent value="agents" className="mt-6">
            <AgentsTab />
          </TabsContent>
        </Tabs>
      </div>
    </DateRangeContext.Provider>
  );
}
