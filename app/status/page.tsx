"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, XCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ServiceStatus {
  name: string;
  status: "operational" | "degraded" | "outage";
  latencyMs?: number;
  message?: string;
}

interface StatusData {
  status: "operational" | "degraded" | "outage";
  services: ServiceStatus[];
  timestamp: string;
  uptime: number;
}

const statusConfig = {
  operational: { label: "Operational", icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/15", border: "border-emerald-500/20" },
  degraded: { label: "Degraded", icon: AlertTriangle, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/15", border: "border-amber-500/20" },
  outage: { label: "Outage", icon: XCircle, color: "text-red-600 dark:text-red-400", bg: "bg-red-500/15", border: "border-red-500/20" },
};

export default function StatusPage() {
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<string>("");

  const fetchStatus = () => {
    setLoading(true);
    fetch("/api/status")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLastChecked(new Date().toLocaleTimeString("en-GB"));
      })
      .catch(() => {
        setData({ status: "outage", services: [{ name: "API Server", status: "outage", message: "Unable to reach API" }], timestamp: new Date().toISOString(), uptime: 0 });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const overallConfig = data ? statusConfig[data.status] : statusConfig.operational;
  const OverallIcon = overallConfig.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 px-4 py-12">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-violet-500">
              <span className="text-white font-bold text-lg">G</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-foreground" data-testid="text-status-title">GoRigo System Status</h1>
          <p className="text-muted-foreground">Real-time health of all platform services.</p>
        </div>

        {loading && !data ? (
          <Card>
            <CardContent className="flex items-center justify-center p-12">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        ) : data && (
          <>
            <Card className={cn("border", overallConfig.border)} data-testid="card-overall-status">
              <CardContent className="flex items-center justify-between p-6">
                <div className="flex items-center gap-3">
                  <OverallIcon className={cn("h-8 w-8", overallConfig.color)} />
                  <div>
                    <p className="text-lg font-semibold text-foreground" data-testid="text-overall-status">
                      {data.status === "operational" ? "All Systems Operational" : data.status === "degraded" ? "Some Services Degraded" : "System Outage Detected"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Uptime: {formatUptime(data.uptime)}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className={cn(overallConfig.bg, overallConfig.color, overallConfig.border)} data-testid="badge-overall-status">
                  {overallConfig.label}
                </Badge>
              </CardContent>
            </Card>

            <Card data-testid="card-services">
              <CardHeader>
                <CardTitle className="text-base">Services</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 p-0 pb-2">
                {data.services.map((service) => {
                  const config = statusConfig[service.status];
                  const Icon = config.icon;
                  return (
                    <div key={service.name} className="flex items-center justify-between px-6 py-3 border-b last:border-0" data-testid={`row-service-${service.name.toLowerCase().replace(/\s+/g, "-")}`}>
                      <div className="flex items-center gap-3">
                        <Icon className={cn("h-4 w-4", config.color)} />
                        <div>
                          <p className="text-sm font-medium text-foreground">{service.name}</p>
                          {service.message && (
                            <p className="text-xs text-muted-foreground">{service.message}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {service.latencyMs !== undefined && (
                          <span className="text-xs text-muted-foreground">{service.latencyMs}ms</span>
                        )}
                        <Badge variant="outline" className={cn("text-xs", config.bg, config.color, config.border)}>
                          {config.label}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Last checked: {lastChecked || "—"} · Auto-refreshes every 60s
              </p>
              <Button variant="ghost" size="sm" onClick={fetchStatus} disabled={loading} data-testid="button-refresh-status">
                <RefreshCw className={cn("h-4 w-4 mr-1", loading && "animate-spin")} />
                Refresh
              </Button>
            </div>
          </>
        )}

        <div className="text-center border-t pt-6">
          <p className="text-xs text-muted-foreground">
            GoRigo.ai — AI Call Centre Platform by International Business Exchange Limited
          </p>
        </div>
      </div>
    </div>
  );
}
