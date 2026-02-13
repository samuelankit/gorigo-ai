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
  Phone,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  PhoneIncoming,
  PhoneOutgoing,
  Clock,
  Activity,
  Target,
  ShieldCheck,
  Building2,
  Bot,
  Star,
  TrendingUp,
  CircleDot,
} from "lucide-react";

interface CallRecord {
  id: number;
  agentId: number;
  orgId: number;
  direction: string;
  callerNumber: string | null;
  duration: number | null;
  status: string | null;
  summary: string | null;
  leadCaptured: boolean | null;
  leadName: string | null;
  leadEmail: string | null;
  leadPhone: string | null;
  appointmentBooked: boolean | null;
  handoffTriggered: boolean | null;
  currentState: string | null;
  turnCount: number | null;
  sentimentScore: string | null;
  sentimentLabel: string | null;
  qualityScore: string | null;
  finalOutcome: string | null;
  callCost: string | null;
  createdAt: string;
  startedAt: string | null;
  endedAt: string | null;
  aiDisclosurePlayed: boolean | null;
  recordingUrl: string | null;
  billedDeploymentModel: string | null;
  billedRatePerMinute: string | null;
  agentName: string | null;
  orgName: string | null;
}

interface Stats {
  totalCalls: number;
  totalDuration: number;
  avgDuration: number;
  completedCalls: number;
  activeCalls: number;
  failedCalls: number;
  inboundCalls: number;
  outboundCalls: number;
  leadsCount: number;
  handoffsCount: number;
  avgSentiment: string;
  avgQuality: string;
  totalRevenue: string;
  uniqueOrgs: number;
  todayCalls: number;
  todayDuration: number;
  todayRevenue: string;
  todayLeads: number;
}

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDurationLong(seconds: number | null): string {
  if (!seconds || seconds <= 0) return "0s";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
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

function formatDate(d: string | null): string {
  if (!d) return "-";
  return new Date(d).toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function statusBadgeVariant(status: string | null): "default" | "destructive" | "secondary" | "outline" {
  switch (status) {
    case "completed": return "default";
    case "failed": return "destructive";
    case "in-progress": return "outline";
    default: return "secondary";
  }
}

function sentimentColor(label: string | null): string {
  switch (label) {
    case "positive": return "text-foreground";
    case "negative": return "text-destructive";
    case "neutral": return "text-muted-foreground";
    default: return "text-muted-foreground";
  }
}

export default function AdminCallsPage() {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [direction, setDirection] = useState("all");
  const [page, setPage] = useState(0);
  const [detailCall, setDetailCall] = useState<CallRecord | null>(null);

  const PAGE_SIZE = 25;

  const fetchCalls = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(page * PAGE_SIZE) });
      if (search) params.set("search", search);
      if (status !== "all") params.set("status", status);
      if (direction !== "all") params.set("direction", direction);
      const res = await fetch(`/api/admin/calls?${params}`);
      const data = await res.json();
      if (data && !data.error) {
        setCalls(data.calls ?? []);
        setTotal(data.total ?? 0);
        setStats(data.stats ?? null);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, [search, status, direction, page]);

  useEffect(() => { fetchCalls(); }, [fetchCalls]);
  useEffect(() => { setPage(0); }, [search, status, direction]);

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
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-calls-title">
            <Phone className="h-6 w-6 text-muted-foreground" />
            Call Monitoring
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Monitor all calls across organisations in real time</p>
        </div>
        <Button variant="outline" onClick={fetchCalls} disabled={loading} data-testid="button-refresh-calls">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-stat-today">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Today's Calls</p>
                <p className="text-2xl font-bold mt-1" data-testid="text-stat-today-calls">{stats?.todayCalls ?? 0}</p>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <span className="text-xs text-muted-foreground" data-testid="text-stat-today-duration">{formatDurationLong(stats?.todayDuration ?? 0)} talk time</span>
                </div>
              </div>
              <Activity className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card data-testid="card-stat-total">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Total Calls</p>
                <p className="text-2xl font-bold mt-1" data-testid="text-stat-total-calls">{(stats?.totalCalls ?? 0).toLocaleString()}</p>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <span className="text-xs text-muted-foreground" data-testid="text-stat-inbound">
                    <PhoneIncoming className="h-3 w-3 inline mr-0.5" />{stats?.inboundCalls ?? 0} in
                  </span>
                  <span className="text-xs text-muted-foreground" data-testid="text-stat-outbound">
                    <PhoneOutgoing className="h-3 w-3 inline mr-0.5" />{stats?.outboundCalls ?? 0} out
                  </span>
                </div>
              </div>
              <Phone className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card data-testid="card-stat-quality">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Avg Quality</p>
                <p className="text-2xl font-bold mt-1" data-testid="text-stat-quality">{parseFloat(stats?.avgQuality ?? "0").toFixed(1)}</p>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <span className="text-xs text-muted-foreground" data-testid="text-stat-sentiment">Sentiment: {parseFloat(stats?.avgSentiment ?? "0").toFixed(1)}</span>
                </div>
              </div>
              <Star className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card data-testid="card-stat-outcomes">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Outcomes</p>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <div className="flex items-center gap-1" title="Leads Captured">
                    <Target className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm font-bold" data-testid="text-stat-leads">{stats?.leadsCount ?? 0}</span>
                  </div>
                  <div className="flex items-center gap-1" title="Handoffs">
                    <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm font-bold" data-testid="text-stat-handoffs">{stats?.handoffsCount ?? 0}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <span className="text-xs text-muted-foreground" data-testid="text-stat-failed">
                    {stats?.failedCalls ?? 0} failed
                  </span>
                  <span className="text-xs text-muted-foreground" data-testid="text-stat-active">
                    {stats?.activeCalls ?? 0} active
                  </span>
                </div>
              </div>
              <CircleDot className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <CardTitle className="text-base">Call Log</CardTitle>
            <Badge variant="secondary" data-testid="text-calls-count">{total.toLocaleString()} calls</Badge>
          </div>
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search caller, agent, org, summary..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="input-calls-search"
              />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[130px]" data-testid="select-calls-status">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="missed">Missed</SelectItem>
                <SelectItem value="voicemail">Voicemail</SelectItem>
              </SelectContent>
            </Select>
            <Select value={direction} onValueChange={setDirection}>
              <SelectTrigger className="w-[130px]" data-testid="select-calls-direction">
                <SelectValue placeholder="All Directions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Directions</SelectItem>
                <SelectItem value="inbound">Inbound</SelectItem>
                <SelectItem value="outbound">Outbound</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {calls.length === 0 ? (
            <div className="text-center py-12">
              <Phone className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground" data-testid="text-no-calls">No calls found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Direction</TableHead>
                    <TableHead>Caller</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Organisation</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Quality</TableHead>
                    <TableHead>Outcome</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {calls.map((call) => (
                    <TableRow
                      key={call.id}
                      className="cursor-pointer"
                      onClick={() => setDetailCall(call)}
                      data-testid={`row-call-${call.id}`}
                    >
                      <TableCell>
                        {call.direction === "inbound" ? (
                          <div className="flex items-center gap-1.5">
                            <PhoneIncoming className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm">In</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <PhoneOutgoing className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm">Out</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm font-mono" data-testid={`text-call-caller-${call.id}`}>
                        {call.callerNumber || "-"}
                      </TableCell>
                      <TableCell data-testid={`text-call-agent-${call.id}`}>
                        <div className="flex items-center gap-1.5">
                          <Bot className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="text-sm truncate max-w-[120px]">{call.agentName || `Agent #${call.agentId}`}</span>
                        </div>
                      </TableCell>
                      <TableCell data-testid={`text-call-org-${call.id}`}>
                        <div className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="text-sm truncate max-w-[120px]">{call.orgName || `Org #${call.orgId}`}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm" data-testid={`text-call-duration-${call.id}`}>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          {formatDuration(call.duration)}
                        </div>
                      </TableCell>
                      <TableCell data-testid={`text-call-status-${call.id}`}>
                        <Badge variant={statusBadgeVariant(call.status)}>
                          {call.status || "unknown"}
                        </Badge>
                      </TableCell>
                      <TableCell data-testid={`text-call-quality-${call.id}`}>
                        {call.qualityScore ? (
                          <span className="text-sm font-medium">{parseFloat(call.qualityScore).toFixed(1)}</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell data-testid={`text-call-outcome-${call.id}`}>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {call.leadCaptured && (
                            <Badge variant="secondary" className="text-xs">Lead</Badge>
                          )}
                          {call.handoffTriggered && (
                            <Badge variant="secondary" className="text-xs">Handoff</Badge>
                          )}
                          {call.appointmentBooked && (
                            <Badge variant="secondary" className="text-xs">Appt</Badge>
                          )}
                          {!call.leadCaptured && !call.handoffTriggered && !call.appointmentBooked && (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground" data-testid={`text-call-time-${call.id}`}>
                        {formatRelative(call.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
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
                <Button size="icon" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)} data-testid="button-calls-prev">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)} data-testid="button-calls-next">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!detailCall} onOpenChange={(open) => { if (!open) setDetailCall(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" data-testid="dialog-call-detail">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {detailCall?.direction === "inbound" ? (
                <PhoneIncoming className="h-5 w-5 text-muted-foreground" />
              ) : (
                <PhoneOutgoing className="h-5 w-5 text-muted-foreground" />
              )}
              Call #{detailCall?.id}
            </DialogTitle>
            <DialogDescription>Full call details and metadata</DialogDescription>
          </DialogHeader>
          {detailCall && (
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Direction</p>
                  <p className="font-medium capitalize" data-testid="text-detail-direction">{detailCall.direction}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Status</p>
                  <Badge variant={statusBadgeVariant(detailCall.status)} data-testid="text-detail-status">
                    {detailCall.status || "unknown"}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Caller</p>
                  <p className="font-medium font-mono" data-testid="text-detail-caller">{detailCall.callerNumber || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Duration</p>
                  <p className="font-medium" data-testid="text-detail-duration">{formatDurationLong(detailCall.duration)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Agent</p>
                  <p className="font-medium" data-testid="text-detail-agent">{detailCall.agentName || `Agent #${detailCall.agentId}`}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Organisation</p>
                  <p className="font-medium" data-testid="text-detail-org">{detailCall.orgName || `Org #${detailCall.orgId}`}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Quality Score</p>
                  <p className="font-medium" data-testid="text-detail-quality">
                    {detailCall.qualityScore ? parseFloat(detailCall.qualityScore).toFixed(1) : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Sentiment</p>
                  <p className={`font-medium capitalize ${sentimentColor(detailCall.sentimentLabel)}`} data-testid="text-detail-sentiment">
                    {detailCall.sentimentLabel || "-"}
                    {detailCall.sentimentScore && ` (${parseFloat(detailCall.sentimentScore).toFixed(1)})`}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Call State</p>
                  <p className="font-medium" data-testid="text-detail-state">{detailCall.currentState || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Turns</p>
                  <p className="font-medium" data-testid="text-detail-turns">{detailCall.turnCount ?? 0}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Cost</p>
                  <p className="font-medium" data-testid="text-detail-cost">
                    {detailCall.callCost ? `£${parseFloat(detailCall.callCost).toFixed(2)}` : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Deployment</p>
                  <p className="font-medium capitalize" data-testid="text-detail-deployment">{detailCall.billedDeploymentModel || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Started</p>
                  <p className="font-medium">{formatDate(detailCall.startedAt)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Ended</p>
                  <p className="font-medium">{formatDate(detailCall.endedAt)}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                {detailCall.aiDisclosurePlayed && (
                  <Badge variant="secondary">
                    <ShieldCheck className="h-3 w-3 mr-1" />
                    AI Disclosed
                  </Badge>
                )}
                {detailCall.leadCaptured && (
                  <Badge variant="secondary">
                    <Target className="h-3 w-3 mr-1" />
                    Lead: {detailCall.leadName || detailCall.leadEmail || detailCall.leadPhone || "Captured"}
                  </Badge>
                )}
                {detailCall.appointmentBooked && (
                  <Badge variant="secondary">Appointment Booked</Badge>
                )}
                {detailCall.handoffTriggered && (
                  <Badge variant="secondary">Handoff Triggered</Badge>
                )}
              </div>

              {detailCall.summary && (
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Summary</p>
                  <p className="text-sm leading-relaxed" data-testid="text-detail-summary">{detailCall.summary}</p>
                </div>
              )}

              {detailCall.finalOutcome && (
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Final Outcome</p>
                  <p className="text-sm" data-testid="text-detail-outcome">{detailCall.finalOutcome}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
