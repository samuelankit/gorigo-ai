"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
  Users,
  UserPlus,
  Trophy,
  Target,
  TrendingUp,
  Search,
  ChevronLeft,
  ChevronRight,
  Download,
  RefreshCw,
  Sparkles,
  MessageSquare,
  Clock,
  Building2,
  Mail,
  Phone,
  Globe,
  Tag,
  Send,
} from "lucide-react";

interface Lead {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  companyDomain: string | null;
  industry: string | null;
  estimatedSize: string | null;
  leadScore: number | null;
  pipelineStage: string | null;
  assignedTo: number | null;
  tags: string[] | null;
  enrichedAt: string | null;
  enrichmentData: Record<string, unknown> | null;
  sourceChannel: string | null;
  totalMessages: number | null;
  lastMessageAt: string | null;
  lastContactedAt: string | null;
  createdAt: string | null;
  status: string | null;
}

interface LeadActivity {
  id: number;
  leadId: number;
  type: string;
  description: string;
  metadata: Record<string, unknown> | null;
  performedBy: number | null;
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

const STAGES = ["all", "new", "contacted", "qualified", "proposal", "won", "lost"];

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
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 30) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function scoreColor(score: number | null): string {
  if (score === null || score === undefined) return "text-muted-foreground";
  if (score >= 61) return "text-green-600 dark:text-green-400";
  if (score >= 31) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

function scoreBg(score: number | null): string {
  if (score === null || score === undefined) return "bg-muted";
  if (score >= 61) return "bg-green-500/10";
  if (score >= 31) return "bg-yellow-500/10";
  return "bg-red-500/10";
}

function stageBadge(stage: string | null) {
  const s = stage || "new";
  const variants: Record<string, { variant: "default" | "secondary" | "outline"; className: string }> = {
    new: { variant: "default", className: "" },
    contacted: { variant: "secondary", className: "" },
    qualified: { variant: "secondary", className: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
    proposal: { variant: "secondary", className: "bg-purple-500/10 text-purple-600 dark:text-purple-400" },
    won: { variant: "secondary", className: "bg-green-500/10 text-green-600 dark:text-green-400" },
    lost: { variant: "outline", className: "text-muted-foreground" },
  };
  const config = variants[s] || variants.new;
  return <Badge variant={config.variant} className={`no-default-hover-elevate ${config.className}`}>{s}</Badge>;
}

export default function AdminLeadsPage() {
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [activeStage, setActiveStage] = useState("all");
  const [stageCounts, setStageCounts] = useState<Record<string, number>>({});
  const [sortBy, setSortBy] = useState("createdAt");

  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [enriching, setEnriching] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [noteSending, setNoteSending] = useState(false);
  const [stageUpdating, setStageUpdating] = useState(false);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        search,
        stage: activeStage,
        sortBy,
      });
      const res = await fetch(`/api/admin/leads?${params}`);
      const data = await res.json();
      if (data && !data.error) {
        setLeads(data.leads || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
        setStageCounts(data.stageCounts || {});
      }
    } catch (error) {
      console.error("Fetch leads failed:", error);
    } finally {
      setLoading(false);
    }
  }, [page, search, activeStage, sortBy]);

  const fetchLeadDetail = useCallback(async (leadId: number) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/leads/${leadId}`);
      const data = await res.json();
      if (data && !data.error) {
        setSelectedLead(data.lead);
        setMessages(data.messages || []);
        setActivities(data.activities || []);
      }
    } catch (error) {
      console.error("Fetch lead detail failed:", error);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const handleEnrich = async (leadId: number) => {
    setEnriching(true);
    try {
      await fetch(`/api/admin/leads/${leadId}`, { method: "POST" });
      await fetchLeadDetail(leadId);
      fetchLeads();
    } catch (error) {
      console.error("Enrich lead failed:", error);
    } finally {
      setEnriching(false);
    }
  };

  const handleStageChange = async (leadId: number, newStage: string) => {
    setStageUpdating(true);
    try {
      const res = await fetch("/api/admin/leads", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, pipelineStage: newStage }),
      });
      if (res.ok) {
        setSelectedLead((prev) => prev ? { ...prev, pipelineStage: newStage } : prev);
        fetchLeads();
        await fetchLeadDetail(leadId);
      }
    } catch (error) {
      console.error("Update stage failed:", error);
    } finally {
      setStageUpdating(false);
    }
  };

  const handleAddNote = async (leadId: number) => {
    if (!noteText.trim()) return;
    setNoteSending(true);
    try {
      const res = await fetch("/api/admin/leads", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, notes: noteText.trim() }),
      });
      if (res.ok) {
        setNoteText("");
        await fetchLeadDetail(leadId);
      }
    } catch (error) {
      console.error("Add note failed:", error);
    } finally {
      setNoteSending(false);
    }
  };

  const handleExport = () => {
    window.open("/api/admin/leads/export", "_blank");
  };

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const openDetail = (lead: Lead) => {
    setSelectedLead(lead);
    setDialogOpen(true);
    setNoteText("");
    fetchLeadDetail(lead.id);
  };

  const totalAll = Object.values(stageCounts).reduce((a, b) => a + b, 0);
  const avgScore = leads.length > 0
    ? Math.round(leads.reduce((sum, l) => sum + (l.leadScore || 0), 0) / leads.length)
    : 0;

  const enrichmentInsights = selectedLead?.enrichmentData?.conversationInsights as {
    mentionedPricing?: boolean;
    mentionedDemo?: boolean;
    mentionedIntegration?: boolean;
    mentionedTimeline?: boolean;
    sentiment?: string;
    engagementLevel?: string;
    topTopics?: string[];
    messageCount?: number;
    userMessageCount?: number;
  } | undefined;

  return (
    <div className="flex flex-col gap-6 p-6" data-testid="page-admin-leads">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-leads-title">Lead Pipeline</h1>
          <p className="text-sm text-muted-foreground">Manage and track your leads from capture to conversion</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} data-testid="button-export-leads">
            <Download className="h-4 w-4 mr-1" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => fetchLeads()} data-testid="button-refresh-leads">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-leads">{totalAll}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">New</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-new-leads">{stageCounts.new || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Qualified</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-qualified-leads">{stageCounts.qualified || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Won</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="text-won-leads">{stageCounts.won || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${scoreColor(avgScore)}`} data-testid="text-avg-score">{avgScore}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {STAGES.map((stage) => (
          <Button
            key={stage}
            variant={activeStage === stage ? "default" : "outline"}
            size="sm"
            onClick={() => { setActiveStage(stage); setPage(1); }}
            className="toggle-elevate"
            data-testid={`button-stage-${stage}`}
          >
            {stage === "all" ? "All" : stage.charAt(0).toUpperCase() + stage.slice(1)}
            {stage !== "all" && stageCounts[stage] ? ` (${stageCounts[stage]})` : ""}
          </Button>
        ))}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, company..."
            className="pl-10"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            data-testid="input-search-leads"
          />
        </div>
        <Select value={sortBy} onValueChange={(v) => { setSortBy(v); setPage(1); }}>
          <SelectTrigger className="w-[160px]" data-testid="select-sort-leads">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="createdAt">Newest First</SelectItem>
            <SelectItem value="leadScore">Highest Score</SelectItem>
            <SelectItem value="lastMessageAt">Recent Activity</SelectItem>
            <SelectItem value="name">Name A-Z</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : leads.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">No leads found</p>
              <p className="text-sm">Leads will appear here when visitors interact with your chatbot</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead) => (
                  <TableRow
                    key={lead.id}
                    className="cursor-pointer hover-elevate"
                    onClick={() => openDetail(lead)}
                    data-testid={`row-lead-${lead.id}`}
                  >
                    <TableCell className="font-medium" data-testid={`text-lead-name-${lead.id}`}>{lead.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{lead.email}</TableCell>
                    <TableCell>{lead.company || <span className="text-muted-foreground">-</span>}</TableCell>
                    <TableCell>{stageBadge(lead.pipelineStage)}</TableCell>
                    <TableCell>
                      <span className={`font-semibold ${scoreColor(lead.leadScore)}`} data-testid={`text-lead-score-${lead.id}`}>
                        {lead.leadScore ?? "-"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="no-default-hover-elevate text-xs">{lead.sourceChannel || "chatbot"}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{relativeTime(lead.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">{total} lead{total !== 1 ? "s" : ""} total</p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              data-testid="button-leads-prev"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              data-testid="button-leads-next"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="text-lead-detail-name">{selectedLead?.name || "Lead Detail"}</DialogTitle>
            <DialogDescription>{selectedLead?.email}</DialogDescription>
          </DialogHeader>

          {detailLoading ? (
            <div className="space-y-3 py-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : selectedLead ? (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedLead.email}</span>
                  </div>
                  {selectedLead.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedLead.phone}</span>
                    </div>
                  )}
                  {selectedLead.company && (
                    <div className="flex items-center gap-2 text-sm">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedLead.company}</span>
                    </div>
                  )}
                  {selectedLead.companyDomain && (
                    <div className="flex items-center gap-2 text-sm">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedLead.companyDomain}</span>
                    </div>
                  )}
                  {selectedLead.industry && (
                    <div className="flex items-center gap-2 text-sm">
                      <Tag className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedLead.industry}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-muted-foreground">Score</span>
                    <span className={`text-lg font-bold ${scoreColor(selectedLead.leadScore)}`} data-testid="text-detail-score">
                      {selectedLead.leadScore ?? 0}/100
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        (selectedLead.leadScore || 0) >= 61 ? "bg-green-500" :
                        (selectedLead.leadScore || 0) >= 31 ? "bg-yellow-500" : "bg-red-500"
                      }`}
                      style={{ width: `${selectedLead.leadScore || 0}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-muted-foreground">Stage</span>
                    {stageBadge(selectedLead.pipelineStage)}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-muted-foreground">Messages</span>
                    <span className="text-sm font-medium">{selectedLead.totalMessages || 0}</span>
                  </div>
                </div>
              </div>

              {enrichmentInsights && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      Enrichment Insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {enrichmentInsights.sentiment && (
                        <Badge variant="outline" className="no-default-hover-elevate text-xs">
                          Sentiment: {enrichmentInsights.sentiment}
                        </Badge>
                      )}
                      {enrichmentInsights.engagementLevel && (
                        <Badge variant="outline" className="no-default-hover-elevate text-xs">
                          Engagement: {enrichmentInsights.engagementLevel}
                        </Badge>
                      )}
                      {enrichmentInsights.topTopics && enrichmentInsights.topTopics.map((topic: string) => (
                        <Badge key={topic} variant="secondary" className="no-default-hover-elevate text-xs">
                          {topic}
                        </Badge>
                      ))}
                      {(selectedLead.enrichmentData as Record<string, unknown>)?.isPersonalEmail === false && (
                        <Badge variant="secondary" className="no-default-hover-elevate text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400">
                          Business Email
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex items-center gap-2 flex-wrap">
                <Select
                  value={selectedLead.pipelineStage || "new"}
                  onValueChange={(v) => handleStageChange(selectedLead.id, v)}
                  disabled={stageUpdating}
                >
                  <SelectTrigger className="w-[160px]" data-testid="select-change-stage">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="qualified">Qualified</SelectItem>
                    <SelectItem value="proposal">Proposal</SelectItem>
                    <SelectItem value="won">Won</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEnrich(selectedLead.id)}
                  disabled={enriching}
                  data-testid="button-enrich-lead"
                >
                  {enriching ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  <span className="ml-1">{enriching ? "Enriching..." : "Enrich"}</span>
                </Button>
              </div>

              {messages.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Conversation ({messages.length} messages)
                  </h3>
                  <div className="max-h-48 overflow-y-auto space-y-2 border rounded-md p-3">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`text-sm p-2 rounded-md ${
                          msg.role === "user"
                            ? "bg-primary/5 ml-4"
                            : "bg-muted mr-4"
                        }`}
                        data-testid={`text-message-${msg.id}`}
                      >
                        <span className="text-xs font-medium text-muted-foreground">
                          {msg.role === "user" ? "Visitor" : "AI"}
                        </span>
                        <p className="mt-0.5">{msg.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activities.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Activity Timeline
                  </h3>
                  <div className="max-h-36 overflow-y-auto space-y-2">
                    {activities.map((act) => (
                      <div key={act.id} className="flex items-start gap-3 text-sm" data-testid={`text-activity-${act.id}`}>
                        <div className="w-2 h-2 rounded-full bg-muted-foreground/30 mt-1.5 shrink-0" />
                        <div className="flex-1">
                          <p>{act.description}</p>
                          <p className="text-xs text-muted-foreground">{relativeTime(act.createdAt)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-sm font-semibold mb-2">Add Note</h3>
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Add a note about this lead..."
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    className="min-h-[60px] text-sm"
                    data-testid="input-lead-note"
                  />
                  <Button
                    size="icon"
                    onClick={() => handleAddNote(selectedLead.id)}
                    disabled={noteSending || !noteText.trim()}
                    data-testid="button-send-note"
                  >
                    {noteSending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
