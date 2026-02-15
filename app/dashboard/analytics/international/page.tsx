"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Globe, Phone, Check, X, DollarSign, Shield, TrendingUp,
  Clock, Users, AlertTriangle, Ban, BarChart3, Activity
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { useToast } from "@/lib/use-toast";

interface AnalyticsData {
  dateRange: { start: string; end: string; days: number };
  summary: {
    totalCalls: number;
    totalAnswered: number;
    totalFailed: number;
    avgDuration: number;
    totalCost: number;
    countriesActive: number;
    avgQualityScore: number;
    avgSentimentScore: number;
  };
  byCountry: Array<{
    countryCode: string;
    countryName: string;
    currency: string;
    calls: number;
    answered: number;
    failed: number;
    avgDuration: number;
    totalCost: number;
    avgQualityScore: number;
    avgSentimentScore: number;
    dncHits: number;
    complianceDisclosurePlayed: number;
    optOutsDetected: number;
    campaigns: number;
  }>;
  trends: Array<{
    date: string;
    calls: number;
    answered: number;
    failed: number;
    cost: number;
  }>;
  compliance: {
    totalDncChecked: number;
    totalDncBlocked: number;
    totalDisclosuresPlayed: number;
    totalOptOuts: number;
    byCountry: Array<{
      countryCode: string;
      countryName: string;
      dncChecked: number;
      dncBlocked: number;
      disclosurePlayed: number;
      optOuts: number;
      consentRecorded: number;
    }>;
  };
  campaignPerformance: Array<{
    campaignId: number;
    campaignName: string;
    countryCode: string | null;
    status: string;
    totalContacts: number;
    calls: number;
    answered: number;
    converted: number;
    optOuts: number;
    avgDuration: number;
    totalCost: number;
  }>;
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

function formatCost(amount: number): string {
  return `£${amount.toFixed(2)}`;
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { month: "short", day: "numeric" });
}

const STATUS_BADGE_MAP: Record<string, { variant: "outline" | "default" | "destructive" | "secondary"; className: string }> = {
  draft: { variant: "outline", className: "" },
  active: { variant: "default", className: "bg-emerald-600 text-white border-emerald-600" },
  paused: { variant: "default", className: "bg-yellow-500 text-white border-yellow-500" },
  completed: { variant: "outline", className: "" },
  cancelled: { variant: "destructive", className: "" },
};

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

function TableSkeleton() {
  return (
    <Card>
      <CardContent className="p-5">
        <Skeleton className="h-6 w-40 mb-4" />
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function InternationalAnalyticsPage() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    setLoading(true);
    fetch(`/api/analytics/international?days=${days}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to fetch analytics");
        return r.json();
      })
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setData(d);
      })
      .catch((err) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      })
      .finally(() => setLoading(false));
  }, [days]);

  const summary = data?.summary;
  const answerRate = summary && summary.totalCalls > 0
    ? (summary.totalAnswered / summary.totalCalls) * 100
    : 0;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-intl-analytics-title">
            International Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Call performance and compliance metrics across countries
          </p>
        </div>
        <Select
          value={String(days)}
          onValueChange={(v) => setDays(Number(v))}
        >
          <SelectTrigger className="w-[180px]" data-testid="select-date-range">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="14">Last 14 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="365">Last 365 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="volume" data-testid="tab-volume">Call Volume</TabsTrigger>
          <TabsTrigger value="compliance" data-testid="tab-compliance">Compliance</TabsTrigger>
          <TabsTrigger value="campaigns" data-testid="tab-campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="cost" data-testid="tab-cost">Cost & Usage</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          {loading ? (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => <StatCardSkeleton key={i} />)}
              </div>
              <TableSkeleton />
            </div>
          ) : !data ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <Globe className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No data available</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <Phone className="w-4 h-4 text-blue-500" />
                      <p className="text-sm text-muted-foreground">Total Calls</p>
                    </div>
                    <p className="text-2xl font-bold text-foreground" data-testid="text-total-calls">
                      {summary!.totalCalls}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <Check className="w-4 h-4 text-emerald-500" />
                      <p className="text-sm text-muted-foreground">Answer Rate</p>
                    </div>
                    <p className="text-2xl font-bold text-foreground" data-testid="text-answer-rate">
                      {formatPercent(answerRate)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <Globe className="w-4 h-4 text-violet-500" />
                      <p className="text-sm text-muted-foreground">Countries Active</p>
                    </div>
                    <p className="text-2xl font-bold text-foreground" data-testid="text-countries-active">
                      {summary!.countriesActive}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="w-4 h-4 text-amber-500" />
                      <p className="text-sm text-muted-foreground">Total Cost</p>
                    </div>
                    <p className="text-2xl font-bold text-foreground" data-testid="text-total-cost">
                      {formatCost(summary!.totalCost)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
                  <CardTitle className="text-base">Country Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  {data.byCountry.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-2">
                      <Globe className="h-8 w-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">No country data available</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table data-testid="table-country-breakdown">
                        <TableHeader>
                          <TableRow>
                            <TableHead>Country</TableHead>
                            <TableHead className="text-right">Calls</TableHead>
                            <TableHead className="text-right">Answered</TableHead>
                            <TableHead className="text-right">Failed</TableHead>
                            <TableHead className="text-right">Avg Duration</TableHead>
                            <TableHead className="text-right">Cost</TableHead>
                            <TableHead className="text-right">Quality Score</TableHead>
                            <TableHead className="text-right">Sentiment</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {[...data.byCountry]
                            .sort((a, b) => b.calls - a.calls)
                            .map((c) => (
                              <TableRow key={c.countryCode} data-testid={`row-country-${c.countryCode}`}>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
                                    <span>{c.countryName}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">{c.calls}</TableCell>
                                <TableCell className="text-right">{c.answered}</TableCell>
                                <TableCell className="text-right">{c.failed}</TableCell>
                                <TableCell className="text-right">{formatDuration(c.avgDuration)}</TableCell>
                                <TableCell className="text-right">{formatCost(c.totalCost)}</TableCell>
                                <TableCell className="text-right">{c.avgQualityScore.toFixed(0)}/100</TableCell>
                                <TableCell className="text-right">{c.avgSentimentScore.toFixed(2)}</TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="volume" className="mt-6">
          {loading ? (
            <div className="space-y-6">
              <Card>
                <CardContent className="p-5">
                  <Skeleton className="h-[300px] w-full" />
                </CardContent>
              </Card>
              <TableSkeleton />
            </div>
          ) : !data ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <BarChart3 className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No data available</p>
            </div>
          ) : (
            <div className="space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
                  <CardTitle className="text-base">Daily Call Volume</CardTitle>
                </CardHeader>
                <CardContent>
                  {data.trends.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[300px] gap-2">
                      <BarChart3 className="h-8 w-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">No trend data available</p>
                    </div>
                  ) : (
                    <div data-testid="chart-call-volume">
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart
                          data={data.trends.map((t) => ({
                            date: formatDateLabel(t.date),
                            answered: t.answered,
                            failed: t.failed,
                            total: t.calls,
                          }))}
                          margin={{ top: 5, right: 5, left: -10, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient id="answeredGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="failedGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis
                            dataKey="date"
                            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            tick={{ fill: "hsl(var(--muted-foreground))" }}
                            tickLine={false}
                            axisLine={false}
                          />
                          <Tooltip
                            contentStyle={tooltipStyle}
                            labelStyle={{ color: "hsl(var(--foreground))" }}
                            formatter={(value: number, name: string) => [value, name === "answered" ? "Answered" : "Failed"]}
                            labelFormatter={(label) => label}
                          />
                          <Legend />
                          <Area
                            type="monotone"
                            dataKey="answered"
                            stackId="1"
                            stroke="#10b981"
                            fill="url(#answeredGrad)"
                            strokeWidth={2}
                            name="Answered"
                          />
                          <Area
                            type="monotone"
                            dataKey="failed"
                            stackId="1"
                            stroke="#ef4444"
                            fill="url(#failedGrad)"
                            strokeWidth={2}
                            name="Failed"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
                  <CardTitle className="text-base">Top 5 Countries by Volume</CardTitle>
                </CardHeader>
                <CardContent>
                  {data.byCountry.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-2">
                      <Globe className="h-8 w-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">No country data</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table data-testid="table-top-countries">
                        <TableHeader>
                          <TableRow>
                            <TableHead>Country</TableHead>
                            <TableHead className="text-right">Total Calls</TableHead>
                            <TableHead className="text-right">Answered</TableHead>
                            <TableHead className="text-right">Failed</TableHead>
                            <TableHead className="text-right">Answer Rate</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {[...data.byCountry]
                            .sort((a, b) => b.calls - a.calls)
                            .slice(0, 5)
                            .map((c) => (
                              <TableRow key={c.countryCode} data-testid={`row-top-country-${c.countryCode}`}>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
                                    <span>{c.countryName}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">{c.calls}</TableCell>
                                <TableCell className="text-right">{c.answered}</TableCell>
                                <TableCell className="text-right">{c.failed}</TableCell>
                                <TableCell className="text-right">
                                  {c.calls > 0 ? formatPercent((c.answered / c.calls) * 100) : "0.0%"}
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="compliance" className="mt-6">
          {loading ? (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => <StatCardSkeleton key={i} />)}
              </div>
              <TableSkeleton />
            </div>
          ) : !data ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <Shield className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No data available</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-4 h-4 text-blue-500" />
                      <p className="text-sm text-muted-foreground">DNC Checks</p>
                    </div>
                    <p className="text-2xl font-bold text-foreground" data-testid="text-dnc-checks">
                      {data.compliance.totalDncChecked}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <Ban className="w-4 h-4 text-red-500" />
                      <p className="text-sm text-muted-foreground">DNC Blocked</p>
                    </div>
                    <p
                      className={`text-2xl font-bold ${data.compliance.totalDncBlocked > 0 ? "text-red-500" : "text-foreground"}`}
                      data-testid="text-dnc-blocked"
                    >
                      {data.compliance.totalDncBlocked}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <Check className="w-4 h-4 text-emerald-500" />
                      <p className="text-sm text-muted-foreground">Disclosures Played</p>
                    </div>
                    <p className="text-2xl font-bold text-foreground" data-testid="text-disclosures-played">
                      {data.compliance.totalDisclosuresPlayed}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      <p className="text-sm text-muted-foreground">Opt-Outs</p>
                    </div>
                    <p className="text-2xl font-bold text-foreground" data-testid="text-opt-outs">
                      {data.compliance.totalOptOuts}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
                  <CardTitle className="text-base">Compliance by Country</CardTitle>
                </CardHeader>
                <CardContent>
                  {data.compliance.byCountry.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-2">
                      <Shield className="h-8 w-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">No compliance data</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table data-testid="table-compliance-country">
                        <TableHeader>
                          <TableRow>
                            <TableHead>Country</TableHead>
                            <TableHead className="text-right">DNC Checked</TableHead>
                            <TableHead className="text-right">DNC Blocked</TableHead>
                            <TableHead className="text-right">Block Rate</TableHead>
                            <TableHead className="text-right">Disclosures Played</TableHead>
                            <TableHead className="text-right">Opt-Outs</TableHead>
                            <TableHead className="text-right">Consent Recorded</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.compliance.byCountry.map((c) => (
                            <TableRow key={c.countryCode} data-testid={`row-compliance-${c.countryCode}`}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
                                  <span>{c.countryName}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">{c.dncChecked}</TableCell>
                              <TableCell className="text-right">{c.dncBlocked}</TableCell>
                              <TableCell className="text-right">
                                {c.dncChecked > 0 ? formatPercent((c.dncBlocked / c.dncChecked) * 100) : "0.0%"}
                              </TableCell>
                              <TableCell className="text-right">{c.disclosurePlayed}</TableCell>
                              <TableCell className="text-right">{c.optOuts}</TableCell>
                              <TableCell className="text-right">{c.consentRecorded}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="campaigns" className="mt-6">
          {loading ? (
            <TableSkeleton />
          ) : !data ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <Users className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No data available</p>
            </div>
          ) : data.campaignPerformance.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <Users className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground" data-testid="text-no-campaigns">No campaigns yet</p>
            </div>
          ) : (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
                <CardTitle className="text-base">Campaign Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table data-testid="table-campaign-performance">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Campaign Name</TableHead>
                        <TableHead>Country</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Contacts</TableHead>
                        <TableHead className="text-right">Calls Made</TableHead>
                        <TableHead className="text-right">Answered</TableHead>
                        <TableHead className="text-right">Converted</TableHead>
                        <TableHead className="text-right">Opt-Outs</TableHead>
                        <TableHead className="text-right">Avg Duration</TableHead>
                        <TableHead className="text-right">Cost</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.campaignPerformance.map((cp) => {
                        const badgeConfig = STATUS_BADGE_MAP[cp.status] || STATUS_BADGE_MAP.draft;
                        return (
                          <TableRow key={cp.campaignId} data-testid={`row-campaign-${cp.campaignId}`}>
                            <TableCell className="font-medium">{cp.campaignName}</TableCell>
                            <TableCell>
                              {cp.countryCode ? (
                                <div className="flex items-center gap-2">
                                  <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
                                  <span>{cp.countryCode}</span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={badgeConfig.variant}
                                className={`no-default-hover-elevate ${badgeConfig.className}`}
                              >
                                {cp.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">{cp.totalContacts}</TableCell>
                            <TableCell className="text-right">{cp.calls}</TableCell>
                            <TableCell className="text-right">{cp.answered}</TableCell>
                            <TableCell className="text-right">{cp.converted}</TableCell>
                            <TableCell className="text-right">{cp.optOuts}</TableCell>
                            <TableCell className="text-right">{formatDuration(cp.avgDuration)}</TableCell>
                            <TableCell className="text-right">{formatCost(cp.totalCost)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="cost" className="mt-6">
          {loading ? (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-3">
                {[1, 2, 3].map((i) => <StatCardSkeleton key={i} />)}
              </div>
              <Card>
                <CardContent className="p-5">
                  <Skeleton className="h-[300px] w-full" />
                </CardContent>
              </Card>
              <TableSkeleton />
            </div>
          ) : !data ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <DollarSign className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No data available</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="w-4 h-4 text-blue-500" />
                      <p className="text-sm text-muted-foreground">Total Spend</p>
                    </div>
                    <p className="text-2xl font-bold text-foreground" data-testid="text-total-spend">
                      {formatCost(summary!.totalCost)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-emerald-500" />
                      <p className="text-sm text-muted-foreground">Daily Average</p>
                    </div>
                    <p className="text-2xl font-bold text-foreground" data-testid="text-daily-average">
                      {formatCost(data.dateRange.days > 0 ? summary!.totalCost / data.dateRange.days : 0)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="w-4 h-4 text-violet-500" />
                      <p className="text-sm text-muted-foreground">Cost per Call</p>
                    </div>
                    <p className="text-2xl font-bold text-foreground" data-testid="text-cost-per-call">
                      {formatCost(summary!.totalCalls > 0 ? summary!.totalCost / summary!.totalCalls : 0)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
                  <CardTitle className="text-base">Cost Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  {data.trends.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[300px] gap-2">
                      <BarChart3 className="h-8 w-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">No trend data available</p>
                    </div>
                  ) : (
                    <div data-testid="chart-cost-trend">
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart
                          data={data.trends.map((t) => ({
                            date: formatDateLabel(t.date),
                            cost: t.cost,
                          }))}
                          margin={{ top: 5, right: 5, left: -10, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis
                            dataKey="date"
                            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis
                            tick={{ fill: "hsl(var(--muted-foreground))" }}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(v) => `£${v}`}
                          />
                          <Tooltip
                            contentStyle={tooltipStyle}
                            labelStyle={{ color: "hsl(var(--foreground))" }}
                            formatter={(value: number) => [`£${value.toFixed(2)}`, "Cost"]}
                          />
                          <Bar dataKey="cost" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Cost" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
                  <CardTitle className="text-base">Cost by Country</CardTitle>
                </CardHeader>
                <CardContent>
                  {data.byCountry.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-2">
                      <Globe className="h-8 w-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">No country data</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table data-testid="table-cost-country">
                        <TableHeader>
                          <TableRow>
                            <TableHead>Country</TableHead>
                            <TableHead className="text-right">Calls</TableHead>
                            <TableHead className="text-right">Total Cost</TableHead>
                            <TableHead className="text-right">Cost per Call</TableHead>
                            <TableHead className="text-right">Local Currency Cost</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {[...data.byCountry]
                            .sort((a, b) => b.totalCost - a.totalCost)
                            .map((c) => (
                              <TableRow key={c.countryCode} data-testid={`row-cost-${c.countryCode}`}>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
                                    <span>{c.countryName}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">{c.calls}</TableCell>
                                <TableCell className="text-right">{formatCost(c.totalCost)}</TableCell>
                                <TableCell className="text-right">
                                  {c.calls > 0 ? formatCost(c.totalCost / c.calls) : "£0.00"}
                                </TableCell>
                                <TableCell className="text-right">
                                  {c.currency} {c.totalCost.toFixed(2)}
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}