"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  FileText,
  ChevronLeft,
  ChevronRight,
  PhoneIncoming,
  PhoneOutgoing,
  Clock,
  Bot,
  Building2,
  X,
  Filter,
  Calendar,
} from "lucide-react";

interface TranscriptResult {
  id: number;
  direction: string;
  callerNumber: string | null;
  duration: number | null;
  status: string | null;
  summary: string | null;
  sentimentLabel: string | null;
  qualityScore: string | null;
  createdAt: string;
  agentName: string | null;
  orgName: string | null;
  highlight: string;
  rank: number;
}

interface TranscriptDetail {
  id: number;
  direction: string;
  callerNumber: string | null;
  duration: number | null;
  status: string | null;
  summary: string | null;
  transcript: string | null;
  sentimentLabel: string | null;
  qualityScore: string | null;
  createdAt: string;
  startedAt: string | null;
  endedAt: string | null;
  agentName: string | null;
  orgName: string | null;
  languageUsed: string | null;
  finalOutcome: string | null;
}

interface AgentOption {
  id: number;
  name: string;
}

export default function TranscriptsPage() {
  const [transcripts, setTranscripts] = useState<TranscriptResult[]>([]);
  const [total, setTotal] = useState(0);
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [direction, setDirection] = useState("all");
  const [agentId, setAgentId] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(0);
  const [selectedCall, setSelectedCall] = useState<TranscriptDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const pageSize = 25;

  const fetchTranscripts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeQuery) params.set("q", activeQuery);
      if (direction !== "all") params.set("direction", direction);
      if (agentId !== "all") params.set("agentId", agentId);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      params.set("limit", String(pageSize));
      params.set("offset", String(page * pageSize));

      const res = await fetch(`/api/admin/transcripts?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setTranscripts(data.transcripts || []);
      setTotal(data.total || 0);
      if (data.agents) setAgents(data.agents);
    } catch (err) {
      console.error("Failed to fetch transcripts:", err);
    } finally {
      setLoading(false);
    }
  }, [activeQuery, direction, agentId, dateFrom, dateTo, page]);

  useEffect(() => {
    fetchTranscripts();
  }, [fetchTranscripts]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    setActiveQuery(searchQuery);
  };

  const openTranscript = async (callId: number) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/transcripts?callId=${callId}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setSelectedCall(data.call);
    } catch (err) {
      console.error("Failed to fetch transcript detail:", err);
    } finally {
      setDetailLoading(false);
    }
  };

  const clearFilters = () => {
    setSearchQuery("");
    setActiveQuery("");
    setDirection("all");
    setAgentId("all");
    setDateFrom("");
    setDateTo("");
    setPage(0);
  };

  const hasActiveFilters = activeQuery || direction !== "all" || agentId !== "all" || dateFrom || dateTo;
  const totalPages = Math.ceil(total / pageSize);

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "—";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const sentimentBadge = (label: string | null) => {
    if (!label) return null;
    const colors: Record<string, string> = {
      positive: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
      neutral: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400",
      negative: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    };
    return (
      <Badge variant="secondary" className={`text-xs ${colors[label] || ""}`} data-testid={`badge-sentiment-${label}`}>
        {label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6" data-testid="page-transcripts">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-transcripts-title">
            Transcript Archive
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Search and browse call transcripts across all agents and organisations
          </p>
        </div>
        <Badge variant="outline" className="text-sm" data-testid="badge-transcript-count">
          {total.toLocaleString()} transcript{total !== 1 ? "s" : ""}
        </Badge>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="flex gap-3" data-testid="form-transcript-search">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search transcripts by keyword or phrase..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-transcript-search"
              />
            </div>
            <Button type="submit" data-testid="button-transcript-search">
              Search
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              data-testid="button-toggle-filters"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {hasActiveFilters && (
                <span className="ml-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">
                  !
                </span>
              )}
            </Button>
          </form>

          {showFilters && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-4 border-t" data-testid="section-filters">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Direction</label>
                <Select value={direction} onValueChange={(v) => { setDirection(v); setPage(0); }}>
                  <SelectTrigger data-testid="select-direction">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Directions</SelectItem>
                    <SelectItem value="inbound">Inbound</SelectItem>
                    <SelectItem value="outbound">Outbound</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Agent</label>
                <Select value={agentId} onValueChange={(v) => { setAgentId(v); setPage(0); }}>
                  <SelectTrigger data-testid="select-agent">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Agents</SelectItem>
                    {agents.map((a) => (
                      <SelectItem key={a.id} value={String(a.id)}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">From Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
                    className="pl-10"
                    data-testid="input-date-from"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">To Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => { setDateTo(e.target.value); setPage(0); }}
                    className="pl-10"
                    data-testid="input-date-to"
                  />
                </div>
              </div>
              {hasActiveFilters && (
                <div className="sm:col-span-2 lg:col-span-4">
                  <Button variant="ghost" size="sm" onClick={clearFilters} data-testid="button-clear-filters">
                    <X className="h-4 w-4 mr-1" />
                    Clear all filters
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {activeQuery && !loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="text-search-results-info">
          <Search className="h-4 w-4" />
          <span>
            Found <span className="font-medium text-foreground">{total}</span> result{total !== 1 ? "s" : ""} for{" "}
            <span className="font-medium text-foreground">"{activeQuery}"</span>
          </span>
          <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => { setActiveQuery(""); setSearchQuery(""); }}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      <div className="space-y-3" data-testid="section-transcript-results">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="py-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-5 w-24" />
                  </div>
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-4 w-48" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : transcripts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-lg font-medium text-muted-foreground" data-testid="text-no-results">
                {activeQuery ? "No transcripts match your search" : "No transcripts available"}
              </p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                {activeQuery
                  ? "Try different keywords or adjust your filters"
                  : "Transcripts will appear here after calls are completed"}
              </p>
            </CardContent>
          </Card>
        ) : (
          transcripts.map((t) => (
            <Card
              key={t.id}
              className="cursor-pointer transition-colors hover:bg-muted/30"
              onClick={() => openTranscript(t.id)}
              data-testid={`card-transcript-${t.id}`}
            >
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {t.direction === "inbound" ? (
                        <Badge variant="outline" className="text-xs gap-1">
                          <PhoneIncoming className="h-3 w-3" /> Inbound
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs gap-1">
                          <PhoneOutgoing className="h-3 w-3" /> Outbound
                        </Badge>
                      )}
                      {t.agentName && (
                        <Badge variant="secondary" className="text-xs gap-1">
                          <Bot className="h-3 w-3" /> {t.agentName}
                        </Badge>
                      )}
                      {t.orgName && (
                        <Badge variant="secondary" className="text-xs gap-1">
                          <Building2 className="h-3 w-3" /> {t.orgName}
                        </Badge>
                      )}
                      {sentimentBadge(t.sentimentLabel)}
                      {t.duration && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {formatDuration(t.duration)}
                        </span>
                      )}
                    </div>
                    <div
                      className="text-sm text-foreground/80 leading-relaxed line-clamp-3"
                      dangerouslySetInnerHTML={{ __html: t.highlight }}
                      data-testid={`text-highlight-${t.id}`}
                    />
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{formatDate(t.createdAt)}</span>
                      {t.callerNumber && <span>{t.callerNumber}</span>}
                      {t.qualityScore && (
                        <span>Quality: {parseFloat(t.qualityScore).toFixed(1)}/5</span>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="shrink-0" data-testid={`button-view-transcript-${t.id}`}>
                    <FileText className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between" data-testid="section-pagination">
          <p className="text-sm text-muted-foreground">
            Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={page === 0}
              data-testid="button-prev-page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground px-2">
              Page {page + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages - 1}
              data-testid="button-next-page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <Dialog open={!!selectedCall} onOpenChange={(open) => { if (!open) setSelectedCall(null); }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {detailLoading ? (
            <div className="space-y-4 py-6">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : selectedCall ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2" data-testid="text-detail-title">
                  <FileText className="h-5 w-5" />
                  Call Transcript #{selectedCall.id}
                </DialogTitle>
                <DialogDescription>
                  {formatDate(selectedCall.createdAt)}
                  {selectedCall.callerNumber && ` — ${selectedCall.callerNumber}`}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5 mt-2">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" data-testid="section-detail-meta">
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground mb-1">Direction</p>
                    <p className="text-sm font-medium flex items-center gap-1.5">
                      {selectedCall.direction === "inbound" ? (
                        <><PhoneIncoming className="h-3.5 w-3.5 text-emerald-500" /> Inbound</>
                      ) : (
                        <><PhoneOutgoing className="h-3.5 w-3.5 text-blue-500" /> Outbound</>
                      )}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground mb-1">Duration</p>
                    <p className="text-sm font-medium">{formatDuration(selectedCall.duration)}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground mb-1">Agent</p>
                    <p className="text-sm font-medium">{selectedCall.agentName || "—"}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground mb-1">Organisation</p>
                    <p className="text-sm font-medium">{selectedCall.orgName || "—"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {sentimentBadge(selectedCall.sentimentLabel)}
                  {selectedCall.qualityScore && (
                    <Badge variant="outline" className="text-xs">
                      Quality: {parseFloat(selectedCall.qualityScore).toFixed(1)}/5
                    </Badge>
                  )}
                  {selectedCall.finalOutcome && (
                    <Badge variant="outline" className="text-xs">
                      {selectedCall.finalOutcome}
                    </Badge>
                  )}
                  {selectedCall.languageUsed && (
                    <Badge variant="outline" className="text-xs">
                      {selectedCall.languageUsed}
                    </Badge>
                  )}
                </div>

                {selectedCall.summary && (
                  <div data-testid="section-detail-summary">
                    <h3 className="text-sm font-semibold mb-2">Summary</h3>
                    <div className="rounded-lg bg-muted/50 p-4 text-sm leading-relaxed">
                      {selectedCall.summary}
                    </div>
                  </div>
                )}

                <div data-testid="section-detail-transcript">
                  <h3 className="text-sm font-semibold mb-2">Full Transcript</h3>
                  <div className="rounded-lg border bg-background p-4 text-sm leading-relaxed whitespace-pre-wrap font-mono max-h-[40vh] overflow-y-auto">
                    {selectedCall.transcript || "No transcript available."}
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
