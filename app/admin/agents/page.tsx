"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Bot,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Building2,
  PhoneIncoming,
  PhoneOutgoing,
  ShieldCheck,
  Activity,
  Globe,
} from "lucide-react";
import { DepartmentFilter } from "@/components/admin/department-filter";

interface AgentEntry {
  id: number;
  name: string;
  orgId: number;
  roles: string | null;
  agentType: string | null;
  status: string | null;
  language: string | null;
  voiceName: string | null;
  inboundEnabled: boolean | null;
  outboundEnabled: boolean | null;
  complianceDisclosure: boolean | null;
  createdAt: string;
  orgName: string | null;
  callCount: number | null;
  lastCallAt: string | null;
}

interface Stats {
  total: number;
  active: number;
  inactive: number;
  inbound: number;
  outbound: number;
  uniqueOrgs: number;
  withDisclosure: number;
}

function formatDate(d: string | null): string {
  if (!d) return "-";
  return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function formatRelative(d: string | null): string {
  if (!d) return "Never";
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(d);
}

export default function AdminAgentsPage() {
  const [agentsList, setAgentsList] = useState<AgentEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");
  const [departmentId, setDepartmentId] = useState("all");
  const [page, setPage] = useState(0);

  const PAGE_SIZE = 25;

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(page * PAGE_SIZE) });
      if (search) params.set("search", search);
      if (status !== "all") params.set("status", status);
      if (type !== "all") params.set("type", type);
      if (departmentId !== "all") params.set("departmentId", departmentId);
      const res = await fetch(`/api/admin/agents?${params}`);
      const data = await res.json();
      if (data && !data.error) {
        setAgentsList(data.agents ?? []);
        setTotal(data.total ?? 0);
        setStats(data.stats ?? null);
      }
    } catch (error) {
      console.error("Fetch admin agents failed:", error);
    } finally {
      setLoading(false);
    }
  }, [search, status, type, departmentId, page]);

  useEffect(() => { fetchAgents(); }, [fetchAgents]);
  useEffect(() => { setPage(0); }, [search, status, type, departmentId]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (loading && !stats) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-agents-title">
            <Bot className="h-6 w-6 text-muted-foreground" />
            Agent Overview
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Monitor AI agents across all organisations</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <DepartmentFilter value={departmentId} onChange={setDepartmentId} />
          <Button variant="outline" onClick={fetchAgents} disabled={loading} data-testid="button-refresh-agents">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-stat-total">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Total Agents</p>
                <p className="text-2xl font-bold mt-1" data-testid="text-stat-total">{stats?.total ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1" data-testid="text-stat-orgs">{stats?.uniqueOrgs ?? 0} organisations</p>
              </div>
              <Bot className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card data-testid="card-stat-active">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Active</p>
                <p className="text-2xl font-bold mt-1" data-testid="text-stat-active">{stats?.active ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">{stats?.inactive ?? 0} inactive</p>
              </div>
              <Activity className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card data-testid="card-stat-channels">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Channels</p>
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex items-center gap-1">
                    <PhoneIncoming className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-lg font-bold" data-testid="text-stat-inbound">{stats?.inbound ?? 0}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <PhoneOutgoing className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-lg font-bold" data-testid="text-stat-outbound">{stats?.outbound ?? 0}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Inbound / Outbound</p>
              </div>
              <Globe className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card data-testid="card-stat-compliance">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">AI Disclosure</p>
                <p className="text-2xl font-bold mt-1" data-testid="text-stat-disclosure">{stats?.withDisclosure ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats?.total ? Math.round(((stats.withDisclosure ?? 0) / stats.total) * 100) : 0}% compliant
                </p>
              </div>
              <ShieldCheck className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <CardTitle className="text-base">All Agents</CardTitle>
            <Badge variant="secondary" data-testid="text-agents-total">{total} agents</Badge>
          </div>
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search agent name, org, or role..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="input-agents-search"
              />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[130px]" data-testid="select-agents-status">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
              </SelectContent>
            </Select>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-[130px]" data-testid="select-agents-type">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="sales">Sales</SelectItem>
                <SelectItem value="support">Support</SelectItem>
                <SelectItem value="receptionist">Receptionist</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {agentsList.length === 0 ? (
            <div className="text-center py-12">
              <Bot className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground" data-testid="text-no-agents">No agents found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent</TableHead>
                    <TableHead>Organisation</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Channels</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Calls</TableHead>
                    <TableHead>Last Call</TableHead>
                    <TableHead>Disclosure</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agentsList.map((agent) => (
                    <TableRow key={agent.id} data-testid={`row-agent-${agent.id}`}>
                      <TableCell className="font-medium" data-testid={`text-agent-name-${agent.id}`}>{agent.name}</TableCell>
                      <TableCell data-testid={`text-agent-org-${agent.id}`}>
                        <div className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="text-sm">{agent.orgName || `Org #${agent.orgId}`}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs capitalize">{agent.roles || "general"}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground capitalize">{agent.agentType || "general"}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {agent.inboundEnabled && (
                            <div className="flex items-center gap-0.5" title="Inbound">
                              <PhoneIncoming className="h-3.5 w-3.5 text-muted-foreground" />
                            </div>
                          )}
                          {agent.outboundEnabled && (
                            <div className="flex items-center gap-0.5" title="Outbound">
                              <PhoneOutgoing className="h-3.5 w-3.5 text-muted-foreground" />
                            </div>
                          )}
                          {!agent.inboundEnabled && !agent.outboundEnabled && (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={agent.status === "active" ? "default" : "secondary"}>
                          {agent.status || "active"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm" data-testid={`text-agent-calls-${agent.id}`}>
                        {(agent.callCount ?? 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatRelative(agent.lastCallAt)}
                      </TableCell>
                      <TableCell>
                        {agent.complianceDisclosure ? (
                          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <span className="text-xs text-muted-foreground">Off</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(agent.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-2 mt-4">
              <p className="text-sm text-muted-foreground">
                Page {page + 1} of {totalPages}
              </p>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)} data-testid="button-agents-prev">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)} data-testid="button-agents-next">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
