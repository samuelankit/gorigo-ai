"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Megaphone,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Building2,
  Bot,
  Users,
  CheckCircle2,
  Clock,
  Play,
  Pause,
  CircleDot,
  Activity,
} from "lucide-react";

interface CampaignRecord {
  id: number;
  orgId: number;
  name: string;
  description: string | null;
  agentId: number | null;
  status: string | null;
  totalContacts: number | null;
  completedCount: number | null;
  failedCount: number | null;
  callInterval: number | null;
  maxRetries: number | null;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  orgName: string | null;
  agentName: string | null;
}

interface Stats {
  totalCampaigns: number;
  activeCampaigns: number;
  draftCampaigns: number;
  completedCampaigns: number;
  pausedCampaigns: number;
  totalContacts: number;
  completedContacts: number;
  failedContacts: number;
  uniqueOrgs: number;
}

function formatDate(d: string | null): string {
  if (!d) return "-";
  return new Date(d).toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatRelative(d: string | null): string {
  if (!d) return "-";
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function statusBadgeVariant(status: string | null): "default" | "destructive" | "secondary" | "outline" {
  switch (status) {
    case "active": return "default";
    case "completed": return "secondary";
    case "paused": return "outline";
    case "failed": return "destructive";
    default: return "secondary";
  }
}

export default function AdminCampaignsPage() {
  const [campaignsList, setCampaignsList] = useState<CampaignRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(0);
  const [detailCampaign, setDetailCampaign] = useState<CampaignRecord | null>(null);

  const PAGE_SIZE = 25;

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(page * PAGE_SIZE) });
      if (search) params.set("search", search);
      if (status !== "all") params.set("status", status);
      const res = await fetch(`/api/admin/campaigns?${params}`);
      const data = await res.json();
      if (data && !data.error) {
        setCampaignsList(data.campaigns ?? []);
        setTotal(data.total ?? 0);
        setStats(data.stats ?? null);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, [search, status, page]);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);
  useEffect(() => { setPage(0); }, [search, status]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (loading && !stats) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-campaigns-title">
            <Megaphone className="h-6 w-6 text-muted-foreground" />
            Campaign Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Monitor outbound campaigns across all organisations</p>
        </div>
        <Button variant="outline" onClick={fetchCampaigns} disabled={loading} data-testid="button-refresh-campaigns">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-stat-total">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Total Campaigns</p>
                <p className="text-2xl font-bold mt-1" data-testid="text-stat-total">{stats?.totalCampaigns ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1" data-testid="text-stat-orgs">{stats?.uniqueOrgs ?? 0} organisations</p>
              </div>
              <Megaphone className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card data-testid="card-stat-active">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Status Breakdown</p>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <div className="flex items-center gap-1" title="Active">
                    <Play className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm font-bold" data-testid="text-stat-active">{stats?.activeCampaigns ?? 0}</span>
                  </div>
                  <div className="flex items-center gap-1" title="Paused">
                    <Pause className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm font-bold" data-testid="text-stat-paused">{stats?.pausedCampaigns ?? 0}</span>
                  </div>
                  <div className="flex items-center gap-1" title="Draft">
                    <CircleDot className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm font-bold" data-testid="text-stat-draft">{stats?.draftCampaigns ?? 0}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{stats?.completedCampaigns ?? 0} completed</p>
              </div>
              <Activity className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card data-testid="card-stat-contacts">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Total Contacts</p>
                <p className="text-2xl font-bold mt-1" data-testid="text-stat-contacts">{(stats?.totalContacts ?? 0).toLocaleString()}</p>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <span className="text-xs text-muted-foreground" data-testid="text-stat-completed-contacts">{(stats?.completedContacts ?? 0).toLocaleString()} reached</span>
                  {(stats?.failedContacts ?? 0) > 0 && (
                    <span className="text-xs text-destructive" data-testid="text-stat-failed-contacts">{stats!.failedContacts} failed</span>
                  )}
                </div>
              </div>
              <Users className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card data-testid="card-stat-completion">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Completion Rate</p>
                <p className="text-2xl font-bold mt-1" data-testid="text-stat-completion-rate">
                  {(stats?.totalContacts ?? 0) > 0
                    ? `${Math.round(((stats?.completedContacts ?? 0) / (stats?.totalContacts ?? 1)) * 100)}%`
                    : "0%"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Contacts successfully reached</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <CardTitle className="text-base">All Campaigns</CardTitle>
            <Badge variant="secondary" data-testid="text-campaigns-count">{total} campaigns</Badge>
          </div>
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search campaign name, org..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="input-campaigns-search"
              />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[130px]" data-testid="select-campaigns-status">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {campaignsList.length === 0 ? (
            <div className="text-center py-12">
              <Megaphone className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground" data-testid="text-no-campaigns">No campaigns found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Organisation</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Contacts</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaignsList.map((c) => {
                    const progressPct = (c.totalContacts ?? 0) > 0
                      ? Math.round(((c.completedCount ?? 0) / (c.totalContacts ?? 1)) * 100)
                      : 0;
                    return (
                      <TableRow
                        key={c.id}
                        className="cursor-pointer"
                        onClick={() => setDetailCampaign(c)}
                        data-testid={`row-campaign-${c.id}`}
                      >
                        <TableCell className="font-medium max-w-[200px] truncate" data-testid={`text-campaign-name-${c.id}`}>
                          {c.name}
                        </TableCell>
                        <TableCell data-testid={`text-campaign-org-${c.id}`}>
                          <div className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="text-sm truncate max-w-[120px]">{c.orgName || `Org #${c.orgId}`}</span>
                          </div>
                        </TableCell>
                        <TableCell data-testid={`text-campaign-agent-${c.id}`}>
                          <div className="flex items-center gap-1.5">
                            <Bot className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="text-sm truncate max-w-[120px]">{c.agentName || (c.agentId ? `Agent #${c.agentId}` : "-")}</span>
                          </div>
                        </TableCell>
                        <TableCell data-testid={`text-campaign-status-${c.id}`}>
                          <Badge variant={statusBadgeVariant(c.status)}>
                            {c.status || "draft"}
                          </Badge>
                        </TableCell>
                        <TableCell data-testid={`text-campaign-progress-${c.id}`}>
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full bg-foreground/40"
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">{progressPct}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm" data-testid={`text-campaign-contacts-${c.id}`}>
                          {(c.completedCount ?? 0)} / {(c.totalContacts ?? 0)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground" data-testid={`text-campaign-created-${c.id}`}>
                          {formatRelative(c.createdAt)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-2 mt-4 flex-wrap">
              <p className="text-sm text-muted-foreground">
                Page {page + 1} of {totalPages}
              </p>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)} data-testid="button-campaigns-prev">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)} data-testid="button-campaigns-next">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!detailCampaign} onOpenChange={(open) => { if (!open) setDetailCampaign(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" data-testid="dialog-campaign-detail">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-muted-foreground" />
              {detailCampaign?.name}
            </DialogTitle>
            <DialogDescription>Campaign details and progress</DialogDescription>
          </DialogHeader>
          {detailCampaign && (() => {
            const progressPct = (detailCampaign.totalContacts ?? 0) > 0
              ? Math.round(((detailCampaign.completedCount ?? 0) / (detailCampaign.totalContacts ?? 1)) * 100)
              : 0;
            return (
              <div className="space-y-4 mt-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Organisation</p>
                    <p className="font-medium" data-testid="text-detail-org">{detailCampaign.orgName || `Org #${detailCampaign.orgId}`}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Status</p>
                    <Badge variant={statusBadgeVariant(detailCampaign.status)} data-testid="text-detail-status">
                      {detailCampaign.status || "draft"}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Agent</p>
                    <p className="font-medium" data-testid="text-detail-agent">
                      {detailCampaign.agentName || (detailCampaign.agentId ? `Agent #${detailCampaign.agentId}` : "Not assigned")}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Call Interval</p>
                    <p className="font-medium" data-testid="text-detail-interval">{detailCampaign.callInterval ?? 30}s</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Total Contacts</p>
                    <p className="font-medium" data-testid="text-detail-total">{(detailCampaign.totalContacts ?? 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Completed</p>
                    <p className="font-medium" data-testid="text-detail-completed">{(detailCampaign.completedCount ?? 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Failed</p>
                    <p className="font-medium" data-testid="text-detail-failed">{(detailCampaign.failedCount ?? 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Max Retries</p>
                    <p className="font-medium" data-testid="text-detail-retries">{detailCampaign.maxRetries ?? 1}</p>
                  </div>
                </div>

                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider mb-2">Progress</p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-foreground/40"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium" data-testid="text-detail-progress">{progressPct}%</span>
                  </div>
                </div>

                {detailCampaign.description && (
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Description</p>
                    <p className="text-sm" data-testid="text-detail-description">{detailCampaign.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Scheduled</p>
                    <p className="font-medium" data-testid="text-detail-scheduled">{formatDate(detailCampaign.scheduledAt)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Started</p>
                    <p className="font-medium" data-testid="text-detail-started">{formatDate(detailCampaign.startedAt)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Completed</p>
                    <p className="font-medium" data-testid="text-detail-completed-at">{formatDate(detailCampaign.completedAt)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Created</p>
                    <p className="font-medium" data-testid="text-detail-created">{formatDate(detailCampaign.createdAt)}</p>
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
