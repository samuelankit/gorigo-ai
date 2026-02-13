"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bell,
  BellOff,
  Send,
  RefreshCw,
  Search,
  AlertTriangle,
  ShieldAlert,
  PhoneOff,
  Wallet,
  Webhook,
  Megaphone,
  CheckCircle2,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  Info,
} from "lucide-react";

interface NotificationItem {
  id: number;
  userId: number;
  orgId: number | null;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  actionUrl: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  orgName: string | null;
  userEmail: string | null;
}

interface Summary {
  total: number;
  unread: number;
  last24h: number;
  byType: Record<string, number>;
}

interface ApiResponse {
  notifications: NotificationItem[];
  total: number;
  limit: number;
  offset: number;
  pages: number;
  summary: Summary;
}

const NOTIFICATION_TYPES = [
  { value: "all", label: "All Types" },
  { value: "low_balance", label: "Low Balance" },
  { value: "spending_cap", label: "Spending Cap" },
  { value: "call_failure", label: "Call Failure" },
  { value: "campaign_complete", label: "Campaign Complete" },
  { value: "webhook_failure", label: "Webhook Failure" },
  { value: "system", label: "System" },
  { value: "security", label: "Security" },
];

const READ_FILTERS = [
  { value: "all", label: "All Status" },
  { value: "false", label: "Unread Only" },
  { value: "true", label: "Read Only" },
];

function TypeIcon({ type }: { type: string }) {
  switch (type) {
    case "low_balance":
      return <Wallet className="h-4 w-4 text-amber-500" />;
    case "spending_cap":
      return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    case "call_failure":
      return <PhoneOff className="h-4 w-4 text-red-500" />;
    case "security":
      return <ShieldAlert className="h-4 w-4 text-red-600" />;
    case "webhook_failure":
      return <Webhook className="h-4 w-4 text-orange-400" />;
    case "campaign_complete":
      return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    case "system":
    default:
      return <Megaphone className="h-4 w-4 text-blue-500" />;
  }
}

function TypeBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    low_balance: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    spending_cap: "bg-orange-500/10 text-orange-600 border-orange-500/20",
    call_failure: "bg-red-500/10 text-red-600 border-red-500/20",
    security: "bg-red-600/10 text-red-700 border-red-600/20",
    webhook_failure: "bg-orange-400/10 text-orange-500 border-orange-400/20",
    campaign_complete: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    system: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  };
  const label = type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <Badge variant="outline" className={`text-xs no-default-hover-elevate ${styles[type] || ""}`} data-testid={`badge-type-${type}`}>
      {label}
    </Badge>
  );
}

function formatTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function AdminNotificationsPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [typeFilter, setTypeFilter] = useState("all");
  const [readFilter, setReadFilter] = useState("all");
  const [days, setDays] = useState("30");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastType, setBroadcastType] = useState("system");
  const [broadcastSending, setBroadcastSending] = useState(false);
  const [detailItem, setDetailItem] = useState<NotificationItem | null>(null);
  const [markingRead, setMarkingRead] = useState(false);
  const limit = 50;

  const fetchData = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      try {
        const params = new URLSearchParams();
        params.set("limit", String(limit));
        params.set("offset", String(page * limit));
        if (typeFilter !== "all") params.set("type", typeFilter);
        if (readFilter !== "all") params.set("read", readFilter);
        if (days !== "all") params.set("days", days);
        if (search) params.set("search", search);

        const res = await fetch(`/api/admin/notifications?${params}`);
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error("Failed to fetch notifications:", err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, typeFilter, readFilter, days, search]
  );

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const interval = setInterval(() => fetchData(false), 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(0);
  };

  const handleMarkRead = async () => {
    if (selectedIds.size === 0) return;
    setMarkingRead(true);
    try {
      const res = await fetch("/api/admin/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      if (res.ok) {
        setSelectedIds(new Set());
        fetchData(true);
      }
    } catch (err) {
      console.error("Failed to mark as read:", err);
    } finally {
      setMarkingRead(false);
    }
  };

  const handleBroadcast = async () => {
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) return;
    setBroadcastSending(true);
    try {
      const res = await fetch("/api/admin/notifications/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: broadcastTitle.trim(),
          message: broadcastMessage.trim(),
          type: broadcastType,
          scope: "all",
        }),
      });
      if (res.ok) {
        setBroadcastOpen(false);
        setBroadcastTitle("");
        setBroadcastMessage("");
        setBroadcastType("system");
        fetchData(true);
      }
    } catch (err) {
      console.error("Failed to broadcast:", err);
    } finally {
      setBroadcastSending(false);
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!data) return;
    const unreadIds = data.notifications.filter((n) => !n.isRead).map((n) => n.id);
    if (unreadIds.every((id) => selectedIds.has(id))) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(unreadIds));
    }
  };

  const summary = data?.summary;
  const items = data?.notifications ?? [];
  const totalPages = data?.pages ?? 1;

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <Skeleton className="h-8 w-60" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}><CardContent className="pt-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
        <Card><CardContent className="pt-6"><Skeleton className="h-64 w-full" /></CardContent></Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Bell className="h-6 w-6 text-violet-500" />
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Notification Center</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="default"
            onClick={() => setBroadcastOpen(true)}
            data-testid="button-broadcast"
          >
            <Send className="h-4 w-4 mr-1" />
            Broadcast
          </Button>
          <Button
            variant="outline"
            onClick={() => fetchData(true)}
            disabled={refreshing}
            data-testid="button-refresh"
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-kpi-total">
          <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Notifications</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="value-kpi-total">{summary?.total?.toLocaleString() ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">{summary?.last24h ?? 0} in last 24h</p>
          </CardContent>
        </Card>

        <Card data-testid="card-kpi-unread">
          <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Unread</CardTitle>
            <EyeOff className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500" data-testid="value-kpi-unread">{summary?.unread?.toLocaleString() ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Requires attention</p>
          </CardContent>
        </Card>

        <Card data-testid="card-kpi-failures">
          <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Call Failures</CardTitle>
            <PhoneOff className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500" data-testid="value-kpi-failures">{summary?.byType?.call_failure ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>

        <Card data-testid="card-kpi-security">
          <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Security Alerts</CardTitle>
            <ShieldAlert className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="value-kpi-security">{summary?.byType?.security ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-notifications-table">
        <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4" />
            All Notifications
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            {selectedIds.size > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleMarkRead}
                disabled={markingRead}
                data-testid="button-mark-read"
              >
                <Eye className="h-4 w-4 mr-1" />
                Mark {selectedIds.size} Read
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 flex-1 min-w-[200px]">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search title, message, org..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-9"
                  data-testid="input-search"
                />
              </div>
              <Button size="sm" variant="outline" onClick={handleSearch} data-testid="button-search">
                Search
              </Button>
            </div>
            <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(0); }}>
              <SelectTrigger className="w-[150px]" data-testid="select-type-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NOTIFICATION_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={readFilter} onValueChange={(v) => { setReadFilter(v); setPage(0); }}>
              <SelectTrigger className="w-[130px]" data-testid="select-read-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {READ_FILTERS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={days} onValueChange={(v) => { setDays(v); setPage(0); }}>
              <SelectTrigger className="w-[130px]" data-testid="select-days-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Last 24h</SelectItem>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-sm text-muted-foreground gap-2">
              <BellOff className="h-8 w-8" />
              <p>No notifications found</p>
            </div>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={items.filter((n) => !n.isRead).length > 0 && items.filter((n) => !n.isRead).every((n) => selectedIds.has(n.id))}
                          onCheckedChange={toggleSelectAll}
                          data-testid="checkbox-select-all"
                        />
                      </TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Organization</TableHead>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((n) => (
                      <TableRow
                        key={n.id}
                        className={n.isRead ? "opacity-60" : ""}
                        data-testid={`row-notification-${n.id}`}
                      >
                        <TableCell>
                          {!n.isRead && (
                            <Checkbox
                              checked={selectedIds.has(n.id)}
                              onCheckedChange={() => toggleSelect(n.id)}
                              data-testid={`checkbox-notification-${n.id}`}
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <TypeIcon type={n.type} />
                            <TypeBadge type={n.type} />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[250px]">
                            <p className="text-sm font-medium truncate" data-testid={`text-title-${n.id}`}>{n.title}</p>
                            <p className="text-xs text-muted-foreground truncate">{n.message}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm" data-testid={`text-org-${n.id}`}>{n.orgName ?? "—"}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground truncate max-w-[150px] block">{n.userEmail ?? "—"}</span>
                        </TableCell>
                        <TableCell>
                          {n.isRead ? (
                            <Badge variant="secondary" className="text-xs no-default-hover-elevate">Read</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs no-default-hover-elevate bg-amber-500/10 text-amber-600 border-amber-500/20">Unread</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">{formatTimeAgo(n.createdAt)}</span>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setDetailItem(n)}
                            data-testid={`button-detail-${n.id}`}
                          >
                            <Info className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between gap-4 flex-wrap">
                <p className="text-sm text-muted-foreground" data-testid="text-pagination-info">
                  Showing {page * limit + 1}–{Math.min((page + 1) * limit, data?.total ?? 0)} of {data?.total ?? 0}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page === 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    data-testid="button-prev-page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm px-2" data-testid="text-page-number">
                    Page {page + 1} of {totalPages}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page + 1 >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    data-testid="button-next-page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!detailItem} onOpenChange={() => setDetailItem(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {detailItem && <TypeIcon type={detailItem.type} />}
              Notification Detail
            </DialogTitle>
          </DialogHeader>
          {detailItem && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <TypeBadge type={detailItem.type} />
                {detailItem.isRead ? (
                  <Badge variant="secondary" className="text-xs no-default-hover-elevate">Read</Badge>
                ) : (
                  <Badge variant="outline" className="text-xs no-default-hover-elevate bg-amber-500/10 text-amber-600 border-amber-500/20">Unread</Badge>
                )}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Title</Label>
                <p className="text-sm font-medium" data-testid="text-detail-title">{detailItem.title}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Message</Label>
                <p className="text-sm" data-testid="text-detail-message">{detailItem.message}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Organization</Label>
                  <p className="text-sm">{detailItem.orgName ?? "—"}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Recipient</Label>
                  <p className="text-sm">{detailItem.userEmail ?? "—"}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Created</Label>
                  <p className="text-sm">{new Date(detailItem.createdAt).toLocaleString()}</p>
                </div>
                {detailItem.actionUrl && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Action URL</Label>
                    <p className="text-sm text-blue-500 truncate">{detailItem.actionUrl}</p>
                  </div>
                )}
              </div>
              {detailItem.metadata && Object.keys(detailItem.metadata).length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground">Metadata</Label>
                  <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto max-h-40 mt-1">
                    {JSON.stringify(detailItem.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={broadcastOpen} onOpenChange={setBroadcastOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-violet-500" />
              Broadcast Notification
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Type</Label>
              <Select value={broadcastType} onValueChange={setBroadcastType}>
                <SelectTrigger data-testid="select-broadcast-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">System</SelectItem>
                  <SelectItem value="security">Security</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Title</Label>
              <Input
                placeholder="Notification title..."
                value={broadcastTitle}
                onChange={(e) => setBroadcastTitle(e.target.value)}
                maxLength={200}
                data-testid="input-broadcast-title"
              />
            </div>
            <div>
              <Label>Message</Label>
              <Textarea
                placeholder="Notification message..."
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                maxLength={2000}
                rows={4}
                data-testid="input-broadcast-message"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              This will send a notification to all users across all organizations.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBroadcastOpen(false)} data-testid="button-cancel-broadcast">
              Cancel
            </Button>
            <Button
              onClick={handleBroadcast}
              disabled={broadcastSending || !broadcastTitle.trim() || !broadcastMessage.trim()}
              data-testid="button-send-broadcast"
            >
              {broadcastSending ? (
                <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-1" />
              )}
              Send to All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
