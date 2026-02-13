"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/lib/use-toast";
import {
  BookOpen,
  Plus,
  Trash2,
  FileText,
  Link2,
  Loader2,
  RefreshCw,
  Database,
  Layers,
  Hash,
} from "lucide-react";

interface KnowledgeDocument {
  id: number;
  title: string;
  content: string;
  sourceType: string;
  sourceUrl: string | null;
  status: string;
  chunkCount: number;
  createdAt: string;
}

interface KnowledgeStats {
  totalDocuments: number;
  totalChunks: number;
  totalTokens: number;
  cacheEntries: number;
}

export default function KnowledgePage() {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  const [stats, setStats] = useState<KnowledgeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [addDocOpen, setAddDocOpen] = useState(false);
  const [importUrlOpen, setImportUrlOpen] = useState(false);
  const [docTitle, setDocTitle] = useState("");
  const [docContent, setDocContent] = useState("");
  const [importUrls, setImportUrls] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchDocuments = () => {
    setLoading(true);
    fetch("/api/knowledge")
      .then((r) => r.json())
      .then((d) => {
        if (d?.documents) setDocuments(d.documents);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const fetchStats = () => {
    fetch("/api/knowledge/stats")
      .then((r) => r.json())
      .then((d) => {
        if (d && !d.error) setStats(d);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchDocuments();
    fetchStats();
  }, []);

  const handleAddDocument = async () => {
    if (!docTitle.trim() || !docContent.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: docTitle.trim(), content: docContent.trim(), sourceType: "manual" }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to add document");
      }
      const data = await res.json();
      toast({ title: "Document added", description: "Now process it to make it searchable by your AI agent." });
      setDocTitle("");
      setDocContent("");
      setAddDocOpen(false);
      fetchDocuments();
      fetchStats();

      if (data.document?.id) {
        handleProcessDocument(data.document.id);
      }
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to add document", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleImportUrls = async () => {
    const urlList = importUrls
      .split("\n")
      .map((u) => u.trim())
      .filter((u) => u.length > 0);
    if (urlList.length === 0) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/knowledge/import-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: urlList }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Import failed");
      }
      const data = await res.json();
      toast({
        title: "Import complete",
        description: `${data.summary?.success || 0} imported, ${data.summary?.errors || 0} failed.`,
      });
      setImportUrls("");
      setImportUrlOpen(false);
      fetchDocuments();
      fetchStats();
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Import failed", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleProcessDocument = async (id: number) => {
    setProcessingId(id);
    try {
      const res = await fetch("/api/knowledge/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: id }),
      });
      if (!res.ok) throw new Error("Processing failed");
      toast({ title: "Processing started", description: "The document is being chunked and embedded for AI search." });
      setTimeout(() => {
        fetchDocuments();
        fetchStats();
      }, 3000);
    } catch {
      toast({ title: "Error", description: "Failed to process document", variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeleteDocument = async (id: number) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/knowledge?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      toast({ title: "Document deleted" });
      fetchDocuments();
      fetchStats();
    } catch {
      toast({ title: "Error", description: "Failed to delete document", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "processed":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
      case "processing":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
      case "pending":
        return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400";
      case "error":
        return "bg-red-500/10 text-red-600 dark:text-red-400";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-violet-500/10">
            <BookOpen className="w-5 h-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground" data-testid="text-knowledge-title">Knowledge Base</h1>
            <p className="text-sm text-muted-foreground">Manage documents your AI agent uses to answer questions.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setImportUrlOpen(true)} data-testid="button-import-url">
            <Link2 className="w-4 h-4 mr-2" />
            Import Audio URL
          </Button>
          <Button onClick={() => setAddDocOpen(true)} data-testid="button-add-document">
            <Plus className="w-4 h-4 mr-2" />
            Add Document
          </Button>
        </div>
      </div>

      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-violet-500/10 flex items-center justify-center shrink-0">
                  <FileText className="h-5 w-5 text-violet-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Documents</p>
                  <p className="text-2xl font-bold" data-testid="text-doc-count">{stats.totalDocuments}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                  <Layers className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Chunks</p>
                  <p className="text-2xl font-bold" data-testid="text-chunk-count">{stats.totalChunks}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <Hash className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tokens</p>
                  <p className="text-2xl font-bold" data-testid="text-token-count">{stats.totalTokens?.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                  <Database className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Cache Entries</p>
                  <p className="text-2xl font-bold" data-testid="text-cache-count">{stats.cacheEntries}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle>Documents</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => { fetchDocuments(); fetchStats(); }} data-testid="button-refresh-docs">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          ) : documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-3">
                <BookOpen className="w-6 h-6 text-muted-foreground/60" />
              </div>
              <p className="text-muted-foreground text-sm" data-testid="text-no-documents">
                No documents yet. Add your first document to give your AI agent knowledge.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-start justify-between gap-4 p-4 rounded-md border"
                  data-testid={`card-doc-${doc.id}`}
                >
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold truncate">{doc.title}</p>
                      <Badge
                        variant="default"
                        className={`no-default-hover-elevate ${getStatusBadgeClass(doc.status)}`}
                      >
                        {doc.status}
                      </Badge>
                      <Badge variant="outline" className="no-default-hover-elevate text-xs">
                        {doc.sourceType}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {doc.content.substring(0, 200)}
                      {doc.content.length > 200 ? "..." : ""}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{doc.chunkCount} chunks</span>
                      <span>{doc.content.length.toLocaleString()} chars</span>
                      <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {doc.status === "pending" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleProcessDocument(doc.id)}
                        disabled={processingId === doc.id}
                        data-testid={`button-process-${doc.id}`}
                      >
                        {processingId === doc.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteDocument(doc.id)}
                      disabled={deletingId === doc.id}
                      data-testid={`button-delete-${doc.id}`}
                    >
                      {deletingId === doc.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 text-red-500" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={addDocOpen} onOpenChange={setAddDocOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-violet-500" />
              Add Document
            </DialogTitle>
            <DialogDescription>
              Add a text document to your knowledge base. It will be processed and used by your AI agent.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="doc-title">Title</Label>
              <Input
                id="doc-title"
                placeholder="e.g., Company FAQ, Product Guide"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                data-testid="input-doc-title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="doc-content">Content</Label>
              <Textarea
                id="doc-content"
                placeholder="Paste your document content here..."
                value={docContent}
                onChange={(e) => setDocContent(e.target.value)}
                className="min-h-[200px]"
                data-testid="input-doc-content"
              />
              <p className="text-xs text-muted-foreground">{docContent.length.toLocaleString()} / 100,000 characters</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDocOpen(false)}>Cancel</Button>
            <Button
              onClick={handleAddDocument}
              disabled={submitting || !docTitle.trim() || !docContent.trim()}
              data-testid="button-submit-document"
            >
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Add & Process
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={importUrlOpen} onOpenChange={setImportUrlOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="w-5 h-5 text-blue-500" />
              Import Audio URLs
            </DialogTitle>
            <DialogDescription>
              Import audio files from URLs. They will be transcribed and added to your knowledge base.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="import-urls">Audio URLs (one per line)</Label>
              <Textarea
                id="import-urls"
                placeholder="https://example.com/audio1.mp3&#10;https://example.com/audio2.wav"
                value={importUrls}
                onChange={(e) => setImportUrls(e.target.value)}
                className="min-h-[150px]"
                data-testid="input-import-urls"
              />
              <p className="text-xs text-muted-foreground">Max 10 URLs per batch. Supported: MP3, WAV, OGG, FLAC, M4A</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportUrlOpen(false)}>Cancel</Button>
            <Button
              onClick={handleImportUrls}
              disabled={submitting || !importUrls.trim()}
              data-testid="button-submit-import"
            >
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Link2 className="w-4 h-4 mr-2" />}
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
