"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  PhoneCall,
  BarChart3,
  Users,
  Activity,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface Analytics {
  revenueByMonth: { month: string; revenue: number; transactions: number }[];
  callsByMonth: { month: string; total: number; completed: number; missed: number; failed: number }[];
  partnerPerformance: { partnerId: number; partnerName: string; tier: string; status: string; clientCount: number; totalRevenue: number; totalCalls: number }[];
  clientGrowth: { month: string; newClients: number; totalClients: number }[];
  callsByDay: { day: string; calls: number }[];
  alerts: { pendingApprovals: number; suspendedPartners: number };
}

const CHART_COLORS = {
  primary: "hsl(262, 83%, 58%)",
  secondary: "hsl(217, 91%, 60%)",
  success: "hsl(142, 71%, 45%)",
  warning: "hsl(38, 92%, 50%)",
  danger: "hsl(0, 84%, 60%)",
};

const PIE_COLORS = ["hsl(262, 83%, 58%)", "hsl(217, 91%, 60%)", "hsl(142, 71%, 45%)", "hsl(38, 92%, 50%)", "hsl(0, 84%, 60%)"];

const formatMonth = (month: string) => {
  const [y, m] = month.split("-");
  const date = new Date(parseInt(y), parseInt(m) - 1);
  return date.toLocaleDateString(undefined, { month: "short" });
};

const formatDay = (day: string) => {
  const date = new Date(day);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then((r) => r.json())
      .then((d) => {
        if (d && !d.error) setAnalytics(d);
      })
      .catch(() => { setError(true); })
      .finally(() => setLoading(false));
  }, []);

  const totalRevenue = analytics?.revenueByMonth.reduce((sum, r) => sum + r.revenue, 0) ?? 0;
  const totalCalls = analytics?.callsByMonth.reduce((sum, c) => sum + c.total, 0) ?? 0;
  const completionRate = totalCalls > 0
    ? Math.round((analytics?.callsByMonth.reduce((sum, c) => sum + c.completed, 0) ?? 0) / totalCalls * 100)
    : 0;

  const tierDistribution = analytics?.partnerPerformance
    ? Object.entries(
        analytics.partnerPerformance.reduce((acc: Record<string, number>, p) => {
          acc[p.tier] = (acc[p.tier] || 0) + 1;
          return acc;
        }, {})
      ).map(([name, value]) => ({ name, value }))
    : [];

  if (error && !loading) {
    return (
      <div className="text-center py-12" data-testid="text-analytics-error">
        <p className="text-sm text-muted-foreground">Failed to load analytics data. Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-start gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-500/10">
          <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-analytics-title">
            Analytics
          </h1>
          <p className="text-sm text-muted-foreground">Deep-dive into platform performance and trends.</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground mb-1">6-Month Revenue</p>
            {loading ? <Skeleton className="h-8 w-20" /> : (
              <p className="text-2xl font-bold text-foreground" data-testid="stat-6mo-revenue">
                {new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(totalRevenue)}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground mb-1">6-Month Calls</p>
            {loading ? <Skeleton className="h-8 w-20" /> : (
              <p className="text-2xl font-bold text-foreground" data-testid="stat-6mo-calls">{totalCalls}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground mb-1">Completion Rate</p>
            {loading ? <Skeleton className="h-8 w-20" /> : (
              <p className="text-2xl font-bold text-foreground" data-testid="stat-completion-rate">{completionRate}%</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card data-testid="chart-revenue-detail">
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Revenue & Transactions</CardTitle>
          </div>
          <Badge variant="secondary" className="no-default-hover-elevate text-xs">6 Months</Badge>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-72 w-full" />
          ) : analytics?.revenueByMonth && analytics.revenueByMonth.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={analytics.revenueByMonth}>
                <defs>
                  <linearGradient id="revGrad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 16%, 47%, 0.15)" />
                <XAxis dataKey="month" tickFormatter={formatMonth} fontSize={12} stroke="hsl(215, 16%, 47%)" />
                <YAxis yAxisId="left" fontSize={12} stroke="hsl(215, 16%, 47%)" tickFormatter={(v) => `£${v}`} />
                <YAxis yAxisId="right" orientation="right" fontSize={12} stroke="hsl(215, 16%, 47%)" />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: "12px" }}
                  labelFormatter={formatMonth}
                />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Area yAxisId="left" type="monotone" dataKey="revenue" name="Revenue (£)" stroke={CHART_COLORS.primary} fill="url(#revGrad2)" strokeWidth={2} />
                <Line yAxisId="right" type="monotone" dataKey="transactions" name="Transactions" stroke={CHART_COLORS.secondary} strokeWidth={2} dot={{ r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-72 text-sm text-muted-foreground">No revenue data yet.</div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card data-testid="chart-call-breakdown">
          <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
            <div className="flex items-center gap-2">
              <PhoneCall className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Call Status Breakdown</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-64 w-full" />
            ) : analytics?.callsByMonth && analytics.callsByMonth.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={analytics.callsByMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 16%, 47%, 0.15)" />
                  <XAxis dataKey="month" tickFormatter={formatMonth} fontSize={12} stroke="hsl(215, 16%, 47%)" />
                  <YAxis fontSize={12} stroke="hsl(215, 16%, 47%)" />
                  <Tooltip
                    labelFormatter={formatMonth}
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: "12px" }}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Bar dataKey="completed" name="Completed" stackId="a" fill={CHART_COLORS.success} />
                  <Bar dataKey="missed" name="Missed" stackId="a" fill={CHART_COLORS.warning} />
                  <Bar dataKey="failed" name="Failed" stackId="a" fill={CHART_COLORS.danger} radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">No call data yet.</div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="chart-tier-distribution">
          <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Partner Tier Distribution</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-64 w-full" />
            ) : tierDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={tierDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {tierDistribution.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: "12px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">No partner data yet.</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card data-testid="chart-client-growth-detail">
          <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Client Growth</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-64 w-full" />
            ) : analytics?.clientGrowth && analytics.clientGrowth.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={analytics.clientGrowth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 16%, 47%, 0.15)" />
                  <XAxis dataKey="month" tickFormatter={formatMonth} fontSize={12} stroke="hsl(215, 16%, 47%)" />
                  <YAxis fontSize={12} stroke="hsl(215, 16%, 47%)" />
                  <Tooltip
                    labelFormatter={formatMonth}
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: "12px" }}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Line type="monotone" dataKey="totalClients" name="Total" stroke={CHART_COLORS.success} strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="newClients" name="New" stroke={CHART_COLORS.secondary} strokeWidth={2} dot={{ r: 3 }} strokeDasharray="4 4" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">No client data yet.</div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="chart-daily-calls-detail">
          <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Daily Call Volume (30 Days)</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-64 w-full" />
            ) : analytics?.callsByDay && analytics.callsByDay.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={analytics.callsByDay}>
                  <defs>
                    <linearGradient id="dailyGrad2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.secondary} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={CHART_COLORS.secondary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 16%, 47%, 0.15)" />
                  <XAxis dataKey="day" tickFormatter={formatDay} fontSize={11} stroke="hsl(215, 16%, 47%)" />
                  <YAxis fontSize={12} stroke="hsl(215, 16%, 47%)" />
                  <Tooltip
                    labelFormatter={formatDay}
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: "12px" }}
                  />
                  <Area type="monotone" dataKey="calls" stroke={CHART_COLORS.secondary} fill="url(#dailyGrad2)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">No call data yet.</div>
            )}
          </CardContent>
        </Card>
      </div>

      {analytics?.partnerPerformance && analytics.partnerPerformance.length > 0 && (
        <Card data-testid="chart-partner-comparison">
          <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Partner Comparison</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.partnerPerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 16%, 47%, 0.15)" />
                <XAxis dataKey="partnerName" fontSize={12} stroke="hsl(215, 16%, 47%)" />
                <YAxis yAxisId="left" fontSize={12} stroke="hsl(215, 16%, 47%)" tickFormatter={(v) => `£${v}`} />
                <YAxis yAxisId="right" orientation="right" fontSize={12} stroke="hsl(215, 16%, 47%)" />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: "12px" }}
                />
                <Legend wrapperStyle={{ fontSize: "12px" }} />
                <Bar yAxisId="left" dataKey="totalRevenue" name="Revenue (£)" fill={CHART_COLORS.primary} radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="totalCalls" name="Calls" fill={CHART_COLORS.secondary} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
