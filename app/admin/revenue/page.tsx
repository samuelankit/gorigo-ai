"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  PoundSterling,
  TrendingUp,
  TrendingDown,
  PhoneCall,
  Clock,
  CreditCard,
  RefreshCw,
  Download,
  Building2,
  Users,
  Network,
} from "lucide-react";

interface KPI {
  totalRevenue: number;
  totalCalls: number;
  totalMinutes: number;
  avgRevenuePerCall: number;
  totalTopUps: number;
  mrr: number;
  mrrGrowth: number;
}

interface PackageBreakdown {
  deploymentModel: string;
  revenue: number;
  calls: number;
  minutes: number;
}

interface MonthlyTrend {
  month: string;
  revenue: number;
  calls: number;
  minutes: number;
}

interface TopClient {
  orgId: number;
  orgName: string;
  deploymentModel: string;
  revenue: number;
  calls: number;
  minutes: number;
}

interface Transaction {
  id: number;
  orgId: number;
  orgName: string;
  type: string;
  amount: number;
  description: string | null;
  createdAt: string;
}

interface CommissionEntry {
  channel: string;
  totalAmount: number;
  platformAmount: number;
  partnerAmount: number;
  resellerAmount: number;
  affiliateAmount: number;
  count: number;
}

interface RevenueData {
  kpi: KPI;
  packageBreakdown: PackageBreakdown[];
  monthlyTrends: MonthlyTrend[];
  topClients: TopClient[];
  recentTransactions: Transaction[];
  commissionSummary: CommissionEntry[];
  days: number;
}

const PACKAGE_COLORS: Record<string, string> = {
  managed: "hsl(262, 83%, 58%)",
  byok: "hsl(217, 91%, 60%)",
  "self-hosted": "hsl(142, 71%, 45%)",
};

const PACKAGE_LABELS: Record<string, string> = {
  managed: "Managed",
  byok: "BYOK",
  "self-hosted": "Self-Hosted",
};

const PACKAGE_RATES: Record<string, string> = {
  managed: "0.15/min",
  byok: "0.05/min",
  "self-hosted": "0.03/min",
};

function PackageBadge({ model }: { model: string }) {
  const label = PACKAGE_LABELS[model] || model;
  if (model === "managed") {
    return <Badge className="no-default-hover-elevate bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20">{label}</Badge>;
  }
  if (model === "byok") {
    return <Badge className="no-default-hover-elevate bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">{label}</Badge>;
  }
  if (model === "self-hosted") {
    return <Badge className="no-default-hover-elevate bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">{label}</Badge>;
  }
  return <Badge variant="outline" className="no-default-hover-elevate">{label}</Badge>;
}

function TxnTypeBadge({ type }: { type: string }) {
  if (type === "top_up") return <Badge className="no-default-hover-elevate bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs">Top-up</Badge>;
  if (type === "deduction") return <Badge className="no-default-hover-elevate bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 text-xs">Deduction</Badge>;
  if (type === "refund") return <Badge className="no-default-hover-elevate bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-xs">Refund</Badge>;
  if (type === "commission") return <Badge className="no-default-hover-elevate bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20 text-xs">Commission</Badge>;
  return <Badge variant="outline" className="no-default-hover-elevate text-xs">{type}</Badge>;
}

const fmt = (v: number) => `\u00a3${Math.abs(v).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatMonth = (month: string) => {
  const [y, m] = month.split("-");
  const date = new Date(parseInt(y), parseInt(m) - 1);
  return date.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
};

export default function AdminRevenuePage() {
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [days, setDays] = useState("30");

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await fetch(`/api/admin/revenue?days=${days}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to fetch revenue data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [days]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  const handleExportCSV = () => {
    if (!data) return;
    const rows = [["Client", "Package", "Revenue", "Calls", "Minutes"]];
    data.topClients.forEach(c => {
      rows.push([c.orgName, c.deploymentModel, c.revenue.toFixed(2), String(c.calls), c.minutes.toFixed(1)]);
    });
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `revenue-report-${days}d.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h1 className="text-2xl font-bold" data-testid="text-revenue-title">Revenue & Billing</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-20 w-full" /></CardContent></Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2].map(i => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-64 w-full" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Revenue & Billing</h1>
        <Card><CardContent className="p-6 text-center text-muted-foreground">Failed to load revenue data</CardContent></Card>
      </div>
    );
  }

  const { kpi, packageBreakdown, monthlyTrends, topClients, recentTransactions, commissionSummary } = data;

  const pieData = packageBreakdown.map(p => ({
    name: PACKAGE_LABELS[p.deploymentModel] || p.deploymentModel,
    value: p.revenue,
    fill: PACKAGE_COLORS[p.deploymentModel] || "hsl(215, 16%, 47%)",
  })).filter(p => p.value > 0);

  const totalCommissions = commissionSummary.reduce((sum, c) => sum + c.partnerAmount + c.resellerAmount + c.affiliateAmount, 0);
  const totalPlatformRevenue = commissionSummary.reduce((sum, c) => sum + c.platformAmount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-revenue-title">Revenue & Billing</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Platform-wide financial overview</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="w-[130px]" data-testid="select-revenue-days">
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
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportCSV}
            data-testid="button-export-revenue"
          >
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => fetchData(true)}
            disabled={refreshing}
            data-testid="button-refresh-revenue"
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Revenue</span>
              <PoundSterling className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold" data-testid="text-total-revenue">{fmt(kpi.totalRevenue)}</p>
            <p className="text-xs text-muted-foreground mt-1">Last {days} days</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">MRR</span>
              {kpi.mrrGrowth >= 0 ? (
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
            </div>
            <p className="text-2xl font-bold" data-testid="text-mrr">{fmt(kpi.mrr)}</p>
            <p className={`text-xs mt-1 ${kpi.mrrGrowth >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
              {kpi.mrrGrowth >= 0 ? "+" : ""}{kpi.mrrGrowth}% vs prev month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Wallet Top-ups</span>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold" data-testid="text-total-topups">{fmt(kpi.totalTopUps)}</p>
            <p className="text-xs text-muted-foreground mt-1">Cash inflow</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Avg per Call</span>
              <PhoneCall className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold" data-testid="text-avg-per-call">{fmt(kpi.avgRevenuePerCall)}</p>
            <p className="text-xs text-muted-foreground mt-1">{kpi.totalCalls.toLocaleString()} calls, {kpi.totalMinutes.toLocaleString()} min</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList data-testid="tabs-revenue">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="clients" data-testid="tab-clients">Top Clients</TabsTrigger>
          <TabsTrigger value="transactions" data-testid="tab-transactions">Transactions</TabsTrigger>
          <TabsTrigger value="commissions" data-testid="tab-commissions">Commissions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card data-testid="chart-revenue-trend">
              <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Revenue Trend
                </CardTitle>
                <Badge variant="secondary" className="no-default-hover-elevate text-xs">Monthly</Badge>
              </CardHeader>
              <CardContent>
                {monthlyTrends.length === 0 ? (
                  <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">No billing data yet</div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={monthlyTrends}>
                      <defs>
                        <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(262, 83%, 58%)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(262, 83%, 58%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 16%, 47%, 0.15)" />
                      <XAxis dataKey="month" tickFormatter={formatMonth} fontSize={12} stroke="hsl(215, 16%, 47%)" />
                      <YAxis fontSize={12} stroke="hsl(215, 16%, 47%)" tickFormatter={(v) => `\u00a3${v}`} />
                      <Tooltip
                        formatter={(value: number) => [`\u00a3${value.toFixed(2)}`, "Revenue"]}
                        labelFormatter={formatMonth}
                        contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: "12px" }}
                      />
                      <Area type="monotone" dataKey="revenue" stroke="hsl(262, 83%, 58%)" fill="url(#revGrad)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card data-testid="chart-package-breakdown">
              <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Revenue by Package
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pieData.length === 0 ? (
                  <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">No package data yet</div>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={3}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {pieData.map((entry, i) => (
                            <Cell key={i} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => [`\u00a3${value.toFixed(2)}`, "Revenue"]}
                          contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: "12px" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex gap-4 flex-wrap justify-center">
                      {packageBreakdown.map(p => (
                        <div key={p.deploymentModel} className="text-center">
                          <PackageBadge model={p.deploymentModel} />
                          <p className="text-sm font-semibold mt-1">{fmt(p.revenue)}</p>
                          <p className="text-xs text-muted-foreground">{p.calls} calls | {p.minutes} min</p>
                          <p className="text-xs text-muted-foreground">{PACKAGE_RATES[p.deploymentModel] || ""}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card data-testid="chart-calls-vs-revenue">
            <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Calls & Minutes Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyTrends.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">No data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 16%, 47%, 0.15)" />
                    <XAxis dataKey="month" tickFormatter={formatMonth} fontSize={12} stroke="hsl(215, 16%, 47%)" />
                    <YAxis yAxisId="left" fontSize={12} stroke="hsl(215, 16%, 47%)" />
                    <YAxis yAxisId="right" orientation="right" fontSize={12} stroke="hsl(215, 16%, 47%)" />
                    <Tooltip
                      labelFormatter={formatMonth}
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: "12px" }}
                    />
                    <Legend wrapperStyle={{ fontSize: "12px" }} />
                    <Bar yAxisId="left" dataKey="calls" name="Calls" fill="hsl(217, 91%, 60%)" radius={[2, 2, 0, 0]} />
                    <Bar yAxisId="right" dataKey="minutes" name="Minutes" fill="hsl(142, 71%, 45%)" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clients" className="space-y-4">
          <Card data-testid="table-top-clients">
            <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                Top Clients by Revenue
              </CardTitle>
              <Badge variant="secondary" className="no-default-hover-elevate text-xs">Top 15</Badge>
            </CardHeader>
            <CardContent>
              {topClients.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No client billing data yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">#</TableHead>
                        <TableHead className="text-xs">Client</TableHead>
                        <TableHead className="text-xs">Package</TableHead>
                        <TableHead className="text-xs text-right">Revenue</TableHead>
                        <TableHead className="text-xs text-right">Calls</TableHead>
                        <TableHead className="text-xs text-right">Minutes</TableHead>
                        <TableHead className="text-xs text-right">Avg/Call</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topClients.map((client, i) => (
                        <TableRow key={client.orgId} data-testid={`row-client-${client.orgId}`}>
                          <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                          <TableCell className="text-sm font-medium">{client.orgName}</TableCell>
                          <TableCell><PackageBadge model={client.deploymentModel} /></TableCell>
                          <TableCell className="text-sm text-right font-semibold">{fmt(client.revenue)}</TableCell>
                          <TableCell className="text-sm text-right">{client.calls.toLocaleString()}</TableCell>
                          <TableCell className="text-sm text-right">{client.minutes.toLocaleString()}</TableCell>
                          <TableCell className="text-sm text-right text-muted-foreground">
                            {client.calls > 0 ? fmt(client.revenue / client.calls) : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <Card data-testid="table-transactions">
            <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Recent Transactions
              </CardTitle>
              <Badge variant="secondary" className="no-default-hover-elevate text-xs">Last 50</Badge>
            </CardHeader>
            <CardContent>
              {recentTransactions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No transactions yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Date</TableHead>
                        <TableHead className="text-xs">Client</TableHead>
                        <TableHead className="text-xs">Type</TableHead>
                        <TableHead className="text-xs text-right">Amount</TableHead>
                        <TableHead className="text-xs">Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentTransactions.map(txn => (
                        <TableRow key={txn.id} data-testid={`row-txn-${txn.id}`}>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(txn.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </TableCell>
                          <TableCell className="text-sm">{txn.orgName}</TableCell>
                          <TableCell><TxnTypeBadge type={txn.type} /></TableCell>
                          <TableCell className={`text-sm text-right font-medium ${txn.amount >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                            {txn.amount >= 0 ? "+" : ""}{fmt(txn.amount)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{txn.description || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="commissions" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Platform Take</span>
                  <PoundSterling className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400" data-testid="text-platform-revenue">{fmt(totalPlatformRevenue)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Commissions Paid</span>
                  <Network className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold" data-testid="text-total-commissions">{fmt(totalCommissions)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Net Margin</span>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold" data-testid="text-net-margin">
                  {totalPlatformRevenue + totalCommissions > 0
                    ? `${Math.round((totalPlatformRevenue / (totalPlatformRevenue + totalCommissions)) * 100)}%`
                    : "N/A"}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card data-testid="table-commissions">
            <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Network className="h-4 w-4" />
                Commission Breakdown by Channel
              </CardTitle>
            </CardHeader>
            <CardContent>
              {commissionSummary.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No distribution data yet</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Channel</TableHead>
                        <TableHead className="text-xs text-right">Total</TableHead>
                        <TableHead className="text-xs text-right">Platform</TableHead>
                        <TableHead className="text-xs text-right">Partners</TableHead>
                        <TableHead className="text-xs text-right">Resellers</TableHead>
                        <TableHead className="text-xs text-right">Affiliates</TableHead>
                        <TableHead className="text-xs text-right">Txns</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {commissionSummary.map(c => (
                        <TableRow key={c.channel} data-testid={`row-channel-${c.channel}`}>
                          <TableCell className="text-sm font-medium capitalize">{c.channel}</TableCell>
                          <TableCell className="text-sm text-right font-semibold">{fmt(c.totalAmount)}</TableCell>
                          <TableCell className="text-sm text-right text-emerald-600 dark:text-emerald-400">{fmt(c.platformAmount)}</TableCell>
                          <TableCell className="text-sm text-right">{fmt(c.partnerAmount)}</TableCell>
                          <TableCell className="text-sm text-right">{fmt(c.resellerAmount)}</TableCell>
                          <TableCell className="text-sm text-right">{fmt(c.affiliateAmount)}</TableCell>
                          <TableCell className="text-sm text-right text-muted-foreground">{c.count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
