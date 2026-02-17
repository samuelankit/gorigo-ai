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
  Phone,
  MessageSquare,
  Clock,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Activity,
} from "lucide-react";

interface ConversationRow {
  id: number;
  sessionId: string;
  channel: string;
  status: string;
  messageCount: number;
  ipAddress: string | null;
  userAgent: string | null;
  leadId: number | null;
  startedAt: string | null;
  endedAt: string | null;
  duration: number | null;
  leadName: string | null;
  leadEmail: string | null;
}

interface ChatMsg {
  id: number;
  leadId: number | null;
  conversationId: number | null;
  role: string;
  content: string;
  rating: number | null;
  createdAt: string | null;
}

interface Stats {
  totalConversations: number;
  webCallCount: number;
  chatbotCount: number;
  activeCount: number;
  endedCount: number;
  avgDuration: number;
  avgMessages: number;
}

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return "-";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
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

function formatTimestamp(dateStr: string | null): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

export default function AdminConversationsPage() {
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [channel, setChannel] = useState("all");
  const [status, setStatus] = useState("all");
  const [stats, setStats] = useState<Stats | null>(null);

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [transcriptMessages, setTranscriptMessages] = useState<ChatMsg[]>([]);
  const [transcriptLoading, setTranscriptLoading] = useState(false);

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        channel,
        status,
        search,
      });
      const res = await fetch(`/api/admin/conversations?${params}`);
      const data = await res.json();
      if (data && !data.error) {
        setConversations(data.conversations || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
        setStats(data.stats || null);
      }
    } catch (error) {
      console.error("Fetch admin conversations failed:", error);
    } finally {
      setLoading(false);
    }
  }, [page, channel, status, search]);

  const fetchTranscript = useCallback(async (id: number) => {
    setTranscriptLoading(true);
    try {
      const res = await fetch(`/api/admin/conversations/${id}`);
      const data = await res.json();
      if (data && !data.error) {
        setTranscriptMessages(data.messages || []);
      }
    } catch (error) {
      console.error("Fetch conversation transcript failed:", error);
    } finally {
      setTranscriptLoading(false);
    }
  }, []);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  const handleRowClick = useCallback((id: number) => {
    if (expandedId === id) {
      setExpandedId(null);
      setTranscriptMessages([]);
    } else {
      setExpandedId(id);
      fetchTranscript(id);
    }
  }, [expandedId, fetchTranscript]);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const handleChannelFilter = useCallback((value: string) => {
    setChannel(value);
    setPage(1);
    setExpandedId(null);
  }, []);

  const handleStatusFilter = useCallback((value: string) => {
    setStatus(value);
    setPage(1);
    setExpandedId(null);
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <MessageSquare className="h-6 w-6 text-violet-500" />
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-conversations-title">Public Conversations</h1>
            <p className="text-sm text-muted-foreground">View all web call and chatbot sessions.</p>
          </div>
        </div>
        <Button variant="outline" onClick={fetchConversations} data-testid="button-refresh-conversations">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card data-testid="stat-total-conversations">
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Total Conversations</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalConversations.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">{stats.activeCount} active, {stats.endedCount} ended</p>
            </CardContent>
          </Card>

          <Card data-testid="stat-web-calls">
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Web Calls</CardTitle>
              <Phone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.webCallCount.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">{stats.totalConversations > 0 ? Math.round((stats.webCallCount / stats.totalConversations) * 100) : 0}% of total</p>
            </CardContent>
          </Card>

          <Card data-testid="stat-chatbot-sessions">
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Chatbot Sessions</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.chatbotCount.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">{stats.avgMessages} avg messages</p>
            </CardContent>
          </Card>

          <Card data-testid="stat-avg-duration">
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Avg Duration</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatDuration(stats.avgDuration)}</div>
              <p className="text-xs text-muted-foreground mt-1">across all sessions</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by IP or lead email..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
            data-testid="input-conversation-search"
          />
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant={channel === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => handleChannelFilter("all")}
            data-testid="filter-channel-all"
          >
            All
          </Button>
          <Button
            variant={channel === "web_call" ? "default" : "outline"}
            size="sm"
            onClick={() => handleChannelFilter("web_call")}
            data-testid="filter-channel-web_call"
          >
            <Phone className="h-3 w-3 mr-1" />
            Web Call
          </Button>
          <Button
            variant={channel === "chatbot" ? "default" : "outline"}
            size="sm"
            onClick={() => handleChannelFilter("chatbot")}
            data-testid="filter-channel-chatbot"
          >
            <MessageSquare className="h-3 w-3 mr-1" />
            Chatbot
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant={status === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => handleStatusFilter("all")}
            data-testid="filter-status-all"
          >
            All
          </Button>
          <Button
            variant={status === "active" ? "default" : "outline"}
            size="sm"
            onClick={() => handleStatusFilter("active")}
            data-testid="filter-status-active"
          >
            Active
          </Button>
          <Button
            variant={status === "ended" ? "default" : "outline"}
            size="sm"
            onClick={() => handleStatusFilter("ended")}
            data-testid="filter-status-ended"
          >
            Ended
          </Button>
        </div>
        <Badge variant="secondary" className="no-default-hover-elevate" data-testid="text-conversations-count">
          {total.toLocaleString()} conversations
        </Badge>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : conversations.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No conversations found.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Channel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Messages</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Lead</TableHead>
                  <TableHead>Started At</TableHead>
                  <TableHead className="w-8"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {conversations.map((conv) => (
                  <>
                    <TableRow
                      key={conv.id}
                      className="cursor-pointer"
                      onClick={() => handleRowClick(conv.id)}
                      data-testid={`conversation-row-${conv.id}`}
                    >
                      <TableCell>
                        {conv.channel === "web_call" ? (
                          <Badge variant="secondary" className="no-default-hover-elevate bg-blue-500/10 text-blue-600 dark:text-blue-400">
                            <Phone className="h-3 w-3 mr-1" />
                            Web Call
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="no-default-hover-elevate bg-green-500/10 text-green-600 dark:text-green-400">
                            <MessageSquare className="h-3 w-3 mr-1" />
                            Chatbot
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {conv.status === "active" ? (
                          <Badge variant="secondary" className="no-default-hover-elevate bg-green-500/10 text-green-600 dark:text-green-400">
                            active
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="no-default-hover-elevate">
                            ended
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{conv.messageCount}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDuration(conv.duration)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground font-mono">{conv.ipAddress || "-"}</TableCell>
                      <TableCell className="text-sm">
                        {conv.leadName ? (
                          <span>{conv.leadName}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{relativeTime(conv.startedAt)}</TableCell>
                      <TableCell>
                        {expandedId === conv.id ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </TableCell>
                    </TableRow>
                    {expandedId === conv.id && (
                      <TableRow key={`transcript-${conv.id}`}>
                        <TableCell colSpan={8} className="p-0">
                          <div
                            className="p-4 bg-muted/30 border-t"
                            data-testid={`transcript-${conv.id}`}
                          >
                            <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>Session: {conv.sessionId}</span>
                              {conv.leadEmail && <span>| Lead: {conv.leadEmail}</span>}
                              {conv.userAgent && <span className="truncate max-w-xs">| UA: {conv.userAgent}</span>}
                            </div>
                            {transcriptLoading ? (
                              <div className="space-y-3">
                                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-3/4" />)}
                              </div>
                            ) : transcriptMessages.length === 0 ? (
                              <p className="text-sm text-muted-foreground text-center py-4">No messages in this conversation.</p>
                            ) : (
                              <div className="space-y-3 max-h-96 overflow-y-auto">
                                {transcriptMessages.map((msg) => (
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
                                      <div className={`mt-1 text-xs ${
                                        msg.role === "user" ? "text-white/70" : "text-muted-foreground"
                                      }`}>
                                        <span>{formatTimestamp(msg.createdAt)}</span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
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
              data-testid="button-conversations-prev"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              data-testid="button-conversations-next"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
