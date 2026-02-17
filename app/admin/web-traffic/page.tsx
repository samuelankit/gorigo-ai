"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Eye,
  Users,
  Activity,
  TrendingDown,
  Clock,
  Layers,
  Globe,
  Monitor,
  BarChart3,
  Search,
  Megaphone,
} from "lucide-react";
import {
  AreaChart,
  Area,
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

import { CHART_COLORS, PIE_COLORS, TOOLTIP_STYLE, PERIODS, formatNumber, formatPercent, fetchAnalyticsData as fetchData } from "@/lib/analytics-shared";

const formatDuration = (seconds: number) => {
  if (!seconds) return "0s";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
};

interface OverviewData {
  total_pageviews: number;
  unique_visitors: number;
  unique_sessions: number;
  bounce_rate: number;
  avg_session_duration: number;
  avg_pages_per_session: number;
}

interface PageData {
  page: string;
  pageviews: number;
  unique_visitors: number;
  avg_time_on_page: number;
  avg_scroll_depth: number;
}

interface SourceData {
  referrers: { source: string; visits: number; unique_visitors: number }[];
  utmCampaigns: { utm_source: string; utm_medium: string; utm_campaign: string; visits: number; unique_visitors: number }[];
}

interface DeviceData {
  deviceTypes: { device_type: string; visitors: number }[];
  browsers: { browser: string; visitors: number }[];
  operatingSystems: { os: string; visitors: number }[];
  screenSizes: { resolution: string; visitors: number }[];
}

interface LocationData {
  countries: { country: string; visitors: number }[];
  cities: { city: string; country: string; visitors: number }[];
}

export default function WebTrafficPage() {
  const [period, setPeriod] = useState<string>("7d");
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [pages, setPages] = useState<PageData[]>([]);
  const [timeseries, setTimeseries] = useState<{ day: string; pageviews: number; visitors: number; sessions: number }[]>([]);
  const [sources, setSources] = useState<SourceData | null>(null);
  const [devices, setDevices] = useState<DeviceData | null>(null);
  const [locations, setLocations] = useState<LocationData | null>(null);

  const loadData = useCallback(async (p: string) => {
    setLoading(true);
    try {
      const [overviewRes, pagesRes, timeseriesRes, sourcesRes, devicesRes, locationsRes] = await Promise.all([
        fetchData(p, "overview"),
        fetchData(p, "pages"),
        fetchData(p, "timeseries"),
        fetchData(p, "sources"),
        fetchData(p, "devices"),
        fetchData(p, "locations"),
      ]);
      setOverview(overviewRes?.data || null);
      setPages(Array.isArray(pagesRes?.data) ? pagesRes.data : []);
      setTimeseries(Array.isArray(timeseriesRes?.data) ? timeseriesRes.data.map((r: any) => ({
        day: r.day ? new Date(r.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '',
        pageviews: Number(r.pageviews || 0),
        visitors: Number(r.visitors || 0),
        sessions: Number(r.sessions || 0),
      })) : []);
      setSources(sourcesRes?.data || null);
      setDevices(devicesRes?.data || null);
      setLocations(locationsRes?.data || null);
    } catch {
      setOverview(null);
      setPages([]);
      setTimeseries([]);
      setSources(null);
      setDevices(null);
      setLocations(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(period);
  }, [period, loadData]);

  const bounceColor = (rate: number) => {
    if (rate < 40) return "text-green-600 dark:text-green-400";
    if (rate <= 60) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  const engagementScore = (scrollDepth: number, timeOnPage: number) => {
    return Math.round((scrollDepth / 100 * 0.4 + Math.min(timeOnPage / 120, 1) * 0.6) * 100);
  };

  const engagementColor = (score: number) => {
    if (score >= 70) return "default" as const;
    if (score >= 40) return "secondary" as const;
    return "destructive" as const;
  };

  const topPages = pages.slice(0, 20);

  const pieData = sources?.referrers
    ? sources.referrers.map((r) => ({ name: r.source, value: Number(r.visits) }))
    : [];

  const deviceData = devices?.deviceTypes
    ? (() => {
        const total = devices.deviceTypes.reduce((s, d) => s + Number(d.visitors), 0);
        return devices.deviceTypes.map((d) => ({
          name: d.device_type || "Unknown",
          visitors: Number(d.visitors),
          percent: total > 0 ? Math.round((Number(d.visitors) / total) * 100) : 0,
        }));
      })()
    : [];

  const browserData = devices?.browsers
    ? devices.browsers.map((b) => ({ name: b.browser, visitors: Number(b.visitors) }))
    : [];

  const locationRows = locations?.cities
    ? locations.cities.slice(0, 15)
    : [];

  const utmData = sources?.utmCampaigns?.filter((c) => c.utm_campaign) || [];

  const hasNoData = !overview && pages.length === 0 && timeseries.length === 0 && !sources && !devices && !locations;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center gap-1 mb-2" data-testid="nav-sub-navigation">
        <Button variant="default" size="sm" className="toggle-elevate toggle-elevated" data-testid="link-overview-active">
          Overview
        </Button>
        <Link href="/admin/web-traffic/journeys">
          <Button variant="outline" size="sm" data-testid="link-journeys">
            Journeys & Funnels
          </Button>
        </Link>
        <Link href="/admin/web-traffic/insights">
          <Button variant="outline" size="sm" data-testid="link-insights">
            AI Insights
          </Button>
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-500/10">
            <Globe className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground" data-testid="text-web-traffic-title">
              Web Traffic Intelligence
            </h1>
            <p className="text-sm text-muted-foreground">Analyse website visitor behaviour and traffic patterns.</p>
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Total Pageviews</p>
            </div>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <p className="text-2xl font-bold text-foreground" data-testid="stat-total-pageviews">
                {formatNumber(Number(overview?.total_pageviews || 0))}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Unique Visitors</p>
            </div>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <p className="text-2xl font-bold text-foreground" data-testid="stat-unique-visitors">
                {formatNumber(Number(overview?.unique_visitors || 0))}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Sessions</p>
            </div>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <p className="text-2xl font-bold text-foreground" data-testid="stat-sessions">
                {formatNumber(Number(overview?.unique_sessions || 0))}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Bounce Rate</p>
            </div>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <p className={`text-2xl font-bold ${bounceColor(Number(overview?.bounce_rate || 0))}`} data-testid="stat-bounce-rate">
                {formatPercent(Number(overview?.bounce_rate || 0))}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Avg Duration</p>
            </div>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <p className="text-2xl font-bold text-foreground" data-testid="stat-avg-duration">
                {formatDuration(Number(overview?.avg_session_duration || 0))}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <Layers className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Pages/Session</p>
            </div>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <p className="text-2xl font-bold text-foreground" data-testid="stat-pages-per-session">
                {Number(overview?.avg_pages_per_session || 0).toFixed(1)}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {!loading && hasNoData ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Search className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-foreground mb-1" data-testid="text-no-data">No data yet</p>
            <p className="text-sm text-muted-foreground">Start tracking to see data here</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card data-testid="chart-traffic-over-time">
            <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">Traffic Over Time</CardTitle>
              </div>
              <Badge variant="secondary" className="no-default-hover-elevate text-xs">{period}</Badge>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-72 w-full" />
              ) : timeseries.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={timeseries}>
                    <defs>
                      <linearGradient id="trafficGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="visitorsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_COLORS.secondary} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={CHART_COLORS.secondary} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 16%, 47%, 0.15)" />
                    <XAxis dataKey="day" fontSize={11} stroke="hsl(215, 16%, 47%)" />
                    <YAxis fontSize={12} stroke="hsl(215, 16%, 47%)" />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Area type="monotone" dataKey="pageviews" name="Pageviews" stroke={CHART_COLORS.primary} fill="url(#trafficGrad)" strokeWidth={2} />
                    <Area type="monotone" dataKey="visitors" name="Visitors" stroke={CHART_COLORS.secondary} fill="url(#visitorsGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-72 text-sm text-muted-foreground">No traffic data yet.</div>
              )}
            </CardContent>
          </Card>

          <Card data-testid="table-top-pages">
            <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">Top Pages</CardTitle>
              </div>
              <Badge variant="secondary" className="no-default-hover-elevate text-xs">{topPages.length} pages</Badge>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : topPages.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Page Path</th>
                        <th className="text-right py-2 px-4 font-medium text-muted-foreground">Views</th>
                        <th className="text-right py-2 px-4 font-medium text-muted-foreground">Visitors</th>
                        <th className="text-right py-2 px-4 font-medium text-muted-foreground">Avg Time</th>
                        <th className="py-2 px-4 font-medium text-muted-foreground">Scroll Depth</th>
                        <th className="text-right py-2 pl-4 font-medium text-muted-foreground">Engagement</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topPages.map((page, i) => {
                        const score = engagementScore(Number(page.avg_scroll_depth || 0), Number(page.avg_time_on_page || 0));
                        return (
                          <tr key={i} className="border-b last:border-0" data-testid={`row-page-${i}`}>
                            <td className="py-2 pr-4 text-foreground font-mono text-xs truncate max-w-[200px]" data-testid={`text-page-path-${i}`}>
                              {page.page}
                            </td>
                            <td className="text-right py-2 px-4 text-foreground" data-testid={`text-page-views-${i}`}>
                              {formatNumber(Number(page.pageviews))}
                            </td>
                            <td className="text-right py-2 px-4 text-muted-foreground" data-testid={`text-page-visitors-${i}`}>
                              {formatNumber(Number(page.unique_visitors))}
                            </td>
                            <td className="text-right py-2 px-4 text-muted-foreground" data-testid={`text-page-time-${i}`}>
                              {formatDuration(Number(page.avg_time_on_page || 0))}
                            </td>
                            <td className="py-2 px-4">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                                  <div
                                    className="h-full rounded-full"
                                    style={{
                                      width: `${Math.min(Number(page.avg_scroll_depth || 0), 100)}%`,
                                      backgroundColor: CHART_COLORS.primary,
                                    }}
                                    data-testid={`progress-scroll-${i}`}
                                  />
                                </div>
                                <span className="text-xs text-muted-foreground w-9 text-right">
                                  {formatPercent(Number(page.avg_scroll_depth || 0))}
                                </span>
                              </div>
                            </td>
                            <td className="text-right py-2 pl-4">
                              <Badge variant={engagementColor(score)} className="no-default-hover-elevate text-xs" data-testid={`badge-engagement-${i}`}>
                                {score}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">No page data yet.</div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card data-testid="chart-traffic-sources">
              <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">Traffic Sources</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-64 w-full" />
                ) : pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={pieData.slice(0, 6)}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={95}
                        paddingAngle={3}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {pieData.slice(0, 6).map((_, index) => (
                          <Cell key={`src-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <Legend wrapperStyle={{ fontSize: "12px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">No source data yet.</div>
                )}
              </CardContent>
            </Card>

            <Card data-testid="chart-device-breakdown">
              <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
                <div className="flex items-center gap-2">
                  <Monitor className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">Device Breakdown</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-64 w-full" />
                ) : deviceData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={deviceData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 16%, 47%, 0.15)" />
                      <XAxis type="number" fontSize={12} stroke="hsl(215, 16%, 47%)" tickFormatter={(v) => `${v}%`} />
                      <YAxis dataKey="name" type="category" fontSize={12} stroke="hsl(215, 16%, 47%)" width={80} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value: number) => [`${value}%`, "Share"]} />
                      <Bar dataKey="percent" name="Share" fill={CHART_COLORS.secondary} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">No device data yet.</div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card data-testid="chart-browser-distribution">
              <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
                <div className="flex items-center gap-2">
                  <Monitor className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">Browser Distribution</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-64 w-full" />
                ) : browserData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={browserData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 16%, 47%, 0.15)" />
                      <XAxis type="number" fontSize={12} stroke="hsl(215, 16%, 47%)" />
                      <YAxis dataKey="name" type="category" fontSize={12} stroke="hsl(215, 16%, 47%)" width={80} />
                      <Tooltip contentStyle={TOOLTIP_STYLE} />
                      <Bar dataKey="visitors" name="Visitors" fill={CHART_COLORS.success} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">No browser data yet.</div>
                )}
              </CardContent>
            </Card>

            <Card data-testid="table-top-locations">
              <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">Top Locations</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-8 w-full" />
                    ))}
                  </div>
                ) : locationRows.length > 0 ? (
                  <div className="overflow-x-auto max-h-[280px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Country</th>
                          <th className="text-left py-2 px-4 font-medium text-muted-foreground">City</th>
                          <th className="text-right py-2 pl-4 font-medium text-muted-foreground">Visitors</th>
                        </tr>
                      </thead>
                      <tbody>
                        {locationRows.map((loc, i) => (
                          <tr key={i} className="border-b last:border-0" data-testid={`row-location-${i}`}>
                            <td className="py-2 pr-4 text-foreground" data-testid={`text-location-country-${i}`}>
                              {loc.country}
                            </td>
                            <td className="py-2 px-4 text-muted-foreground" data-testid={`text-location-city-${i}`}>
                              {loc.city}
                            </td>
                            <td className="text-right py-2 pl-4 text-foreground" data-testid={`text-location-visitors-${i}`}>
                              {formatNumber(Number(loc.visitors))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">No location data yet.</div>
                )}
              </CardContent>
            </Card>
          </div>

          {utmData.length > 0 && (
            <Card data-testid="table-utm-campaigns">
              <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
                <div className="flex items-center gap-2">
                  <Megaphone className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">UTM Campaign Performance</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Campaign</th>
                        <th className="text-left py-2 px-4 font-medium text-muted-foreground">Source</th>
                        <th className="text-left py-2 px-4 font-medium text-muted-foreground">Medium</th>
                        <th className="text-right py-2 px-4 font-medium text-muted-foreground">Visitors</th>
                        <th className="text-right py-2 pl-4 font-medium text-muted-foreground">Visits</th>
                      </tr>
                    </thead>
                    <tbody>
                      {utmData.map((campaign, i) => (
                        <tr key={i} className="border-b last:border-0" data-testid={`row-utm-${i}`}>
                          <td className="py-2 pr-4 text-foreground" data-testid={`text-utm-campaign-${i}`}>
                            {campaign.utm_campaign || "-"}
                          </td>
                          <td className="py-2 px-4 text-muted-foreground" data-testid={`text-utm-source-${i}`}>
                            {campaign.utm_source || "-"}
                          </td>
                          <td className="py-2 px-4 text-muted-foreground" data-testid={`text-utm-medium-${i}`}>
                            {campaign.utm_medium || "-"}
                          </td>
                          <td className="text-right py-2 px-4 text-foreground" data-testid={`text-utm-visitors-${i}`}>
                            {formatNumber(Number(campaign.unique_visitors))}
                          </td>
                          <td className="text-right py-2 pl-4 text-muted-foreground" data-testid={`text-utm-visits-${i}`}>
                            {formatNumber(Number(campaign.visits))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
