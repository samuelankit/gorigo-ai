"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft, Building2, Mail, Phone, Cloud, Key, Server, DollarSign,
  Users, Bot, TrendingUp, Shield, ShieldOff, Flag, Clock, PhoneCall,
  Wallet, Activity, BarChart3, AlertTriangle,
} from "lucide-react";

interface ClientDetail {
  client: {
    id: number;
    name: string;
    timezone: string;
    currency: string;
    channelType: string;
    deploymentModel: string;
    maxConcurrentCalls: number;
    voicemailEnabled: boolean;
    createdAt: string;
  };
  owner: { email: string; firstName: string; lastName: string | null; id: number } | null;
  wallet: { balance: string; currency: string; isActive: boolean; lowBalanceThreshold: string } | null;
  partner: { id: number; name: string; tier: string } | null;
  usage: { totalCalls: number; completedCalls: number; failedCalls: number; totalMinutes: number; totalCost: number; avgDuration: number };
  usageLast30Days: { totalCalls: number; completedCalls: number; failedCalls: number; totalMinutes: number; totalCost: number; avgDuration: number };
  agentCount: number;
  memberCount: number;
}

const PACKAGE_CONFIG: Record<string, { label: string; color: string; rate: string; icon: typeof Cloud }> = {
  individual: { label: "Individual", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400", rate: "0.20/min", icon: Cloud },
  self_hosted: { label: "Self-Hosted", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", rate: "0.03/min", icon: Server },
  custom: { label: "Custom", color: "bg-violet-500/10 text-violet-600 dark:text-violet-400", rate: "Custom", icon: Cloud },
};

function StatCard({ icon: Icon, label, value, subtext, color, testId }: {
  icon: typeof Phone;
  label: string;
  value: string | number;
  subtext?: string;
  color: string;
  testId: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-1">
          <Icon className={`w-4 h-4 ${color}`} />
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
        <p className="text-2xl font-bold" data-testid={testId}>{value}</p>
        {subtext && <p className="text-xs text-muted-foreground mt-1">{subtext}</p>}
      </CardContent>
    </Card>
  );
}

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params?.id as string;

  const [data, setData] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [statusAction, setStatusAction] = useState<"suspend" | "activate" | "flag" | null>(null);
  const [statusReason, setStatusReason] = useState("");
  const [statusLoading, setStatusLoading] = useState(false);

  const fetchData = useCallback(() => {
    if (!clientId) return;
    setLoading(true);
    setError(false);
    fetch(`/api/admin/clients/${clientId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed");
        return r.json();
      })
      .then((d) => setData(d))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [clientId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleStatusAction = async () => {
    if (!statusAction) return;
    setStatusLoading(true);
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: statusAction, reason: statusReason }),
      });
      if (res.ok) {
        fetchData();
        setStatusAction(null);
        setStatusReason("");
      }
    } catch (error) {
      console.error("Update client status failed:", error);
    } finally {
      setStatusLoading(false);
    }
  };

  const formatCurrency = (amount: number | string) =>
    new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Number(amount));

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });

  if (loading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-muted">
          <AlertTriangle className="w-7 h-7 text-muted-foreground/60" />
        </div>
        <p className="text-muted-foreground" data-testid="text-client-error">
          Client not found or failed to load.
        </p>
        <Button variant="outline" onClick={() => router.push("/admin/clients")} data-testid="button-back-to-clients">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Clients
        </Button>
      </div>
    );
  }

  const { client, owner, wallet, partner, usage, usageLast30Days, agentCount, memberCount } = data;
  const pkg = PACKAGE_CONFIG[client.deploymentModel] || PACKAGE_CONFIG.individual;
  const PkgIcon = pkg.icon;
  const isSuspended = client.channelType === "suspended";
  const walletBalance = Number(wallet?.balance ?? 0);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/admin/clients")} data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-foreground" data-testid="text-client-name">
                {client.name}
              </h1>
              {isSuspended ? (
                <Badge variant="destructive" className="no-default-hover-elevate">Suspended</Badge>
              ) : (
                <Badge variant="secondary" className="no-default-hover-elevate bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">Active</Badge>
              )}
              <Badge className={`no-default-hover-elevate ${pkg.color}`}>
                <PkgIcon className="w-3 h-3 mr-1" />
                {pkg.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              ID: {client.id} {owner && <> &middot; {owner.email}</>} {partner && <> &middot; Partner: {partner.name}</>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isSuspended ? (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" onClick={() => setStatusAction("activate")} data-testid="button-activate-client">
                  <Shield className="h-4 w-4 mr-1" />
                  Activate
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Activate Client</DialogTitle>
                  <DialogDescription>This will re-enable services for {client.name}.</DialogDescription>
                </DialogHeader>
                <Textarea
                  placeholder="Reason (optional)"
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  data-testid="input-status-reason"
                />
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline" size="sm">Cancel</Button>
                  </DialogClose>
                  <DialogClose asChild>
                    <Button size="sm" onClick={handleStatusAction} disabled={statusLoading} data-testid="button-confirm-activate">
                      Confirm Activate
                    </Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : (
            <>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" onClick={() => setStatusAction("flag")} data-testid="button-flag-client">
                    <Flag className="h-4 w-4 mr-1" />
                    Flag
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Flag Client</DialogTitle>
                    <DialogDescription>Flag {client.name} for review.</DialogDescription>
                  </DialogHeader>
                  <Textarea
                    placeholder="Reason for flagging..."
                    value={statusReason}
                    onChange={(e) => setStatusReason(e.target.value)}
                    data-testid="input-flag-reason"
                  />
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline" size="sm">Cancel</Button>
                    </DialogClose>
                    <DialogClose asChild>
                      <Button size="sm" onClick={handleStatusAction} disabled={statusLoading} data-testid="button-confirm-flag">
                        Confirm Flag
                      </Button>
                    </DialogClose>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="destructive" size="sm" onClick={() => setStatusAction("suspend")} data-testid="button-suspend-client">
                    <ShieldOff className="h-4 w-4 mr-1" />
                    Suspend
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Suspend Client</DialogTitle>
                    <DialogDescription>This will disable all services for {client.name}. All calls will stop.</DialogDescription>
                  </DialogHeader>
                  <Textarea
                    placeholder="Reason for suspension..."
                    value={statusReason}
                    onChange={(e) => setStatusReason(e.target.value)}
                    data-testid="input-suspend-reason"
                  />
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline" size="sm">Cancel</Button>
                    </DialogClose>
                    <DialogClose asChild>
                      <Button variant="destructive" size="sm" onClick={handleStatusAction} disabled={statusLoading} data-testid="button-confirm-suspend">
                        Confirm Suspend
                      </Button>
                    </DialogClose>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList data-testid="tabs-client-detail">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="usage" data-testid="tab-usage">Usage</TabsTrigger>
          <TabsTrigger value="calls" data-testid="tab-calls">Calls</TabsTrigger>
          <TabsTrigger value="agents" data-testid="tab-agents">Agents</TabsTrigger>
          <TabsTrigger value="wallet" data-testid="tab-wallet">Wallet</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Phone} label="Total Calls" value={usage.totalCalls.toLocaleString()} subtext={`${usageLast30Days.totalCalls} last 30 days`} color="text-blue-500" testId="text-overview-calls" />
            <StatCard icon={DollarSign} label="Total Revenue" value={formatCurrency(usage.totalCost)} subtext={`${formatCurrency(usageLast30Days.totalCost)} last 30 days`} color="text-amber-500" testId="text-overview-revenue" />
            <StatCard icon={Bot} label="Agents" value={agentCount} subtext={`${memberCount} team member${memberCount !== 1 ? "s" : ""}`} color="text-violet-500" testId="text-overview-agents" />
            <StatCard icon={Wallet} label="Wallet" value={formatCurrency(walletBalance)} subtext={wallet?.isActive ? "Active" : "Inactive"} color={walletBalance <= 0 ? "text-destructive" : "text-emerald-500"} testId="text-overview-wallet" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Client Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <DetailRow label="Business Name" value={client.name} testId="text-detail-name" />
                  <DetailRow label="Owner Email" value={owner?.email ?? "N/A"} testId="text-detail-email" />
                  <DetailRow label="Deployment" value={pkg.label} testId="text-detail-package" />
                  <DetailRow label="Rate" value={`£${pkg.rate}`} testId="text-detail-rate" />
                  <DetailRow label="Timezone" value={client.timezone || "UTC"} testId="text-detail-timezone" />
                  <DetailRow label="Currency" value={client.currency || "GBP"} testId="text-detail-currency" />
                  <DetailRow label="Max Concurrent Calls" value={String(client.maxConcurrentCalls ?? 5)} testId="text-detail-concurrent" />
                  <DetailRow label="Voicemail" value={client.voicemailEnabled ? "Enabled" : "Disabled"} testId="text-detail-voicemail" />
                  <DetailRow label="Joined" value={client.createdAt ? formatDate(client.createdAt) : "N/A"} testId="text-detail-joined" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Last 30 Days Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <DetailRow label="Total Calls" value={String(usageLast30Days.totalCalls)} testId="text-30d-calls" />
                  <DetailRow label="Completed" value={String(usageLast30Days.completedCalls)} testId="text-30d-completed" />
                  <DetailRow label="Failed" value={String(usageLast30Days.failedCalls)} testId="text-30d-failed" />
                  <DetailRow label="Total Minutes" value={`${usageLast30Days.totalMinutes.toFixed(1)} min`} testId="text-30d-minutes" />
                  <DetailRow label="Avg Duration" value={`${usageLast30Days.avgDuration.toFixed(0)}s`} testId="text-30d-avg" />
                  <DetailRow label="Revenue" value={formatCurrency(usageLast30Days.totalCost)} testId="text-30d-revenue" />
                  <DetailRow
                    label="Success Rate"
                    value={usageLast30Days.totalCalls > 0
                      ? `${((usageLast30Days.completedCalls / usageLast30Days.totalCalls) * 100).toFixed(1)}%`
                      : "N/A"
                    }
                    testId="text-30d-success"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {partner && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Partner Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <DetailRow label="Partner Name" value={partner.name} testId="text-partner-name" />
                  <DetailRow label="Partner ID" value={String(partner.id)} testId="text-partner-id" />
                  <DetailRow label="Tier" value={partner.tier || "Standard"} testId="text-partner-tier" />
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="usage" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard icon={PhoneCall} label="All-Time Calls" value={usage.totalCalls.toLocaleString()} color="text-blue-500" testId="text-usage-total" />
            <StatCard icon={Clock} label="Total Minutes" value={`${usage.totalMinutes.toFixed(1)} min`} color="text-emerald-500" testId="text-usage-minutes" />
            <StatCard icon={BarChart3} label="Avg Duration" value={`${usage.avgDuration.toFixed(0)}s`} color="text-violet-500" testId="text-usage-avg" />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Call Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Metric</TableHead>
                    <TableHead className="text-right">All-Time</TableHead>
                    <TableHead className="text-right">Last 30 Days</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Total Calls</TableCell>
                    <TableCell className="text-right">{usage.totalCalls.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{usageLast30Days.totalCalls.toLocaleString()}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Completed</TableCell>
                    <TableCell className="text-right">{usage.completedCalls.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{usageLast30Days.completedCalls.toLocaleString()}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Failed</TableCell>
                    <TableCell className="text-right">{usage.failedCalls.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{usageLast30Days.failedCalls.toLocaleString()}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Total Minutes</TableCell>
                    <TableCell className="text-right">{usage.totalMinutes.toFixed(1)}</TableCell>
                    <TableCell className="text-right">{usageLast30Days.totalMinutes.toFixed(1)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Revenue</TableCell>
                    <TableCell className="text-right">{formatCurrency(usage.totalCost)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(usageLast30Days.totalCost)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Avg Duration</TableCell>
                    <TableCell className="text-right">{usage.avgDuration.toFixed(0)}s</TableCell>
                    <TableCell className="text-right">{usageLast30Days.avgDuration.toFixed(0)}s</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Success Rate</TableCell>
                    <TableCell className="text-right">
                      {usage.totalCalls > 0 ? `${((usage.completedCalls / usage.totalCalls) * 100).toFixed(1)}%` : "N/A"}
                    </TableCell>
                    <TableCell className="text-right">
                      {usageLast30Days.totalCalls > 0 ? `${((usageLast30Days.completedCalls / usageLast30Days.totalCalls) * 100).toFixed(1)}%` : "N/A"}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calls" className="space-y-6">
          <CallsTab clientId={clientId} />
        </TabsContent>

        <TabsContent value="agents" className="space-y-6">
          <AgentsTab clientId={clientId} />
        </TabsContent>

        <TabsContent value="wallet" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard icon={Wallet} label="Balance" value={formatCurrency(walletBalance)} color={walletBalance <= 0 ? "text-destructive" : "text-emerald-500"} testId="text-wallet-balance" />
            <StatCard icon={DollarSign} label="Low Balance Threshold" value={wallet ? formatCurrency(wallet.lowBalanceThreshold) : "N/A"} color="text-amber-500" testId="text-wallet-threshold" />
            <StatCard icon={Shield} label="Wallet Status" value={wallet?.isActive ? "Active" : "Inactive"} color={wallet?.isActive ? "text-emerald-500" : "text-destructive"} testId="text-wallet-status" />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Billing Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <DetailRow label="Package" value={pkg.label} testId="text-billing-package" />
                <DetailRow label="Rate" value={`£${pkg.rate}`} testId="text-billing-rate" />
                <DetailRow label="All-Time Cost" value={formatCurrency(usage.totalCost)} testId="text-billing-total" />
                <DetailRow label="Last 30 Days Cost" value={formatCurrency(usageLast30Days.totalCost)} testId="text-billing-30d" />
                <DetailRow label="Currency" value={wallet?.currency ?? client.currency ?? "GBP"} testId="text-billing-currency" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DetailRow({ label, value, testId }: { label: string; value: string; testId: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right" data-testid={testId}>{value}</span>
    </div>
  );
}

function CallsTab({ clientId }: { clientId: string }) {
  const [calls, setCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/clients/${clientId}/calls`)
      .then((r) => r.ok ? r.json() : { calls: [] })
      .then((d) => setCalls(d.calls || []))
      .catch(() => setCalls([]))
      .finally(() => setLoading(false));
  }, [clientId]);

  if (loading) return <Skeleton className="h-48 w-full" />;

  if (calls.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Phone className="w-8 h-8 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground" data-testid="text-no-calls">No call history found for this client.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Phone className="w-4 h-4" />
          Recent Calls
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table data-testid="table-client-calls">
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Direction</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead className="text-right">Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {calls.map((call: any) => (
                <TableRow key={call.id} data-testid={`row-call-${call.id}`}>
                  <TableCell className="text-sm whitespace-nowrap">{call.createdAt ? new Date(call.createdAt).toLocaleString() : "-"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="no-default-hover-elevate">{call.direction || "inbound"}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={call.status === "completed" ? "secondary" : "destructive"}
                      className={`no-default-hover-elevate ${call.status === "completed" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : ""}`}
                    >
                      {call.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{call.duration ? `${Math.round(call.duration)}s` : "-"}</TableCell>
                  <TableCell className="text-sm text-right">
                    {call.callCost ? new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Number(call.callCost)) : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function AgentsTab({ clientId }: { clientId: string }) {
  const [agentsList, setAgentsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/clients/${clientId}/agents`)
      .then((r) => r.ok ? r.json() : { agents: [] })
      .then((d) => setAgentsList(d.agents || []))
      .catch(() => setAgentsList([]))
      .finally(() => setLoading(false));
  }, [clientId]);

  if (loading) return <Skeleton className="h-48 w-full" />;

  if (agentsList.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Bot className="w-8 h-8 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground" data-testid="text-no-agents">No agents configured for this client.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Bot className="w-4 h-4" />
          AI Agents
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table data-testid="table-client-agents">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Language</TableHead>
                <TableHead>Capabilities</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agentsList.map((agent: any) => (
                <TableRow key={agent.id} data-testid={`row-agent-${agent.id}`}>
                  <TableCell className="font-medium">{agent.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="no-default-hover-elevate">{agent.agentType || "general"}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">{agent.language || "en-GB"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {agent.inboundEnabled && <Badge variant="secondary" className="no-default-hover-elevate bg-blue-500/10 text-blue-600 dark:text-blue-400">Inbound</Badge>}
                      {agent.outboundEnabled && <Badge variant="secondary" className="no-default-hover-elevate bg-violet-500/10 text-violet-600 dark:text-violet-400">Outbound</Badge>}
                      {!agent.inboundEnabled && !agent.outboundEnabled && <span className="text-sm text-muted-foreground">None</span>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
