"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Activity,
  Database,
  HardDrive,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Server,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface HealthData {
  status: string;
  timestamp: string;
  version?: string;
  db?: { status: string; latencyMs: number };
  uptime?: number;
  processAge?: number;
  memory?: {
    rssMb: number;
    heapUsedMb: number;
    heapTotalMb: number;
    externalMb: number;
  };
  node?: string;
}

interface MetricDataPoint {
  timestamp: string;
  cpuUserUs: number;
  cpuSystemUs: number;
  heapUsedMb: number;
  heapTotalMb: number;
  rssMb: number;
  externalMb: number;
  uptimeSeconds: number;
  dbLatencyMs: number;
  cpuPercent: number;
}

interface MetricsData {
  current: MetricDataPoint;
  history: MetricDataPoint[];
  node: string;
  processAge: number;
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);
  return parts.join(" ");
}

function formatTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return isoString;
  }
}

export default function MonitoringPage() {
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [metricsData, setMetricsData] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastChecked, setLastChecked] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch("/api/health");
      if (!res.ok) throw new Error("Health check failed");
      const data = await res.json();
      setHealthData(data);
    } catch (err) {
      console.error("Health fetch error:", err);
    }
  }, []);

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch("/api/health/metrics");
      if (!res.ok) {
        if (res.status === 403) {
          setError("Access denied. SUPERADMIN role required.");
          return;
        }
        throw new Error("Metrics fetch failed");
      }
      const data = await res.json();
      setMetricsData(data);
      setError(null);
    } catch (err) {
      console.error("Metrics fetch error:", err);
      setError("Failed to load metrics data.");
    }
  }, []);

  const fetchAll = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchHealth(), fetchMetrics()]);
    setLastChecked(new Date().toLocaleTimeString());
    setRefreshing(false);
    setLoading(false);
  }, [fetchHealth, fetchMetrics]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchAll, 15000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchAll]);

  const status = healthData?.status || "unknown";
  const current = metricsData?.current;

  const statusBadge = () => {
    if (status === "healthy") {
      return (
        <Badge
          data-testid="text-health-status"
          variant="default"
          className="no-default-hover-elevate no-default-active-elevate"
          style={{ backgroundColor: "hsl(142, 71%, 45%)", color: "#fff" }}
        >
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Healthy
        </Badge>
      );
    }
    if (status === "degraded") {
      return (
        <Badge
          data-testid="text-health-status"
          variant="secondary"
          className="no-default-hover-elevate no-default-active-elevate"
          style={{ backgroundColor: "hsl(45, 93%, 47%)", color: "#000" }}
        >
          <AlertTriangle className="h-3 w-3 mr-1" />
          Degraded
        </Badge>
      );
    }
    return (
      <Badge
        data-testid="text-health-status"
        variant="destructive"
        className="no-default-hover-elevate no-default-active-elevate"
      >
        <XCircle className="h-3 w-3 mr-1" />
        Unhealthy
      </Badge>
    );
  };

  const chartData = (metricsData?.history || []).map((p) => ({
    time: formatTime(p.timestamp),
    heapUsedMb: p.heapUsedMb,
    dbLatencyMs: p.dbLatencyMs,
  }));

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">System Monitoring</h1>
          <p className="text-muted-foreground text-sm mt-1">Loading system metrics...</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-20 bg-muted animate-pulse rounded mt-1" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">System Monitoring</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Real-time health and performance metrics for the GoRigo platform
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label htmlFor="auto-refresh-toggle" className="text-sm text-muted-foreground">
              Auto-refresh
            </label>
            <Switch
              id="auto-refresh-toggle"
              data-testid="switch-auto-refresh"
              checked={autoRefresh}
              onCheckedChange={setAutoRefresh}
            />
          </div>
          <Button
            data-testid="button-refresh"
            variant="outline"
            size="sm"
            onClick={fetchAll}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Server Status</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="mt-1">{statusBadge()}</div>
            {healthData?.version && (
              <p className="text-xs text-muted-foreground mt-2">v{healthData.version}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Database Latency</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold" data-testid="text-db-latency">
              {current ? `${current.dbLatencyMs}ms` : "--"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {current && current.dbLatencyMs >= 0 ? "Connected" : "Unreachable"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold" data-testid="text-memory-usage">
              {current ? `${current.heapUsedMb} MB` : "--"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {current
                ? `${current.heapUsedMb} / ${current.heapTotalMb} MB (${Math.round(
                    (current.heapUsedMb / current.heapTotalMb) * 100
                  )}%)`
                : "--"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uptime</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold" data-testid="text-uptime">
              {current ? formatUptime(current.uptimeSeconds) : "--"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {current ? `${current.uptimeSeconds.toLocaleString()}s total` : "--"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Memory Usage Over Time</CardTitle>
            <CardDescription>Heap memory used (MB) across recent data points</CardDescription>
          </CardHeader>
          <CardContent>
            <div data-testid="chart-memory" className="h-64 w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} unit=" MB" />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="heapUsedMb"
                      stroke="hsl(262, 83%, 58%)"
                      strokeWidth={2}
                      dot={false}
                      name="Heap Used (MB)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  No data points yet. Metrics will appear as data is collected.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Database Latency Over Time</CardTitle>
            <CardDescription>Query latency (ms) across recent data points</CardDescription>
          </CardHeader>
          <CardContent>
            <div data-testid="chart-latency" className="h-64 w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} unit="ms" />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="dbLatencyMs"
                      stroke="hsl(199, 89%, 48%)"
                      strokeWidth={2}
                      dot={false}
                      name="DB Latency (ms)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  No data points yet. Metrics will appear as data is collected.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">System Information</CardTitle>
            <CardDescription>Runtime environment details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Node Version</span>
                <span className="text-sm font-medium">{metricsData?.node || "--"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Process Age</span>
                <span className="text-sm font-medium">
                  {metricsData?.processAge ? formatUptime(metricsData.processAge) : "--"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Last Check</span>
                <span className="text-sm font-medium">{lastChecked || "--"}</span>
              </div>
              {current && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">RSS Memory</span>
                    <span className="text-sm font-medium">{current.rssMb} MB</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">CPU Usage</span>
                    <span className="text-sm font-medium">{current.cpuPercent}%</span>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Alert Configuration
            </CardTitle>
            <CardDescription>Azure Monitor alerts for production</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Production alerts are configured via Azure Monitor. The setup script creates
                metric alerts for CPU, memory, HTTP 5xx errors, latency, and container restarts.
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  <span>CPU usage alert (&gt;80% for 5 min)</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  <span>Memory usage alert (&gt;80% for 5 min)</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  <span>HTTP 5xx error rate (&gt;5 in 5 min)</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  <span>Response latency (&gt;3000ms avg)</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  <span>Container restart detection</span>
                </div>
              </div>
              <div className="mt-3 p-3 bg-muted rounded-md">
                <p className="text-xs font-mono text-muted-foreground">
                  Run: ./scripts/setup-azure-monitoring.sh
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
