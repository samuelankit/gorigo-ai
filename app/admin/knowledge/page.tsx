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
  BookOpen,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Building2,
  FileText,
  Upload,
  Globe,
  Mic,
  Layers,
  Boxes,
  ExternalLink,
  Hash,
} from "lucide-react";

interface KnowledgeDoc {
  id: number;
  orgId: number;
  title: string;
  sourceType: string | null;
  sourceUrl: string | null;
  status: string | null;
  chunkCount: number | null;
  createdAt: string;
  updatedAt: string;
  orgName: string | null;
  totalChunks: number | null;
  totalTokens: number | null;
  embeddedChunks: number | null;
}

interface Stats {
  totalDocs: number;
  processed: number;
  pending: number;
  failed: number;
  totalChunks: number;
  uniqueOrgs: number;
  manualDocs: number;
  uploadDocs: number;
  urlDocs: number;
  audioDocs: number;
}

function formatDate(d: string | null): string {
  if (!d) return "-";
  return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
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
  return formatDate(d);
}

function getSourceIcon(sourceType: string | null) {
  switch (sourceType) {
    case "upload": return <Upload className="h-3.5 w-3.5 text-muted-foreground" />;
    case "url": return <Globe className="h-3.5 w-3.5 text-muted-foreground" />;
    case "audio": return <Mic className="h-3.5 w-3.5 text-muted-foreground" />;
    default: return <FileText className="h-3.5 w-3.5 text-muted-foreground" />;
  }
}

export default function AdminKnowledgePage() {
  const [docsList, setDocsList] = useState<KnowledgeDoc[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [source, setSource] = useState("all");
  const [page, setPage] = useState(0);
  const [detailDoc, setDetailDoc] = useState<KnowledgeDoc | null>(null);

  const PAGE_SIZE = 25;

  const fetchDocs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(page * PAGE_SIZE) });
      if (search) params.set("search", search);
      if (status !== "all") params.set("status", status);
      if (source !== "all") params.set("source", source);
      const res = await fetch(`/api/admin/knowledge?${params}`);
      const data = await res.json();
      if (data && !data.error) {
        setDocsList(data.documents ?? []);
        setTotal(data.total ?? 0);
        setStats(data.stats ?? null);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, [search, status, source, page]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);
  useEffect(() => { setPage(0); }, [search, status, source]);

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
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-knowledge-title">
            <BookOpen className="h-6 w-6 text-muted-foreground" />
            Knowledge Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Monitor knowledge bases and document processing across all organisations</p>
        </div>
        <Button variant="outline" onClick={fetchDocs} disabled={loading} data-testid="button-refresh-knowledge">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-stat-total">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Total Documents</p>
                <p className="text-2xl font-bold mt-1" data-testid="text-stat-total">{stats?.totalDocs ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1" data-testid="text-stat-orgs">{stats?.uniqueOrgs ?? 0} organisations</p>
              </div>
              <BookOpen className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card data-testid="card-stat-processed">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Processing</p>
                <p className="text-2xl font-bold mt-1" data-testid="text-stat-processed">{stats?.processed ?? 0}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-muted-foreground" data-testid="text-stat-pending">{stats?.pending ?? 0} pending</span>
                  {(stats?.failed ?? 0) > 0 && (
                    <span className="text-xs text-destructive" data-testid="text-stat-failed">{stats!.failed} failed</span>
                  )}
                </div>
              </div>
              <Layers className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card data-testid="card-stat-chunks">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Total Chunks</p>
                <p className="text-2xl font-bold mt-1" data-testid="text-stat-chunks">{(stats?.totalChunks ?? 0).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">Across all documents</p>
              </div>
              <Boxes className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card data-testid="card-stat-sources">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Sources</p>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <div className="flex items-center gap-1" title="Manual">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm font-bold" data-testid="text-stat-manual">{stats?.manualDocs ?? 0}</span>
                  </div>
                  <div className="flex items-center gap-1" title="Upload">
                    <Upload className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm font-bold" data-testid="text-stat-upload">{stats?.uploadDocs ?? 0}</span>
                  </div>
                  <div className="flex items-center gap-1" title="URL">
                    <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm font-bold" data-testid="text-stat-url">{stats?.urlDocs ?? 0}</span>
                  </div>
                  <div className="flex items-center gap-1" title="Audio">
                    <Mic className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm font-bold" data-testid="text-stat-audio">{stats?.audioDocs ?? 0}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">By source type</p>
              </div>
              <Hash className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <CardTitle className="text-base">All Documents</CardTitle>
            <Badge variant="secondary" data-testid="text-docs-count">{total} documents</Badge>
          </div>
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search document title or org..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="input-knowledge-search"
              />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[130px]" data-testid="select-knowledge-status">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="processed">Processed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger className="w-[130px]" data-testid="select-knowledge-source">
                <SelectValue placeholder="All Sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="upload">Upload</SelectItem>
                <SelectItem value="url">URL</SelectItem>
                <SelectItem value="audio">Audio</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {docsList.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground" data-testid="text-no-documents">No documents found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Organisation</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Chunks</TableHead>
                    <TableHead>Tokens</TableHead>
                    <TableHead>Embedded</TableHead>
                    <TableHead>Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {docsList.map((doc) => {
                    const chunks = doc.totalChunks ?? doc.chunkCount ?? 0;
                    const embedded = doc.embeddedChunks ?? 0;
                    const embeddingPct = chunks > 0 ? Math.round((embedded / chunks) * 100) : 0;
                    return (
                      <TableRow
                        key={doc.id}
                        className="cursor-pointer"
                        onClick={() => setDetailDoc(doc)}
                        data-testid={`row-doc-${doc.id}`}
                      >
                        <TableCell className="font-medium max-w-[250px] truncate" data-testid={`text-doc-title-${doc.id}`}>
                          {doc.title}
                        </TableCell>
                        <TableCell data-testid={`text-doc-org-${doc.id}`}>
                          <div className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="text-sm">{doc.orgName || `Org #${doc.orgId}`}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            {getSourceIcon(doc.sourceType)}
                            <span className="text-sm capitalize">{doc.sourceType || "manual"}</span>
                          </div>
                        </TableCell>
                        <TableCell data-testid={`text-doc-status-${doc.id}`}>
                          <Badge variant={
                            doc.status === "processed" ? "default" :
                            doc.status === "failed" ? "destructive" : "secondary"
                          }>
                            {doc.status || "pending"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm" data-testid={`text-doc-chunks-${doc.id}`}>
                          {chunks.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {(doc.totalTokens ?? 0).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full bg-foreground/40"
                                style={{ width: `${embeddingPct}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">{embeddingPct}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatRelative(doc.updatedAt)}
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
                <Button size="icon" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)} data-testid="button-knowledge-prev">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)} data-testid="button-knowledge-next">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!detailDoc} onOpenChange={(open) => { if (!open) setDetailDoc(null); }}>
        <DialogContent className="max-w-lg" data-testid="dialog-doc-detail">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {getSourceIcon(detailDoc?.sourceType ?? null)}
              {detailDoc?.title}
            </DialogTitle>
            <DialogDescription>Document details and processing status</DialogDescription>
          </DialogHeader>
          {detailDoc && (
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Organisation</p>
                  <p className="font-medium" data-testid="text-detail-org">{detailDoc.orgName || `Org #${detailDoc.orgId}`}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Source Type</p>
                  <p className="font-medium capitalize" data-testid="text-detail-source">{detailDoc.sourceType || "manual"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Status</p>
                  <Badge variant={
                    detailDoc.status === "processed" ? "default" :
                    detailDoc.status === "failed" ? "destructive" : "secondary"
                  } data-testid="text-detail-status">
                    {detailDoc.status || "pending"}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Chunks</p>
                  <p className="font-medium" data-testid="text-detail-chunks">{(detailDoc.totalChunks ?? detailDoc.chunkCount ?? 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Total Tokens</p>
                  <p className="font-medium" data-testid="text-detail-tokens">{(detailDoc.totalTokens ?? 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Embedded</p>
                  <p className="font-medium" data-testid="text-detail-embedded">
                    {detailDoc.embeddedChunks ?? 0} / {detailDoc.totalChunks ?? detailDoc.chunkCount ?? 0}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Created</p>
                  <p className="font-medium">{formatDate(detailDoc.createdAt)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Updated</p>
                  <p className="font-medium">{formatRelative(detailDoc.updatedAt)}</p>
                </div>
              </div>
              {detailDoc.sourceUrl && (
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Source URL</p>
                  <a
                    href={detailDoc.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm underline flex items-center gap-1"
                    data-testid="link-detail-source-url"
                  >
                    {detailDoc.sourceUrl}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
