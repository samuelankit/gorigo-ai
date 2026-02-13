"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FileText, ChevronLeft, ChevronRight, Download, Search,
  Clock, Users, Activity, CalendarDays, Eye,
} from "lucide-react";

interface AuditEntry {
  id: number;
  actorId: number | null;
  actorEmail?: string | null;
  action: string;
  entityType: string;
  entityId?: number | null;
  details?: Record<string, unknown> | string | null;
  ipAddress?: string | null;
  createdAt: string;
}

interface AuditSummary {
  totalEntries: number;
  todayEntries: number;
  uniqueActors: number;
}

const PAGE_SIZE = 50;

const DATE_RANGES = [
  { label: "All Time", value: "all" },
  { label: "Today", value: "1" },
  { label: "Last 7 Days", value: "7" },
  { label: "Last 30 Days", value: "30" },
  { label: "Last 90 Days", value: "90" },
];

export default function AuditLogPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [summary, setSummary] = useState<AuditSummary>({ totalEntries: 0, todayEntries: 0, uniqueActors: 0 });
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(0);
  const [actionFilter, setActionFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");
  const [dateRange, setDateRange] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [detailEntry, setDetailEntry] = useState<AuditEntry | null>(null);

  const fetchEntries = useCallback(() => {
    setLoading(true);
    setError(false);
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: String(page * PAGE_SIZE),
    });
    if (actionFilter !== "all") params.set("action", actionFilter);
    if (entityFilter !== "all") params.set("entityType", entityFilter);
    if (dateRange !== "all") params.set("days", dateRange);
    if (searchTerm) params.set("search", searchTerm);

    fetch(`/api/admin/audit?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.entries) setEntries(d.entries);
        else if (Array.isArray(d)) setEntries(d);
        if (d?.total != null) setTotal(d.total);
        if (d?.summary) setSummary(d.summary);
      })
      .catch(() => { setError(true); })
      .finally(() => setLoading(false));
  }, [page, actionFilter, entityFilter, dateRange, searchTerm]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const handleSearch = () => {
    setSearchTerm(searchInput);
    setPage(0);
  };

  const formatTimestamp = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDetails = (details?: Record<string, unknown> | string | null) => {
    if (!details) return "-";
    try {
      const str = typeof details === "string" ? details : JSON.stringify(details, null, 2);
      return str;
    } catch {
      return "-";
    }
  };

  const truncateDetails = (details?: Record<string, unknown> | string | null) => {
    const full = formatDetails(details);
    if (full === "-") return "-";
    return full.length > 60 ? full.substring(0, 60) + "..." : full;
  };

  const exportCSV = () => {
    const headers = ["Timestamp", "Actor", "Action", "Entity Type", "Entity ID", "IP Address", "Details"];
    const rows = entries.map((e) => [
      e.createdAt ? new Date(e.createdAt).toLocaleString() : "",
      e.actorEmail || "",
      e.action,
      e.entityType,
      String(e.entityId || ""),
      e.ipAddress || "",
      typeof e.details === "string" ? e.details : JSON.stringify(e.details || ""),
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getActionBadgeClass = (action: string) => {
    const lower = action.toLowerCase();
    if (lower.includes("create") || lower.includes("add") || lower.includes("activate")) return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
    if (lower.includes("delete") || lower.includes("remove") || lower.includes("suspend")) return "bg-red-500/10 text-red-600 dark:text-red-400";
    if (lower.includes("update") || lower.includes("edit") || lower.includes("flag")) return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
    if (lower.includes("login") || lower.includes("auth")) return "bg-violet-500/10 text-violet-600 dark:text-violet-400";
    return "";
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-slate-500/10">
            <FileText className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground" data-testid="text-audit-title">
              Audit Log
            </h1>
            <p className="text-sm text-muted-foreground">Track all administrative actions across the platform.</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV} data-testid="button-export-audit">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-blue-500" />
              <p className="text-sm text-muted-foreground">Total Events</p>
            </div>
            <p className="text-2xl font-bold" data-testid="text-audit-total">{summary.totalEntries.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-emerald-500" />
              <p className="text-sm text-muted-foreground">Today</p>
            </div>
            <p className="text-2xl font-bold" data-testid="text-audit-today">{summary.todayEntries.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-violet-500" />
              <p className="text-sm text-muted-foreground">Unique Actors</p>
            </div>
            <p className="text-2xl font-bold" data-testid="text-audit-actors">{summary.uniqueActors}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-sm">
          <Input
            placeholder="Search by actor, action..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            data-testid="input-search-audit"
          />
          <Button variant="outline" size="icon" onClick={handleSearch} data-testid="button-search-audit">
            <Search className="h-4 w-4" />
          </Button>
        </div>
        <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(0); }}>
          <SelectTrigger className="w-44" data-testid="select-action-filter">
            <SelectValue placeholder="Action type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="create">Create</SelectItem>
            <SelectItem value="update">Update</SelectItem>
            <SelectItem value="delete">Delete</SelectItem>
            <SelectItem value="suspend">Suspend</SelectItem>
            <SelectItem value="activate">Activate</SelectItem>
            <SelectItem value="flag">Flag</SelectItem>
            <SelectItem value="login">Login</SelectItem>
          </SelectContent>
        </Select>
        <Select value={entityFilter} onValueChange={(v) => { setEntityFilter(v); setPage(0); }}>
          <SelectTrigger className="w-44" data-testid="select-entity-filter">
            <SelectValue placeholder="Entity type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Entities</SelectItem>
            <SelectItem value="org">Organisation</SelectItem>
            <SelectItem value="partner">Partner</SelectItem>
            <SelectItem value="user">User</SelectItem>
            <SelectItem value="settings">Settings</SelectItem>
            <SelectItem value="agent">Agent</SelectItem>
            <SelectItem value="call">Call</SelectItem>
            <SelectItem value="wallet">Wallet</SelectItem>
          </SelectContent>
        </Select>
        <Select value={dateRange} onValueChange={(v) => { setDateRange(v); setPage(0); }}>
          <SelectTrigger className="w-40" data-testid="select-date-range">
            <SelectValue placeholder="Date range" />
          </SelectTrigger>
          <SelectContent>
            {DATE_RANGES.map((r) => (
              <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-6">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-3">
                <FileText className="w-6 h-6 text-muted-foreground/60" />
              </div>
              <p className="text-sm text-muted-foreground" data-testid="text-audit-error">Failed to load audit log.</p>
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-3">
                <FileText className="w-6 h-6 text-muted-foreground/60" />
              </div>
              <p className="text-sm text-muted-foreground" data-testid="text-no-audit">No audit entries found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table data-testid="table-audit-log">
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id} data-testid={`row-audit-${entry.id}`}>
                      <TableCell className="text-sm whitespace-nowrap">{formatTimestamp(entry.createdAt)}</TableCell>
                      <TableCell className="text-sm">{entry.actorEmail || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="default" className={`no-default-hover-elevate ${getActionBadgeClass(entry.action)}`}>
                          {entry.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{entry.entityType}</TableCell>
                      <TableCell className="text-sm">{entry.entityId || "-"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{entry.ipAddress || "-"}</TableCell>
                      <TableCell className="text-sm max-w-36 truncate">{truncateDetails(entry.details)}</TableCell>
                      <TableCell>
                        {entry.details && formatDetails(entry.details) !== "-" && (
                          <Button variant="ghost" size="icon" onClick={() => setDetailEntry(entry)} data-testid={`button-detail-${entry.id}`}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {!loading && !error && entries.length > 0 && (
            <div className="flex items-center justify-between gap-3 p-4 border-t flex-wrap">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
                data-testid="button-audit-prev"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page + 1} of {totalPages || 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={entries.length < PAGE_SIZE}
                onClick={() => setPage(page + 1)}
                data-testid="button-audit-next"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!detailEntry} onOpenChange={(open) => !open && setDetailEntry(null)}>
        <DialogContent className="max-w-lg" data-testid="dialog-audit-detail">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Audit Entry Detail
            </DialogTitle>
          </DialogHeader>
          {detailEntry && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Timestamp</p>
                  <p className="font-medium" data-testid="text-detail-timestamp">{formatTimestamp(detailEntry.createdAt)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Actor</p>
                  <p className="font-medium" data-testid="text-detail-actor">{detailEntry.actorEmail || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Action</p>
                  <Badge variant="default" className={`no-default-hover-elevate ${getActionBadgeClass(detailEntry.action)}`} data-testid="text-detail-action">
                    {detailEntry.action}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Entity</p>
                  <p className="font-medium" data-testid="text-detail-entity">{detailEntry.entityType} #{detailEntry.entityId || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">IP Address</p>
                  <p className="font-medium" data-testid="text-detail-ip">{detailEntry.ipAddress || "-"}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Details</p>
                <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto max-h-48" data-testid="text-audit-detail-json">
                  {formatDetails(detailEntry.details)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
