"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/components/query-provider";
import { useToast } from "@/lib/use-toast";
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
  Users,
  UserPlus,
  Trophy,
  Target,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Mail,
  Phone,
  Building2,
  Globe,
  Tag,
  Clock,
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
  tags: string[] | null;
  sourceChannel: string | null;
  totalMessages: number | null;
  lastMessageAt: string | null;
  lastContactedAt: string | null;
  createdAt: string | null;
  status: string | null;
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

export default function CustomerLeadsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [activeStage, setActiveStage] = useState("all");

  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: leadsData, isLoading: loading } = useQuery<{
    leads: Lead[];
    total: number;
    totalPages: number;
    stageCounts: Record<string, number>;
  }>({
    queryKey: ["/api/leads", { page, search, stage: activeStage }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        search,
        stage: activeStage,
      });
      const res = await fetch(`/api/leads?${params}`);
      if (!res.ok) throw new Error("Failed to fetch leads");
      return res.json();
    },
  });

  const leads = leadsData?.leads || [];
  const total = leadsData?.total || 0;
  const totalPages = leadsData?.totalPages || 1;
  const stageCounts = leadsData?.stageCounts || {};

  const updateStageMutation = useMutation({
    mutationFn: ({ leadId, pipelineStage }: { leadId: number; pipelineStage: string }) =>
      apiRequest("/api/leads", { method: "PATCH", body: JSON.stringify({ leadId, pipelineStage }) }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      if (selectedLead && selectedLead.id === variables.leadId) {
        setSelectedLead({ ...selectedLead, pipelineStage: variables.pipelineStage });
      }
      toast({ title: "Lead updated", description: "Pipeline stage changed successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update lead stage.", variant: "destructive" });
    },
  });

  const openLeadDetail = (lead: Lead) => {
    setSelectedLead(lead);
    setDialogOpen(true);
  };

  const totalAll = Object.values(stageCounts).reduce((a, b) => a + b, 0);
  const wonCount = stageCounts["won"] || 0;
  const qualifiedCount = stageCounts["qualified"] || 0;
  const newCount = stageCounts["new"] || 0;

  return (
    <div className="space-y-6 p-6" data-testid="leads-dashboard">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="leads-title">Leads</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage and track your captured leads from chatbot interactions
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/leads"] })} data-testid="btn-refresh-leads">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card data-testid="card-total-leads">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Leads</p>
                <p className="text-xl font-bold">{totalAll}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card data-testid="card-new-leads">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <UserPlus className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">New</p>
                <p className="text-xl font-bold">{newCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card data-testid="card-qualified-leads">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Target className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Qualified</p>
                <p className="text-xl font-bold">{qualifiedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card data-testid="card-won-leads">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Trophy className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Won</p>
                <p className="text-xl font-bold">{wonCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-base">Lead Pipeline</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search leads..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9"
                data-testid="input-search-leads"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-1 mb-4 flex-wrap">
            {STAGES.map((stage) => (
              <Button
                key={stage}
                variant={activeStage === stage ? "default" : "ghost"}
                size="sm"
                className="text-xs capitalize"
                onClick={() => { setActiveStage(stage); setPage(1); }}
                data-testid={`btn-stage-${stage}`}
              >
                {stage}
                {stage !== "all" && stageCounts[stage] ? (
                  <span className="ml-1 text-[10px] opacity-70">({stageCounts[stage]})</span>
                ) : stage === "all" ? (
                  <span className="ml-1 text-[10px] opacity-70">({totalAll})</span>
                ) : null}
              </Button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : leads.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground" data-testid="leads-empty-state">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No leads yet</p>
              <p className="text-sm mt-1">Leads captured from chatbot conversations will appear here</p>
            </div>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Name</TableHead>
                      <TableHead className="hidden md:table-cell">Company</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead className="hidden sm:table-cell">Source</TableHead>
                      <TableHead className="hidden lg:table-cell">Messages</TableHead>
                      <TableHead className="hidden lg:table-cell">Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leads.map((lead) => (
                      <TableRow
                        key={lead.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => openLeadDetail(lead)}
                        data-testid={`lead-row-${lead.id}`}
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{lead.name}</p>
                            <p className="text-xs text-muted-foreground">{lead.email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className="text-sm">{lead.company || "-"}</span>
                        </TableCell>
                        <TableCell>
                          <span className={`text-sm font-semibold ${scoreColor(lead.leadScore)} px-2 py-0.5 rounded ${scoreBg(lead.leadScore)}`}>
                            {lead.leadScore ?? "-"}
                          </span>
                        </TableCell>
                        <TableCell>{stageBadge(lead.pipelineStage)}</TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <span className="text-xs text-muted-foreground">{lead.sourceChannel || "chatbot"}</span>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <span className="text-sm">{lead.totalMessages || 0}</span>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <span className="text-xs text-muted-foreground">{relativeTime(lead.createdAt)}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Showing {(page - 1) * 25 + 1}-{Math.min(page * 25, total)} of {total}
                </p>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    data-testid="btn-prev-page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    data-testid="btn-next-page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedLead?.name || "Lead Details"}</DialogTitle>
            <DialogDescription>
              View and manage lead information
            </DialogDescription>
          </DialogHeader>
          {selectedLead && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
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
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{relativeTime(selectedLead.createdAt)}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Score:</span>
                <span className={`font-bold text-lg ${scoreColor(selectedLead.leadScore)} px-2 py-0.5 rounded ${scoreBg(selectedLead.leadScore)}`}>
                  {selectedLead.leadScore ?? "-"}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Stage:</span>
                <Select
                  value={selectedLead.pipelineStage || "new"}
                  onValueChange={(val) => updateStageMutation.mutate({ leadId: selectedLead.id, pipelineStage: val })}
                  disabled={updateStageMutation.isPending}
                >
                  <SelectTrigger className="w-40" data-testid="select-stage">
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
              </div>

              {selectedLead.tags && selectedLead.tags.length > 0 && (
                <div>
                  <span className="text-sm text-muted-foreground">Tags:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedLead.tags.map((tag, i) => (
                      <Badge key={i} variant="outline" className="no-default-hover-elevate text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                <div>
                  <p className="text-xs text-muted-foreground">Total Messages</p>
                  <p className="font-medium">{selectedLead.totalMessages || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Source</p>
                  <p className="font-medium">{selectedLead.sourceChannel || "chatbot"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Last Message</p>
                  <p className="font-medium">{relativeTime(selectedLead.lastMessageAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Last Contacted</p>
                  <p className="font-medium">{relativeTime(selectedLead.lastContactedAt)}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
