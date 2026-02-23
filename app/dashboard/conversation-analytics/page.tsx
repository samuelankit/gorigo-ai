"use client";

import { useState, createContext, useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  TrendingUp, TrendingDown, BarChart3, Users, Clock, Heart, Shield, Activity,
  Smile, Frown, Meh, AlertTriangle, Target, ArrowUpRight, ArrowDownRight,
  Award, Star, MessageSquare, Bell, Tag, Minus, Phone,
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from "recharts";

const DateRangeContext = createContext<{ days: number }>({ days: 30 });

function daysLabel(days: number): string {
  if (days === 365) return "Last year";
  return `Last ${days} days`;
}

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
      <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
      <CardContent><Skeleton className="h-[250px] w-full" /></CardContent>
    </Card>
  );
}

function ChangeIndicator({ value, inverse }: { value: number; inverse?: boolean }) {
  if (value === 0) return <span className="text-xs text-muted-foreground flex items-center gap-0.5"><Minus className="h-3 w-3" /> 0%</span>;
  const isPositive = inverse ? value < 0 : value > 0;
  return (
    <span className={`text-xs flex items-center gap-0.5 ${isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
      {value > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {Math.abs(value)}%
    </span>
  );
}

function KPIsTab() {
  const { days } = useContext(DateRangeContext);

  const { data, isLoading: loading } = useQuery<any>({
    queryKey: ["/api/conversation-analytics", { tab: "kpis", days }],
    queryFn: async () => {
      const res = await fetch(`/api/conversation-analytics?tab=kpis&days=${days}`);
      if (!res.ok) return null;
      const d = await res.json();
      return d && !d.error ? d : null;
    },
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <StatCardSkeleton key={i} />)}</div>
        <ChartSkeleton />
      </div>
    );
  }

  if (!data) {
    return <div className="flex items-center justify-center py-16"><p className="text-sm text-muted-foreground" data-testid="text-kpis-no-data">No data available</p></div>;
  }

  const { current: c, changes: ch, dailyTrend } = data;

  const kpis = [
    { label: "Total Calls", value: c.totalCalls, change: ch.totalCalls, icon: Phone, color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
    { label: "Avg Duration", value: formatDuration(c.avgDuration), change: ch.avgDuration, icon: Clock, color: "bg-purple-500/10 text-purple-600 dark:text-purple-400" },
    { label: "Quality Score", value: c.avgQuality !== null ? `${c.avgQuality}/100` : "N/A", change: ch.avgQuality, icon: Shield, color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
    { label: "CSAT Score", value: c.avgCsat !== null ? `${c.avgCsat}/5` : "N/A", change: ch.avgCsat, icon: Star, color: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
    { label: "Resolution Rate", value: `${c.resolutionRate}%`, change: ch.resolutionRate, icon: Target, color: "bg-green-500/10 text-green-600 dark:text-green-400" },
    { label: "Escalation Rate", value: `${c.escalationRate}%`, change: ch.escalationRate, icon: AlertTriangle, color: "bg-orange-500/10 text-orange-600 dark:text-orange-400", inverse: true },
    { label: "Avg Turns", value: c.avgTurns, change: null, icon: MessageSquare, color: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" },
    { label: "Leads Captured", value: c.leadsCaptured, change: null, icon: Users, color: "bg-pink-500/10 text-pink-600 dark:text-pink-400" },
  ];

  const trendData = (dailyTrend || []).map((t: any) => ({
    day: t.day?.substring(5) || "",
    calls: Number(t.calls),
    quality: t.avgQuality ? Math.round(Number(t.avgQuality)) : null,
    resolved: Number(t.resolved || 0),
  }));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">{kpi.label}</p>
                  <p className="text-2xl font-bold text-foreground" data-testid={`text-kpi-${kpi.label.toLowerCase().replace(/\s+/g, "-")}`}>{kpi.value}</p>
                  {kpi.change !== null && <ChangeIndicator value={kpi.change} inverse={kpi.inverse} />}
                </div>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${kpi.color.split(" ")[0]}`}>
                  <kpi.icon className={`h-5 w-5 ${kpi.color.split(" ").slice(1).join(" ")}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
          <CardTitle className="text-base">Daily Call Volume & Quality</CardTitle>
          <Badge variant="secondary" className="no-default-hover-elevate text-xs">{daysLabel(days)}</Badge>
        </CardHeader>
        <CardContent>
          {trendData.length === 0 ? (
            <div className="flex items-center justify-center h-[280px]">
              <p className="text-sm text-muted-foreground" data-testid="text-no-kpi-trend">No trend data</p>
            </div>
          ) : (
            <div className="h-[280px] w-full" data-testid="chart-kpi-trend">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="kpiCallsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="day" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="left" tick={{ fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "hsl(var(--foreground))" }} />
                  <Legend />
                  <Area yAxisId="left" type="monotone" dataKey="calls" name="Calls" stroke="hsl(221, 83%, 53%)" strokeWidth={2} fill="url(#kpiCallsGradient)" />
                  <Line yAxisId="right" type="monotone" dataKey="quality" name="Quality" stroke="hsl(142, 71%, 45%)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SentimentTab() {
  const { days } = useContext(DateRangeContext);

  const { data, isLoading: loading } = useQuery<any>({
    queryKey: ["/api/conversation-analytics", { tab: "sentiment", days }],
    queryFn: async () => {
      const res = await fetch(`/api/conversation-analytics?tab=sentiment&days=${days}`);
      if (!res.ok) return null;
      const d = await res.json();
      return d && !d.error ? d : null;
    },
  });

  if (loading) {
    return <div className="space-y-6"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">{[1, 2, 3, 4, 5].map((i) => <StatCardSkeleton key={i} />)}</div><ChartSkeleton /><ChartSkeleton /></div>;
  }

  if (!data) {
    return <div className="flex items-center justify-center py-16"><p className="text-sm text-muted-foreground" data-testid="text-sentiment-no-data">No data available</p></div>;
  }

  const SENTIMENT_CONFIG: Record<string, { color: string; textClass: string; bgClass: string }> = {
    very_negative: { color: "hsl(0, 84%, 60%)", textClass: "text-red-500", bgClass: "bg-red-500/10" },
    negative: { color: "hsl(25, 95%, 53%)", textClass: "text-orange-500", bgClass: "bg-orange-500/10" },
    neutral: { color: "hsl(220, 9%, 46%)", textClass: "text-muted-foreground", bgClass: "bg-muted" },
    positive: { color: "hsl(142, 71%, 45%)", textClass: "text-green-500", bgClass: "bg-green-500/10" },
    very_positive: { color: "hsl(160, 84%, 39%)", textClass: "text-emerald-500", bgClass: "bg-emerald-500/10" },
  };

  const { distribution, agentSentiment, negativeCalls, trend } = data;
  const totalDist = (distribution || []).reduce((s: number, d: any) => s + Number(d.count), 0);

  const trendData = (trend || []).map((t: any) => ({
    day: t.day?.substring(5) || "",
    score: Math.round(Number(t.avgScore) * 100) / 100,
    calls: Number(t.callCount),
  }));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {["very_negative", "negative", "neutral", "positive", "very_positive"].map((label) => {
          const item = (distribution || []).find((d: any) => d.label === label);
          const config = SENTIMENT_CONFIG[label] || SENTIMENT_CONFIG.neutral;
          const count = item ? Number(item.count) : 0;
          const pct = totalDist > 0 ? ((count / totalDist) * 100).toFixed(1) : "0.0";
          const IconC = label.includes("negative") ? Frown : label === "neutral" ? Meh : Smile;
          return (
            <Card key={label} className={config.bgClass}>
              <CardContent className="p-4 text-center">
                <IconC className={`h-6 w-6 mx-auto mb-2 ${config.textClass}`} />
                <p className="text-xs font-medium text-muted-foreground mb-1">{formatLabel(label)}</p>
                <p className={`text-xl font-bold ${config.textClass}`} data-testid={`text-ca-sentiment-${label}-count`}>{count}</p>
                <p className="text-xs text-muted-foreground">{pct}%</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
          <CardTitle className="text-base">Daily Sentiment Trend</CardTitle>
          <Badge variant="secondary" className="no-default-hover-elevate text-xs">{daysLabel(days)}</Badge>
        </CardHeader>
        <CardContent>
          {trendData.length === 0 ? (
            <div className="flex items-center justify-center h-[250px]"><p className="text-sm text-muted-foreground">No trend data</p></div>
          ) : (
            <div className="h-[250px] w-full" data-testid="chart-ca-sentiment-trend">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="day" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "hsl(var(--foreground))" }} />
                  <Line type="monotone" dataKey="score" stroke="hsl(142, 71%, 45%)" strokeWidth={2} dot={false} name="Avg Sentiment" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sentiment by Agent</CardTitle>
          </CardHeader>
          <CardContent>
            {(!agentSentiment || agentSentiment.length === 0) ? (
              <p className="text-sm text-muted-foreground">No agent data</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent</TableHead>
                    <TableHead className="text-right">Calls</TableHead>
                    <TableHead className="text-right">Avg Score</TableHead>
                    <TableHead className="text-right">Negative</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agentSentiment.map((a: any) => (
                    <TableRow key={a.agentId}>
                      <TableCell className="font-medium">{a.agentName}</TableCell>
                      <TableCell className="text-right">{a.callCount}</TableCell>
                      <TableCell className="text-right">
                        <span className={Number(a.avgSentiment) >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                          {Number(a.avgSentiment).toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {Number(a.negativeCalls) > 0 && (
                          <Badge variant="destructive" className="no-default-hover-elevate text-xs">{a.negativeCalls}</Badge>
                        )}
                        {Number(a.negativeCalls) === 0 && <span className="text-muted-foreground">0</span>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Frown className="h-4 w-4 text-red-500" /> Negative Call Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(!negativeCalls || negativeCalls.length === 0) ? (
              <p className="text-sm text-muted-foreground" data-testid="text-no-negative-alerts">No negative calls detected</p>
            ) : (
              <div className="space-y-3 max-h-[350px] overflow-y-auto" data-testid="list-negative-calls">
                {negativeCalls.slice(0, 10).map((call: any) => (
                  <div key={call.id} className="p-3 rounded-lg border bg-red-500/5 dark:bg-red-500/10">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{call.agentName}</span>
                      <Badge variant="destructive" className="no-default-hover-elevate text-xs">
                        {Number(call.sentimentScore).toFixed(2)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{call.summary || "No summary available"}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>{call.callerNumber || "Unknown"}</span>
                      <span>{call.duration ? formatDuration(call.duration) : "\u2014"}</span>
                      <span>{call.createdAt ? new Date(call.createdAt).toLocaleDateString() : ""}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function QualityTab() {
  const { days } = useContext(DateRangeContext);

  const { data, isLoading: loading } = useQuery<any>({
    queryKey: ["/api/conversation-analytics", { tab: "quality", days }],
    queryFn: async () => {
      const res = await fetch(`/api/conversation-analytics?tab=quality&days=${days}`);
      if (!res.ok) return null;
      const d = await res.json();
      return d && !d.error ? d : null;
    },
  });

  if (loading) {
    return <div className="space-y-6"><div className="grid gap-4 sm:grid-cols-2"><StatCardSkeleton /><StatCardSkeleton /></div><ChartSkeleton /><ChartSkeleton /></div>;
  }

  if (!data) {
    return <div className="flex items-center justify-center py-16"><p className="text-sm text-muted-foreground" data-testid="text-ca-quality-no-data">No data available</p></div>;
  }

  const { overall, breakdown, qualityDistribution, worstCalls, trend } = data;

  const QUALITY_RANGE_CONFIG: Record<string, { label: string; color: string; bgClass: string }> = {
    excellent: { label: "Excellent (80+)", color: "hsl(142, 71%, 45%)", bgClass: "bg-green-500" },
    good: { label: "Good (65-79)", color: "hsl(160, 84%, 39%)", bgClass: "bg-emerald-500" },
    average: { label: "Average (50-64)", color: "hsl(38, 92%, 50%)", bgClass: "bg-yellow-500" },
    below_average: { label: "Below Avg (35-49)", color: "hsl(25, 95%, 53%)", bgClass: "bg-orange-500" },
    poor: { label: "Poor (<35)", color: "hsl(0, 84%, 60%)", bgClass: "bg-red-500" },
  };

  const breakdownData = breakdown ? [
    { subject: "Greeting", value: breakdown.greeting ?? 0, fullMark: 10 },
    { subject: "Understanding", value: breakdown.understanding ?? 0, fullMark: 10 },
    { subject: "Accuracy", value: breakdown.accuracy ?? 0, fullMark: 10 },
    { subject: "Professionalism", value: breakdown.professionalism ?? 0, fullMark: 10 },
    { subject: "Resolution", value: breakdown.resolution ?? 0, fullMark: 10 },
    { subject: "Efficiency", value: breakdown.efficiency ?? 0, fullMark: 10 },
  ] : [];

  const totalQualDist = (qualityDistribution || []).reduce((s: number, q: any) => s + Number(q.count), 0);

  const trendData = (trend || []).map((t: any) => ({
    day: t.day?.substring(5) || "",
    score: Math.round(Number(t.avgScore) * 10) / 10,
    csat: Math.round(Number(t.avgCsat) * 10) / 10,
  }));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Avg Quality</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-ca-quality-avg">{overall.averageScore !== null ? `${overall.averageScore}/100` : "N/A"}</p>
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
                <p className="text-sm font-medium text-muted-foreground mb-1">Avg CSAT</p>
                <p className="text-2xl font-bold text-foreground" data-testid="text-ca-quality-csat">{overall.averageCsat !== null ? `${overall.averageCsat}/5` : "N/A"}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                <Star className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Total Calls</p>
                <p className="text-2xl font-bold text-foreground">{overall.totalCalls}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                <Phone className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Scored</p>
                <p className="text-2xl font-bold text-foreground">{overall.scoredCalls}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-violet-500/10 flex items-center justify-center shrink-0">
                <Activity className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quality Radar</CardTitle>
          </CardHeader>
          <CardContent>
            {breakdownData.length === 0 ? (
              <p className="text-sm text-muted-foreground">No breakdown data</p>
            ) : (
              <div className="h-[300px] w-full" data-testid="chart-ca-quality-radar">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={breakdownData}>
                    <PolarGrid className="stroke-border" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <PolarRadiusAxis domain={[0, 10]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }} />
                    <Radar name="Score" dataKey="value" stroke="hsl(221, 83%, 53%)" fill="hsl(221, 83%, 53%)" fillOpacity={0.3} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quality Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {totalQualDist === 0 ? (
              <p className="text-sm text-muted-foreground">No quality data</p>
            ) : (
              <div className="space-y-4" data-testid="chart-ca-quality-distribution">
                {["excellent", "good", "average", "below_average", "poor"].map((range) => {
                  const item = (qualityDistribution || []).find((q: any) => q.range === range);
                  const count = item ? Number(item.count) : 0;
                  const pct = totalQualDist > 0 ? (count / totalQualDist) * 100 : 0;
                  const config = QUALITY_RANGE_CONFIG[range];
                  return (
                    <div key={range}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">{config.label}</span>
                        <span className="font-medium">{count} ({pct.toFixed(1)}%)</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full ${config.bgClass} transition-all`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
          <CardTitle className="text-base">Quality & CSAT Trend</CardTitle>
          <Badge variant="secondary" className="no-default-hover-elevate text-xs">{daysLabel(days)}</Badge>
        </CardHeader>
        <CardContent>
          {trendData.length === 0 ? (
            <div className="flex items-center justify-center h-[250px]"><p className="text-sm text-muted-foreground">No trend data</p></div>
          ) : (
            <div className="h-[250px] w-full" data-testid="chart-ca-quality-trend">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="day" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="left" domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 5]} tick={{ fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "hsl(var(--foreground))" }} />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="score" name="Quality" stroke="hsl(142, 71%, 45%)" strokeWidth={2} dot={false} />
                  <Line yAxisId="right" type="monotone" dataKey="csat" name="CSAT" stroke="hsl(38, 92%, 50%)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-500" /> Lowest Quality Calls
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(!worstCalls || worstCalls.length === 0) ? (
            <p className="text-sm text-muted-foreground">No scored calls</p>
          ) : (
            <div className="overflow-x-auto" data-testid="table-worst-calls">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent</TableHead>
                    <TableHead>Caller</TableHead>
                    <TableHead className="text-right">Quality</TableHead>
                    <TableHead className="text-right">CSAT</TableHead>
                    <TableHead>Resolution</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {worstCalls.slice(0, 10).map((call: any) => (
                    <TableRow key={call.id}>
                      <TableCell className="font-medium">{call.agentName}</TableCell>
                      <TableCell className="text-muted-foreground">{call.callerNumber || "Unknown"}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={Number(call.qualityScore) < 35 ? "destructive" : "secondary"} className="no-default-hover-elevate">
                          {Number(call.qualityScore).toFixed(0)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{call.csatPrediction ? Number(call.csatPrediction).toFixed(1) : "\u2014"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="no-default-hover-elevate text-xs capitalize">{call.resolutionStatus || "unknown"}</Badge>
                      </TableCell>
                      <TableCell>{call.duration ? formatDuration(call.duration) : "\u2014"}</TableCell>
                      <TableCell className="text-muted-foreground">{call.createdAt ? new Date(call.createdAt).toLocaleDateString() : ""}</TableCell>
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

function ScorecardsTab() {
  const { days } = useContext(DateRangeContext);

  const { data, isLoading: loading } = useQuery<any>({
    queryKey: ["/api/conversation-analytics", { tab: "scorecards", days }],
    queryFn: async () => {
      const res = await fetch(`/api/conversation-analytics?tab=scorecards&days=${days}`);
      if (!res.ok) return null;
      const d = await res.json();
      return d && !d.error ? d : null;
    },
  });

  if (loading) {
    return <div className="space-y-6"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map((i) => <ChartSkeleton key={i} />)}</div></div>;
  }

  if (!data || !data.scorecards || data.scorecards.length === 0) {
    return <div className="flex items-center justify-center py-16"><p className="text-sm text-muted-foreground" data-testid="text-scorecards-no-data">No agent data available</p></div>;
  }

  const { scorecards } = data;

  const getRankBadge = (index: number) => {
    if (index === 0) return <Badge className="no-default-hover-elevate bg-amber-500 text-white"><Award className="h-3 w-3 mr-1" /> #1</Badge>;
    if (index === 1) return <Badge className="no-default-hover-elevate bg-slate-400 text-white"><Award className="h-3 w-3 mr-1" /> #2</Badge>;
    if (index === 2) return <Badge className="no-default-hover-elevate bg-orange-700 text-white"><Award className="h-3 w-3 mr-1" /> #3</Badge>;
    return <Badge variant="outline" className="no-default-hover-elevate">#{index + 1}</Badge>;
  };

  const getQualityColor = (score: number) => {
    if (score >= 80) return "text-green-600 dark:text-green-400";
    if (score >= 65) return "text-emerald-600 dark:text-emerald-400";
    if (score >= 50) return "text-yellow-600 dark:text-yellow-400";
    if (score >= 35) return "text-orange-600 dark:text-orange-400";
    return "text-red-600 dark:text-red-400";
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="grid-scorecards">
        {scorecards.map((agent: any, index: number) => (
          <Card key={agent.agentId} className={index === 0 ? "border-amber-500/50 shadow-sm" : ""}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                    {agent.agentName?.charAt(0) || "A"}
                  </div>
                  <div>
                    <CardTitle className="text-sm">{agent.agentName}</CardTitle>
                    <p className="text-xs text-muted-foreground">{agent.totalCalls} calls</p>
                  </div>
                </div>
                {getRankBadge(index)}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Quality</p>
                  <p className={`text-lg font-bold ${getQualityColor(agent.avgQualityScore)}`} data-testid={`text-scorecard-quality-${agent.agentId}`}>
                    {agent.avgQualityScore}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">CSAT</p>
                  <p className="text-lg font-bold text-foreground">{agent.avgCsatPrediction}/5</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Resolution</p>
                  <p className="text-lg font-bold text-foreground">{agent.resolutionRate}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Escalation</p>
                  <p className={`text-lg font-bold ${agent.escalationRate > 20 ? "text-red-600 dark:text-red-400" : "text-foreground"}`}>{agent.escalationRate}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Avg Handle</p>
                  <p className="text-sm font-medium text-foreground">{formatDuration(agent.avgHandleTime)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Sentiment</p>
                  <p className={`text-sm font-medium ${agent.avgSentimentScore >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                    {agent.avgSentimentScore}
                  </p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
                <span>{agent.leadsCaptured} leads</span>
                <span>{agent.avgTurns} avg turns</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Agent Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          {scorecards.length === 0 ? (
            <p className="text-sm text-muted-foreground">No agent data</p>
          ) : (
            <div className="h-[300px] w-full" data-testid="chart-agent-comparison">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scorecards.slice(0, 10)} margin={{ top: 5, right: 5, left: -10, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="agentName" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickLine={false} axisLine={false} angle={-25} textAnchor="end" />
                  <YAxis domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "hsl(var(--foreground))" }} />
                  <Legend />
                  <Bar dataKey="avgQualityScore" name="Quality" fill="hsl(221, 83%, 53%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="resolutionRate" name="Resolution %" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TopicsTab() {
  const { days } = useContext(DateRangeContext);

  const { data, isLoading: loading } = useQuery<any>({
    queryKey: ["/api/conversation-analytics", { tab: "topics", days }],
    queryFn: async () => {
      const res = await fetch(`/api/conversation-analytics?tab=topics&days=${days}`);
      if (!res.ok) return null;
      const d = await res.json();
      return d && !d.error ? d : null;
    },
  });

  if (loading) {
    return <div className="space-y-6"><ChartSkeleton /><ChartSkeleton /></div>;
  }

  if (!data) {
    return <div className="flex items-center justify-center py-16"><p className="text-sm text-muted-foreground" data-testid="text-topics-no-data">No data available</p></div>;
  }

  const { topics, topPhrases, alerts, totalCalls } = data;

  const SEVERITY_CONFIG: Record<string, { bgClass: string; textClass: string; icon: typeof AlertTriangle }> = {
    high: { bgClass: "bg-red-500/10 border-red-500/30", textClass: "text-red-600 dark:text-red-400", icon: AlertTriangle },
    medium: { bgClass: "bg-orange-500/10 border-orange-500/30", textClass: "text-orange-600 dark:text-orange-400", icon: AlertTriangle },
    low: { bgClass: "bg-yellow-500/10 border-yellow-500/30", textClass: "text-yellow-600 dark:text-yellow-400", icon: Bell },
  };

  const TOPIC_COLORS = [
    "hsl(221, 83%, 53%)", "hsl(142, 71%, 45%)", "hsl(38, 92%, 50%)",
    "hsl(262, 83%, 58%)", "hsl(0, 84%, 60%)", "hsl(160, 84%, 39%)",
    "hsl(25, 95%, 53%)", "hsl(330, 81%, 60%)",
  ];

  return (
    <div className="space-y-6">
      {alerts && alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4 text-amber-500" /> Active Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3" data-testid="list-alerts">
              {alerts.map((alert: any, i: number) => {
                const config = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.low;
                const Icon = config.icon;
                return (
                  <div key={i} className={`p-3 rounded-lg border ${config.bgClass}`}>
                    <div className="flex items-start gap-3">
                      <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${config.textClass}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-foreground">{alert.message}</p>
                          <Badge variant="outline" className={`no-default-hover-elevate text-xs ${config.textClass} capitalize`}>
                            {alert.severity}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="capitalize">{alert.type}</span>
                          {alert.timestamp && <span>{new Date(alert.timestamp).toLocaleDateString()}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Call Topics</CardTitle>
          </CardHeader>
          <CardContent>
            {(!topics || topics.length === 0) ? (
              <p className="text-sm text-muted-foreground" data-testid="text-no-topics">No topics detected</p>
            ) : (
              <div className="space-y-4" data-testid="list-topics">
                {topics.map((topic: any, i: number) => (
                  <div key={topic.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-foreground">{topic.name}</span>
                      <span className="text-muted-foreground">{topic.count} ({topic.percentage}%)</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${topic.percentage}%`, backgroundColor: TOPIC_COLORS[i % TOPIC_COLORS.length] }}
                      />
                    </div>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground pt-2">Based on {totalCalls} calls analyzed</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Tag className="h-4 w-4 text-blue-500" /> Common Tags & Phrases
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(!topPhrases || topPhrases.length === 0) ? (
              <p className="text-sm text-muted-foreground" data-testid="text-no-phrases">No tags detected</p>
            ) : (
              <div className="flex flex-wrap gap-2" data-testid="list-phrases">
                {topPhrases.map((phrase: any) => (
                  <Badge key={phrase.phrase} variant="secondary" className="no-default-hover-elevate text-xs px-2.5 py-1">
                    {phrase.phrase}
                    <span className="ml-1.5 text-muted-foreground">({phrase.count})</span>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Topic Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          {(!topics || topics.length === 0) ? (
            <p className="text-sm text-muted-foreground">No topics to chart</p>
          ) : (
            <div className="h-[280px] w-full" data-testid="chart-topic-distribution">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topics} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                  <YAxis dataKey="name" type="category" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickLine={false} axisLine={false} width={75} />
                  <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "hsl(var(--foreground))" }} />
                  <Bar dataKey="count" name="Calls" radius={[0, 4, 4, 0]}>
                    {topics.map((_: any, i: number) => (
                      <Cell key={i} fill={TOPIC_COLORS[i % TOPIC_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ConversationAnalyticsPage() {
  const [days, setDays] = useState(30);

  return (
    <DateRangeContext.Provider value={{ days }}>
      <div className="p-6 max-w-[1400px] mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-foreground" data-testid="text-page-title">Conversation Analytics</h1>
            <p className="text-sm text-muted-foreground mt-1">Deep insights into call performance, sentiment, and trends</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="no-default-hover-elevate text-xs">Enterprise</Badge>
            <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
              <SelectTrigger className="w-[150px] h-9" data-testid="select-date-range">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="14">Last 14 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="60">Last 60 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="180">Last 6 months</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs defaultValue="kpis" className="space-y-0">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="kpis" data-testid="tab-ca-kpis">KPIs</TabsTrigger>
            <TabsTrigger value="sentiment" data-testid="tab-ca-sentiment">Sentiment</TabsTrigger>
            <TabsTrigger value="quality" data-testid="tab-ca-quality">Quality</TabsTrigger>
            <TabsTrigger value="scorecards" data-testid="tab-ca-scorecards">Scorecards</TabsTrigger>
            <TabsTrigger value="topics" data-testid="tab-ca-topics">Topics & Alerts</TabsTrigger>
          </TabsList>
          <TabsContent value="kpis" className="mt-6"><KPIsTab /></TabsContent>
          <TabsContent value="sentiment" className="mt-6"><SentimentTab /></TabsContent>
          <TabsContent value="quality" className="mt-6"><QualityTab /></TabsContent>
          <TabsContent value="scorecards" className="mt-6"><ScorecardsTab /></TabsContent>
          <TabsContent value="topics" className="mt-6"><TopicsTab /></TabsContent>
        </Tabs>
      </div>
    </DateRangeContext.Provider>
  );
}
