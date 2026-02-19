"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  PoundSterling,
  TrendingUp,
  Calculator,
  Server,
  FileText,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Receipt,
  Building2,
} from "lucide-react";

const fmt = (v: number) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
  }).format(v);

const fmtNum = (v: number) => v === -1 ? "N/A" : new Intl.NumberFormat("en-GB").format(v);

const fmtPct = (v: number) => `${v.toFixed(1)}%`;

const profitColour = (v: number) =>
  v >= 0
    ? "text-green-600 dark:text-green-400"
    : "text-red-600 dark:text-red-400";

const marginColour = (m: number) => {
  if (m > 60) return "text-green-600 dark:text-green-400";
  if (m >= 30) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
};

const CATEGORY_COLOURS: Record<string, string> = {
  llm: "hsl(262, 83%, 58%)",
  stt: "hsl(220, 70%, 50%)",
  tts: "hsl(200, 70%, 50%)",
  telephony: "hsl(142, 71%, 45%)",
  embedding: "hsl(30, 90%, 55%)",
  other: "hsl(0, 0%, 55%)",
};

export default function CostAccountingPage() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("pnl");
  const [days, setDays] = useState(30);

  const [pnlData, setPnlData] = useState<any>(null);
  const [pnlLoading, setPnlLoading] = useState(false);

  const [cogsData, setCogsData] = useState<any>(null);
  const [cogsLoading, setCogsLoading] = useState(false);

  const [pricingData, setPricingData] = useState<any>(null);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [estimatedMinutes, setEstimatedMinutes] = useState(5000);

  const [fixedData, setFixedData] = useState<any>(null);
  const [fixedLoading, setFixedLoading] = useState(false);

  const [taxData, setTaxData] = useState<any>(null);
  const [taxLoading, setTaxLoading] = useState(false);

  const pricingDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d) => {
        if (!d.user || d.user.globalRole !== "SUPERADMIN") {
          window.location.href = "/dashboard";
        } else {
          setUser(d.user);
        }
      });
  }, []);

  const fetchPnl = useCallback((d: number) => {
    setPnlLoading(true);
    fetch(`/api/admin/cost-accounting?tab=pnl&days=${d}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.pnl) setPnlData(data.pnl);
      })
      .catch((e) => console.error("Fetch P&L failed:", e))
      .finally(() => setPnlLoading(false));
  }, []);

  const fetchCogs = useCallback((d: number) => {
    setCogsLoading(true);
    fetch(`/api/admin/cost-accounting?tab=cogs&days=${d}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.cogs) setCogsData(data.cogs);
      })
      .catch((e) => console.error("Fetch COGS failed:", e))
      .finally(() => setCogsLoading(false));
  }, []);

  const fetchPricing = useCallback((d: number, mins: number) => {
    setPricingLoading(true);
    fetch(`/api/admin/cost-accounting?tab=pricing&days=${d}&minutes=${mins}`)
      .then((r) => r.json())
      .then((data) => {
        if (data) setPricingData(data);
      })
      .catch((e) => console.error("Fetch pricing failed:", e))
      .finally(() => setPricingLoading(false));
  }, []);

  const fetchFixed = useCallback(() => {
    setFixedLoading(true);
    fetch(`/api/admin/cost-accounting?tab=fixed`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.fixed) setFixedData(data.fixed);
      })
      .catch((e) => console.error("Fetch fixed costs failed:", e))
      .finally(() => setFixedLoading(false));
  }, []);

  const fetchTax = useCallback((d: number) => {
    setTaxLoading(true);
    fetch(`/api/admin/cost-accounting?tab=tax&days=${d}`)
      .then((r) => r.json())
      .then((data) => {
        if (data) setTaxData(data);
      })
      .catch((e) => console.error("Fetch tax failed:", e))
      .finally(() => setTaxLoading(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    if (activeTab === "pnl") fetchPnl(days);
    if (activeTab === "cogs") fetchCogs(days);
    if (activeTab === "pricing") fetchPricing(days, estimatedMinutes);
    if (activeTab === "fixed") fetchFixed();
    if (activeTab === "tax") fetchTax(days);
  }, [activeTab, days, user, fetchPnl, fetchCogs, fetchPricing, fetchFixed, fetchTax]);

  useEffect(() => {
    if (activeTab !== "pricing" || !user) return;
    if (pricingDebounceRef.current) clearTimeout(pricingDebounceRef.current);
    pricingDebounceRef.current = setTimeout(() => {
      fetchPricing(days, estimatedMinutes);
    }, 600);
    return () => {
      if (pricingDebounceRef.current) clearTimeout(pricingDebounceRef.current);
    };
  }, [estimatedMinutes]);

  const cogsChartData = (() => {
    if (!cogsData?.daily) return [];
    const map: Record<string, Record<string, number>> = {};
    const categories = new Set<string>();
    cogsData.daily.forEach((row: any) => {
      if (!map[row.date]) map[row.date] = { date: 0 };
      map[row.date][row.category] = parseFloat(row.totalCost);
      categories.add(row.category);
    });
    return Object.entries(map)
      .map(([date, vals]) => ({ date, ...vals }))
      .sort((a, b) => a.date.localeCompare(b.date));
  })();

  const cogsCategories = (() => {
    if (!cogsData?.daily) return [];
    const cats = new Set<string>();
    cogsData.daily.forEach((row: any) => cats.add(row.category));
    return Array.from(cats);
  })();

  if (!user) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto" data-testid="page-cost-accounting">
      <div className="flex items-start gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-500/10">
          <Calculator className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-page-title">
            Cost Accounting
          </h1>
          <p className="text-sm text-muted-foreground">
            Profit and loss, cost analysis, pricing recommendations, and UK tax compliance
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm text-muted-foreground">Date range:</span>
        <Select
          value={String(days)}
          onValueChange={(v) => setDays(parseInt(v))}
        >
          <SelectTrigger className="w-32" data-testid="select-days">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="14">Last 14 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="60">Last 60 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList data-testid="tabs-cost-accounting">
          <TabsTrigger value="pnl" data-testid="tab-pnl">P&L Overview</TabsTrigger>
          <TabsTrigger value="cogs" data-testid="tab-cogs">COGS Breakdown</TabsTrigger>
          <TabsTrigger value="pricing" data-testid="tab-pricing">Pricing Advisor</TabsTrigger>
          <TabsTrigger value="fixed" data-testid="tab-fixed">Fixed Costs</TabsTrigger>
          <TabsTrigger value="tax" data-testid="tab-tax">Tax & Compliance</TabsTrigger>
        </TabsList>

        {/* Tab 1: P&L Overview */}
        <TabsContent value="pnl" className="space-y-6">
          {pnlLoading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
              <Skeleton className="h-96 w-full" />
            </div>
          ) : pnlData ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Revenue</span>
                      <PoundSterling className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="text-2xl font-bold" data-testid="text-pnl-revenue">
                      {fmt(pnlData.revenue?.talkTimeRevenue || 0)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Gross Profit</span>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className={`text-2xl font-bold ${profitColour(pnlData.grossProfit?.amount || 0)}`} data-testid="text-pnl-gross-profit">
                      {fmt(pnlData.grossProfit?.amount || 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">{fmtPct(pnlData.grossProfit?.margin || 0)} margin</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Operating Profit</span>
                      <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className={`text-2xl font-bold ${profitColour(pnlData.operatingProfit?.amount || 0)}`} data-testid="text-pnl-operating-profit">
                      {fmt(pnlData.operatingProfit?.amount || 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">{fmtPct(pnlData.operatingProfit?.margin || 0)} margin</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Net Profit</span>
                      <Calculator className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className={`text-2xl font-bold ${profitColour(pnlData.netProfit?.amount || 0)}`} data-testid="text-pnl-net-profit">
                      {fmt(pnlData.netProfit?.amount || 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">{fmtPct(pnlData.netProfit?.margin || 0)} margin</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Profit & Loss Statement
                  </CardTitle>
                  <span className="text-xs text-muted-foreground">Last {days} days</span>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table data-testid="table-pnl">
                      <TableBody>
                        <TableRow className="font-bold">
                          <TableCell>Revenue</TableCell>
                          <TableCell className="text-right" data-testid="text-pnl-revenue-line">
                            {fmt(pnlData.revenue?.talkTimeRevenue || 0)}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="text-muted-foreground text-sm">
                            Cash received ({pnlData.revenue?.topUpCount || 0} top-ups)
                          </TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">
                            {fmt(pnlData.revenue?.cashReceived || 0)}
                          </TableCell>
                        </TableRow>

                        <TableRow>
                          <TableCell colSpan={2} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-4">
                            Less: Cost of Goods Sold
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="pl-8 text-sm">LLM / AI Costs</TableCell>
                          <TableCell className="text-right text-sm text-red-600 dark:text-red-400">
                            ({fmt(pnlData.cogs?.llmCosts || 0)})
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="pl-8 text-sm">Telephony Costs</TableCell>
                          <TableCell className="text-right text-sm text-red-600 dark:text-red-400">
                            ({fmt(pnlData.cogs?.telephonyCosts || 0)})
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="pl-8 text-sm">Stripe Fees</TableCell>
                          <TableCell className="text-right text-sm text-red-600 dark:text-red-400">
                            ({fmt(pnlData.cogs?.stripeFees || 0)})
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="pl-8 text-sm">Other Variable Costs</TableCell>
                          <TableCell className="text-right text-sm text-red-600 dark:text-red-400">
                            ({fmt(pnlData.cogs?.otherVariableCosts || 0)})
                          </TableCell>
                        </TableRow>
                        <TableRow className="border-t">
                          <TableCell className="pl-8 font-medium text-sm">Total COGS</TableCell>
                          <TableCell className="text-right font-medium text-sm text-red-600 dark:text-red-400">
                            ({fmt(pnlData.cogs?.totalCOGS || 0)})
                          </TableCell>
                        </TableRow>

                        <TableRow className="font-bold border-t-2">
                          <TableCell className={profitColour(pnlData.grossProfit?.amount || 0)}>
                            Gross Profit
                          </TableCell>
                          <TableCell className={`text-right ${profitColour(pnlData.grossProfit?.amount || 0)}`} data-testid="text-pnl-gross-line">
                            {fmt(pnlData.grossProfit?.amount || 0)}
                            <span className="text-xs ml-2 font-normal text-muted-foreground">
                              ({fmtPct(pnlData.grossProfit?.margin || 0)})
                            </span>
                          </TableCell>
                        </TableRow>

                        <TableRow>
                          <TableCell colSpan={2} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-4">
                            Less: Operating Expenses
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="pl-8 text-sm">Infrastructure</TableCell>
                          <TableCell className="text-right text-sm text-red-600 dark:text-red-400">
                            ({fmt(pnlData.operatingExpenses?.infrastructure || 0)})
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="pl-8 text-sm">Partner Commissions</TableCell>
                          <TableCell className="text-right text-sm text-red-600 dark:text-red-400">
                            ({fmt(pnlData.operatingExpenses?.partnerCommissions || 0)})
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="pl-8 text-sm">Reseller Commissions</TableCell>
                          <TableCell className="text-right text-sm text-red-600 dark:text-red-400">
                            ({fmt(pnlData.operatingExpenses?.resellerCommissions || 0)})
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="pl-8 text-sm">Affiliate Commissions</TableCell>
                          <TableCell className="text-right text-sm text-red-600 dark:text-red-400">
                            ({fmt(pnlData.operatingExpenses?.affiliateCommissions || 0)})
                          </TableCell>
                        </TableRow>
                        <TableRow className="border-t">
                          <TableCell className="pl-8 font-medium text-sm">Total Operating Expenses</TableCell>
                          <TableCell className="text-right font-medium text-sm text-red-600 dark:text-red-400">
                            ({fmt(pnlData.operatingExpenses?.totalOpex || 0)})
                          </TableCell>
                        </TableRow>

                        <TableRow className="font-bold border-t-2">
                          <TableCell className={profitColour(pnlData.operatingProfit?.amount || 0)}>
                            Operating Profit
                          </TableCell>
                          <TableCell className={`text-right ${profitColour(pnlData.operatingProfit?.amount || 0)}`} data-testid="text-pnl-operating-line">
                            {fmt(pnlData.operatingProfit?.amount || 0)}
                            <span className="text-xs ml-2 font-normal text-muted-foreground">
                              ({fmtPct(pnlData.operatingProfit?.margin || 0)})
                            </span>
                          </TableCell>
                        </TableRow>

                        <TableRow>
                          <TableCell colSpan={2} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-4">
                            Less: Corporation Tax Provision
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="pl-8 text-sm">
                            {pnlData.tax?.bracket || "N/A"} ({fmtPct(pnlData.tax?.effectiveRate || 0)} effective)
                          </TableCell>
                          <TableCell className="text-right text-sm text-red-600 dark:text-red-400">
                            ({fmt(pnlData.tax?.provisionedForPeriod || 0)})
                          </TableCell>
                        </TableRow>

                        <TableRow className="font-bold border-t-2 border-double">
                          <TableCell className={profitColour(pnlData.netProfit?.amount || 0)}>
                            Net Profit
                          </TableCell>
                          <TableCell className={`text-right ${profitColour(pnlData.netProfit?.amount || 0)}`} data-testid="text-pnl-net-line">
                            {fmt(pnlData.netProfit?.amount || 0)}
                            <span className="text-xs ml-2 font-normal text-muted-foreground">
                              ({fmtPct(pnlData.netProfit?.margin || 0)})
                            </span>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No P&L data available</p>
          )}
        </TabsContent>

        {/* Tab 2: COGS Breakdown */}
        <TabsContent value="cogs" className="space-y-6">
          {cogsLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-80 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : cogsData ? (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Daily Costs by Category
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {cogsChartData.length === 0 ? (
                    <div className="flex items-center justify-center h-80 text-sm text-muted-foreground">
                      No daily cost data available
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={360} data-testid="chart-cogs-daily">
                      <AreaChart data={cogsChartData}>
                        <defs>
                          {cogsCategories.map((cat) => (
                            <linearGradient key={cat} id={`grad-${cat}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={CATEGORY_COLOURS[cat] || CATEGORY_COLOURS.other} stopOpacity={0.4} />
                              <stop offset="95%" stopColor={CATEGORY_COLOURS[cat] || CATEGORY_COLOURS.other} stopOpacity={0} />
                            </linearGradient>
                          ))}
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 16%, 47%, 0.15)" />
                        <XAxis
                          dataKey="date"
                          fontSize={12}
                          stroke="hsl(215, 16%, 47%)"
                          tickFormatter={(v) => {
                            const d = new Date(v);
                            return d.toLocaleDateString("en-GB", { month: "short", day: "numeric" });
                          }}
                        />
                        <YAxis
                          fontSize={12}
                          stroke="hsl(215, 16%, 47%)"
                          tickFormatter={(v) => `\u00a3${v}`}
                        />
                        <Tooltip
                          formatter={(value: number, name: string) => [fmt(value), name]}
                          labelFormatter={(label) => {
                            const d = new Date(label);
                            return d.toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric" });
                          }}
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "6px",
                            fontSize: "12px",
                          }}
                        />
                        {cogsCategories.map((cat, i) => (
                          <Area
                            key={cat}
                            type="monotone"
                            dataKey={cat}
                            stroke={CATEGORY_COLOURS[cat] || CATEGORY_COLOURS.other}
                            fill={`url(#grad-${cat})`}
                            strokeWidth={2}
                            stackId="1"
                          />
                        ))}
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Server className="h-4 w-4" />
                    Costs by Provider / Model
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(!cogsData.byProvider || cogsData.byProvider.length === 0) ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No provider data available</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table data-testid="table-cogs-provider">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Provider</TableHead>
                            <TableHead className="text-xs">Model</TableHead>
                            <TableHead className="text-xs">Category</TableHead>
                            <TableHead className="text-xs text-right">Total Cost</TableHead>
                            <TableHead className="text-xs text-right">Events</TableHead>
                            <TableHead className="text-xs text-right">Margin</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {cogsData.byProvider.map((row: any, i: number) => (
                            <TableRow key={i} data-testid={`row-cogs-provider-${i}`}>
                              <TableCell className="text-sm font-medium">{row.provider}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">{row.model || "-"}</TableCell>
                              <TableCell className="text-sm capitalize">{row.category}</TableCell>
                              <TableCell className="text-sm text-right">{fmt(parseFloat(row.totalCost))}</TableCell>
                              <TableCell className="text-sm text-right text-muted-foreground">{fmtNum(row.eventCount)}</TableCell>
                              <TableCell className={`text-sm text-right ${profitColour(parseFloat(row.totalMargin))}`}>
                                {fmt(parseFloat(row.totalMargin))}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No COGS data available</p>
          )}
        </TabsContent>

        {/* Tab 3: Pricing Advisor */}
        <TabsContent value="pricing" className="space-y-6">
          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-sm text-muted-foreground" htmlFor="estimated-minutes">
              Estimated Monthly Minutes:
            </label>
            <Input
              id="estimated-minutes"
              type="number"
              value={estimatedMinutes}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setEstimatedMinutes(Number.isFinite(val) && val > 0 ? val : 1);
              }}
              min={1}
              className="w-36"
              data-testid="input-estimated-minutes"
            />
          </div>

          {pricingLoading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-64 w-full" />
                ))}
              </div>
              <Skeleton className="h-48 w-full" />
            </div>
          ) : pricingData ? (
            <>
              {pricingData.recommendations && pricingData.recommendations.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {pricingData.recommendations.map((rec: any) => (
                    <Card key={rec.key} data-testid={`card-pricing-${rec.key}`}>
                      <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap pb-3">
                        <CardTitle className="text-base">{rec.customerType}</CardTitle>
                        <Badge variant="outline" className={marginColour(rec.grossMarginPercent)}>
                          {fmtPct(rec.grossMarginPercent)} gross
                        </Badge>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Current Rate</p>
                            <p className="text-lg font-semibold">{fmt(rec.currentRatePerMin)}/min</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Recommended Rate</p>
                            <p className="text-lg font-semibold text-green-600 dark:text-green-400">{fmt(rec.recommendedRatePerMin)}/min</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Cost/min</p>
                            <p className="text-sm font-medium">{fmt(rec.costPerMin)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Net Margin</p>
                            <p className={`text-sm font-medium ${marginColour(rec.netMarginPercent)}`}>{fmtPct(rec.netMarginPercent)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Min. Viable Rate</p>
                            <p className="text-sm font-medium">{fmt(rec.minimumViableRate)}/min</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Suggested Wallet Deposit</p>
                          <p className="text-sm font-medium">{fmt(rec.suggestedWalletDeposit)}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">{rec.rationale}</p>
                        <p className="text-xs text-muted-foreground italic">{rec.marketBenchmark}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {pricingData.breakEven && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Break-Even Analysis
                    </CardTitle>
                    {pricingData.breakEven.isViable === false && (
                      <Badge variant="destructive" data-testid="badge-not-viable">Not Viable</Badge>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {pricingData.breakEven.notViableReason && (
                      <div className="p-3 rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900" data-testid="alert-not-viable">
                        <p className="text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 shrink-0" />
                          {pricingData.breakEven.notViableReason}
                        </p>
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div data-testid="text-breakeven-minutes">
                        <p className="text-xs text-muted-foreground">Break-Even Minutes</p>
                        <p className="text-xl font-bold">{fmtNum(pricingData.breakEven.breakEvenMinutes)}</p>
                      </div>
                      <div data-testid="text-breakeven-calls">
                        <p className="text-xs text-muted-foreground">Break-Even Calls</p>
                        <p className="text-xl font-bold">{fmtNum(pricingData.breakEven.breakEvenCalls)}</p>
                      </div>
                      <div data-testid="text-contribution-per-min">
                        <p className="text-xs text-muted-foreground">Contribution/min</p>
                        <p className="text-xl font-bold">{fmt(pricingData.breakEven.contributionPerMinute)}</p>
                      </div>
                    </div>

                    {pricingData.breakEven.scenarios && pricingData.breakEven.scenarios.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2">Scenarios</h4>
                        <div className="overflow-x-auto">
                          <Table data-testid="table-scenarios">
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-xs">Scenario</TableHead>
                                <TableHead className="text-xs text-right">Avg Call (mins)</TableHead>
                                <TableHead className="text-xs text-right">Break-Even Calls</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {pricingData.breakEven.scenarios.map((s: any, i: number) => (
                                <TableRow key={i} data-testid={`row-scenario-${i}`}>
                                  <TableCell className="text-sm">{s.label}</TableCell>
                                  <TableCell className="text-sm text-right">{s.avgCallMinutes}</TableCell>
                                  <TableCell className="text-sm text-right font-medium">{fmtNum(s.breakEvenCalls)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}

                    {pricingData.breakEven.monthlyTargets && pricingData.breakEven.monthlyTargets.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2">Monthly Targets</h4>
                        <div className="overflow-x-auto">
                          <Table data-testid="table-monthly-targets">
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-xs">Tier</TableHead>
                                <TableHead className="text-xs text-right">Minutes</TableHead>
                                <TableHead className="text-xs text-right">Revenue</TableHead>
                                <TableHead className="text-xs text-right">Profit</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {pricingData.breakEven.monthlyTargets.map((t: any, i: number) => (
                                <TableRow key={i} data-testid={`row-target-${i}`}>
                                  <TableCell className="text-sm font-medium">{t.tier}</TableCell>
                                  <TableCell className="text-sm text-right">{fmtNum(t.minutes)}</TableCell>
                                  <TableCell className="text-sm text-right">{fmt(t.revenue)}</TableCell>
                                  <TableCell className={`text-sm text-right ${profitColour(t.profit)}`}>{fmt(t.profit)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No pricing data available</p>
          )}
        </TabsContent>

        {/* Tab 4: Fixed Costs */}
        <TabsContent value="fixed" className="space-y-6">
          {fixedLoading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
              <Skeleton className="h-64 w-full" />
            </div>
          ) : fixedData ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Monthly</span>
                      <PoundSterling className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="text-2xl font-bold" data-testid="text-fixed-monthly">{fmt(fixedData.totalMonthly)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Annual</span>
                      <Receipt className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="text-2xl font-bold" data-testid="text-fixed-annual">{fmt(fixedData.totalAnnual)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Azure Monthly</span>
                      <Server className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="text-2xl font-bold" data-testid="text-fixed-azure">{fmt(fixedData.azureMonthly)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Third-Party Monthly</span>
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="text-2xl font-bold" data-testid="text-fixed-thirdparty">{fmt(fixedData.thirdPartyMonthly)}</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap pb-3">
                  <CardTitle className="text-base">Fixed Cost Items</CardTitle>
                </CardHeader>
                <CardContent>
                  {fixedData.items && fixedData.items.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table data-testid="table-fixed-items">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Name</TableHead>
                            <TableHead className="text-xs">Provider</TableHead>
                            <TableHead className="text-xs">Category</TableHead>
                            <TableHead className="text-xs text-right">Monthly Cost</TableHead>
                            <TableHead className="text-xs text-right">Annual Cost</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {fixedData.items.map((item: any, i: number) => (
                            <TableRow key={i} data-testid={`row-fixed-item-${i}`}>
                              <TableCell className="text-sm font-medium">{item.name}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">{item.provider}</TableCell>
                              <TableCell className="text-sm capitalize">{item.category}</TableCell>
                              <TableCell className="text-sm text-right">{fmt(item.monthlyCost)}</TableCell>
                              <TableCell className="text-sm text-right">{fmt(item.monthlyCost * 12)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">No fixed cost items</p>
                  )}
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {fixedData.byCategory && Object.keys(fixedData.byCategory).length > 0 && (
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap pb-3">
                      <CardTitle className="text-base">By Category</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(fixedData.byCategory).map(([cat, amount]) => (
                          <Badge key={cat} variant="secondary" className="capitalize" data-testid={`badge-category-${cat}`}>
                            {cat}: {fmt(amount as number)}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
                {fixedData.byProvider && Object.keys(fixedData.byProvider).length > 0 && (
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap pb-3">
                      <CardTitle className="text-base">By Provider</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(fixedData.byProvider).map(([prov, amount]) => (
                          <Badge key={prov} variant="secondary" data-testid={`badge-provider-${prov}`}>
                            {prov}: {fmt(amount as number)}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              <p className="text-sm text-muted-foreground">
                Amortised per minute depends on your call volume. At 5,000 minutes/month, fixed costs add {fmt(fixedData.totalMonthly / 5000)} per minute.
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No fixed cost data available</p>
          )}
        </TabsContent>

        {/* Tab 5: Tax & Compliance */}
        <TabsContent value="tax" className="space-y-6">
          {taxLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : taxData ? (
            <>
              {taxData.vatStatus && (
                <Card data-testid="card-vat-status">
                  <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Receipt className="h-4 w-4" />
                      VAT Status
                    </CardTitle>
                    <Badge
                      variant={taxData.vatStatus.needsRegistration ? "destructive" : "secondary"}
                      data-testid="badge-vat-status"
                    >
                      {taxData.vatStatus.registered
                        ? "VAT Registered"
                        : taxData.vatStatus.needsRegistration
                          ? "Registration Required"
                          : "Not Registered"}
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Current Turnover (annualised)</p>
                        <p className="text-lg font-semibold">{fmt(taxData.vatStatus.currentTurnover)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">VAT Threshold</p>
                        <p className="text-lg font-semibold">{fmt(taxData.vatStatus.threshold)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Status</p>
                        <p className={`text-lg font-semibold ${taxData.vatStatus.needsRegistration ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
                          {taxData.vatStatus.needsRegistration ? "Action Required" : "Below Threshold"}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{taxData.vatStatus.note}</p>
                  </CardContent>
                </Card>
              )}

              {taxData.tax && (
                <Card data-testid="card-corporation-tax">
                  <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Corporation Tax Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Taxable Profit</p>
                        <p className="text-lg font-semibold" data-testid="text-taxable-profit">{fmt(taxData.tax.taxableProfit)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Tax Rate</p>
                        <p className="text-lg font-semibold">{fmtPct(taxData.tax.taxRate)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Bracket</p>
                        <p className="text-sm font-medium">{taxData.tax.bracket}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Estimated Tax Due</p>
                        <p className="text-lg font-semibold text-red-600 dark:text-red-400" data-testid="text-tax-due">{fmt(taxData.tax.taxDue)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Effective Rate</p>
                        <p className="text-lg font-semibold">{fmtPct(taxData.tax.effectiveRate)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {taxData.expenses && taxData.expenses.length > 0 && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      HMRC Expense Categories (Annualised)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {taxData.expenses.map((cat: any, ci: number) => (
                      <div key={ci} className="space-y-2" data-testid={`section-hmrc-${ci}`}>
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div>
                            <h4 className="text-sm font-semibold">{cat.hmrcCategory}</h4>
                            <p className="text-xs text-muted-foreground">{cat.description}</p>
                          </div>
                          <span className="text-sm font-semibold">{fmt(cat.subtotal)}</span>
                        </div>
                        <div className="overflow-x-auto">
                          <Table>
                            <TableBody>
                              {cat.items.map((item: any, ii: number) => (
                                <TableRow key={ii}>
                                  <TableCell className="text-sm pl-6">{item.name}</TableCell>
                                  <TableCell className="text-sm text-right">{fmt(item.amount)}</TableCell>
                                  <TableCell className="text-sm text-right w-10">
                                    {item.taxDeductible ? (
                                      <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 inline" />
                                    ) : (
                                      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 inline" />
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    ))}

                    <div className="border-t pt-3 flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-sm font-bold">Total Deductible Expenses</span>
                      <span className="text-sm font-bold" data-testid="text-total-deductible">{fmt(taxData.totalDeductible)}</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card data-testid="card-rnd-tax-credits">
                <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    R&D Tax Relief (RDEC)
                  </CardTitle>
                  <Badge variant="secondary">Potential Saving</Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    As an AI software company, GoRigo may qualify for the UK merged R&D scheme (RDEC). From April 2024,
                    qualifying companies can claim a 20% above-the-line credit on eligible R&D expenditure. Eligible costs
                    include software development staff costs, cloud computing for R&D, and subcontracted R&D work.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">RDEC Credit Rate</p>
                      <p className="text-lg font-semibold">20%</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">SME Enhanced Deduction</p>
                      <p className="text-lg font-semibold">86% (loss-making)</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground italic">
                    Consult an R&D tax specialist to confirm eligibility. GoRigo&apos;s AI agent development, RAG system,
                    and voice biometrics work are strong candidates for qualifying expenditure.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Important Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
                    <li>Prices are currently VAT-exclusive. When VAT registration is required, add 20% to customer-facing prices.</li>
                    <li>Corporation Tax is payable 9 months and 1 day after the end of your accounting period.</li>
                    <li>Keep all receipts and invoices. Digital records are acceptable under Making Tax Digital.</li>
                    <li>Stripe UK fees: 1.5% + 20p for European cards, 2.9% + 20p for non-European cards.</li>
                    <li>These figures are estimates. Consult a chartered accountant for formal tax returns.</li>
                  </ul>
                </CardContent>
              </Card>
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No tax data available</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}