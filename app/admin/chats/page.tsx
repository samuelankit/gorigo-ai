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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MessageCircle,
  Users,
  TrendingUp,
  Mail,
  Search,
  ChevronLeft,
  ChevronRight,
  ThumbsUp,
  ThumbsDown,
  Clock,
  RefreshCw,
} from "lucide-react";

interface ChatLead {
  id: number;
  name: string;
  email: string;
  ipAddress: string | null;
  status: string;
  totalMessages: number;
  lastMessageAt: string | null;
  createdAt: string | null;
}

interface ChatMessage {
  id: number;
  leadId: number;
  role: string;
  content: string;
  rating: number | null;
  createdAt: string | null;
}

interface Stats {
  totalLeads: number;
  newLeads: number;
  contactedLeads: number;
  convertedLeads: number;
  totalMessages: number;
  avgMessages: number;
  conversionRate: number;
}

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return "-";
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin} minute${diffMin !== 1 ? "s" : ""} ago`;
  if (diffHour < 24) return `${diffHour} hour${diffHour !== 1 ? "s" : ""} ago`;
  if (diffDay < 30) return `${diffDay} day${diffDay !== 1 ? "s" : ""} ago`;
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function statusBadge(status: string) {
  switch (status) {
    case "new":
      return <Badge variant="default" className="no-default-hover-elevate">{status}</Badge>;
    case "contacted":
      return <Badge variant="secondary" className="no-default-hover-elevate">{status}</Badge>;
    case "converted":
      return <Badge variant="secondary" className="no-default-hover-elevate bg-green-500/10 text-green-600 dark:text-green-400">{status}</Badge>;
    case "archived":
      return <Badge variant="outline" className="no-default-hover-elevate text-muted-foreground">{status}</Badge>;
    default:
      return <Badge variant="outline" className="no-default-hover-elevate">{status}</Badge>;
  }
}

export default function AdminChatsPage() {
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<ChatLead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [stats, setStats] = useState<Stats | null>(null);

  const [selectedLead, setSelectedLead] = useState<ChatLead | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const PAGE_SIZE = 25;

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        search,
        status,
      });
      const res = await fetch(`/api/admin/chats?${params}`);
      const data = await res.json();
      if (data && !data.error) {
        setLeads(data.leads || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
        setStats(data.stats || null);
      }
    } catch (error) {
      console.error("Fetch admin chat leads failed:", error);
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  const fetchMessages = useCallback(async (leadId: number) => {
    setMessagesLoading(true);
    try {
      const res = await fetch(`/api/admin/chats/${leadId}`);
      const data = await res.json();
      if (data && !data.error) {
        setMessages(data.messages || []);
        if (data.lead) {
          setSelectedLead(data.lead);
        }
      }
    } catch (error) {
      console.error("Fetch chat messages failed:", error);
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  const updateStatus = useCallback(async (leadId: number, newStatus: string) => {
    setStatusUpdating(true);
    try {
      const res = await fetch("/api/admin/chats", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, status: newStatus }),
      });
      if (res.ok) {
        setSelectedLead((prev) => prev ? { ...prev, status: newStatus } : prev);
        fetchLeads();
      }
    } catch (error) {
      console.error("Update chat lead status failed:", error);
    } finally {
      setStatusUpdating(false);
    }
  }, [fetchLeads]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const handleRowClick = useCallback((lead: ChatLead) => {
    setSelectedLead(lead);
    setDialogOpen(true);
    fetchMessages(lead.id);
  }, [fetchMessages]);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const handleStatusFilter = useCallback((value: string) => {
    setStatus(value);
    setPage(1);
  }, []);

  if (loading && !stats) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-10 w-full max-w-sm" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      </div>
    );
  }

  const archivedCount = total - (stats?.newLeads || 0) - (stats?.contactedLeads || 0) - (stats?.convertedLeads || 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <MessageCircle className="h-6 w-6 text-violet-500" />
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-chats-title">Chat Conversations</h1>
            <p className="text-sm text-muted-foreground">Manage chat leads and view conversation transcripts.</p>
          </div>
        </div>
        <Button variant="outline" onClick={fetchLeads} data-testid="button-refresh-chats">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card data-testid="card-total-conversations">
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Total Conversations</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-leads">{stats.totalLeads.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                <Badge variant="secondary" className="no-default-hover-elevate text-xs mr-1">{stats.newLeads} new</Badge>
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-messages">
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Messages</CardTitle>
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-messages">{stats.totalMessages.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">{stats.avgMessages} avg per chat</p>
            </CardContent>
          </Card>

          <Card data-testid="card-conversion-rate">
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Conversion Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-conversion-rate">{stats.conversionRate}%</div>
              <p className="text-xs text-muted-foreground mt-1">{stats.convertedLeads} of {stats.totalLeads} converted</p>
            </CardContent>
          </Card>

          <Card data-testid="card-lead-status">
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Lead Status</CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-contacted-count">{stats.contactedLeads}</div>
              <p className="text-xs text-muted-foreground mt-1">contacted, {archivedCount > 0 ? archivedCount : 0} archived</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
            data-testid="input-chat-search"
          />
        </div>
        <Select value={status} onValueChange={handleStatusFilter}>
          <SelectTrigger className="w-[140px]" data-testid="select-chat-status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="converted">Converted</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Badge variant="secondary" className="no-default-hover-elevate" data-testid="text-leads-count">
          {total.toLocaleString()} leads
        </Badge>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : leads.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No chat conversations found.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Messages</TableHead>
                  <TableHead>Last Message</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead) => (
                  <TableRow
                    key={lead.id}
                    className="cursor-pointer"
                    onClick={() => handleRowClick(lead)}
                    data-testid={`row-chat-${lead.id}`}
                  >
                    <TableCell className="font-medium" data-testid={`text-lead-name-${lead.id}`}>{lead.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground" data-testid={`text-lead-email-${lead.id}`}>{lead.email}</TableCell>
                    <TableCell data-testid={`text-lead-status-${lead.id}`}>{statusBadge(lead.status)}</TableCell>
                    <TableCell className="text-sm" data-testid={`text-lead-messages-${lead.id}`}>{lead.totalMessages}</TableCell>
                    <TableCell className="text-sm text-muted-foreground" data-testid={`text-lead-last-message-${lead.id}`}>
                      {relativeTime(lead.lastMessageAt)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground" data-testid={`text-lead-created-${lead.id}`}>
                      {relativeTime(lead.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              data-testid="button-chats-prev"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              data-testid="button-chats-next"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <DialogTitle data-testid="text-dialog-lead-name">
                  {selectedLead?.name || "Conversation"}
                </DialogTitle>
                <DialogDescription data-testid="text-dialog-lead-email">
                  {selectedLead?.email || ""}
                </DialogDescription>
              </div>
              {selectedLead && (
                <Select
                  value={selectedLead.status}
                  onValueChange={(v) => updateStatus(selectedLead.id, v)}
                  disabled={statusUpdating}
                >
                  <SelectTrigger className="w-[130px]" data-testid="select-dialog-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="converted">Converted</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </DialogHeader>

          {selectedLead && (
            <div className="flex items-center gap-4 flex-wrap text-xs text-muted-foreground border-b pb-3">
              <span data-testid="text-dialog-status">Status: {selectedLead.status}</span>
              {selectedLead.ipAddress && (
                <span data-testid="text-dialog-ip">IP: {selectedLead.ipAddress}</span>
              )}
              <span className="flex items-center gap-1" data-testid="text-dialog-created">
                <Clock className="h-3 w-3" />
                {formatDate(selectedLead.createdAt)}
              </span>
            </div>
          )}

          <div className="flex-1 overflow-y-auto space-y-3 py-3" data-testid="container-messages">
            {messagesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-3/4" />)}
              </div>
            ) : messages.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No messages in this conversation.</p>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  data-testid={`message-${msg.id}`}
                >
                  <div
                    className={`max-w-[75%] rounded-lg px-3 py-2 ${
                      msg.role === "user"
                        ? "bg-violet-600 text-white"
                        : "bg-muted"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <div className={`flex items-center gap-2 mt-1 text-xs ${
                      msg.role === "user" ? "text-white/70" : "text-muted-foreground"
                    }`}>
                      <span>{relativeTime(msg.createdAt)}</span>
                      {msg.rating !== null && msg.rating !== undefined && (
                        <span className="flex items-center gap-0.5">
                          {msg.rating > 0 ? (
                            <ThumbsUp className="h-3 w-3" />
                          ) : (
                            <ThumbsDown className="h-3 w-3" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
