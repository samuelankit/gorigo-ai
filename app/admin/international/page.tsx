"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Globe, Shield, AlertTriangle, BarChart3, Phone, Users, TrendingUp,
  Activity, Plus, RefreshCw, CheckCircle, XCircle, Clock,
} from "lucide-react";

export default function AdminInternationalPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [createDialog, setCreateDialog] = useState(false);
  const [newSubAccount, setNewSubAccount] = useState({ orgId: "", friendlyName: "" });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [mainRes, alertsRes] = await Promise.all([
        fetch("/api/admin/international"),
        fetch("/api/admin/international/fraud-alerts"),
      ]);
      const mainData = await mainRes.json();
      const alertsData = await alertsRes.json();
      setData({ ...mainData, fraudAlerts: alertsData.alerts || [] });
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function refreshFraudAlerts() {
    try {
      const res = await fetch("/api/admin/international/fraud-alerts");
      const alertsData = await res.json();
      setData((prev: any) => prev ? { ...prev, fraudAlerts: alertsData.alerts || [] } : prev);
    } catch (error) {
      console.error("Failed to refresh fraud alerts:", error);
    }
  }

  const countryStats = data?.countryStats || [];
  const activeCountries = data?.activeCountries || [];
  const subAccounts = data?.subAccounts || [];
  const campaignStats = data?.campaignStats || [];
  const rateCardStats = data?.rateCardStats || {};
  const compliance = data?.compliance || {};
  const fraudAlerts = data?.fraudAlerts || [];

  const complianceRate = compliance.totalCalls > 0
    ? ((compliance.disclosurePlayed / compliance.totalCalls) * 100).toFixed(1)
    : "0.0";

  if (loading && !data) {
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
          <Globe className="h-6 w-6 text-violet-500" />
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-international-title">International Operations</h1>
            <p className="text-sm text-muted-foreground">Manage international calling operations, compliance, and fraud detection.</p>
          </div>
        </div>
        <Button variant="outline" onClick={fetchData} disabled={loading} data-testid="button-refresh-international">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto" data-testid="tabs-international">
          <TabsTrigger value="overview" data-testid="tab-overview">
            <Globe className="h-3.5 w-3.5 mr-1.5" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="sub-accounts" data-testid="tab-sub-accounts">
            <Users className="h-3.5 w-3.5 mr-1.5" />
            Sub-Accounts
          </TabsTrigger>
          <TabsTrigger value="compliance" data-testid="tab-compliance">
            <Shield className="h-3.5 w-3.5 mr-1.5" />
            Compliance
          </TabsTrigger>
          <TabsTrigger value="fraud-alerts" data-testid="tab-fraud-alerts">
            <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
            Fraud Alerts
          </TabsTrigger>
          <TabsTrigger value="campaigns" data-testid="tab-campaigns">
            <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
            Campaigns
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card data-testid="card-stat-countries">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Total Countries</p>
                    <p className="text-2xl font-bold mt-1" data-testid="text-stat-countries">{activeCountries.length}</p>
                  </div>
                  <Globe className="h-8 w-8 text-muted-foreground/30" />
                </div>
              </CardContent>
            </Card>
            <Card data-testid="card-stat-sub-accounts">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Active Sub-Accounts</p>
                    <p className="text-2xl font-bold mt-1" data-testid="text-stat-sub-accounts">
                      {subAccounts.filter((s: any) => s.status === "active").length}
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-muted-foreground/30" />
                </div>
              </CardContent>
            </Card>
            <Card data-testid="card-stat-compliance-rate">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Compliance Rate</p>
                    <p className="text-2xl font-bold mt-1" data-testid="text-stat-compliance-rate">{complianceRate}%</p>
                  </div>
                  <Shield className="h-8 w-8 text-muted-foreground/30" />
                </div>
              </CardContent>
            </Card>
            <Card data-testid="card-stat-fraud-alerts">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Fraud Alerts</p>
                    <p className="text-2xl font-bold mt-1" data-testid="text-stat-fraud-alerts">{fraudAlerts.length}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-muted-foreground/30" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Country Stats
              </CardTitle>
            </CardHeader>
            <CardContent>
              {countryStats.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <Globe className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No country stats available.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table data-testid="table-country-stats">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Country Code</TableHead>
                        <TableHead>Total Calls</TableHead>
                        <TableHead>Avg Duration</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {countryStats.map((stat: any, idx: number) => (
                        <TableRow key={idx} data-testid={`row-country-stat-${idx}`}>
                          <TableCell className="font-mono font-medium" data-testid={`text-country-code-${idx}`}>
                            {stat.countryCode || stat.country_code || "-"}
                          </TableCell>
                          <TableCell data-testid={`text-total-calls-${idx}`}>
                            {(stat.totalCalls || stat.total_calls || 0).toLocaleString()}
                          </TableCell>
                          <TableCell data-testid={`text-avg-duration-${idx}`}>
                            {stat.avgDuration || stat.avg_duration || "0"}s
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Active Countries
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeCountries.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active countries.</p>
              ) : (
                <div className="flex flex-wrap gap-2" data-testid="grid-active-countries">
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

        <TabsContent value="sub-accounts" className="space-y-4 mt-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <h2 className="text-lg font-semibold" data-testid="text-sub-accounts-heading">Voice Provider Accounts</h2>
            <Dialog open={createDialog} onOpenChange={setCreateDialog}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-sub-account">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Sub-Account
                </Button>
              </DialogTrigger>
              <DialogContent data-testid="dialog-create-sub-account">
                <DialogHeader>
                  <DialogTitle>Create Sub-Account</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-2">
                  <div className="space-y-2">
                    <Label htmlFor="orgId">Org ID</Label>
                    <Input
                      id="orgId"
                      type="number"
                      placeholder="Enter org ID"
                      value={newSubAccount.orgId}
                      onChange={(e) => setNewSubAccount({ ...newSubAccount, orgId: e.target.value })}
                      data-testid="input-org-id"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="friendlyName">Friendly Name</Label>
                    <Input
                      id="friendlyName"
                      placeholder="Enter friendly name"
                      value={newSubAccount.friendlyName}
                      onChange={(e) => setNewSubAccount({ ...newSubAccount, friendlyName: e.target.value })}
                      data-testid="input-friendly-name"
                    />
                  </div>
                  <Button
                    onClick={createSubAccount}
                    disabled={creating || !newSubAccount.orgId || !newSubAccount.friendlyName}
                    className="w-full"
                    data-testid="button-submit-sub-account"
                  >
                    {creating ? "Creating..." : "Create"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              {subAccounts.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No sub-accounts found.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table data-testid="table-sub-accounts">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Org ID</TableHead>
                        <TableHead>Friendly Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Concurrent Limit</TableHead>
                        <TableHead>Daily Spend Limit</TableHead>
                        <TableHead>Current Spend</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {subAccounts.map((acc: any, idx: number) => (
                        <TableRow key={acc.accountSid || idx} data-testid={`row-sub-account-${idx}`}>
                          <TableCell className="font-medium" data-testid={`text-sub-org-${idx}`}>
                            {acc.orgId}
                          </TableCell>
                          <TableCell data-testid={`text-sub-name-${idx}`}>
                            {acc.friendlyName}
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
                            {acc.concurrentLimit ?? "-"}
                          </TableCell>
                          <TableCell data-testid={`text-sub-daily-limit-${idx}`}>
                            {acc.dailySpendLimit ? `$${Number(acc.dailySpendLimit).toFixed(2)}` : "-"}
                          </TableCell>
                          <TableCell data-testid={`text-sub-current-spend-${idx}`}>
                            {acc.currentSpend ? `$${Number(acc.currentSpend).toFixed(2)}` : "$0.00"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {acc.status !== "active" && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => updateSubAccountStatus(acc.accountSid, "active")}
                                  data-testid={`button-activate-${idx}`}
                                >
                                  <CheckCircle className="h-3.5 w-3.5 mr-1" />
                                  Activate
                                </Button>
                              )}
                              {acc.status !== "suspended" && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => updateSubAccountStatus(acc.accountSid, "suspended")}
                                  data-testid={`button-suspend-${idx}`}
                                >
                                  <XCircle className="h-3.5 w-3.5 mr-1" />
                                  Suspend
                                </Button>
                              )}
                            </div>
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

        <TabsContent value="compliance" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card data-testid="card-compliance-total-calls">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Total Calls</p>
                    <p className="text-2xl font-bold mt-1" data-testid="text-compliance-total-calls">
                      {(compliance.totalCalls || 0).toLocaleString()}
                    </p>
                  </div>
                  <Phone className="h-8 w-8 text-muted-foreground/30" />
                </div>
              </CardContent>
            </Card>
            <Card data-testid="card-compliance-dnc-blocked">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">DNC Blocked</p>
                    <p className="text-2xl font-bold mt-1" data-testid="text-compliance-dnc-blocked">
                      {(compliance.dncBlocked || 0).toLocaleString()}
                    </p>
                  </div>
                  <XCircle className="h-8 w-8 text-muted-foreground/30" />
                </div>
              </CardContent>
            </Card>
            <Card data-testid="card-compliance-disclosure">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Disclosure Played</p>
                    <p className="text-2xl font-bold mt-1" data-testid="text-compliance-disclosure">
                      {(compliance.disclosurePlayed || 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1" data-testid="text-compliance-rate-value">
                      {complianceRate}% rate
                    </p>
                  </div>
                  <Shield className="h-8 w-8 text-muted-foreground/30" />
                </div>
              </CardContent>
            </Card>
            <Card data-testid="card-compliance-consent">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Consent Obtained</p>
                    <p className="text-2xl font-bold mt-1" data-testid="text-compliance-consent">
                      {(compliance.consentObtained || 0).toLocaleString()}
                    </p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-muted-foreground/30" />
                </div>
              </CardContent>
            </Card>
            <Card data-testid="card-compliance-opt-outs">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Opt-Outs</p>
                    <p className="text-2xl font-bold mt-1" data-testid="text-compliance-opt-outs">
                      {(compliance.optOuts || 0).toLocaleString()}
                    </p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-muted-foreground/30" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="fraud-alerts" className="space-y-4 mt-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <h2 className="text-lg font-semibold" data-testid="text-fraud-heading">Fraud Detection Alerts</h2>
            <Button variant="outline" onClick={refreshFraudAlerts} data-testid="button-refresh-fraud">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Alerts
            </Button>
          </div>

          {fraudAlerts.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No fraud alerts detected.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {fraudAlerts.map((alert: any, idx: number) => (
                <Card key={idx} data-testid={`card-fraud-alert-${idx}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className={`h-5 w-5 shrink-0 mt-0.5 ${
                          alert.severity === "critical" ? "text-red-500" : "text-yellow-500"
                        }`} />
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge
                              variant="secondary"
                              className={`no-default-hover-elevate text-xs ${
                                alert.severity === "critical"
                                  ? "bg-red-500/10 text-red-600 dark:text-red-400"
                                  : "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
                              }`}
                              data-testid={`badge-severity-${idx}`}
                            >
                              {alert.severity}
                            </Badge>
                            <Badge variant="outline" className="no-default-hover-elevate text-xs" data-testid={`badge-alert-type-${idx}`}>
                              {alert.type || alert.alertType}
                            </Badge>
                          </div>
                          <p className="text-sm" data-testid={`text-alert-message-${idx}`}>{alert.message}</p>
                          <p className="text-xs text-muted-foreground" data-testid={`text-alert-org-${idx}`}>
                            Org ID: {alert.orgId}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                        <Clock className="h-3.5 w-3.5" />
                        <span data-testid={`text-alert-time-${idx}`}>
                          {alert.timestamp ? new Date(alert.timestamp).toLocaleString() : "-"}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Campaign Stats by Country
              </CardTitle>
            </CardHeader>
            <CardContent>
              {campaignStats.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No campaign stats available.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table data-testid="table-campaign-stats">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Country</TableHead>
                        <TableHead>Total Campaigns</TableHead>
                        <TableHead>Active</TableHead>
                        <TableHead>Total Calls</TableHead>
                        <TableHead>Success Rate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {campaignStats.map((stat: any, idx: number) => (
                        <TableRow key={idx} data-testid={`row-campaign-stat-${idx}`}>
                          <TableCell className="font-mono font-medium" data-testid={`text-campaign-country-${idx}`}>
                            {stat.countryCode || stat.country_code || "-"}
                          </TableCell>
                          <TableCell data-testid={`text-campaign-total-${idx}`}>
                            {stat.totalCampaigns || stat.total_campaigns || 0}
                          </TableCell>
                          <TableCell data-testid={`text-campaign-active-${idx}`}>
                            {stat.activeCampaigns || stat.active_campaigns || 0}
                          </TableCell>
                          <TableCell data-testid={`text-campaign-calls-${idx}`}>
                            {(stat.totalCalls || stat.total_calls || 0).toLocaleString()}
                          </TableCell>
                          <TableCell data-testid={`text-campaign-success-${idx}`}>
                            {stat.successRate || stat.success_rate || "0"}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Rate Card Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Total Rate Cards</p>
                  <p className="text-xl font-bold" data-testid="text-rate-total">
                    {rateCardStats.totalCards || rateCardStats.total_cards || 0}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Active Rate Cards</p>
                  <p className="text-xl font-bold" data-testid="text-rate-active">
                    {rateCardStats.activeCards || rateCardStats.active_cards || 0}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Avg Margin</p>
                  <p className="text-xl font-bold" data-testid="text-rate-margin">
                    {rateCardStats.avgMargin || rateCardStats.avg_margin || "0"}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
