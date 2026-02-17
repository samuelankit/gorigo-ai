"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Calculator,
  TrendingUp,
  PoundSterling,
  BarChart3,
  Zap,
  Phone,
  CreditCard,
  Server,
  Users,
} from "lucide-react";

interface CategoryRow {
  category: string;
  totalCost: string;
  totalRevenue: string;
  totalMargin: string;
  eventCount: number;
  totalInputTokens: string;
  totalOutputTokens: string;
}

interface ProviderRow {
  provider: string;
  model: string | null;
  totalCost: string;
  eventCount: number;
  totalInputTokens: string;
  totalOutputTokens: string;
}

interface SummaryData {
  totals: {
    totalCost: string;
    totalRevenue: string;
    totalMargin: string;
    eventCount: number;
    marginPercent: string;
  };
  byCategory: CategoryRow[];
  byProvider: ProviderRow[];
}

interface RevenueRow {
  referenceType: string | null;
  totalRevenue: string;
  txCount: number;
}

interface DistributionData {
  totalAmount: string;
  platformAmount: string;
  partnerAmount: string;
  resellerAmount: string;
  affiliateAmount: string;
  eventCount: number;
}

interface TrendRow {
  date: string;
  category: string;
  totalCost: string;
  totalRevenue: string;
  eventCount: number;
}

interface SimulationResult {
  revenue: {
    totalRevenueFromCalls: number;
    revenuePerCall: number;
    revenuePerMinute: number;
    totalMinutes: number;
  };
  costs: {
    llm: { totalCost: number; costPerCall: number; model: string; avgInputTokens: number; avgOutputTokens: number };
    telephony: { totalCost: number; costPerCall: number; ratePerMinute: number; country: string };
    stripe: { totalFees: number; monthlyTopUps: number };
    infrastructure: { server: number; database: number; total: number };
    totalCOGS: number;
    costPerCall: number;
  };
  commissions: { partner: number; affiliate: number; total: number };
  profitability: {
    grossProfit: number;
    grossMarginPercent: number;
    netProfit: number;
    netMarginPercent: number;
    profitPerCall: number;
    breakEvenCalls: number;
  };
}

const fmt = (v: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(v);

const fmtNum = (v: number) =>
  new Intl.NumberFormat("en-GB").format(v);

const fmtPct = (v: number) => `${v.toFixed(1)}%`;

export default function UnitEconomicsPage() {
  const [activeTab, setActiveTab] = useState("overview");

  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueRow[]>([]);
  const [distributionData, setDistributionData] = useState<DistributionData | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  const [trendsData, setTrendsData] = useState<TrendRow[]>([]);
  const [trendsDays, setTrendsDays] = useState(30);
  const [trendsLoading, setTrendsLoading] = useState(false);

  const [simResult, setSimResult] = useState<SimulationResult | null>(null);
  const [simLoading, setSimLoading] = useState(false);
  const [callsPerMonth, setCallsPerMonth] = useState(1000);
  const [avgCallDuration, setAvgCallDuration] = useState(3);
  const [avgLLMTokens, setAvgLLMTokens] = useState(2000);
  const [ratePerMinute, setRatePerMinute] = useState(0.15);
  const [llmModel, setLlmModel] = useState("gpt-4o-mini");
  const [country, setCountry] = useState("GB");
  const [partnerCommission, setPartnerCommission] = useState(10);
  const [affiliateCommission, setAffiliateCommission] = useState(5);
  const [avgTopUp, setAvgTopUp] = useState(50);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSummaryLoading(true);
    fetch("/api/admin/unit-economics?view=summary")
      .then((r) => r.json())
      .then((d) => {
        if (d?.summary) setSummaryData(d.summary);
        if (d?.revenue) setRevenueData(d.revenue);
        if (d?.distribution) setDistributionData(d.distribution);
      })
      .catch((error) => { console.error("Fetch unit economics summary failed:", error); })
      .finally(() => setSummaryLoading(false));
  }, []);

  const fetchTrends = useCallback((days: number) => {
    setTrendsLoading(true);
    fetch(`/api/admin/unit-economics?view=trends&days=${days}`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.trends) setTrendsData(d.trends);
      })
      .catch((error) => { console.error("Fetch unit economics trends failed:", error); })
      .finally(() => setTrendsLoading(false));
  }, []);

  useEffect(() => {
    if (activeTab === "trends") {
      fetchTrends(trendsDays);
    }
  }, [activeTab, trendsDays, fetchTrends]);

  const runSimulation = useCallback(() => {
    setSimLoading(true);
    fetch("/api/admin/unit-economics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "simulate",
        callsPerMonth,
        avgCallDurationMinutes: avgCallDuration,
        avgLLMTokensPerCall: avgLLMTokens,
        ratePerMinuteCharged: ratePerMinute,
        llmModel,
        countryCode: country,
        partnerCommissionPercent: partnerCommission,
        affiliateCommissionPercent: affiliateCommission,
        topUpAmountAvg: avgTopUp,
      }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d?.simulation) setSimResult(d.simulation);
      })
      .catch((error) => { console.error("Run unit economics simulation failed:", error); })
      .finally(() => setSimLoading(false));
  }, [callsPerMonth, avgCallDuration, avgLLMTokens, ratePerMinute, llmModel, country, partnerCommission, affiliateCommission, avgTopUp]);

  useEffect(() => {
    if (activeTab !== "simulator") return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runSimulation();
    }, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [activeTab, runSimulation]);

  const chartData = (() => {
    const map: Record<string, { date: string; cost: number; revenue: number }> = {};
    trendsData.forEach((row) => {
      if (!map[row.date]) {
        map[row.date] = { date: row.date, cost: 0, revenue: 0 };
      }
      map[row.date].cost += parseFloat(row.totalCost);
      map[row.date].revenue += parseFloat(row.totalRevenue);
    });
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
  })();

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-start gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-violet-500/10">
          <Calculator className="w-5 h-5 text-violet-600 dark:text-violet-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-page-title">
            Unit Economics
          </h1>
          <p className="text-sm text-muted-foreground">Cost breakdown, trends, and pricing simulation</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList data-testid="tabs-unit-economics">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="trends" data-testid="tab-trends">Trends</TabsTrigger>
          <TabsTrigger value="simulator" data-testid="tab-simulator">Simulator</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {summaryLoading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {[1, 2].map((i) => <Skeleton key={i} className="h-64 w-full" />)}
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Cost</span>
                      <PoundSterling className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="text-2xl font-bold" data-testid="text-total-cost">
                      {fmt(parseFloat(summaryData?.totals?.totalCost || "0"))}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Revenue</span>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="text-2xl font-bold" data-testid="text-total-revenue">
                      {fmt(parseFloat(summaryData?.totals?.totalRevenue || "0"))}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Gross Margin</span>
                      <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="text-2xl font-bold" data-testid="text-gross-margin">
                      {summaryData?.totals?.marginPercent || "0"}%
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Event Count</span>
                      <Zap className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="text-2xl font-bold" data-testid="text-event-count">
                      {fmtNum(summaryData?.totals?.eventCount || 0)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap pb-3">
                    <CardTitle className="text-base">Cost by Category</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(!summaryData?.byCategory || summaryData.byCategory.length === 0) ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No cost data yet</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table data-testid="table-cost-by-category">
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs">Category</TableHead>
                              <TableHead className="text-xs text-right">Total Cost</TableHead>
                              <TableHead className="text-xs text-right">Revenue</TableHead>
                              <TableHead className="text-xs text-right">Margin</TableHead>
                              <TableHead className="text-xs text-right">Events</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {summaryData.byCategory.map((row) => (
                              <TableRow key={row.category} data-testid={`row-category-${row.category}`}>
                                <TableCell className="text-sm font-medium capitalize">{row.category}</TableCell>
                                <TableCell className="text-sm text-right">{fmt(parseFloat(row.totalCost))}</TableCell>
                                <TableCell className="text-sm text-right">{fmt(parseFloat(row.totalRevenue))}</TableCell>
                                <TableCell className="text-sm text-right">{fmt(parseFloat(row.totalMargin))}</TableCell>
                                <TableCell className="text-sm text-right text-muted-foreground">{row.eventCount}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap pb-3">
                    <CardTitle className="text-base">Cost by Provider / Model</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(!summaryData?.byProvider || summaryData.byProvider.length === 0) ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No provider data yet</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table data-testid="table-cost-by-provider">
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs">Provider</TableHead>
                              <TableHead className="text-xs">Model</TableHead>
                              <TableHead className="text-xs text-right">Total Cost</TableHead>
                              <TableHead className="text-xs text-right">Tokens In</TableHead>
                              <TableHead className="text-xs text-right">Tokens Out</TableHead>
                              <TableHead className="text-xs text-right">Events</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {summaryData.byProvider.map((row, i) => (
                              <TableRow key={`${row.provider}-${row.model}-${i}`} data-testid={`row-provider-${i}`}>
                                <TableCell className="text-sm font-medium">{row.provider}</TableCell>
                                <TableCell className="text-sm text-muted-foreground">{row.model || "-"}</TableCell>
                                <TableCell className="text-sm text-right">{fmt(parseFloat(row.totalCost))}</TableCell>
                                <TableCell className="text-sm text-right text-muted-foreground">{fmtNum(parseInt(row.totalInputTokens))}</TableCell>
                                <TableCell className="text-sm text-right text-muted-foreground">{fmtNum(parseInt(row.totalOutputTokens))}</TableCell>
                                <TableCell className="text-sm text-right text-muted-foreground">{row.eventCount}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {distributionData && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Revenue Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div data-testid="text-platform-amount">
                        <p className="text-xs text-muted-foreground mb-1">Platform Amount</p>
                        <p className="text-lg font-semibold">{fmt(parseFloat(distributionData.platformAmount))}</p>
                      </div>
                      <div data-testid="text-partner-amount">
                        <p className="text-xs text-muted-foreground mb-1">Partner Amount</p>
                        <p className="text-lg font-semibold">{fmt(parseFloat(distributionData.partnerAmount))}</p>
                      </div>
                      <div data-testid="text-reseller-amount">
                        <p className="text-xs text-muted-foreground mb-1">Reseller Amount</p>
                        <p className="text-lg font-semibold">{fmt(parseFloat(distributionData.resellerAmount))}</p>
                      </div>
                      <div data-testid="text-affiliate-amount">
                        <p className="text-xs text-muted-foreground mb-1">Affiliate Amount</p>
                        <p className="text-lg font-semibold">{fmt(parseFloat(distributionData.affiliateAmount))}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {revenueData.length > 0 && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      Revenue by Reference Type
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table data-testid="table-revenue-by-ref">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Reference Type</TableHead>
                            <TableHead className="text-xs text-right">Total Revenue</TableHead>
                            <TableHead className="text-xs text-right">Transactions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {revenueData.map((row, i) => (
                            <TableRow key={i} data-testid={`row-revenue-ref-${i}`}>
                              <TableCell className="text-sm font-medium capitalize">{row.referenceType || "Unknown"}</TableCell>
                              <TableCell className="text-sm text-right">{fmt(parseFloat(row.totalRevenue))}</TableCell>
                              <TableCell className="text-sm text-right text-muted-foreground">{row.txCount}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">Date range:</span>
            {[7, 30, 90].map((d) => (
              <Button
                key={d}
                variant={trendsDays === d ? "default" : "outline"}
                size="sm"
                onClick={() => setTrendsDays(d)}
                data-testid={`button-trends-${d}d`}
              >
                {d}d
              </Button>
            ))}
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Cost vs Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              {trendsLoading ? (
                <Skeleton className="h-80 w-full" />
              ) : chartData.length === 0 ? (
                <div className="flex items-center justify-center h-80 text-sm text-muted-foreground">
                  No trend data available
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={360} data-testid="chart-trends">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="revGrad2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 16%, 47%, 0.15)" />
                    <XAxis
                      dataKey="date"
                      fontSize={12}
                      stroke="hsl(215, 16%, 47%)"
                      tickFormatter={(v) => {
                        const d = new Date(v);
                        return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
                      }}
                    />
                    <YAxis fontSize={12} stroke="hsl(215, 16%, 47%)" tickFormatter={(v) => `\u00a3${v}`} />
                    <Tooltip
                      formatter={(value: number, name: string) => [fmt(value), name === "cost" ? "Cost" : "Revenue"]}
                      labelFormatter={(label) => {
                        const d = new Date(label);
                        return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
                      }}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "6px",
                        fontSize: "12px",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="cost"
                      stroke="hsl(0, 84%, 60%)"
                      fill="url(#costGrad)"
                      strokeWidth={2}
                      stackId="1"
                      name="Cost"
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="hsl(142, 71%, 45%)"
                      fill="url(#revGrad2)"
                      strokeWidth={2}
                      stackId="2"
                      name="Revenue"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="simulator" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                Pricing Simulator
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="sim-calls" className="text-xs text-muted-foreground">Calls per Month</Label>
                  <Input
                    id="sim-calls"
                    type="number"
                    min={0}
                    value={callsPerMonth}
                    onChange={(e) => setCallsPerMonth(parseInt(e.target.value) || 0)}
                    data-testid="input-calls-per-month"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sim-duration" className="text-xs text-muted-foreground">Avg Call Duration (min)</Label>
                  <Input
                    id="sim-duration"
                    type="number"
                    min={0}
                    step={0.5}
                    value={avgCallDuration}
                    onChange={(e) => setAvgCallDuration(parseFloat(e.target.value) || 0)}
                    data-testid="input-avg-duration"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sim-tokens" className="text-xs text-muted-foreground">Avg LLM Tokens per Call</Label>
                  <Input
                    id="sim-tokens"
                    type="number"
                    min={0}
                    value={avgLLMTokens}
                    onChange={(e) => setAvgLLMTokens(parseInt(e.target.value) || 0)}
                    data-testid="input-avg-tokens"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sim-rate" className="text-xs text-muted-foreground">Rate Charged per Minute (GBP)</Label>
                  <Input
                    id="sim-rate"
                    type="number"
                    min={0}
                    step={0.01}
                    value={ratePerMinute}
                    onChange={(e) => setRatePerMinute(parseFloat(e.target.value) || 0)}
                    data-testid="input-rate-per-minute"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">LLM Model</Label>
                  <Select value={llmModel} onValueChange={setLlmModel}>
                    <SelectTrigger data-testid="select-llm-model">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gpt-4o-mini">gpt-4o-mini</SelectItem>
                      <SelectItem value="gpt-4o">gpt-4o</SelectItem>
                      <SelectItem value="claude-sonnet-4-5">claude-sonnet-4-5</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Country</Label>
                  <Select value={country} onValueChange={setCountry}>
                    <SelectTrigger data-testid="select-country">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GB">GB</SelectItem>
                      <SelectItem value="US">US</SelectItem>
                      <SelectItem value="DE">DE</SelectItem>
                      <SelectItem value="FR">FR</SelectItem>
                      <SelectItem value="ES">ES</SelectItem>
                      <SelectItem value="IT">IT</SelectItem>
                      <SelectItem value="NL">NL</SelectItem>
                      <SelectItem value="SE">SE</SelectItem>
                      <SelectItem value="IE">IE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sim-partner" className="text-xs text-muted-foreground">Partner Commission %</Label>
                  <Input
                    id="sim-partner"
                    type="number"
                    min={0}
                    max={100}
                    value={partnerCommission}
                    onChange={(e) => setPartnerCommission(parseFloat(e.target.value) || 0)}
                    data-testid="input-partner-commission"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sim-affiliate" className="text-xs text-muted-foreground">Affiliate Commission %</Label>
                  <Input
                    id="sim-affiliate"
                    type="number"
                    min={0}
                    max={100}
                    value={affiliateCommission}
                    onChange={(e) => setAffiliateCommission(parseFloat(e.target.value) || 0)}
                    data-testid="input-affiliate-commission"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sim-topup" className="text-xs text-muted-foreground">Avg Top-Up Amount</Label>
                  <Input
                    id="sim-topup"
                    type="number"
                    min={0}
                    step={1}
                    value={avgTopUp}
                    onChange={(e) => setAvgTopUp(parseFloat(e.target.value) || 0)}
                    data-testid="input-avg-topup"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {simLoading && !simResult && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
            </div>
          )}

          {simResult && (
            <>
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                  <PoundSterling className="h-4 w-4" />
                  Revenue
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground mb-1">Total Revenue</p>
                      <p className="text-lg font-bold" data-testid="text-sim-total-revenue">{fmt(simResult.revenue.totalRevenueFromCalls)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground mb-1">Revenue per Call</p>
                      <p className="text-lg font-bold" data-testid="text-sim-revenue-per-call">{fmt(simResult.revenue.revenuePerCall)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground mb-1">Revenue per Minute</p>
                      <p className="text-lg font-bold" data-testid="text-sim-revenue-per-min">{fmt(simResult.revenue.revenuePerMinute)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground mb-1">Total Minutes</p>
                      <p className="text-lg font-bold" data-testid="text-sim-total-minutes">{fmtNum(simResult.revenue.totalMinutes)}</p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                  <Server className="h-4 w-4" />
                  Costs
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground mb-1">LLM Cost</p>
                      <p className="text-lg font-bold" data-testid="text-sim-llm-cost">{fmt(simResult.costs.llm.totalCost)}</p>
                      <p className="text-xs text-muted-foreground">{fmt(simResult.costs.llm.costPerCall)} / call</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground mb-1">Telephony Cost</p>
                      <p className="text-lg font-bold" data-testid="text-sim-telephony-cost">{fmt(simResult.costs.telephony.totalCost)}</p>
                      <p className="text-xs text-muted-foreground">{fmt(simResult.costs.telephony.costPerCall)} / call</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground mb-1">Stripe Fees</p>
                      <p className="text-lg font-bold" data-testid="text-sim-stripe-fees">{fmt(simResult.costs.stripe.totalFees)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground mb-1">Infrastructure</p>
                      <p className="text-lg font-bold" data-testid="text-sim-infra-cost">{fmt(simResult.costs.infrastructure.total)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground mb-1">Total COGS</p>
                      <p className="text-lg font-bold" data-testid="text-sim-total-cogs">{fmt(simResult.costs.totalCOGS)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground mb-1">Cost per Call</p>
                      <p className="text-lg font-bold" data-testid="text-sim-cost-per-call">{fmt(simResult.costs.costPerCall)}</p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Commissions
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground mb-1">Partner</p>
                      <p className="text-lg font-bold" data-testid="text-sim-partner-commission">{fmt(simResult.commissions.partner)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground mb-1">Affiliate</p>
                      <p className="text-lg font-bold" data-testid="text-sim-affiliate-commission">{fmt(simResult.commissions.affiliate)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground mb-1">Total</p>
                      <p className="text-lg font-bold" data-testid="text-sim-total-commissions">{fmt(simResult.commissions.total)}</p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Profitability
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground mb-1">Gross Profit</p>
                      <p className={`text-lg font-bold ${simResult.profitability.grossProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`} data-testid="text-sim-gross-profit">
                        {fmt(simResult.profitability.grossProfit)}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground mb-1">Gross Margin %</p>
                      <p className="text-lg font-bold" data-testid="text-sim-gross-margin">{fmtPct(simResult.profitability.grossMarginPercent)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground mb-1">Net Profit</p>
                      <p className={`text-lg font-bold ${simResult.profitability.netProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`} data-testid="text-sim-net-profit">
                        {fmt(simResult.profitability.netProfit)}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground mb-1">Net Margin %</p>
                      <p className="text-lg font-bold" data-testid="text-sim-net-margin">{fmtPct(simResult.profitability.netMarginPercent)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground mb-1">Profit per Call</p>
                      <p className="text-lg font-bold" data-testid="text-sim-profit-per-call">{fmt(simResult.profitability.profitPerCall)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground mb-1">Break-even Calls</p>
                      <p className="text-lg font-bold" data-testid="text-sim-breakeven">{fmtNum(simResult.profitability.breakEvenCalls)}</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
