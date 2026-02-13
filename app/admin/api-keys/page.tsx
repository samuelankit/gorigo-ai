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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Key,
  Search,
  ShieldOff,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ShieldCheck,
  Clock,
  Building2,
  Activity,
  AlertTriangle,
  Copy,
} from "lucide-react";

interface ApiKeyEntry {
  id: number;
  orgId: number;
  userId: number;
  name: string;
  keyPrefix: string;
  scopes: string[] | null;
  lastUsedAt: string | null;
  expiresAt: string | null;
  isRevoked: boolean;
  revokedAt: string | null;
  createdAt: string;
  orgName: string | null;
  userEmail: string | null;
}

interface Stats {
  total: number;
  active: number;
  revoked: number;
  expired: number;
  recentlyUsed: number;
  uniqueOrgs: number;
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

function getKeyStatus(key: ApiKeyEntry): { label: string; variant: "default" | "destructive" | "outline" | "secondary" } {
  if (key.isRevoked) return { label: "Revoked", variant: "destructive" };
  if (key.expiresAt && new Date(key.expiresAt) <= new Date()) return { label: "Expired", variant: "outline" };
  return { label: "Active", variant: "default" };
}

export default function AdminApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(0);
  const [revokeTarget, setRevokeTarget] = useState<ApiKeyEntry | null>(null);
  const [revoking, setRevoking] = useState(false);

  const PAGE_SIZE = 25;

  const fetchKeys = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(page * PAGE_SIZE) });
      if (search) params.set("search", search);
      if (status !== "all") params.set("status", status);
      const res = await fetch(`/api/admin/api-keys?${params}`);
      const data = await res.json();
      if (data && !data.error) {
        setKeys(data.keys ?? []);
        setTotal(data.total ?? 0);
        setStats(data.stats ?? null);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, [search, status, page]);

  useEffect(() => { fetchKeys(); }, [fetchKeys]);

  useEffect(() => { setPage(0); }, [search, status]);

  const confirmRevoke = async () => {
    if (!revokeTarget) return;
    setRevoking(true);
    try {
      const res = await fetch(`/api/admin/api-keys?id=${revokeTarget.id}`, { method: "DELETE" });
      if (res.ok) {
        fetchKeys();
        setRevokeTarget(null);
      }
    } catch {} finally {
      setRevoking(false);
    }
  };

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
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-apikeys-title">
            <Key className="h-6 w-6 text-muted-foreground" />
            API Key Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Monitor and manage API keys across all organisations</p>
        </div>
        <Button variant="outline" onClick={fetchKeys} disabled={loading} data-testid="button-refresh-apikeys">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-stat-total">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Total Keys</p>
                <p className="text-2xl font-bold mt-1" data-testid="text-stat-total-count">{stats?.total ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1" data-testid="text-stat-unique-orgs">{stats?.uniqueOrgs ?? 0} organisations</p>
              </div>
              <Key className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card data-testid="card-stat-active">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Active</p>
                <p className="text-2xl font-bold mt-1" data-testid="text-stat-active-count">{stats?.active ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1" data-testid="text-stat-recently-used">{stats?.recentlyUsed ?? 0} used this week</p>
              </div>
              <ShieldCheck className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card data-testid="card-stat-revoked">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Revoked</p>
                <p className="text-2xl font-bold mt-1" data-testid="text-stat-revoked-count">{stats?.revoked ?? 0}</p>
              </div>
              <ShieldOff className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card data-testid="card-stat-expired">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Expired</p>
                <p className="text-2xl font-bold mt-1" data-testid="text-stat-expired-count">{stats?.expired ?? 0}</p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <CardTitle className="text-base">API Keys</CardTitle>
            <Badge variant="secondary" data-testid="text-keys-total">{total} keys</Badge>
          </div>
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search key name, prefix, org, or email..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="input-keys-search"
              />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[140px]" data-testid="select-keys-status">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="revoked">Revoked</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {keys.length === 0 ? (
            <div className="text-center py-12">
              <Key className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground" data-testid="text-no-keys">No API keys found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Key Prefix</TableHead>
                    <TableHead>Organisation</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Scopes</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Used</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {keys.map((key) => {
                    const s = getKeyStatus(key);
                    return (
                      <TableRow key={key.id} data-testid={`row-key-${key.id}`}>
                        <TableCell className="font-medium" data-testid={`text-key-name-${key.id}`}>{key.name}</TableCell>
                        <TableCell data-testid={`text-key-prefix-${key.id}`}>
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{key.keyPrefix}...</code>
                        </TableCell>
                        <TableCell data-testid={`text-key-org-${key.id}`}>
                          <div className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="text-sm">{key.orgName || `Org #${key.orgId}`}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground" data-testid={`text-key-owner-${key.id}`}>{key.userEmail || "-"}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {key.scopes && key.scopes.length > 0 ? (
                              key.scopes.slice(0, 3).map((scope) => (
                                <Badge key={scope} variant="outline" className="text-xs">{scope}</Badge>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground">All</span>
                            )}
                            {key.scopes && key.scopes.length > 3 && (
                              <Badge variant="outline" className="text-xs">+{key.scopes.length - 3}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={s.variant}>{s.label}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            {key.lastUsedAt && <Activity className="h-3 w-3 shrink-0" />}
                            {formatRelative(key.lastUsedAt)}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(key.createdAt)}</TableCell>
                        <TableCell>
                          {!key.isRevoked && !(key.expiresAt && new Date(key.expiresAt) <= new Date()) && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setRevokeTarget(key)}
                              data-testid={`button-revoke-key-${key.id}`}
                            >
                              <ShieldOff className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
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
                <Button size="icon" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)} data-testid="button-keys-prev">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)} data-testid="button-keys-next">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!revokeTarget} onOpenChange={(open) => { if (!open) setRevokeTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Revoke API Key
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to revoke <span className="font-semibold">{revokeTarget?.name}</span> (prefix: <code className="font-mono">{revokeTarget?.keyPrefix}...</code>) belonging to <span className="font-semibold">{revokeTarget?.orgName}</span>? This action cannot be undone and will immediately stop all API access using this key.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRevokeTarget(null)} data-testid="button-cancel-revoke">Cancel</Button>
            <Button variant="destructive" onClick={confirmRevoke} disabled={revoking} data-testid="button-confirm-revoke">
              {revoking ? "Revoking..." : "Revoke Key"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
