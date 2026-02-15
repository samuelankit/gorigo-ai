"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Activity, Globe, AlertTriangle, RefreshCw, Phone, Server, Shield, Clock, CheckCircle, XCircle, Wifi } from "lucide-react";

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatTimestamp(d: string | null): string {
  if (!d) return "-";
  return new Date(d).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function statusColor(status: string | null): string {
  switch (status) {
    case "in-progress": return "bg-green-500/10 text-green-600 dark:text-green-400";
    case "ringing": return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
    case "completed": return "bg-muted text-muted-foreground";
    case "failed": return "bg-red-500/10 text-red-600 dark:text-red-400";
    default: return "bg-muted text-muted-foreground";
  }
}

function severityColor(severity: string): string {
  switch (severity) {
    case "critical": return "bg-red-500/10 text-red-600 dark:text-red-400";
    case "warning": return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400";
    case "info": return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
    default: return "bg-muted text-muted-foreground";
  }
}

export default function AdminOperationsPage() {
  const [activeTab, setActiveTab] = useState("live-calls");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [countryFilter, setCountryFilter] = useState("all");

  const [calls, setCalls] = useState<any[]>([]);
  const [callStats, setCallStats] = useState<any>(null);
  const [internationalData, setInternationalData] = useState<any>(null);
  const [infraData, setInfraData] = useState<any>(null);
  const [fraudAlerts, setFraudAlerts] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [callsRes, intlRes, infraRes, alertsRes] = await Promise.all([
        fetch("/api/admin/calls?limit=50"),
        fetch("/api/admin/international"),
        fetch("/api/admin/infrastructure"),
        fetch("/api/admin/international/fraud-alerts"),
      ]);
      const callsData = await callsRes.json();
      const intlData = await intlRes.json();
      const infraDataJson = await infraRes.json();
      const alertsData = await alertsRes.json();

      setCalls(callsData.calls || []);
      setCallStats(callsData.stats || null);
      setInternationalData(intlData);
      setInfraData(infraDataJson);
      setFraudAlerts(alertsData.alerts || []);
      setLastRefresh(new Date());
    } catch (error) {
      console.error("Failed to fetch operations data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchData();
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  const activeCountries = internationalData?.activeCountries || [];
  const subAccounts = internationalData?.subAccounts || [];

  const filteredCalls = countryFilter === "all"
    ? calls
    : calls.filter((c: any) => c.country === countryFilter || c.countryCode === countryFilter);

  const activeCalls = calls.filter((c: any) => c.status === "in-progress" || c.status === "ringing");
  const inboundCalls = calls.filter((c: any) => c.direction === "inbound");
  const outboundCalls = calls.filter((c: any) => c.direction === "outbound");
  const avgDuration = calls.length > 0
    ? Math.round(calls.reduce((acc: number, c: any) => acc + (c.duration || 0), 0) / calls.length)
    : 0;

  if (loading && !callStats) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-72" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Activity className="h-6 w-6 text-violet-500" />
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-operations-title">Operations Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Real-time call monitoring and system health overview
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground" data-testid="text-last-refresh">
            Updated {lastRefresh.toLocaleTimeString()}
          </span>
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            data-testid="button-toggle-auto-refresh"
          >
            <Clock className="h-3.5 w-3.5 mr-1.5" />
            {autoRefresh ? "Auto" : "Paused"}
          </Button>
          <Button variant="outline" onClick={fetchData} disabled={loading} data-testid="button-refresh-operations">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto" data-testid="tabs-operations">
          <TabsTrigger value="live-calls" data-testid="tab-live-calls">
            <Phone className="h-3.5 w-3.5 mr-1.5" />
            Live Calls
          </TabsTrigger>
          <TabsTrigger value="system-health" data-testid="tab-system-health">
            <Server className="h-3.5 w-3.5 mr-1.5" />
            System Health
          </TabsTrigger>
          <TabsTrigger value="alerts" data-testid="tab-alerts">
            <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
            Alerts
            {fraudAlerts.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 no-default-hover-elevate text-xs">
                {fraudAlerts.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="live-calls" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card data-testid="card-stat-active-calls">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Total Active</p>
                    <p className="text-2xl font-bold mt-1" data-testid="text-stat-active-calls">{activeCalls.length}</p>
                  </div>
                  <Activity className="h-8 w-8 text-muted-foreground/30" />
                </div>
              </CardContent>
            </Card>
            <Card data-testid="card-stat-inbound">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Inbound</p>
                    <p className="text-2xl font-bold mt-1" data-testid="text-stat-inbound">{callStats?.inboundCalls ?? inboundCalls.length}</p>
                  </div>
                  <Phone className="h-8 w-8 text-muted-foreground/30" />
                </div>
              </CardContent>
            </Card>
            <Card data-testid="card-stat-outbound">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Outbound</p>
                    <p className="text-2xl font-bold mt-1" data-testid="text-stat-outbound">{callStats?.outboundCalls ?? outboundCalls.length}</p>
                  </div>
                  <Phone className="h-8 w-8 text-muted-foreground/30" />
                </div>
              </CardContent>
            </Card>
            <Card data-testid="card-stat-avg-duration">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Avg Duration</p>
                    <p className="text-2xl font-bold mt-1" data-testid="text-stat-avg-duration">{formatDuration(callStats?.avgDuration ?? avgDuration)}</p>
                  </div>
                  <Clock className="h-8 w-8 text-muted-foreground/30" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <CardTitle className="text-base flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Live Call Monitor
                </CardTitle>
                <Select value={countryFilter} onValueChange={setCountryFilter}>
                  <SelectTrigger className="w-[180px]" data-testid="select-country-filter">
                    <SelectValue placeholder="All Countries" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Countries</SelectItem>
                    {activeCountries.map((country: string) => (
                      <SelectItem key={country} value={country}>{country}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {filteredCalls.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Phone className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm" data-testid="text-no-calls">No calls found.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table data-testid="table-live-calls">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Call ID</TableHead>
                        <TableHead>Direction</TableHead>
                        <TableHead>Phone Number</TableHead>
                        <TableHead>Country</TableHead>
                        <TableHead>Agent</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCalls.map((call: any, idx: number) => (
                        <TableRow key={call.id || idx} data-testid={`row-call-${call.id || idx}`}>
                          <TableCell className="font-mono text-sm" data-testid={`text-call-id-${call.id || idx}`}>
                            #{call.id}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="no-default-hover-elevate text-xs" data-testid={`badge-direction-${call.id || idx}`}>
                              {call.direction || "unknown"}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm" data-testid={`text-call-phone-${call.id || idx}`}>
                            {call.callerNumber || "-"}
                          </TableCell>
                          <TableCell data-testid={`text-call-country-${call.id || idx}`}>
                            {call.country || call.countryCode || "-"}
                          </TableCell>
                          <TableCell data-testid={`text-call-agent-${call.id || idx}`}>
                            {call.agentName || (call.agentId ? `Agent #${call.agentId}` : "-")}
                          </TableCell>
                          <TableCell className="text-sm" data-testid={`text-call-duration-${call.id || idx}`}>
                            {formatDuration(call.duration)}
                          </TableCell>
                          <TableCell data-testid={`text-call-status-${call.id || idx}`}>
                            <Badge variant="secondary" className={`no-default-hover-elevate text-xs ${statusColor(call.status)}`}>
                              {call.status || "unknown"}
                            </Badge>
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

        <TabsContent value="system-health" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card data-testid="card-api-health">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">API Health</p>
                    <div className="flex items-center gap-2 mt-2">
                      {infraData?.api?.healthy !== false ? (
                        <>
                          <CheckCircle className="h-5 w-5 text-green-500" />
                          <span className="font-semibold text-green-600 dark:text-green-400" data-testid="text-api-status">Operational</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-5 w-5 text-red-500" />
                          <span className="font-semibold text-red-600 dark:text-red-400" data-testid="text-api-status">Down</span>
                        </>
                      )}
                    </div>
                  </div>
                  <Server className="h-8 w-8 text-muted-foreground/30" />
                </div>
              </CardContent>
            </Card>
            <Card data-testid="card-db-health">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Database</p>
                    <div className="flex items-center gap-2 mt-2">
                      {infraData?.database?.healthy !== false ? (
                        <>
                          <CheckCircle className="h-5 w-5 text-green-500" />
                          <span className="font-semibold text-green-600 dark:text-green-400" data-testid="text-db-status">Operational</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-5 w-5 text-red-500" />
                          <span className="font-semibold text-red-600 dark:text-red-400" data-testid="text-db-status">Down</span>
                        </>
                      )}
                    </div>
                  </div>
                  <Shield className="h-8 w-8 text-muted-foreground/30" />
                </div>
              </CardContent>
            </Card>
            <Card data-testid="card-twilio-health">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Twilio Connection</p>
                    <div className="flex items-center gap-2 mt-2">
                      {infraData?.twilio?.healthy === true ? (
                        <>
                          <CheckCircle className="h-5 w-5 text-green-500" />
                          <span className="font-semibold text-green-600 dark:text-green-400" data-testid="text-twilio-status">Connected</span>
                        </>
                      ) : infraData?.twilio?.healthy === false ? (
                        <>
                          <XCircle className="h-5 w-5 text-red-500" />
                          <span className="font-semibold text-red-600 dark:text-red-400" data-testid="text-twilio-status">Disconnected</span>
                        </>
                      ) : (
                        <>
                          <Wifi className="h-5 w-5 text-yellow-500" />
                          <span className="font-semibold text-yellow-600 dark:text-yellow-400" data-testid="text-twilio-status">Checking</span>
                        </>
                      )}
                    </div>
                  </div>
                  <Wifi className="h-8 w-8 text-muted-foreground/30" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Server className="h-4 w-4" />
                Sub-Account Health
              </CardTitle>
            </CardHeader>
            <CardContent>
              {subAccounts.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <Server className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm" data-testid="text-no-sub-accounts">No sub-accounts configured.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table data-testid="table-sub-account-health">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Account Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Concurrent Calls</TableHead>
                        <TableHead>Daily Spend</TableHead>
                        <TableHead>Spend Usage</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {subAccounts.map((acc: any, idx: number) => {
                        const spendPct = acc.dailySpendLimit
                          ? Math.min(100, Math.round((Number(acc.currentSpend || 0) / Number(acc.dailySpendLimit)) * 100))
                          : 0;
                        return (
                          <TableRow key={acc.accountSid || idx} data-testid={`row-sub-health-${idx}`}>
                            <TableCell className="font-medium" data-testid={`text-sub-name-${idx}`}>
                              {acc.friendlyName || `Account ${idx + 1}`}
                            </TableCell>
                            <TableCell data-testid={`text-sub-status-${idx}`}>
                              <Badge
                                variant="secondary"
                                className={`no-default-hover-elevate text-xs ${
                                  acc.status === "active"
                                    ? "bg-green-500/10 text-green-600 dark:text-green-400"
                                    : acc.status === "pending"
                                    ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
                                    : "bg-red-500/10 text-red-600 dark:text-red-400"
                                }`}
                              >
                                {acc.status}
                              </Badge>
                            </TableCell>
                            <TableCell data-testid={`text-sub-concurrent-${idx}`}>
                              <span className="text-sm">
                                {acc.currentConcurrent ?? 0} / {acc.concurrentLimit ?? "-"}
                              </span>
                            </TableCell>
                            <TableCell data-testid={`text-sub-spend-${idx}`}>
                              <span className="text-sm">
                                ${Number(acc.currentSpend || 0).toFixed(2)} / ${acc.dailySpendLimit ? Number(acc.dailySpendLimit).toFixed(2) : "-"}
                              </span>
                            </TableCell>
                            <TableCell data-testid={`text-sub-spend-bar-${idx}`}>
                              {acc.dailySpendLimit ? (
                                <div className="flex items-center gap-2 min-w-[120px]">
                                  <Progress value={spendPct} className="h-2 flex-1" />
                                  <span className="text-xs text-muted-foreground w-10 text-right">{spendPct}%</span>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">N/A</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Country Coverage
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeCountries.length === 0 ? (
                <p className="text-sm text-muted-foreground" data-testid="text-no-countries">No active countries.</p>
              ) : (
                <div className="flex flex-wrap gap-2" data-testid="grid-country-coverage">
                  {activeCountries.map((country: string, idx: number) => (
                    <Badge key={idx} variant="secondary" className="no-default-hover-elevate" data-testid={`badge-country-${idx}`}>
                      {country}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4 mt-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <h2 className="text-lg font-semibold" data-testid="text-alerts-heading">Recent Alerts</h2>
            <Button
              variant="outline"
              onClick={fetchData}
              disabled={loading}
              data-testid="button-refresh-alerts"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh Alerts
            </Button>
          </div>

          {fraudAlerts.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm" data-testid="text-no-alerts">No alerts detected. All systems normal.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {fraudAlerts.map((alert: any, idx: number) => (
                <Card key={idx} data-testid={`card-alert-${idx}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className={`h-5 w-5 shrink-0 mt-0.5 ${
                          alert.severity === "critical" ? "text-red-500" :
                          alert.severity === "warning" ? "text-yellow-500" : "text-blue-500"
                        }`} />
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge
                              variant="secondary"
                              className={`no-default-hover-elevate text-xs ${severityColor(alert.severity || "info")}`}
                              data-testid={`badge-alert-severity-${idx}`}
                            >
                              {alert.severity || "info"}
                            </Badge>
                            {alert.orgId && (
                              <span className="text-xs text-muted-foreground" data-testid={`text-alert-org-${idx}`}>
                                Org #{alert.orgId}
                              </span>
                            )}
                          </div>
                          <p className="text-sm" data-testid={`text-alert-message-${idx}`}>
                            {alert.message || alert.description || "Alert triggered"}
                          </p>
                          <p className="text-xs text-muted-foreground" data-testid={`text-alert-time-${idx}`}>
                            {alert.createdAt ? formatTimestamp(alert.createdAt) : alert.timestamp ? formatTimestamp(alert.timestamp) : "-"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}