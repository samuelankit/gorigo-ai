"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/lib/use-toast";
import {
  Plus, Trash2, BookOpen, FileText, Loader2, Database, Zap, Link, Volume2,
} from "lucide-react";
import { useKnowledgeDocs, useRagStats, useUploadDocument, useDeleteDocument, useImportAudioUrls } from "@/hooks/use-knowledge";

export function KnowledgeTab() {
  const { toast } = useToast();
  const { data: knowledgeDocs = [], isLoading: loadingKnowledge } = useKnowledgeDocs();
  const { data: ragStats } = useRagStats();

  const [newDocTitle, setNewDocTitle] = useState("");
  const [newDocContent, setNewDocContent] = useState("");
  const [audioUrls, setAudioUrls] = useState("");
  const [knowledgeInputMode, setKnowledgeInputMode] = useState<"text" | "audio">("text");

  const uploadMutation = useUploadDocument();
  const deleteMutation = useDeleteDocument();
  const importMutation = useImportAudioUrls();

  const uploadDocument = async () => {
    if (!newDocTitle.trim() || !newDocContent.trim()) return;
    try {
      await uploadMutation.mutateAsync({ title: newDocTitle.trim(), content: newDocContent.trim(), sourceType: "text" });
      setNewDocTitle("");
      setNewDocContent("");
      toast({ title: "Document added", description: "Your document is being processed and will be ready shortly." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to upload document.", variant: "destructive" });
    }
  };

  const deleteDocument = async (id: number) => {
    try {
      await deleteMutation.mutateAsync(id);
      toast({ title: "Deleted", description: "Document removed from knowledge base." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete document.", variant: "destructive" });
    }
  };

  const importAudioUrls = async () => {
    const lines = audioUrls.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
    if (lines.length === 0) return;
    if (lines.length > 10) {
      toast({ title: "Too many URLs", description: "Maximum 10 URLs per batch.", variant: "destructive" });
      return;
    }
    try {
      const data = await importMutation.mutateAsync(lines);
      const { summary } = data;
      if (summary.errors > 0 && summary.success > 0) {
        toast({ title: "Partial success", description: `${summary.success} imported, ${summary.errors} failed.` });
      } else if (summary.errors > 0) {
        toast({ title: "Import failed", description: data.results.find((r: any) => r.error)?.error || "All imports failed.", variant: "destructive" });
      } else {
        toast({ title: "Audio imported", description: `${summary.success} audio file${summary.success > 1 ? "s" : ""} transcribed and added to knowledge base.` });
      }
      setAudioUrls("");
    } catch (error) {
      toast({ title: "Import error", description: error instanceof Error ? error.message : "Failed to import audio.", variant: "destructive" });
    }
  };

  return (
    <div className="mt-6 space-y-6">
      {ragStats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950">
                  <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-doc-count">{ragStats.totalDocuments}</p>
                  <p className="text-xs text-muted-foreground">Documents</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-950">
                  <Database className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-chunk-count">{ragStats.totalChunks}</p>
                  <p className="text-xs text-muted-foreground">Chunks</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-100 dark:bg-green-950">
                  <Zap className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-cache-entries">{ragStats.cacheEntries}</p>
                  <p className="text-xs text-muted-foreground">Cached</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950">
                  <Zap className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-cache-hit-rate">{ragStats.cacheHitRate}%</p>
                  <p className="text-xs text-muted-foreground">Hit Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-100 dark:bg-cyan-950">
              <BookOpen className="h-5 w-5 text-cyan-700 dark:text-cyan-300" />
            </div>
            <div>
              <CardTitle>Knowledge Base</CardTitle>
              <CardDescription>Add documents to train your AI agent. The system automatically chunks text, generates embeddings, and uses them to provide more accurate responses.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {loadingKnowledge ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : knowledgeDocs.length > 0 ? (
            <div className="space-y-3">
              {knowledgeDocs.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between gap-3 p-4 border rounded-md bg-muted/30">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {doc.sourceType === "audio_url" ? (
                      <Volume2 className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" data-testid={`text-doc-title-${doc.id}`}>{doc.title}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge
                          variant={doc.status === "ready" ? "default" : doc.status === "processing" || doc.status === "transcribing" ? "secondary" : doc.status === "error" ? "destructive" : "outline"}
                          className="text-xs"
                          data-testid={`badge-doc-status-${doc.id}`}
                        >
                          {(doc.status === "processing" || doc.status === "transcribing") && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                          {doc.status}
                        </Badge>
                        {doc.sourceType === "audio_url" && (
                          <Badge variant="outline" className="text-xs">
                            <Volume2 className="h-3 w-3 mr-1" />
                            audio
                          </Badge>
                        )}
                        {doc.chunkCount > 0 && (
                          <span className="text-xs text-muted-foreground">{doc.chunkCount} chunks</span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {new Date(doc.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => deleteDocument(doc.id)} data-testid={`button-delete-doc-${doc.id}`}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm" data-testid="text-no-docs">No documents in your knowledge base yet.</p>
              <p className="text-xs mt-1">Add documents below to improve your AI agent's responses.</p>
            </div>
          )}

          <Separator />

          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <h3 className="font-medium text-sm">Add to Knowledge Base</h3>
              <div className="flex gap-1">
                <Button
                  variant={knowledgeInputMode === "text" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setKnowledgeInputMode("text")}
                  data-testid="button-mode-text"
                >
                  <FileText className="h-4 w-4 mr-1" />
                  Text
                </Button>
                <Button
                  variant={knowledgeInputMode === "audio" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setKnowledgeInputMode("audio")}
                  data-testid="button-mode-audio"
                >
                  <Volume2 className="h-4 w-4 mr-1" />
                  Audio URL
                </Button>
              </div>
            </div>

            {knowledgeInputMode === "text" ? (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="docTitle" className="font-medium">Document Title</Label>
                  <Input
                    id="docTitle"
                    value={newDocTitle}
                    onChange={(e) => setNewDocTitle(e.target.value)}
                    placeholder="e.g., Product Catalog, Company Policies"
                    data-testid="input-doc-title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="docContent" className="font-medium">Content</Label>
                  <Textarea
                    id="docContent"
                    value={newDocContent}
                    onChange={(e) => setNewDocContent(e.target.value)}
                    rows={6}
                    placeholder="Paste your document content here. The system will automatically split it into chunks and generate vector embeddings for intelligent retrieval..."
                    data-testid="textarea-doc-content"
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={uploadDocument}
                  disabled={!newDocTitle.trim() || !newDocContent.trim() || uploadMutation.isPending}
                  data-testid="button-add-doc"
                >
                  {uploadMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                  {uploadMutation.isPending ? "Uploading..." : "Add Document"}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="audioUrls" className="font-medium">Audio URLs</Label>
                  <Textarea
                    id="audioUrls"
                    value={audioUrls}
                    onChange={(e) => setAudioUrls(e.target.value)}
                    rows={5}
                    placeholder={"Paste audio file URLs, one per line (max 10).\nSupported: MP3, WAV, MP4, M4A, WebM, OGG\n\nhttps://storage.example.com/call-recording-01.mp3\nhttps://s3.amazonaws.com/bucket/meeting-notes.wav"}
                    data-testid="textarea-audio-urls"
                  />
                  <p className="text-xs text-muted-foreground">
                    Audio files are fetched from your storage, transcribed using AI, then processed into the knowledge base. Max 100MB per file.
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={importAudioUrls}
                  disabled={!audioUrls.trim() || importMutation.isPending}
                  data-testid="button-import-audio"
                >
                  {importMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Link className="h-4 w-4 mr-1" />}
                  {importMutation.isPending ? "Importing & Transcribing..." : "Import Audio"}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
