"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Users,
  PhoneCall,
  DollarSign,
  Clock,
  Activity,
  Shield,
  Settings,
  Plus,
  Pencil,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  XCircle,
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

interface Stats {
  totalPartners: number;
  totalClients: number;
  totalCalls: number;
  totalRevenue: number;
  totalMinutes: number;
}

interface Analytics {
  revenueByMonth: { month: string; revenue: number; transactions: number }[];
  callsByMonth: { month: string; total: number; completed: number; missed: number; failed: number }[];
  partnerPerformance: { partnerId: number; partnerName: string; tier: string; status: string; clientCount: number; totalRevenue: number; totalCalls: number }[];
  clientGrowth: { month: string; newClients: number; totalClients: number }[];
  callsByDay: { day: string; calls: number }[];
  alerts: { pendingApprovals: number; suspendedPartners: number };
}

interface ActivityEntry {
  id: string;
  type: string;
  date: string;
  description: string;
  details?: {
    action?: string;
    entityType?: string;
    actorEmail?: string;
    [key: string]: unknown;
  };
}

const CHART_COLORS = {
  primary: "hsl(262, 83%, 58%)",
  secondary: "hsl(217, 91%, 60%)",
  success: "hsl(142, 71%, 45%)",
  warning: "hsl(38, 92%, 50%)",
  danger: "hsl(0, 84%, 60%)",
  muted: "hsl(215, 16%, 47%)",
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

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [loadingActivity, setLoadingActivity] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((d) => {
        if (d) setStats(d);
      })
      .catch(() => {})
      .finally(() => setLoadingStats(false));

    fetch("/api/admin/analytics")
      .then((r) => r.json())
      .then((d) => {
        if (d && !d.error) setAnalytics(d);
      })
      .catch(() => {})
      .finally(() => setLoadingAnalytics(false));

    fetch("/api/admin/activity")
      .then((r) => r.json())
      .then((d) => {
        if (d?.feed) setActivity(d.feed.slice(0, 8));
        else if (Array.isArray(d)) setActivity(d.slice(0, 8));
      })
      .catch(() => {})
      .finally(() => setLoadingActivity(false));
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
    }).format(amount);
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  };

  const getActionIcon = (entry: ActivityEntry) => {
    const lower = (entry.description + (entry.details?.action ?? "")).toLowerCase();
    if (lower.includes("partner")) return Building2;
    if (lower.includes("client") || lower.includes("user")) return Users;
    if (lower.includes("setting")) return Settings;
    if (lower.includes("create") || lower.includes("add")) return Plus;
    if (lower.includes("update") || lower.includes("edit")) return Pencil;
    return Activity;
  };

  const statCards = [
    {
      title: "Total Partners",
      value: stats?.totalPartners ?? 0,
      icon: Building2,
      gradient: "from-blue-500/10 to-transparent dark:from-blue-500/20",
      iconBg: "bg-blue-500",
      testId: "stat-total-partners",
    },
    {
      title: "Total Clients",
      value: stats?.totalClients ?? 0,
      icon: Users,
      gradient: "from-violet-500/10 to-transparent dark:from-violet-500/20",
      iconBg: "bg-violet-500",
      testId: "stat-total-clients",
    },
    {
      title: "Total Calls",
      value: stats?.totalCalls ?? 0,
      icon: PhoneCall,
      gradient: "from-emerald-500/10 to-transparent dark:from-emerald-500/20",
      iconBg: "bg-emerald-500",
      testId: "stat-total-calls",
    },
    {
      title: "Total Revenue",
      value: stats ? formatCurrency(stats.totalRevenue) : formatCurrency(0),
      icon: DollarSign,
      gradient: "from-amber-500/10 to-transparent dark:from-amber-500/20",
      iconBg: "bg-amber-500",
      testId: "stat-total-revenue",
    },
    {
      title: "Total Minutes",
      value: Math.round(stats?.totalMinutes ?? 0),
      icon: Clock,
      gradient: "from-rose-500/10 to-transparent dark:from-rose-500/20",
      iconBg: "bg-rose-500",
      testId: "stat-total-minutes",
    },
  ];

  const pendingCount = analytics?.alerts.pendingApprovals ?? 0;
  const suspendedCount = analytics?.alerts.suspendedPartners ?? 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-start gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-violet-500/10">
          <Shield className="w-5 h-5 text-violet-600 dark:text-violet-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-admin-dashboard-title">
            Command Center
          </h1>
          <p className="text-sm text-muted-foreground">Platform overview, analytics, and operations.</p>
        </div>
      </div>

      {(pendingCount > 0 || suspendedCount > 0) && (
        <div className="grid gap-3 sm:grid-cols-2" data-testid="section-action-center">
          {pendingCount > 0 && (
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-500/10">
                      <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground" data-testid="text-pending-approvals">
                        {pendingCount} Partner{pendingCount > 1 ? "s" : ""} Pending Approval
                      </p>
                      <p className="text-xs text-muted-foreground">Requires your review</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild data-testid="button-review-pending">
                    <Link href="/admin/partners?filter=pending">
                      Review
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          {suspendedCount > 0 && (
            <Card className="border-red-500/30 bg-red-500/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-500/10">
                      <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground" data-testid="text-suspended-partners">
                        {suspendedCount} Partner{suspendedCount > 1 ? "s" : ""} Suspended
                      </p>
                      <p className="text-xs text-muted-foreground">Review and resolve</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild data-testid="button-review-suspended">
                    <Link href="/admin/partners?filter=suspended">
                      View
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {statCards.map((card) => (
          <Card key={card.title} className={`bg-gradient-to-br ${card.gradient}`}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-muted-foreground mb-1">{card.title}</p>
                  {loadingStats ? (
                    <Skeleton className="h-8 w-20" />
                  ) : (
                    <p className="text-2xl font-bold text-foreground" data-testid={card.testId}>
                      {card.value}
                    </p>
                  )}
                </div>
                <div className={`w-12 h-12 ${card.iconBg} rounded-full flex items-center justify-center shrink-0`}>
                  <card.icon className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card data-testid="chart-revenue-trends">
          <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Revenue Trends</CardTitle>
            </div>
            <Badge variant="secondary" className="no-default-hover-elevate text-xs">6 Months</Badge>
          </CardHeader>
          <CardContent>
            {loadingAnalytics ? (
              <Skeleton className="h-64 w-full" />
            ) : analytics?.revenueByMonth && analytics.revenueByMonth.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={analytics.revenueByMonth}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 16%, 47%, 0.15)" />
                  <XAxis dataKey="month" tickFormatter={formatMonth} fontSize={12} stroke="hsl(215, 16%, 47%)" />
                  <YAxis fontSize={12} stroke="hsl(215, 16%, 47%)" tickFormatter={(v) => `£${v}`} />
                  <Tooltip
                    formatter={(value: number) => [`£${value.toFixed(2)}`, "Revenue"]}
                    labelFormatter={formatMonth}
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: "12px" }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke={CHART_COLORS.primary} fill="url(#revenueGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
                No revenue data yet.
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="chart-call-volume">
          <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
            <div className="flex items-center gap-2">
              <PhoneCall className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Call Volume</CardTitle>
            </div>
            <Badge variant="secondary" className="no-default-hover-elevate text-xs">6 Months</Badge>
          </CardHeader>
          <CardContent>
            {loadingAnalytics ? (
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
                  <Bar dataKey="completed" name="Completed" fill={CHART_COLORS.success} radius={[2, 2, 0, 0]} />
                  <Bar dataKey="missed" name="Missed" fill={CHART_COLORS.warning} radius={[2, 2, 0, 0]} />
                  <Bar dataKey="failed" name="Failed" fill={CHART_COLORS.danger} radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
                No call data yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card data-testid="chart-partner-performance">
          <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Partner Performance</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {loadingAnalytics ? (
              <Skeleton className="h-64 w-full" />
            ) : analytics?.partnerPerformance && analytics.partnerPerformance.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={analytics.partnerPerformance} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 16%, 47%, 0.15)" />
                  <XAxis type="number" fontSize={12} stroke="hsl(215, 16%, 47%)" tickFormatter={(v) => `£${v}`} />
                  <YAxis type="category" dataKey="partnerName" fontSize={12} stroke="hsl(215, 16%, 47%)" width={120} />
                  <Tooltip
                    formatter={(value: number) => [`£${value.toFixed(2)}`, "Revenue"]}
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: "12px" }}
                  />
                  <Bar dataKey="totalRevenue" name="Revenue" fill={CHART_COLORS.secondary} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
                No partner data yet.
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="chart-client-growth">
          <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Client Growth</CardTitle>
            </div>
            <Badge variant="secondary" className="no-default-hover-elevate text-xs">6 Months</Badge>
          </CardHeader>
          <CardContent>
            {loadingAnalytics ? (
              <Skeleton className="h-64 w-full" />
            ) : analytics?.clientGrowth && analytics.clientGrowth.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={analytics.clientGrowth}>
                  <defs>
                    <linearGradient id="clientGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={CHART_COLORS.success} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={CHART_COLORS.success} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 16%, 47%, 0.15)" />
                  <XAxis dataKey="month" tickFormatter={formatMonth} fontSize={12} stroke="hsl(215, 16%, 47%)" />
                  <YAxis fontSize={12} stroke="hsl(215, 16%, 47%)" />
                  <Tooltip
                    labelFormatter={formatMonth}
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: "12px" }}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Line type="monotone" dataKey="totalClients" name="Total Clients" stroke={CHART_COLORS.success} strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="newClients" name="New This Month" stroke={CHART_COLORS.secondary} strokeWidth={2} dot={{ r: 3 }} strokeDasharray="4 4" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
                No client growth data yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {analytics?.callsByDay && analytics.callsByDay.length > 0 && (
        <Card data-testid="chart-daily-calls">
          <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Daily Call Activity</CardTitle>
            </div>
            <Badge variant="secondary" className="no-default-hover-elevate text-xs">Last 30 Days</Badge>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={analytics.callsByDay}>
                <defs>
                  <linearGradient id="dailyGrad" x1="0" y1="0" x2="0" y2="1">
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
                <Area type="monotone" dataKey="calls" stroke={CHART_COLORS.secondary} fill="url(#dailyGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </div>
          <Badge variant="secondary" className="no-default-hover-elevate text-xs">Latest</Badge>
        </CardHeader>
        <CardContent>
          {loadingActivity ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : activity.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center" data-testid="text-no-activity">
              No recent activity.
            </p>
          ) : (
            <div className="space-y-3">
              {activity.map((entry) => {
                const Icon = getActionIcon(entry);
                return (
                  <div key={entry.id} className="flex items-start gap-3 py-2" data-testid={`activity-entry-${entry.id}`}>
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted shrink-0">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">
                        {entry.description}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap mt-0.5">
                        {entry.details?.actorEmail && (
                          <span className="text-xs text-muted-foreground">{entry.details.actorEmail}</span>
                        )}
                        {entry.date && (
                          <span className="text-xs text-muted-foreground/60">{formatTime(entry.date)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
