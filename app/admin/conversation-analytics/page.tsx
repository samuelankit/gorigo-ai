"use client";

import { useEffect, useState, useCallback, Fragment } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Phone, TrendingUp, Star, Clock, DollarSign, CheckCircle, BrainCircuit,
  RefreshCw, ChevronDown, ChevronUp, X, AlertTriangle, Info, AlertCircle,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

const COLORS = {
  positive: "hsl(142, 71%, 45%)",
  negative: "hsl(0, 84%, 60%)",
  neutral: "hsl(38, 92%, 50%)",
  primary: "hsl(262, 83%, 58%)",
  secondary: "hsl(217, 91%, 60%)",
};

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "6px",
  fontSize: "12px",
};

const defaultFrom = () => {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().split("T")[0];
};
const defaultTo = () => new Date().toISOString().split("T")[0];

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function fmtNum(n: number | string | null | undefined, dec = 1): string {
  const v = typeof n === "string" ? parseFloat(n) : n;
  if (v == null || isNaN(v)) return "0";
  return v.toFixed(dec);
}

function fmtDur(sec: number | null | undefined): string {
  if (!sec || sec <= 0) return "0s";
  const m = Math.floor(sec / 60), s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function fmtPct(n: number | string | null | undefined): string {
  const v = typeof n === "string" ? parseFloat(n) : n;
  if (v == null || isNaN(v)) return "0%";
  return `${(v * 100).toFixed(1)}%`;
}

function severityVariant(s: string): "default" | "destructive" | "secondary" | "outline" {
  if (s === "critical" || s === "high") return "destructive";
  if (s === "medium") return "default";
  return "secondary";
}

export default function ConversationAnalyticsPage() {
  const [tab, setTab] = useState("overview");
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [overview, setOverview] = useState<any>(null);
  const [sentiment, setSentiment] = useState<any>(null);
  const [quality, setQuality] = useState<any>(null);
  const [agents, setAgents] = useState<any>(null);
  const [topics, setTopics] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedAgent, setExpandedAgent] = useState<number | null>(null);
  const [agentTrend, setAgentTrend] = useState<any[]>([]);
  const [sortCol, setSortCol] = useState("overallScore");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const params = `orgId=1&from=${from}&to=${to}`;

  const fetchTab = useCallback(async (t: string) => {
    setLoading(true);
    try {
      if (t === "overview") {
        const r = await fetch(`/api/admin/conversation-analytics?${params}`);
        const d = await r.json();
        if (!d.error) setOverview(d);
      } else if (t === "sentiment") {
        const r = await fetch(`/api/admin/conversation-analytics/sentiment-trends?${params}`);
        const d = await r.json();
        if (!d.error) setSentiment(d);
      } else if (t === "quality") {
        const r = await fetch(`/api/admin/conversation-analytics/quality-scores?${params}`);
        const d = await r.json();
        if (!d.error) setQuality(d);
      } else if (t === "agents") {
        const r = await fetch(`/api/admin/conversation-analytics/agent-scorecards?${params}`);
        const d = await r.json();
        if (!d.error) setAgents(d);
      } else if (t === "topics") {
        const [tr, ar] = await Promise.all([
          fetch(`/api/admin/conversation-analytics/topics?${params}&limit=20`),
          fetch(`/api/admin/conversation-analytics/alerts?orgId=1`),
        ]);
        const td = await tr.json();
        const ad = await ar.json();
        if (!td.error) setTopics(td);
        if (!ad.error) setAlerts(Array.isArray(ad) ? ad : ad.alerts ?? []);
      }
    } catch (e) {
      console.error("Fetch failed:", e);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => { fetchTab(tab); }, [tab, from, to]);

  const handleAgentExpand = async (agentId: number) => {
    if (expandedAgent === agentId) { setExpandedAgent(null); return; }
    setExpandedAgent(agentId);
    try {
      const r = await fetch(`/api/admin/conversation-analytics/agent-scorecards/${agentId}?${params}`);
      const d = await r.json();
      setAgentTrend(d.dailyTrend ?? d.trend ?? []);
    } catch { setAgentTrend([]); }
  };

  const dismissAlert = async (id: number) => {
    try {
      await fetch(`/api/admin/conversation-analytics/alerts/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dismissed: true }) });
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch {}
  };

  const sortedAgents = (() => {
    const list = agents?.scorecards ?? agents?.agents ?? [];
    return [...list].sort((a: any, b: any) => {
      const av = typeof a[sortCol] === "string" ? parseFloat(a[sortCol]) : (a[sortCol] ?? 0);
      const bv = typeof b[sortCol] === "string" ? parseFloat(b[sortCol]) : (b[sortCol] ?? 0);
      return sortDir === "asc" ? av - bv : bv - av;
    });
  })();

  const toggleSort = (col: string) => {
    if (sortCol === col) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("desc"); }
  };

  const SortIcon = ({ col }: { col: string }) => (
    sortCol === col ? (sortDir === "desc" ? <ChevronDown className="h-3 w-3 inline ml-0.5" /> : <ChevronUp className="h-3 w-3 inline ml-0.5" />) : null
  );

  const kpi = overview?.summary ?? overview ?? {};
  const trends = overview?.trends ?? overview?.dailyTrends ?? [];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-violet-500/10">
            <BrainCircuit className="w-5 h-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-conv-analytics-title">Conversation Analytics</h1>
            <p className="text-sm text-muted-foreground">Comprehensive insights into call quality, sentiment, and agent performance.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-[150px]" data-testid="input-date-from" />
          <span className="text-sm text-muted-foreground">to</span>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-[150px]" data-testid="input-date-to" />
          <Button variant="outline" onClick={() => fetchTab(tab)} disabled={loading} data-testid="button-refresh">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList data-testid="tabs-list">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="sentiment" data-testid="tab-sentiment">Sentiment Trends</TabsTrigger>
          <TabsTrigger value="quality" data-testid="tab-quality">Quality Scores</TabsTrigger>
          <TabsTrigger value="agents" data-testid="tab-agents">Agent Scorecards</TabsTrigger>
          <TabsTrigger value="topics" data-testid="tab-topics">Topics & Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-4">
          {loading && !overview ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
              <Skeleton className="h-72" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { label: "Total Calls", value: kpi.totalCalls ?? 0, icon: Phone },
                  { label: "Avg Sentiment", value: fmtNum(kpi.avgSentiment), icon: TrendingUp },
                  { label: "Avg Quality", value: fmtNum(kpi.avgQuality), icon: Star },
                  { label: "Resolution Rate", value: fmtPct(kpi.resolutionRate), icon: CheckCircle },
                  { label: "Avg Duration", value: fmtDur(kpi.avgDuration), icon: Clock },
                  { label: "Total Cost", value: `$${fmtNum(kpi.totalCost, 2)}`, icon: DollarSign },
                ].map(({ label, value, icon: Icon }) => (
                  <Card key={label} data-testid={`card-kpi-${label.toLowerCase().replace(/\s+/g, "-")}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{label}</p>
                          <p className="text-2xl font-bold mt-1" data-testid={`text-kpi-${label.toLowerCase().replace(/\s+/g, "-")}`}>{value}</p>
                        </div>
                        <Icon className="h-8 w-8 text-muted-foreground/30" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Card data-testid="chart-call-volume">
                <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
                  <CardTitle className="text-base">Call Volume Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  {trends.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={trends}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 16%, 47%, 0.15)" />
                        <XAxis dataKey="date" tickFormatter={fmtDate} fontSize={12} stroke="hsl(215, 16%, 47%)" />
                        <YAxis fontSize={12} stroke="hsl(215, 16%, 47%)" />
                        <Tooltip contentStyle={tooltipStyle} labelFormatter={fmtDate} />
                        <Line type="monotone" dataKey="calls" name="Calls" stroke={COLORS.primary} strokeWidth={2} dot={{ r: 2 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-72 text-sm text-muted-foreground" data-testid="text-no-trends">No trend data available.</div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="sentiment" className="space-y-6 mt-4">
          {loading && !sentiment ? (
            <div className="space-y-4"><Skeleton className="h-72" /><Skeleton className="h-64" /></div>
          ) : (
            <>
              <Card data-testid="chart-sentiment-trends">
                <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
                  <CardTitle className="text-base">Sentiment Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  {(sentiment?.trends ?? sentiment?.dailyTrends ?? []).length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={sentiment?.trends ?? sentiment?.dailyTrends ?? []}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 16%, 47%, 0.15)" />
                        <XAxis dataKey="date" tickFormatter={fmtDate} fontSize={12} stroke="hsl(215, 16%, 47%)" />
                        <YAxis fontSize={12} stroke="hsl(215, 16%, 47%)" />
                        <Tooltip contentStyle={tooltipStyle} labelFormatter={fmtDate} />
                        <Line type="monotone" dataKey="positive" name="Positive" stroke={COLORS.positive} strokeWidth={2} dot={{ r: 2 }} />
                        <Line type="monotone" dataKey="negative" name="Negative" stroke={COLORS.negative} strokeWidth={2} dot={{ r: 2 }} />
                        <Line type="monotone" dataKey="neutral" name="Neutral" stroke={COLORS.neutral} strokeWidth={2} dot={{ r: 2 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-72 text-sm text-muted-foreground" data-testid="text-no-sentiment">No sentiment data available.</div>
                  )}
                </CardContent>
              </Card>
              <Card data-testid="table-sentiment-daily">
                <CardHeader className="pb-2"><CardTitle className="text-base">Daily Sentiment Values</CardTitle></CardHeader>
                <CardContent>
                  {(sentiment?.trends ?? sentiment?.dailyTrends ?? []).length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Positive</TableHead>
                            <TableHead>Negative</TableHead>
                            <TableHead>Neutral</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(sentiment?.trends ?? sentiment?.dailyTrends ?? []).map((row: any, i: number) => (
                            <TableRow key={i} data-testid={`row-sentiment-${i}`}>
                              <TableCell className="text-sm">{fmtDate(row.date)}</TableCell>
                              <TableCell className="text-sm text-green-600 dark:text-green-400">{fmtNum(row.positive)}</TableCell>
                              <TableCell className="text-sm text-red-600 dark:text-red-400">{fmtNum(row.negative)}</TableCell>
                              <TableCell className="text-sm text-amber-600 dark:text-amber-400">{fmtNum(row.neutral)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8" data-testid="text-no-sentiment-table">No daily sentiment data.</p>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="quality" className="space-y-6 mt-4">
          {loading && !quality ? (
            <div className="space-y-4"><Skeleton className="h-28" /><Skeleton className="h-64" /><Skeleton className="h-64" /></div>
          ) : (
            <>
              <Card data-testid="card-overall-quality">
                <CardContent className="p-6 text-center">
                  <p className="text-sm text-muted-foreground uppercase tracking-wider font-medium">Overall Quality Score</p>
                  <p className="text-5xl font-bold mt-2" data-testid="text-overall-quality">{fmtNum(quality?.overallScore ?? quality?.avgQuality, 1)}</p>
                  <p className="text-sm text-muted-foreground mt-1">out of 10</p>
                </CardContent>
              </Card>
              <Card data-testid="table-best-calls">
                <CardHeader className="pb-2"><CardTitle className="text-base">Top 10 Best Calls</CardTitle></CardHeader>
                <CardContent>
                  {(quality?.topCalls ?? quality?.bestCalls ?? []).length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Call ID</TableHead>
                            <TableHead>Caller</TableHead>
                            <TableHead>Quality</TableHead>
                            <TableHead>Sentiment</TableHead>
                            <TableHead>Duration</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(quality?.topCalls ?? quality?.bestCalls ?? []).slice(0, 10).map((c: any) => (
                            <TableRow key={c.id ?? c.callId} data-testid={`row-best-call-${c.id ?? c.callId}`}>
                              <TableCell className="text-sm font-mono">#{c.id ?? c.callId}</TableCell>
                              <TableCell className="text-sm">{c.callerNumber ?? c.caller ?? "-"}</TableCell>
                              <TableCell className="text-sm font-medium text-green-600 dark:text-green-400">{fmtNum(c.qualityScore ?? c.quality)}</TableCell>
                              <TableCell className="text-sm">{fmtNum(c.sentimentScore ?? c.sentiment)}</TableCell>
                              <TableCell className="text-sm">{fmtDur(c.duration)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8" data-testid="text-no-best">No top calls data.</p>
                  )}
                </CardContent>
              </Card>
              <Card data-testid="table-worst-calls">
                <CardHeader className="pb-2"><CardTitle className="text-base">Bottom 10 Calls - Needs Improvement</CardTitle></CardHeader>
                <CardContent>
                  {(quality?.bottomCalls ?? quality?.worstCalls ?? []).length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Call ID</TableHead>
                            <TableHead>Caller</TableHead>
                            <TableHead>Quality</TableHead>
                            <TableHead>Sentiment</TableHead>
                            <TableHead>Duration</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(quality?.bottomCalls ?? quality?.worstCalls ?? []).slice(0, 10).map((c: any) => (
                            <TableRow key={c.id ?? c.callId} data-testid={`row-worst-call-${c.id ?? c.callId}`}>
                              <TableCell className="text-sm font-mono">#{c.id ?? c.callId}</TableCell>
                              <TableCell className="text-sm">{c.callerNumber ?? c.caller ?? "-"}</TableCell>
                              <TableCell className="text-sm font-medium text-red-600 dark:text-red-400">{fmtNum(c.qualityScore ?? c.quality)}</TableCell>
                              <TableCell className="text-sm">{fmtNum(c.sentimentScore ?? c.sentiment)}</TableCell>
                              <TableCell className="text-sm">{fmtDur(c.duration)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8" data-testid="text-no-worst">No bottom calls data.</p>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="agents" className="space-y-6 mt-4">
          {loading && !agents ? (
            <Skeleton className="h-96" />
          ) : (
            <Card data-testid="table-agent-scorecards">
              <CardHeader className="pb-2"><CardTitle className="text-base">Agent Performance Scorecards</CardTitle></CardHeader>
              <CardContent>
                {sortedAgents.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Agent</TableHead>
                          {[
                            { key: "totalCalls", label: "Calls" },
                            { key: "avgQuality", label: "Avg Quality" },
                            { key: "avgSentiment", label: "Avg Sentiment" },
                            { key: "resolutionRate", label: "Resolution" },
                            { key: "handoffRate", label: "Handoff" },
                            { key: "overallScore", label: "Score" },
                          ].map(({ key, label }) => (
                            <TableHead key={key} className="cursor-pointer select-none" onClick={() => toggleSort(key)} data-testid={`sort-${key}`}>
                              {label}<SortIcon col={key} />
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedAgents.map((a: any) => {
                          const id = a.agentId ?? a.id;
                          return (
                            <Fragment key={id}>
                              <TableRow className="cursor-pointer" onClick={() => handleAgentExpand(id)} data-testid={`row-agent-${id}`}>
                                <TableCell className="text-sm font-medium">{a.agentName ?? a.name ?? `Agent #${id}`}</TableCell>
                                <TableCell className="text-sm">{a.totalCalls ?? 0}</TableCell>
                                <TableCell className="text-sm">{fmtNum(a.avgQuality)}</TableCell>
                                <TableCell className="text-sm">{fmtNum(a.avgSentiment)}</TableCell>
                                <TableCell className="text-sm">{fmtPct(a.resolutionRate)}</TableCell>
                                <TableCell className="text-sm">{fmtPct(a.handoffRate)}</TableCell>
                                <TableCell className="text-sm font-bold">{fmtNum(a.overallScore)}</TableCell>
                              </TableRow>
                              {expandedAgent === id && (
                                <TableRow data-testid={`row-agent-trend-${id}`}>
                                  <TableCell colSpan={7} className="p-4">
                                    {agentTrend.length > 0 ? (
                                      <ResponsiveContainer width="100%" height={200}>
                                        <LineChart data={agentTrend}>
                                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 16%, 47%, 0.15)" />
                                          <XAxis dataKey="date" tickFormatter={fmtDate} fontSize={11} stroke="hsl(215, 16%, 47%)" />
                                          <YAxis fontSize={11} stroke="hsl(215, 16%, 47%)" />
                                          <Tooltip contentStyle={tooltipStyle} labelFormatter={fmtDate} />
                                          <Line type="monotone" dataKey="quality" name="Quality" stroke={COLORS.primary} strokeWidth={2} dot={{ r: 2 }} />
                                          <Line type="monotone" dataKey="sentiment" name="Sentiment" stroke={COLORS.positive} strokeWidth={2} dot={{ r: 2 }} />
                                        </LineChart>
                                      </ResponsiveContainer>
                                    ) : (
                                      <p className="text-sm text-muted-foreground text-center py-4">No daily trend data for this agent.</p>
                                    )}
                                  </TableCell>
                                </TableRow>
                              )}
                            </Fragment>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8" data-testid="text-no-agents">No agent scorecard data available.</p>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="topics" className="mt-4">
          {loading && !topics ? (
            <div className="grid lg:grid-cols-2 gap-4"><Skeleton className="h-96" /><Skeleton className="h-96" /></div>
          ) : (
            <div className="grid lg:grid-cols-2 gap-4">
              <Card data-testid="table-topics">
                <CardHeader className="pb-2"><CardTitle className="text-base">Top Topics</CardTitle></CardHeader>
                <CardContent>
                  {(topics?.topics ?? []).length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Topic</TableHead>
                            <TableHead>Count</TableHead>
                            <TableHead>Avg Sentiment</TableHead>
                            <TableHead>Resolution</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(topics?.topics ?? []).map((t: any, i: number) => (
                            <TableRow key={i} data-testid={`row-topic-${i}`}>
                              <TableCell className="text-sm font-medium">{t.topic ?? t.name}</TableCell>
                              <TableCell className="text-sm">{t.count ?? t.mentions ?? 0}</TableCell>
                              <TableCell className="text-sm">
                                <span className={parseFloat(t.avgSentiment ?? "0") >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                                  {fmtNum(t.avgSentiment)}
                                </span>
                              </TableCell>
                              <TableCell className="text-sm">{fmtPct(t.resolutionRate)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8" data-testid="text-no-topics">No topics extracted yet.</p>
                  )}
                </CardContent>
              </Card>
              <Card data-testid="card-alerts">
                <CardHeader className="pb-2"><CardTitle className="text-base">Analytics Alerts</CardTitle></CardHeader>
                <CardContent>
                  {alerts.length > 0 ? (
                    <div className="space-y-3">
                      {alerts.map((a: any) => (
                        <div key={a.id} className={`flex items-start gap-3 p-3 rounded-md border ${a.read ? "opacity-60" : ""}`} data-testid={`alert-${a.id}`}>
                          {a.severity === "critical" || a.severity === "high" ? (
                            <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                          ) : a.severity === "medium" ? (
                            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                          ) : (
                            <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-medium">{a.title ?? a.message}</p>
                              <Badge variant={severityVariant(a.severity)}>{a.severity}</Badge>
                              {!a.read && <Badge variant="outline">Unread</Badge>}
                            </div>
                            {a.description && <p className="text-xs text-muted-foreground mt-1">{a.description}</p>}
                          </div>
                          <Button size="icon" variant="ghost" onClick={() => dismissAlert(a.id)} data-testid={`button-dismiss-alert-${a.id}`}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8" data-testid="text-no-alerts">No active alerts.</p>
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
