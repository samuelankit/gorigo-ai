"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Activity,
  Database,
  Brain,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Cpu,
  HardDrive,
  Clock,
  Zap,
  RotateCcw,
  Trash2,
  Server,
  Gauge,
  TrendingUp,
  Wifi,
} from "lucide-react";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface HealthReport {
  timestamp: string;
  overall: "healthy" | "degraded" | "critical";
  uptime: number;
  memory: { rss: number; heapUsed: number; heapTotal: number; external: number };
  database: { healthy: boolean; latencyMs: number; pool: { totalCount: number; idleCount: number; waitingCount: number }; error?: string };
  llm: Record<string, { status: string; latencyMs: number; successRate: number; totalRequests: number; totalFailures: number }>;
  errors: { recentCount: number; last5: Array<{ timestamp: string; code: string; error: string }> };
  services: { twilio: { configured: boolean; status: string }; stripe: { configured: boolean; status: string } };
}

interface HealthEvent {
  timestamp: string;
  type: "info" | "warning" | "critical" | "recovery";
  component: string;
  message: string;
}

interface MetricsSnapshot {
  timestamp: string;
  heapUsedMB: number;
  heapTotalMB: number;
  rssMB: number;
  dbLatencyMs: number;
  dbHealthy: boolean;
  poolTotal: number;
  poolIdle: number;
  poolWaiting: number;
  errorCount: number;
  overall: string;
}

interface InfraData {
  health: HealthReport;
  llm: { configuredProviders: string[]; health: Record<string, any>; circuitBreakers: Record<string, any> };
  events: HealthEvent[];
  errors: { count: number; recent: Array<{ timestamp: string; code: string; error: string }> };
  metrics: MetricsSnapshot[];
}

const CHART_COLORS = {
  primary: "hsl(262, 83%, 58%)",
  secondary: "hsl(217, 91%, 60%)",
  success: "hsl(142, 71%, 45%)",
  warning: "hsl(38, 92%, 50%)",
  danger: "hsl(0, 84%, 60%)",
  muted: "hsl(215, 16%, 47%)",
};

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function formatTime(ts: string): string {
  return new Date(ts).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function StatusIcon({ status }: { status: string }) {
  if (status === "healthy") return <CheckCircle className="h-4 w-4 text-green-500" />;
  if (status === "degraded") return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
  return <XCircle className="h-4 w-4 text-red-500" />;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "healthy") return <Badge variant="default" className="bg-green-600 text-white no-default-hover-elevate" data-testid="badge-status-healthy">Healthy</Badge>;
  if (status === "degraded") return <Badge variant="default" className="bg-yellow-600 text-white no-default-hover-elevate" data-testid="badge-status-degraded">Degraded</Badge>;
  if (status === "unconfigured") return <Badge variant="secondary" className="no-default-hover-elevate" data-testid="badge-status-unconfigured">Not Configured</Badge>;
  if (status === "unknown") return <Badge variant="secondary" className="no-default-hover-elevate" data-testid="badge-status-unknown">Unknown</Badge>;
  if (status === "down") return <Badge variant="destructive" className="no-default-hover-elevate" data-testid="badge-status-down">Down</Badge>;
  return <Badge variant="destructive" className="no-default-hover-elevate" data-testid="badge-status-critical">Critical</Badge>;
}

function EventTypeBadge({ type }: { type: string }) {
  if (type === "info") return <Badge variant="secondary" className="text-xs no-default-hover-elevate">INFO</Badge>;
  if (type === "warning") return <Badge variant="default" className="bg-yellow-600 text-white text-xs no-default-hover-elevate">WARN</Badge>;
  if (type === "recovery") return <Badge variant="default" className="bg-green-600 text-white text-xs no-default-hover-elevate">RECOVERY</Badge>;
  return <Badge variant="destructive" className="text-xs no-default-hover-elevate">CRITICAL</Badge>;
}

function GaugeCard({ label, value, max, unit, icon: Icon, color, testId }: {
  label: string; value: number; max: number; unit: string; icon: any; color: string; testId: string;
}) {
  const pct = max > 0 ? Math.min(Math.round((value / max) * 100), 100) : 0;
  const barColor = pct > 90 ? "bg-red-500" : pct > 75 ? "bg-yellow-500" : `bg-${color}-500`;
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{label}</span>
          </div>
          <span className="text-xs text-muted-foreground">{pct}%</span>
        </div>
        <p className="text-2xl font-bold mt-2" data-testid={testId}>{value}{unit}</p>
        <div className="mt-2">
          <div className="w-full bg-muted rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full transition-all ${pct > 90 ? "bg-red-500" : pct > 75 ? "bg-yellow-500" : "bg-green-500"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">{value} / {max} {unit}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function InfrastructurePage() {
  const [data, setData] = useState<InfraData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await fetch("/api/admin/infrastructure");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to fetch infrastructure data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(), 30_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleAction = async (action: string, extra?: Record<string, string>) => {
    setActionLoading(action);
    try {
      const res = await fetch("/api/admin/infrastructure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      if (res.ok) {
        await fetchData(true);
      }
    } catch (err) {
      console.error("Action failed:", err);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <Skeleton className="h-8 w-60" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-20 w-full" /></CardContent></Card>
          ))}
        </div>
        <Card><CardContent className="pt-6"><Skeleton className="h-64 w-full" /></CardContent></Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">Infrastructure</h1>
        <Card><CardContent className="p-6 text-center text-muted-foreground">Failed to load infrastructure data</CardContent></Card>
      </div>
    );
  }

  const { health, llm, events, errors, metrics } = data;
  const heapPercent = health.memory.heapTotal > 0 ? Math.round((health.memory.heapUsed / health.memory.heapTotal) * 100) : 0;

  const metricsChartData = (metrics || []).map((m) => ({
    ...m,
    time: formatTime(m.timestamp),
    poolActive: m.poolTotal - m.poolIdle,
  }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Server className="h-6 w-6 text-violet-500" />
          <h1 className="text-2xl font-bold" data-testid="text-infra-title">Infrastructure</h1>
          <StatusBadge status={health.overall} />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">
            Updated {new Date(health.timestamp).toLocaleTimeString()}
          </span>
          <Button
            variant="outline"
            onClick={() => fetchData(true)}
            disabled={refreshing}
            data-testid="button-refresh-infra"
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card data-testid="card-uptime">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Uptime</span>
            </div>
            <p className="text-2xl font-bold mt-2" data-testid="text-uptime">{formatUptime(health.uptime)}</p>
            <p className="text-xs text-muted-foreground mt-1">Process running</p>
          </CardContent>
        </Card>

        <Card data-testid="card-db-latency">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">DB Latency</span>
              </div>
              <StatusIcon status={health.database.healthy ? "healthy" : "critical"} />
            </div>
            <p className="text-2xl font-bold mt-2" data-testid="text-db-latency">{health.database.latencyMs}ms</p>
            <p className="text-xs text-muted-foreground mt-1">
              Pool: {health.database.pool.totalCount} total, {health.database.pool.idleCount} idle
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-memory">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Heap</span>
              </div>
              <StatusIcon status={heapPercent > 90 ? "critical" : heapPercent > 75 ? "degraded" : "healthy"} />
            </div>
            <p className="text-2xl font-bold mt-2" data-testid="text-memory">{health.memory.heapUsed}MB</p>
            <div className="mt-2">
              <div className="w-full bg-muted rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full ${heapPercent > 90 ? "bg-red-500" : heapPercent > 75 ? "bg-yellow-500" : "bg-green-500"}`}
                  style={{ width: `${Math.min(heapPercent, 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">{heapPercent}% of {health.memory.heapTotal}MB</p>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-rss">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">RSS</span>
            </div>
            <p className="text-2xl font-bold mt-2" data-testid="text-rss">{health.memory.rss}MB</p>
            <p className="text-xs text-muted-foreground mt-1">Total process memory</p>
          </CardContent>
        </Card>

        <Card data-testid="card-errors">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Errors</span>
              </div>
              <StatusIcon status={errors.count > 20 ? "critical" : errors.count > 5 ? "degraded" : "healthy"} />
            </div>
            <p className="text-2xl font-bold mt-2" data-testid="text-error-count">{errors.count}</p>
            <p className="text-xs text-muted-foreground mt-1">Recent errors logged</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList data-testid="tabs-infra">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="llm" data-testid="tab-llm">LLM Providers</TabsTrigger>
          <TabsTrigger value="database" data-testid="tab-database">Database</TabsTrigger>
          <TabsTrigger value="timeline" data-testid="tab-timeline">Health Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card data-testid="chart-memory-trend">
              <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Cpu className="h-4 w-4" />
                  Memory Usage Trend
                </CardTitle>
                <Badge variant="secondary" className="text-xs no-default-hover-elevate">60 snapshots</Badge>
              </CardHeader>
              <CardContent>
                {metricsChartData.length === 0 ? (
                  <div className="flex items-center justify-center h-52 text-sm text-muted-foreground">Collecting metrics... Check back in a minute.</div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={metricsChartData}>
                      <defs>
                        <linearGradient id="heapGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="rssGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={CHART_COLORS.secondary} stopOpacity={0.2} />
                          <stop offset="95%" stopColor={CHART_COLORS.secondary} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 16%, 47%, 0.15)" />
                      <XAxis dataKey="time" fontSize={11} stroke="hsl(215, 16%, 47%)" />
                      <YAxis fontSize={11} stroke="hsl(215, 16%, 47%)" tickFormatter={(v) => `${v}MB`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: "12px" }}
                        formatter={(value: number, name: string) => [`${value}MB`, name]}
                      />
                      <Legend wrapperStyle={{ fontSize: "12px" }} />
                      <Area type="monotone" dataKey="heapUsedMB" name="Heap Used" stroke={CHART_COLORS.primary} fill="url(#heapGrad)" strokeWidth={2} />
                      <Area type="monotone" dataKey="rssMB" name="RSS" stroke={CHART_COLORS.secondary} fill="url(#rssGrad)" strokeWidth={1.5} strokeDasharray="4 4" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card data-testid="chart-db-latency-trend">
              <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  DB Latency Trend
                </CardTitle>
                <Badge variant="secondary" className="text-xs no-default-hover-elevate">ms</Badge>
              </CardHeader>
              <CardContent>
                {metricsChartData.length === 0 ? (
                  <div className="flex items-center justify-center h-52 text-sm text-muted-foreground">Collecting metrics...</div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={metricsChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 16%, 47%, 0.15)" />
                      <XAxis dataKey="time" fontSize={11} stroke="hsl(215, 16%, 47%)" />
                      <YAxis fontSize={11} stroke="hsl(215, 16%, 47%)" tickFormatter={(v) => `${v}ms`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: "12px" }}
                        formatter={(value: number) => [`${value}ms`, "Latency"]}
                      />
                      <Line type="monotone" dataKey="dbLatencyMs" name="Latency" stroke={CHART_COLORS.success} strokeWidth={2} dot={{ r: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <Card data-testid="chart-pool-trend">
            <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Gauge className="h-4 w-4" />
                Connection Pool Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              {metricsChartData.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">Collecting metrics...</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={metricsChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 16%, 47%, 0.15)" />
                    <XAxis dataKey="time" fontSize={11} stroke="hsl(215, 16%, 47%)" />
                    <YAxis fontSize={11} stroke="hsl(215, 16%, 47%)" />
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: "12px" }}
                    />
                    <Legend wrapperStyle={{ fontSize: "12px" }} />
                    <Bar dataKey="poolActive" name="Active" stackId="pool" fill={CHART_COLORS.primary} radius={[2, 2, 0, 0]} />
                    <Bar dataKey="poolIdle" name="Idle" stackId="pool" fill={CHART_COLORS.success} radius={[2, 2, 0, 0]} />
                    <Bar dataKey="poolWaiting" name="Waiting" stackId="pool" fill={CHART_COLORS.warning} radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card data-testid="card-external-services">
              <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Wifi className="h-4 w-4" />
                  External Services
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between gap-2 p-3 rounded-md border">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Twilio</span>
                  </div>
                  <StatusBadge status={health.services.twilio.status} />
                </div>
                <div className="flex items-center justify-between gap-2 p-3 rounded-md border">
                  <div className="flex items-center gap-2">
                    <HardDrive className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Stripe</span>
                  </div>
                  <StatusBadge status={health.services.stripe.status} />
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-recent-errors">
              <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Recent Errors
                </CardTitle>
                {errors.count > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAction("clear-errors")}
                    disabled={actionLoading === "clear-errors"}
                    data-testid="button-clear-errors"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {errors.count === 0 ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    No errors recorded
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {errors.recent.map((err, i) => (
                      <div key={i} className="p-2 rounded-md border text-sm">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <Badge variant="destructive" className="text-xs no-default-hover-elevate">{err.code}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(err.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="mt-1 text-muted-foreground text-xs break-words">{err.error}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="llm" className="space-y-4 mt-4">
          <Card data-testid="card-llm-providers">
            <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="h-4 w-4" />
                LLM Provider Status
              </CardTitle>
              <Badge variant="secondary" className="text-xs no-default-hover-elevate">
                {llm.configuredProviders.length} configured
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              {llm.configuredProviders.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">No LLM providers configured</p>
              )}
              {llm.configuredProviders.map((provider) => {
                const providerHealth = llm.health[provider];
                const circuit = llm.circuitBreakers[provider];
                const successRate = providerHealth?.successRate ?? 100;
                const isDown = providerHealth?.status === "down";
                const isDegraded = providerHealth?.status === "degraded";
                return (
                  <div key={provider} className="p-4 rounded-md border space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-3">
                        <Brain className="h-5 w-5 text-violet-500" />
                        <span className="text-base font-semibold" data-testid={`text-llm-provider-${provider}`}>{provider}</span>
                        <StatusBadge status={providerHealth?.status || "unknown"} />
                      </div>
                      {circuit?.isOpen && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAction("reset-circuit-breaker", { provider })}
                          disabled={actionLoading === "reset-circuit-breaker"}
                          data-testid={`button-reset-circuit-${provider}`}
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          Reset Circuit
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Latency</p>
                        <p className="text-lg font-bold" data-testid={`text-llm-latency-${provider}`}>{providerHealth?.latencyMs || 0}ms</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Success Rate</p>
                        <p className={`text-lg font-bold ${successRate < 95 ? "text-red-500" : successRate < 99 ? "text-yellow-500" : ""}`}>
                          {successRate.toFixed(1)}%
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Requests</p>
                        <p className="text-lg font-bold">{providerHealth?.totalRequests || 0}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider">Failures</p>
                        <p className={`text-lg font-bold ${(providerHealth?.totalFailures || 0) > 0 ? "text-red-500" : ""}`}>
                          {providerHealth?.totalFailures || 0}
                        </p>
                      </div>
                    </div>

                    {circuit && (
                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        <span>Circuit: {circuit.isOpen ? "OPEN" : circuit.isHalfOpen ? "HALF-OPEN" : "CLOSED"}</span>
                        {circuit.failures > 0 && <span>Consecutive failures: {circuit.failures}</span>}
                        {circuit.lastFailure && <span>Last failure: {formatTime(circuit.lastFailure)}</span>}
                      </div>
                    )}

                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${isDown ? "bg-red-500" : isDegraded ? "bg-yellow-500" : "bg-green-500"}`}
                        style={{ width: `${successRate}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="database" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Status</span>
                  </div>
                  <StatusIcon status={health.database.healthy ? "healthy" : "critical"} />
                </div>
                <p className="text-2xl font-bold mt-2" data-testid="text-db-status">{health.database.healthy ? "Online" : "Offline"}</p>
                {health.database.error && <p className="text-xs text-red-500 mt-1">{health.database.error}</p>}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Latency</span>
                </div>
                <p className={`text-2xl font-bold mt-2 ${health.database.latencyMs > 1000 ? "text-red-500" : health.database.latencyMs > 500 ? "text-yellow-500" : ""}`} data-testid="text-db-latency-detail">
                  {health.database.latencyMs}ms
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {health.database.latencyMs < 50 ? "Excellent" : health.database.latencyMs < 200 ? "Good" : health.database.latencyMs < 500 ? "Acceptable" : "Slow"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Gauge className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Pool</span>
                </div>
                <p className="text-2xl font-bold mt-2" data-testid="text-pool-total">{health.database.pool.totalCount}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {health.database.pool.idleCount} idle, {health.database.pool.waitingCount} waiting
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card data-testid="chart-db-latency-history">
              <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Latency History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {metricsChartData.length === 0 ? (
                  <div className="flex items-center justify-center h-52 text-sm text-muted-foreground">Collecting metrics...</div>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={metricsChartData}>
                      <defs>
                        <linearGradient id="latencyGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={CHART_COLORS.success} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={CHART_COLORS.success} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 16%, 47%, 0.15)" />
                      <XAxis dataKey="time" fontSize={11} stroke="hsl(215, 16%, 47%)" />
                      <YAxis fontSize={11} stroke="hsl(215, 16%, 47%)" tickFormatter={(v) => `${v}ms`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: "12px" }}
                        formatter={(value: number) => [`${value}ms`, "Latency"]}
                      />
                      <Area type="monotone" dataKey="dbLatencyMs" stroke={CHART_COLORS.success} fill="url(#latencyGrad)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card data-testid="chart-pool-history">
              <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Pool Utilization
                </CardTitle>
              </CardHeader>
              <CardContent>
                {metricsChartData.length === 0 ? (
                  <div className="flex items-center justify-center h-52 text-sm text-muted-foreground">Collecting metrics...</div>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={metricsChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 16%, 47%, 0.15)" />
                      <XAxis dataKey="time" fontSize={11} stroke="hsl(215, 16%, 47%)" />
                      <YAxis fontSize={11} stroke="hsl(215, 16%, 47%)" />
                      <Tooltip
                        contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: "12px" }}
                      />
                      <Legend wrapperStyle={{ fontSize: "12px" }} />
                      <Bar dataKey="poolActive" name="Active" stackId="pool" fill={CHART_COLORS.primary} radius={[2, 2, 0, 0]} />
                      <Bar dataKey="poolIdle" name="Idle" stackId="pool" fill={CHART_COLORS.success} radius={[2, 2, 0, 0]} />
                      <Bar dataKey="poolWaiting" name="Waiting" stackId="pool" fill={CHART_COLORS.danger} radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-4 mt-4">
          <Card data-testid="card-health-timeline">
            <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Health Event Timeline
              </CardTitle>
              <Badge variant="secondary" className="text-xs no-default-hover-elevate">{events.length} events</Badge>
            </CardHeader>
            <CardContent>
              {events.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-sm text-muted-foreground gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  No health events recorded yet. The autopilot monitor reports events every 60 seconds.
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {events.slice().reverse().map((event, i) => (
                    <div key={i} className="flex items-start gap-3 py-2 border-b last:border-0" data-testid={`event-${i}`}>
                      <div className="shrink-0 mt-0.5">
                        <EventTypeBadge type={event.type} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs no-default-hover-elevate">{event.component}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(event.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm mt-1 break-words">{event.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
