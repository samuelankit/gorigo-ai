"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
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
import {
  Network,
  Building2,
  Users,
  Link2,
  TrendingUp,
  ArrowDownRight,
  ArrowUpRight,
  Wallet,
} from "lucide-react";

interface DistributionData {
  channelBreakdown: {
    totalOrgs: number;
    d2cCount: number;
    partnerCount: number;
    affiliateCount: number;
  };
  partnerStats: {
    totalPartners: number;
    activePartners: number;
    totalClients: number;
    actualActiveClients: number;
  };
  affiliateStats: {
    totalAffiliates: number;
    activeAffiliates: number;
    platformAffiliates: number;
    partnerAffiliates: number;
    totalClicks: number;
    totalSignups: number;
    totalCommissions: number;
    pendingPayouts: number;
  };
  revenueStats: {
    totalWalletBalance: number;
    totalWallets: number;
  };
  recentRevenue: {
    totalDeductions: number;
    totalTopUps: number;
    totalSpend: number;
  };
  commissionStats: {
    totalCommissionsAccrued: number;
    pendingCommissions: number;
  };
  revenueByMonth: {
    month: string;
    topUps: number;
    spend: number;
    commissions: number;
    revenueShare: number;
  }[];
  topPartners: {
    id: number;
    name: string;
    tier: string;
    status: string;
    revenueSharePercent: number;
    clientCount: number;
  }[];
  topAffiliates: {
    id: number;
    code: string;
    name: string;
    email: string;
    totalClicks: number;
    totalSignups: number;
    totalEarnings: number;
    pendingPayout: number;
    status: string;
  }[];
  waterfall: {
    grossRevenue: number;
    partnerRevenueShare: number;
    affiliateCommissions: number;
    netRevenue: number;
  };
}

const CHART_COLORS = {
  primary: "hsl(262, 83%, 58%)",
  secondary: "hsl(217, 91%, 60%)",
  success: "hsl(142, 71%, 45%)",
  warning: "hsl(38, 92%, 50%)",
  danger: "hsl(0, 84%, 60%)",
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(amount);

const formatMonth = (month: string) => {
  const [y, m] = month.split("-");
  const date = new Date(parseInt(y), parseInt(m) - 1);
  return date.toLocaleDateString(undefined, { month: "short" });
};

export default function DistributionPage() {
  const [data, setData] = useState<DistributionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/admin/distribution")
      .then((r) => r.json())
      .then((d) => {
        if (d && !d.error) setData(d);
        else setError(true);
      })
      .catch(() => {
        setError(true);
      })
      .finally(() => setLoading(false));
  }, []);

  const channelPieData = data
    ? [
        { name: "D2C", value: Number(data.channelBreakdown.d2cCount) },
        { name: "Partner", value: Number(data.channelBreakdown.partnerCount) },
        { name: "Affiliate", value: Number(data.channelBreakdown.affiliateCount) },
      ]
    : [];

  const PIE_COLORS = [CHART_COLORS.primary, CHART_COLORS.secondary, CHART_COLORS.success];

  if (error && !loading) {
    return (
      <div className="text-center py-12" data-testid="text-distribution-error">
        <p className="text-sm text-muted-foreground">
          Failed to load distribution data. Please try again later.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-start gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-violet-500/10">
          <Network className="w-5 h-5 text-violet-600 dark:text-violet-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-distribution-title">
            Distribution Overview
          </h1>
          <p className="text-sm text-muted-foreground">
            Revenue hierarchy across partners, affiliates, and direct channels.
          </p>
        </div>
      </div>

      {/* Revenue Waterfall */}
      <div data-testid="section-revenue-waterfall">
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
          Revenue Waterfall
        </h2>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                <p className="text-sm text-muted-foreground">Gross Revenue</p>
              </div>
              {loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <p
                  className="text-2xl font-bold text-emerald-600 dark:text-emerald-400"
                  data-testid="stat-gross-revenue"
                >
                  {formatCurrency(data?.waterfall.grossRevenue ?? 0)}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-1">
                <ArrowDownRight className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Partner Share</p>
              </div>
              {loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <p
                  className="text-2xl font-bold text-muted-foreground"
                  data-testid="stat-partner-share"
                >
                  -{formatCurrency(data?.waterfall.partnerRevenueShare ?? 0)}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-1">
                <ArrowDownRight className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Affiliate Commissions</p>
              </div>
              {loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <p
                  className="text-2xl font-bold text-muted-foreground"
                  data-testid="stat-affiliate-commissions"
                >
                  -{formatCurrency(data?.waterfall.affiliateCommissions ?? 0)}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-1">
                <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                <p className="text-sm text-muted-foreground">Net Revenue</p>
              </div>
              {loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <p
                  className="text-2xl font-bold text-emerald-600 dark:text-emerald-400"
                  data-testid="stat-net-revenue"
                >
                  {formatCurrency(data?.waterfall.netRevenue ?? 0)}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Channel Breakdown */}
      <div data-testid="section-channel-breakdown">
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
          Channel Breakdown
        </h2>
        <div className="grid gap-4 grid-cols-1 md:grid-cols-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-4 w-4 text-violet-500" />
                <p className="text-sm text-muted-foreground">D2C</p>
              </div>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-2xl font-bold text-foreground" data-testid="stat-d2c-count">
                  {data?.channelBreakdown.d2cCount ?? 0}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-1">
                <Building2 className="h-4 w-4 text-blue-500" />
                <p className="text-sm text-muted-foreground">Partner</p>
              </div>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-2xl font-bold text-foreground" data-testid="stat-partner-count">
                  {data?.channelBreakdown.partnerCount ?? 0}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-1">
                <Link2 className="h-4 w-4 text-emerald-500" />
                <p className="text-sm text-muted-foreground">Affiliate</p>
              </div>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-2xl font-bold text-foreground" data-testid="stat-affiliate-count">
                  {data?.channelBreakdown.affiliateCount ?? 0}
                </p>
              )}
            </CardContent>
          </Card>

          <Card data-testid="chart-channel-pie">
            <CardContent className="p-2 flex items-center justify-center">
              {loading ? (
                <Skeleton className="h-[120px] w-[120px] rounded-full" />
              ) : (
                <ResponsiveContainer width="100%" height={130}>
                  <PieChart>
                    <Pie
                      data={channelPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={55}
                      dataKey="value"
                      stroke="none"
                    >
                      {channelPieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "6px",
                        fontSize: "12px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabs Section */}
      <Tabs defaultValue="partners" data-testid="tabs-distribution">
        <TabsList>
          <TabsTrigger value="partners" data-testid="tab-partners">
            Partners
          </TabsTrigger>
          <TabsTrigger value="affiliates" data-testid="tab-affiliates">
            Affiliates
          </TabsTrigger>
          <TabsTrigger value="revenue" data-testid="tab-revenue">
            Revenue
          </TabsTrigger>
        </TabsList>

        {/* Partners Tab */}
        <TabsContent value="partners">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
              <CardTitle className="text-base">Top Partners</CardTitle>
              <Badge variant="secondary" className="no-default-hover-elevate text-xs">
                {data?.partnerStats.activePartners ?? 0} active
              </Badge>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : data?.topPartners && data.topPartners.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" data-testid="table-partners">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="py-2 pr-4 font-medium">Name</th>
                        <th className="py-2 pr-4 font-medium">Tier</th>
                        <th className="py-2 pr-4 font-medium">Rev Share %</th>
                        <th className="py-2 pr-4 font-medium">Clients</th>
                        <th className="py-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topPartners.map((partner) => (
                        <tr
                          key={partner.id}
                          className="border-b last:border-0"
                          data-testid={`row-partner-${partner.id}`}
                        >
                          <td className="py-2.5 pr-4 font-medium text-foreground">
                            {partner.name}
                          </td>
                          <td className="py-2.5 pr-4">
                            <Badge variant="outline" className="no-default-hover-elevate text-xs">
                              {partner.tier}
                            </Badge>
                          </td>
                          <td className="py-2.5 pr-4 text-muted-foreground">
                            {partner.revenueSharePercent}%
                          </td>
                          <td className="py-2.5 pr-4 text-muted-foreground">
                            {partner.clientCount}
                          </td>
                          <td className="py-2.5">
                            <Badge
                              variant={partner.status === "active" ? "default" : "secondary"}
                              className="no-default-hover-elevate text-xs"
                              data-testid={`badge-partner-status-${partner.id}`}
                            >
                              {partner.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center" data-testid="text-no-partners">
                  No active partners found.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Affiliates Tab */}
        <TabsContent value="affiliates">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
              <CardTitle className="text-base">Top Affiliates</CardTitle>
              <Badge variant="secondary" className="no-default-hover-elevate text-xs">
                {data?.affiliateStats.activeAffiliates ?? 0} active
              </Badge>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : data?.topAffiliates && data.topAffiliates.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" data-testid="table-affiliates">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="py-2 pr-4 font-medium">Code</th>
                        <th className="py-2 pr-4 font-medium">Name</th>
                        <th className="py-2 pr-4 font-medium">Clicks</th>
                        <th className="py-2 pr-4 font-medium">Signups</th>
                        <th className="py-2 pr-4 font-medium">Earnings</th>
                        <th className="py-2 pr-4 font-medium">Pending</th>
                        <th className="py-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topAffiliates.map((affiliate) => (
                        <tr
                          key={affiliate.id}
                          className="border-b last:border-0"
                          data-testid={`row-affiliate-${affiliate.id}`}
                        >
                          <td className="py-2.5 pr-4 font-mono text-xs text-muted-foreground">
                            {affiliate.code}
                          </td>
                          <td className="py-2.5 pr-4 font-medium text-foreground">
                            {affiliate.name}
                          </td>
                          <td className="py-2.5 pr-4 text-muted-foreground">
                            {affiliate.totalClicks}
                          </td>
                          <td className="py-2.5 pr-4 text-muted-foreground">
                            {affiliate.totalSignups}
                          </td>
                          <td className="py-2.5 pr-4 text-muted-foreground">
                            {formatCurrency(Number(affiliate.totalEarnings))}
                          </td>
                          <td className="py-2.5 pr-4 text-muted-foreground">
                            {formatCurrency(Number(affiliate.pendingPayout))}
                          </td>
                          <td className="py-2.5">
                            <Badge
                              variant={affiliate.status === "active" ? "default" : "secondary"}
                              className="no-default-hover-elevate text-xs"
                              data-testid={`badge-affiliate-status-${affiliate.id}`}
                            >
                              {affiliate.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center" data-testid="text-no-affiliates">
                  No active affiliates found.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Revenue Tab */}
        <TabsContent value="revenue">
          <Card data-testid="chart-revenue-monthly">
            <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
              <CardTitle className="text-base">Monthly Revenue Breakdown</CardTitle>
              <Badge variant="secondary" className="no-default-hover-elevate text-xs">
                6 Months
              </Badge>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-72 w-full" />
              ) : data?.revenueByMonth && data.revenueByMonth.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={data.revenueByMonth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 16%, 47%, 0.15)" />
                    <XAxis
                      dataKey="month"
                      tickFormatter={formatMonth}
                      fontSize={12}
                      stroke="hsl(215, 16%, 47%)"
                    />
                    <YAxis
                      fontSize={12}
                      stroke="hsl(215, 16%, 47%)"
                      tickFormatter={(v) => `£${v}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "6px",
                        fontSize: "12px",
                      }}
                      labelFormatter={formatMonth}
                    />
                    <Legend wrapperStyle={{ fontSize: "12px" }} />
                    <Bar
                      dataKey="topUps"
                      name="Top Ups"
                      stackId="a"
                      fill={CHART_COLORS.success}
                    />
                    <Bar
                      dataKey="spend"
                      name="Spend"
                      stackId="a"
                      fill={CHART_COLORS.primary}
                    />
                    <Bar
                      dataKey="commissions"
                      name="Commissions"
                      stackId="a"
                      fill={CHART_COLORS.warning}
                    />
                    <Bar
                      dataKey="revenueShare"
                      name="Revenue Share"
                      stackId="a"
                      fill={CHART_COLORS.secondary}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground py-8 text-center" data-testid="text-no-revenue-data">
                  No revenue data available yet.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Stats Row */}
      <div data-testid="section-stats-row">
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
          Platform Financials
        </h2>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-1">
                <Wallet className="h-4 w-4 text-blue-500" />
                <p className="text-sm text-muted-foreground">Total Wallet Balance</p>
              </div>
              {loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <p className="text-2xl font-bold text-foreground" data-testid="stat-total-wallet-balance">
                  {formatCurrency(Number(data?.revenueStats.totalWalletBalance ?? 0))}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-4 w-4 text-violet-500" />
                <p className="text-sm text-muted-foreground">Total Wallets</p>
              </div>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-2xl font-bold text-foreground" data-testid="stat-total-wallets">
                  {data?.revenueStats.totalWallets ?? 0}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                <p className="text-sm text-muted-foreground">Commissions Accrued</p>
              </div>
              {loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <p className="text-2xl font-bold text-foreground" data-testid="stat-commissions-accrued">
                  {formatCurrency(Number(data?.commissionStats.totalCommissionsAccrued ?? 0))}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-1">
                <ArrowUpRight className="h-4 w-4 text-amber-500" />
                <p className="text-sm text-muted-foreground">Pending Payouts</p>
              </div>
              {loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <p className="text-2xl font-bold text-foreground" data-testid="stat-pending-payouts">
                  {formatCurrency(Number(data?.affiliateStats.pendingPayouts ?? 0))}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}