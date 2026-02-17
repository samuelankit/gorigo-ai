"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  GitBranch,
  ArrowDown,
  LogIn,
  LogOut,
  ArrowRightLeft,
  AlertTriangle,
  Globe,
  Search,
  TrendingDown,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const CHART_COLORS = {
  primary: "hsl(262, 83%, 58%)",
  secondary: "hsl(217, 91%, 60%)",
  success: "hsl(142, 71%, 45%)",
  warning: "hsl(38, 92%, 50%)",
  danger: "hsl(0, 84%, 60%)",
  info: "hsl(199, 89%, 48%)",
};

const PIE_COLORS = [
  "hsl(262, 83%, 58%)",
  "hsl(217, 91%, 60%)",
  "hsl(142, 71%, 45%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 84%, 60%)",
  "hsl(199, 89%, 48%)",
];

const TOOLTIP_STYLE = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "6px",
  fontSize: "12px",
};

const FUNNEL_COLORS = [
  "hsl(262, 83%, 48%)",
  "hsl(262, 78%, 53%)",
  "hsl(262, 73%, 58%)",
  "hsl(262, 68%, 63%)",
  "hsl(262, 63%, 68%)",
  "hsl(262, 58%, 73%)",
];

const FUNNEL_STAGES = [
  { label: "Landing Page", paths: ["/", "/home"] },
  { label: "Pricing", paths: ["/pricing"] },
  { label: "Features", paths: ["/features", "/capabilities"] },
  { label: "Register", paths: ["/register"] },
  { label: "Onboarding", paths: ["/onboarding"] },
  { label: "Dashboard", paths: ["/dashboard"] },
];

const PERIODS = ["7d", "30d", "90d"] as const;

const formatNumber = (n: number) => new Intl.NumberFormat().format(n);
const formatPercent = (n: number) => `${Math.round(n)}%`;

const fetchData = async (period: string, metric: string) => {
  const res = await fetch(`/api/analytics/data?period=${period}&metric=${metric}`);
  if (!res.ok) return null;
  return res.json();
};

const bounceColor = (rate: number) => {
  if (rate < 30) return CHART_COLORS.success;
  if (rate <= 50) return CHART_COLORS.warning;
  return CHART_COLORS.danger;
};

const bounceTextClass = (rate: number) => {
  if (rate < 30) return "text-green-600 dark:text-green-400";
  if (rate <= 50) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
};

const categorizeSource = (source: string): string => {
  const s = source.toLowerCase();
  if (s === "direct" || s === "(direct)" || s === "") return "Direct";
  if (s.includes("google") || s.includes("bing") || s.includes("yahoo") || s.includes("duckduckgo")) return "Search";
  if (s.includes("facebook") || s.includes("twitter") || s.includes("linkedin") || s.includes("instagram") || s.includes("tiktok") || s.includes("reddit") || s.includes("youtube")) return "Social";
  return "Referral";
};

interface JourneysData {
  entryPages: { entry_page: string; sessions: number }[];
  exitPages: { exit_page: string; sessions: number }[];
  bounceByPage: { entry_page: string; total_sessions: number; bounce_rate: number }[];
  pageFlows: { from_page: string; to_page: string; transitions: number }[];
}

interface PageRow {
  page: string;
  pageviews: number;
  unique_visitors: number;
  avg_time_on_page: number;
  avg_scroll_depth: number;
}

interface SourcesData {
  referrers: { source: string; visits: number; unique_visitors: number }[];
  utmCampaigns: { utm_source: string; utm_medium: string; utm_campaign: string; visits: number; unique_visitors: number }[];
}

export default function JourneysPage() {
  const [period, setPeriod] = useState<string>("7d");
  const [loading, setLoading] = useState(true);
  const [journeys, setJourneys] = useState<JourneysData | null>(null);
  const [pages, setPages] = useState<PageRow[]>([]);
  const [sources, setSources] = useState<SourcesData | null>(null);

  const loadData = useCallback(async (p: string) => {
    setLoading(true);
    try {
      const [journeysRes, pagesRes, sourcesRes] = await Promise.all([
        fetchData(p, "journeys"),
        fetchData(p, "pages"),
        fetchData(p, "sources"),
      ]);
      setJourneys(journeysRes?.data || null);
      setPages(Array.isArray(pagesRes?.data) ? pagesRes.data : []);
      setSources(sourcesRes?.data || null);
    } catch {
      setJourneys(null);
      setPages([]);
      setSources(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(period);
  }, [period, loadData]);

  const funnelData = FUNNEL_STAGES.map((stage) => {
    const matchingPages = pages.filter((p) =>
      stage.paths.some((path) => p.page === path || p.page.startsWith(path + "/") || (path === "/" && p.page === "/"))
    );
    const visitors = matchingPages.reduce((sum, p) => sum + Number(p.unique_visitors || 0), 0);
    return { ...stage, visitors };
  });

  const maxFunnelVisitors = Math.max(...funnelData.map((s) => s.visitors), 1);

  const entryPages = journeys?.entryPages || [];
  const exitPages = journeys?.exitPages || [];
  const maxEntrySessions = Math.max(...entryPages.map((e) => Number(e.sessions)), 1);
  const maxExitSessions = Math.max(...exitPages.map((e) => Number(e.sessions)), 1);

  const bounceData = (journeys?.bounceByPage || [])
    .map((b) => ({
      page: b.entry_page,
      bounceRate: Number(b.bounce_rate),
      sessions: Number(b.total_sessions),
    }))
    .sort((a, b) => b.bounceRate - a.bounceRate);

  const pageFlows = journeys?.pageFlows || [];

  const sourceCategories = sources?.referrers
    ? (() => {
        const cats: Record<string, number> = {};
        sources.referrers.forEach((r) => {
          const cat = categorizeSource(r.source);
          cats[cat] = (cats[cat] || 0) + Number(r.visits);
        });
        return Object.entries(cats).map(([name, value]) => ({ name, value }));
      })()
    : [];

  const totalSourceVisits = sourceCategories.reduce((s, c) => s + c.value, 0);

  const searchKeywords = sources?.utmCampaigns
    ? sources.utmCampaigns
        .filter((c) => c.utm_medium?.toLowerCase() === "organic" || c.utm_medium?.toLowerCase() === "cpc")
        .map((c) => ({
          keyword: c.utm_campaign || "(not provided)",
          visitors: Number(c.visits),
          source: c.utm_source || "unknown",
        }))
    : [];

  const hasNoData = !journeys && pages.length === 0 && !sources;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center gap-1 mb-2" data-testid="nav-sub-navigation">
        <Link href="/admin/web-traffic">
          <Button variant="outline" size="sm" data-testid="link-overview">
            Overview
          </Button>
        </Link>
        <Button variant="default" size="sm" className="toggle-elevate toggle-elevated" data-testid="link-journeys-active">
          Journeys & Funnels
        </Button>
        <Link href="/admin/web-traffic/insights">
          <Button variant="outline" size="sm" data-testid="link-insights">
            AI Insights
          </Button>
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-500/10">
            <GitBranch className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground" data-testid="text-journeys-title">
              User Journeys & Funnels
            </h1>
            <p className="text-sm text-muted-foreground">Analyse conversion funnels, page flows, and drop-off points.</p>
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

      {!loading && hasNoData ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Search className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-foreground mb-1" data-testid="text-no-data">No journey data yet</p>
            <p className="text-sm text-muted-foreground">Start tracking to see funnel and journey data here.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card data-testid="card-conversion-funnel">
            <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">Conversion Funnel</CardTitle>
              </div>
              <Badge variant="secondary" className="no-default-hover-elevate text-xs">{period}</Badge>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {funnelData.map((stage, i) => {
                    const widthPct = maxFunnelVisitors > 0 ? Math.max((stage.visitors / maxFunnelVisitors) * 100, 4) : 4;
                    const prevVisitors = i > 0 ? funnelData[i - 1].visitors : stage.visitors;
                    const dropOff = prevVisitors > 0 && i > 0 ? Math.round(((prevVisitors - stage.visitors) / prevVisitors) * 100) : 0;
                    const isZero = stage.visitors === 0;

                    return (
                      <div key={stage.label} className="flex items-center gap-3" data-testid={`funnel-stage-${i}`}>
                        <div className="w-28 text-sm text-foreground font-medium shrink-0 truncate">
                          {stage.label}
                        </div>
                        <div className="flex-1 relative">
                          <div
                            className="h-9 rounded-md flex items-center px-3 transition-all"
                            style={{
                              width: `${widthPct}%`,
                              backgroundColor: isZero ? "hsl(var(--muted))" : FUNNEL_COLORS[i],
                              opacity: isZero ? 0.5 : 1,
                            }}
                          >
                            <span className="text-xs font-semibold text-white whitespace-nowrap" data-testid={`funnel-visitors-${i}`}>
                              {isZero ? "0" : formatNumber(stage.visitors)}
                            </span>
                          </div>
                        </div>
                        {i > 0 && (
                          <div className="w-20 text-right shrink-0">
                            <span className={`text-xs font-medium ${dropOff > 60 ? "text-red-600 dark:text-red-400" : dropOff > 30 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`} data-testid={`funnel-dropoff-${i}`}>
                              {dropOff > 0 ? `-${dropOff}%` : "0%"}
                            </span>
                          </div>
                        )}
                        {i === 0 && <div className="w-20 shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card data-testid="card-entry-pages">
              <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
                <div className="flex items-center gap-2">
                  <LogIn className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">Top Entry Pages</CardTitle>
                </div>
                <Badge variant="secondary" className="no-default-hover-elevate text-xs">{entryPages.length} pages</Badge>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-8 w-full" />
                    ))}
                  </div>
                ) : entryPages.length > 0 ? (
                  <div className="space-y-2">
                    {entryPages.slice(0, 10).map((entry, i) => {
                      const pct = (Number(entry.sessions) / maxEntrySessions) * 100;
                      return (
                        <div key={i} className="flex items-center gap-3" data-testid={`entry-page-${i}`}>
                          <span className="text-xs font-mono text-foreground truncate w-40 shrink-0">{entry.entry_page || "/"}</span>
                          <div className="flex-1 h-5 rounded-md bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-md"
                              style={{ width: `${pct}%`, backgroundColor: CHART_COLORS.primary }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-16 text-right shrink-0">{formatNumber(Number(entry.sessions))}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">No entry page data yet.</div>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-exit-pages">
              <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
                <div className="flex items-center gap-2">
                  <LogOut className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">Top Exit Pages</CardTitle>
                </div>
                <Badge variant="secondary" className="no-default-hover-elevate text-xs">{exitPages.length} pages</Badge>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-8 w-full" />
                    ))}
                  </div>
                ) : exitPages.length > 0 ? (
                  <div className="space-y-2">
                    {exitPages.slice(0, 10).map((exit, i) => {
                      const pct = (Number(exit.sessions) / maxExitSessions) * 100;
                      const isHighBounce = pct > 60;
                      return (
                        <div key={i} className="flex items-center gap-3" data-testid={`exit-page-${i}`}>
                          <span className={`text-xs font-mono truncate w-40 shrink-0 ${isHighBounce ? "text-amber-600 dark:text-amber-400" : "text-foreground"}`}>{exit.exit_page || "/"}</span>
                          <div className="flex-1 h-5 rounded-md bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-md"
                              style={{ width: `${pct}%`, backgroundColor: isHighBounce ? CHART_COLORS.warning : CHART_COLORS.danger }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-16 text-right shrink-0">{formatNumber(Number(exit.sessions))}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">No exit page data yet.</div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card data-testid="card-page-transitions">
            <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">Page Transitions</CardTitle>
              </div>
              <Badge variant="secondary" className="no-default-hover-elevate text-xs">Top {pageFlows.length}</Badge>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : pageFlows.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 pr-4 font-medium text-muted-foreground">From Page</th>
                        <th className="text-center py-2 px-4 font-medium text-muted-foreground" />
                        <th className="text-left py-2 px-4 font-medium text-muted-foreground">To Page</th>
                        <th className="text-right py-2 pl-4 font-medium text-muted-foreground">Transitions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageFlows.map((flow, i) => (
                        <tr key={i} className="border-b last:border-0" data-testid={`flow-row-${i}`}>
                          <td className="py-2 pr-4 text-foreground font-mono text-xs truncate max-w-[200px]">{flow.from_page}</td>
                          <td className="py-2 px-4 text-center">
                            <ArrowRightLeft className="h-3 w-3 text-muted-foreground inline-block" />
                          </td>
                          <td className="py-2 px-4 text-foreground font-mono text-xs truncate max-w-[200px]">{flow.to_page}</td>
                          <td className="py-2 pl-4 text-right">
                            <Badge variant="secondary" className="no-default-hover-elevate text-xs">{formatNumber(Number(flow.transitions))}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">No page flow data yet.</div>
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-bounce-rate">
            <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">Bounce Rate by Page</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-72 w-full" />
              ) : bounceData.length > 0 ? (
                <ResponsiveContainer width="100%" height={Math.max(bounceData.length * 36, 200)}>
                  <BarChart data={bounceData.slice(0, 15)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 16%, 47%, 0.15)" />
                    <XAxis type="number" fontSize={12} stroke="hsl(215, 16%, 47%)" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                    <YAxis dataKey="page" type="category" fontSize={11} stroke="hsl(215, 16%, 47%)" width={120} tick={{ fill: "hsl(215, 16%, 47%)" }} />
                    <Tooltip
                      contentStyle={TOOLTIP_STYLE}
                      formatter={(value: number) => [`${value}%`, "Bounce Rate"]}
                      labelFormatter={(label) => `Page: ${label}`}
                    />
                    <Bar dataKey="bounceRate" name="Bounce Rate" radius={[0, 4, 4, 0]}>
                      {bounceData.slice(0, 15).map((entry, index) => (
                        <Cell key={`bounce-${index}`} fill={bounceColor(entry.bounceRate)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">No bounce rate data yet.</div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card data-testid="card-traffic-sources">
              <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">Traffic Sources</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-64 w-full" />
                ) : sourceCategories.length > 0 ? (
                  <div className="flex flex-col gap-4">
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={sourceCategories}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={85}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {sourceCategories.map((_, index) => (
                            <Cell key={`cat-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={TOOLTIP_STYLE} />
                        <Legend wrapperStyle={{ fontSize: "12px" }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2">
                      {sourceCategories.map((cat, i) => (
                        <div key={cat.name} className="flex items-center justify-between gap-2" data-testid={`source-cat-${i}`}>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                            <span className="text-sm text-foreground">{cat.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">{formatNumber(cat.value)}</span>
                            <span className="text-xs text-muted-foreground w-10 text-right">
                              {totalSourceVisits > 0 ? formatPercent((cat.value / totalSourceVisits) * 100) : "0%"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">No source data yet.</div>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-search-keywords">
              <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">Search Keywords</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-8 w-full" />
                    ))}
                  </div>
                ) : searchKeywords.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Keyword</th>
                          <th className="text-right py-2 px-4 font-medium text-muted-foreground">Visitors</th>
                          <th className="text-right py-2 pl-4 font-medium text-muted-foreground">Source</th>
                        </tr>
                      </thead>
                      <tbody>
                        {searchKeywords.slice(0, 15).map((kw, i) => (
                          <tr key={i} className="border-b last:border-0" data-testid={`keyword-row-${i}`}>
                            <td className="py-2 pr-4 text-foreground text-xs">
                              {kw.keyword === "(not provided)" ? (
                                <span className="italic text-muted-foreground">(not provided)</span>
                              ) : (
                                kw.keyword
                              )}
                            </td>
                            <td className="py-2 px-4 text-right text-foreground text-xs">{formatNumber(kw.visitors)}</td>
                            <td className="py-2 pl-4 text-right text-muted-foreground text-xs">{kw.source}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">No keyword data yet.</div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card data-testid="card-dropoff-analysis">
            <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
              <div className="flex items-center gap-2">
                <ArrowDown className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">Drop-off Analysis</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-1">
                  {funnelData.map((stage, i) => {
                    const nextVisitors = i < funnelData.length - 1 ? funnelData[i + 1].visitors : stage.visitors;
                    const dropOff = stage.visitors > 0 ? Math.round(((stage.visitors - nextVisitors) / stage.visitors) * 100) : 0;
                    const needsAttention = dropOff > 60;
                    const isLast = i === funnelData.length - 1;

                    return (
                      <div key={stage.label} data-testid={`dropoff-stage-${i}`}>
                        <div className="flex items-center justify-between gap-4 py-3">
                          <div className="flex items-center gap-3 flex-1">
                            <div
                              className="w-8 h-8 rounded-md flex items-center justify-center text-white text-xs font-bold shrink-0"
                              style={{ backgroundColor: FUNNEL_COLORS[i] }}
                            >
                              {i + 1}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground">{stage.label}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatNumber(stage.visitors)} visitors
                              </p>
                            </div>
                          </div>
                          {!isLast && (
                            <div className="flex items-center gap-2 shrink-0">
                              <div className="text-right">
                                <p className="text-xs text-muted-foreground">
                                  {formatNumber(nextVisitors)} continued
                                </p>
                                <p className={`text-sm font-semibold ${needsAttention ? "text-red-600 dark:text-red-400" : dropOff > 30 ? "text-amber-600 dark:text-amber-400" : "text-green-600 dark:text-green-400"}`}>
                                  {dropOff > 0 ? `-${dropOff}%` : "0%"} drop-off
                                </p>
                              </div>
                              <ArrowDown className={`h-4 w-4 shrink-0 ${needsAttention ? "text-red-500" : "text-muted-foreground"}`} />
                            </div>
                          )}
                          {isLast && (
                            <Badge variant="default" className="no-default-hover-elevate text-xs shrink-0">Converted</Badge>
                          )}
                        </div>
                        {needsAttention && !isLast && (
                          <div className="flex items-center gap-2 ml-11 mb-2 px-3 py-1.5 rounded-md bg-red-500/10" data-testid={`dropoff-warning-${i}`}>
                            <AlertTriangle className="h-3 w-3 text-red-500 shrink-0" />
                            <span className="text-xs text-red-600 dark:text-red-400">High drop-off — this stage needs attention</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <div className="mt-4 px-3 py-2 rounded-md bg-muted/50">
                    <p className="text-xs text-muted-foreground">Pages with &gt;60% drop-off need attention. Consider improving page content, load speed, or calls to action at those stages.</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
