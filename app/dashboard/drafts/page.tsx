"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  PhoneCall,
  Mail,
  MessageSquare,
  HelpCircle,
  Sparkles,
  Save,
  RefreshCw,
  Copy,
  Trash2,
  Upload,
  MoreVertical,
  Search,
  Filter,
  FileText,
  Volume2,
  AlertCircle,
  Loader2,
  Wand2,
  PenLine,
  Layers,
  History,
  Download,
  ClipboardCopy,
  ChevronDown,
  ChevronUp,
  Smartphone,
} from "lucide-react";
import { useToast } from "@/lib/use-toast";

const DRAFT_TYPES = [
  { value: "call_script", label: "Call Script", icon: PhoneCall, description: "Voice agent scripts" },
  { value: "email_template", label: "Email Template", icon: Mail, description: "Email communications" },
  { value: "sms_template", label: "SMS Template", icon: MessageSquare, description: "Text messages (160 chars)" },
  { value: "faq_answer", label: "FAQ Answer", icon: HelpCircle, description: "Agent FAQ responses" },
] as const;

const TONES = [
  { value: "professional", label: "Professional" },
  { value: "friendly", label: "Friendly" },
  { value: "concise", label: "Concise" },
  { value: "detailed", label: "Detailed" },
  { value: "empathetic", label: "Empathetic" },
] as const;

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "it", label: "Italian" },
  { value: "pt", label: "Portuguese" },
  { value: "nl", label: "Dutch" },
  { value: "ja", label: "Japanese" },
  { value: "zh", label: "Chinese" },
  { value: "ko", label: "Korean" },
  { value: "ar", label: "Arabic" },
  { value: "hi", label: "Hindi" },
] as const;

const TYPE_CHAR_LIMITS: Record<string, number> = {
  call_script: 1000,
  email_template: 3000,
  sms_template: 320,
  faq_answer: 700,
};

interface Draft {
  id: number;
  orgId: number;
  userId: number;
  type: string;
  title: string;
  content: string;
  prompt: string | null;
  status: string;
  tone: string | null;
  language: string | null;
  version: number;
  parentDraftId: number | null;
  qualityScore: number | null;
  metadata: Record<string, unknown> | null;
  publishedToAgentId: number | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Agent {
  id: number;
  name: string;
}

export default function SmartDraftsPage() {
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("create");
  const [selectedType, setSelectedType] = useState("call_script");
  const [prompt, setPrompt] = useState("");
  const [tone, setTone] = useState("professional");
  const [language, setLanguage] = useState("en");
  const [generatedContent, setGeneratedContent] = useState("");
  const [generatedTitle, setGeneratedTitle] = useState("");
  const [qualityScore, setQualityScore] = useState<number | null>(null);
  const [charCount, setCharCount] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refineFeedback, setRefineFeedback] = useState("");
  const [showRefine, setShowRefine] = useState(false);

  const [savedDrafts, setSavedDrafts] = useState<Draft[]>([]);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 });

  const [editingDraft, setEditingDraft] = useState<Draft | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editTitle, setEditTitle] = useState("");

  const [publishDialog, setPublishDialog] = useState<Draft | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<Draft | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [duplicating, setDuplicating] = useState<number | null>(null);

  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [bulkCount, setBulkCount] = useState(5);
  const [bulkTone, setBulkTone] = useState("professional");
  const [bulkLanguage, setBulkLanguage] = useState("en");

  const [ttsPlaying, setTtsPlaying] = useState(false);

  const [orgAgents, setOrgAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<number | undefined>(undefined);

  const [versionHistory, setVersionHistory] = useState<Draft[]>([]);
  const [versionDialog, setVersionDialog] = useState<Draft | null>(null);
  const [versionsLoading, setVersionsLoading] = useState(false);

  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    fetch("/api/agents")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.agents) {
          setOrgAgents(data.agents.map((a: Agent) => ({ id: a.id, name: a.name })));
        }
      })
      .catch((error) => { console.error("Fetch org agents for drafts failed:", error); });
  }, []);

  const fetchDrafts = useCallback(async () => {
    setDraftsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(pagination.page), limit: "20" });
      if (filterType !== "all") params.set("type", filterType);
      if (filterStatus !== "all") params.set("status", filterStatus);
      if (searchQuery) params.set("search", searchQuery);

      const res = await fetch(`/api/drafts?${params}`);
      if (res.ok) {
        const data = await res.json();
        setSavedDrafts(data.drafts || []);
        setPagination(prev => ({ ...prev, total: data.pagination.total, totalPages: data.pagination.totalPages }));
      }
    } catch (error) {
      console.error("Fetch drafts failed:", error);
    }
    setDraftsLoading(false);
  }, [filterType, filterStatus, searchQuery, pagination.page]);

  useEffect(() => {
    fetchDrafts();
  }, [fetchDrafts]);

  const handleSearchChange = (value: string) => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setSearchQuery(value);
      setPagination(prev => ({ ...prev, page: 1 }));
    }, 300);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    setGeneratedContent("");
    setQualityScore(null);

    try {
      const body: Record<string, unknown> = { type: selectedType, prompt, tone, language };
      if (showRefine && refineFeedback && generatedContent) {
        body.refineFeedback = refineFeedback;
        body.previousContent = generatedContent;
      }

      const res = await fetch("/api/drafts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        toast({ title: "Generation failed", description: err.error || "Failed to generate draft", variant: "destructive" });
        setGenerating(false);
        return;
      }

      const data = await res.json();
      setGeneratedContent(data.content);
      setGeneratedTitle(data.suggestedTitle || "");
      setQualityScore(data.qualityScore);
      setCharCount(data.charCount);
      setShowRefine(false);
      setRefineFeedback("");
      toast({ title: "Draft generated", description: `Quality: ${Math.round((data.qualityScore || 0) * 100)}%` });
    } catch {
      toast({ title: "Error", description: "Failed to generate draft. Please try again.", variant: "destructive" });
    }
    setGenerating(false);
  };

  const handleSave = async () => {
    if (!generatedContent) return;
    setSaving(true);
    try {
      const res = await fetch("/api/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: selectedType,
          title: generatedTitle || `Draft ${new Date().toLocaleDateString()}`,
          content: generatedContent,
          prompt,
          tone,
          language,
          qualityScore,
        }),
      });
      if (res.ok) {
        toast({ title: "Draft saved", description: "Your draft has been saved to the library." });
        setActiveTab("library");
        setGeneratedContent("");
        setPrompt("");
        setGeneratedTitle("");
        setQualityScore(null);
        fetchDrafts();
      } else {
        const err = await res.json();
        toast({ title: "Save failed", description: err.error || "Could not save draft", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to save draft", variant: "destructive" });
    }
    setSaving(false);
  };

  const handleUpdate = async () => {
    if (!editingDraft || !editContent) return;
    setSaving(true);
    try {
      const res = await fetch("/api/drafts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingDraft.id,
          title: editTitle,
          content: editContent,
        }),
      });
      if (res.ok) {
        toast({ title: "Draft updated", description: `Version ${editingDraft.version + 1} saved.` });
        setEditingDraft(null);
        fetchDrafts();
      } else {
        const err = await res.json();
        toast({ title: "Update failed", description: err.error || "Could not update draft", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to update draft", variant: "destructive" });
    }
    setSaving(false);
  };

  const handleDuplicate = async (id: number) => {
    setDuplicating(id);
    try {
      const res = await fetch("/api/drafts/duplicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        toast({ title: "Draft duplicated", description: "A copy has been created in your library." });
        fetchDrafts();
      } else {
        const err = await res.json();
        toast({ title: "Duplicate failed", description: err.error || "Could not duplicate draft", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to duplicate draft", variant: "destructive" });
    }
    setDuplicating(null);
  };

  const handleDelete = async () => {
    if (!deleteDialog) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/drafts?id=${deleteDialog.id}`, { method: "DELETE" });
      if (res.ok) {
        toast({ title: "Draft deleted", description: "The draft has been permanently removed." });
        setDeleteDialog(null);
        fetchDrafts();
      } else {
        const err = await res.json();
        toast({ title: "Delete failed", description: err.error || "Could not delete draft", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to delete draft", variant: "destructive" });
    }
    setDeleting(false);
  };

  const handlePublish = async () => {
    if (!publishDialog) return;
    setPublishing(true);
    try {
      const res = await fetch("/api/drafts/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draftId: publishDialog.id,
          ...(selectedAgentId ? { agentId: selectedAgentId } : {}),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "Published", description: data.message || "Draft published to agent." });
        setPublishDialog(null);
        setSelectedAgentId(undefined);
        fetchDrafts();
      } else {
        toast({ title: "Publish failed", description: data.error || "Failed to publish", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to publish draft", variant: "destructive" });
    }
    setPublishing(false);
  };

  const handleBulkFaq = async () => {
    setBulkGenerating(true);
    try {
      const res = await fetch("/api/drafts/bulk-faq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: bulkCount, tone: bulkTone, language: bulkLanguage }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "FAQs generated", description: data.message || `Generated ${data.count} FAQ drafts` });
        setActiveTab("library");
        setFilterType("faq_answer");
        fetchDrafts();
      } else {
        toast({ title: "Generation failed", description: data.error || "Failed to generate FAQs", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to generate FAQs", variant: "destructive" });
    }
    setBulkGenerating(false);
  };

  const handleTtsPreview = (text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      toast({ title: "Not supported", description: "Text-to-speech is not supported in this browser.", variant: "destructive" });
      return;
    }
    if (ttsPlaying) {
      window.speechSynthesis.cancel();
      setTtsPlaying(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.onend = () => setTtsPlaying(false);
    utterance.onerror = () => setTtsPlaying(false);
    setTtsPlaying(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleCopyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied", description: "Content copied to clipboard." });
    } catch {
      toast({ title: "Copy failed", description: "Could not copy to clipboard.", variant: "destructive" });
    }
  };

  const handleExport = (draft: Draft) => {
    const extension = draft.type === "email_template" ? "html" : "txt";
    let content = draft.content;
    if (draft.type === "email_template") {
      content = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${draft.title}</title></head><body>${draft.content.split("\n").map(l => `<p>${l}</p>`).join("")}</body></html>`;
    }
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${draft.title.replace(/[^a-zA-Z0-9]/g, "_")}.${extension}`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: `Draft exported as .${extension} file.` });
  };

  const handleViewVersions = async (draft: Draft) => {
    setVersionDialog(draft);
    setVersionsLoading(true);
    try {
      const res = await fetch(`/api/drafts?parentId=${draft.id}`);
      if (res.ok) {
        const data = await res.json();
        setVersionHistory(data.drafts || []);
      }
    } catch (error) {
      console.error("Fetch draft version history failed:", error);
    }
    setVersionsLoading(false);
  };

  const getTypeIcon = (type: string) => {
    const found = DRAFT_TYPES.find(t => t.value === type);
    if (!found) return FileText;
    return found.icon;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft": return <Badge variant="outline" data-testid={`badge-status-${status}`}>Draft</Badge>;
      case "published": return <Badge variant="default" data-testid={`badge-status-${status}`}>Published</Badge>;
      case "archived": return <Badge variant="secondary" data-testid={`badge-status-${status}`}>Archived</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const qualityLabel = (score: number | null) => {
    if (score === null) return null;
    if (score >= 0.7) return { label: "High", className: "text-emerald-600 dark:text-emerald-400" };
    if (score >= 0.4) return { label: "Medium", className: "text-amber-600 dark:text-amber-400" };
    return { label: "Low", className: "text-red-600 dark:text-red-400" };
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto" data-testid="page-smart-drafts">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Wand2 className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Smart Drafts</h1>
          <Badge variant="secondary">AI-Powered</Badge>
        </div>
        <p className="text-muted-foreground text-sm">
          Generate call scripts, emails, SMS templates, and FAQ answers grounded in your knowledge base.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList data-testid="tabs-drafts">
          <TabsTrigger value="create" data-testid="tab-create">
            <Sparkles className="h-4 w-4 mr-1.5" />
            Create
          </TabsTrigger>
          <TabsTrigger value="library" data-testid="tab-library">
            <Layers className="h-4 w-4 mr-1.5" />
            Library ({pagination.total})
          </TabsTrigger>
          <TabsTrigger value="bulk" data-testid="tab-bulk">
            <FileText className="h-4 w-4 mr-1.5" />
            Bulk FAQ
          </TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <PenLine className="h-4 w-4" />
                    Draft Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Draft Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      {DRAFT_TYPES.map(dt => {
                        const Icon = dt.icon;
                        const isSelected = selectedType === dt.value;
                        return (
                          <button
                            key={dt.value}
                            onClick={() => setSelectedType(dt.value)}
                            className={`flex items-center gap-2 p-3 rounded-md border text-left transition-colors ${
                              isSelected
                                ? "border-primary bg-primary/5"
                                : "border-border hover-elevate"
                            }`}
                            data-testid={`button-type-${dt.value}`}
                          >
                            <Icon className={`h-4 w-4 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                            <div>
                              <div className="text-sm font-medium">{dt.label}</div>
                              <div className="text-xs text-muted-foreground">{dt.description}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Tone</label>
                      <Select value={tone} onValueChange={setTone} data-testid="select-tone">
                        <SelectTrigger data-testid="select-tone-trigger">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TONES.map(t => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Language</label>
                      <Select value={language} onValueChange={setLanguage} data-testid="select-language">
                        <SelectTrigger data-testid="select-language-trigger">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LANGUAGES.map(l => (
                            <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">
                      {selectedType === "faq_answer" ? "Question to answer" : "Describe what you need"}
                    </label>
                    <Textarea
                      value={prompt}
                      onChange={e => setPrompt(e.target.value)}
                      placeholder={
                        selectedType === "call_script"
                          ? "e.g. A greeting script for new callers asking about our services"
                          : selectedType === "email_template"
                            ? "e.g. Follow-up email after a demo call with pricing info"
                            : selectedType === "sms_template"
                              ? "e.g. Appointment reminder with date and time placeholder"
                              : "e.g. What are your business hours?"
                      }
                      className="min-h-[100px]"
                      data-testid="input-prompt"
                    />
                  </div>

                  {showRefine && (
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Refinement Feedback</label>
                      <Textarea
                        value={refineFeedback}
                        onChange={e => setRefineFeedback(e.target.value)}
                        placeholder="e.g. Make it shorter, add a question at the end, mention the discount..."
                        className="min-h-[80px]"
                        data-testid="input-refine"
                      />
                    </div>
                  )}

                  <Button
                    onClick={handleGenerate}
                    disabled={generating || !prompt.trim()}
                    className="w-full"
                    data-testid="button-generate"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : showRefine ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refine Draft
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate Draft
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <Card className={generatedContent ? "" : "opacity-60"}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Preview
                    </CardTitle>
                    {qualityScore !== null && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">Quality:</span>
                        <span className={`text-xs font-medium ${qualityLabel(qualityScore)?.className}`}>
                          {Math.round(qualityScore * 100)}% {qualityLabel(qualityScore)?.label}
                        </span>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {generatedContent ? (
                    <div className="space-y-4">
                      <div>
                        <Input
                          value={generatedTitle}
                          onChange={e => setGeneratedTitle(e.target.value)}
                          placeholder="Draft title"
                          className="font-medium mb-3"
                          data-testid="input-title"
                        />

                        {selectedType === "email_template" ? (
                          <div className="border rounded-md p-4 bg-muted/30 space-y-2">
                            {generatedContent.split("\n").filter(l => l.trim()).map((line, i) => {
                              if (line.startsWith("Subject:")) {
                                return <div key={i} className="font-medium text-sm">{line}</div>;
                              }
                              return <p key={i} className="text-sm">{line}</p>;
                            })}
                          </div>
                        ) : selectedType === "sms_template" ? (
                          <div className="border rounded-md bg-muted/30 max-w-xs mx-auto">
                            <div className="bg-muted/50 rounded-t-md px-3 py-1.5 flex items-center gap-1.5">
                              <Smartphone className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground font-medium">SMS Preview</span>
                            </div>
                            <div className="p-3">
                              <div className="bg-primary/10 rounded-lg p-3 text-sm" data-testid="text-sms-preview">
                                {generatedContent}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="border rounded-md p-4 bg-muted/30">
                            <p className="text-sm whitespace-pre-wrap" data-testid="text-preview-content">
                              {generatedContent}
                            </p>
                          </div>
                        )}

                        <div className="flex items-center justify-between gap-2 mt-2 flex-wrap">
                          <span className={`text-xs ${
                            charCount > TYPE_CHAR_LIMITS[selectedType]
                              ? "text-red-500"
                              : "text-muted-foreground"
                          }`}>
                            {charCount}/{TYPE_CHAR_LIMITS[selectedType]} characters
                          </span>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopyToClipboard(generatedContent)}
                              data-testid="button-copy-preview"
                            >
                              <ClipboardCopy className="h-4 w-4 mr-1" />
                              Copy
                            </Button>
                            {selectedType === "call_script" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleTtsPreview(generatedContent)}
                                data-testid="button-tts-preview"
                              >
                                <Volume2 className="h-4 w-4 mr-1" />
                                {ttsPlaying ? "Stop" : "Listen"}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 flex-wrap">
                        <Button
                          onClick={handleSave}
                          disabled={saving}
                          data-testid="button-save-draft"
                        >
                          {saving ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4 mr-2" />
                          )}
                          Save as Draft
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setShowRefine(!showRefine)}
                          data-testid="button-refine"
                        >
                          <PenLine className="h-4 w-4 mr-1.5" />
                          Refine
                        </Button>
                        <Button
                          variant="outline"
                          onClick={handleGenerate}
                          disabled={generating}
                          data-testid="button-regenerate"
                        >
                          <RefreshCw className="h-4 w-4 mr-1.5" />
                          Regenerate
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <Sparkles className="h-8 w-8 mb-3 opacity-40" />
                      <p className="text-sm">Your generated draft will appear here</p>
                      <p className="text-xs mt-1">Select a type, describe what you need, and click Generate</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="library" className="mt-4 space-y-4">
          <div className="flex gap-2 flex-wrap items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title or content..."
                defaultValue={searchQuery}
                onChange={e => handleSearchChange(e.target.value)}
                className="pl-9"
                data-testid="input-search-drafts"
              />
            </div>
            <Select value={filterType} onValueChange={v => { setFilterType(v); setPagination(prev => ({ ...prev, page: 1 })); }}>
              <SelectTrigger className="w-[150px]" data-testid="select-filter-type">
                <Filter className="h-4 w-4 mr-1.5" />
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {DRAFT_TYPES.map(dt => (
                  <SelectItem key={dt.value} value={dt.value}>{dt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={v => { setFilterStatus(v); setPagination(prev => ({ ...prev, page: 1 })); }}>
              <SelectTrigger className="w-[130px]" data-testid="select-filter-status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {draftsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : savedDrafts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <FileText className="h-10 w-10 text-muted-foreground/40 mb-4" />
                <p className="font-medium mb-1">No drafts yet</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Create your first draft using the AI generator
                </p>
                <Button onClick={() => setActiveTab("create")} data-testid="button-create-first">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Create Draft
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {savedDrafts.map(draft => {
                const TypeIcon = getTypeIcon(draft.type);
                const qs = qualityLabel(draft.qualityScore);
                const isDuplicating = duplicating === draft.id;
                return (
                  <Card key={draft.id} className="hover-elevate" data-testid={`card-draft-${draft.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="p-2 rounded-md bg-muted shrink-0">
                            <TypeIcon className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <h3 className="font-medium text-sm truncate">{draft.title}</h3>
                              {getStatusBadge(draft.status)}
                              {draft.version > 1 && (
                                <Badge variant="outline" className="text-xs">v{draft.version}</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {draft.content}
                            </p>
                            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                              <span>{DRAFT_TYPES.find(t => t.value === draft.type)?.label || draft.type}</span>
                              {draft.tone && <span className="capitalize">{draft.tone}</span>}
                              {qs && (
                                <span className={qs.className}>
                                  Quality: {Math.round((draft.qualityScore || 0) * 100)}%
                                </span>
                              )}
                              <span>{new Date(draft.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {(draft.type === "faq_answer" || draft.type === "call_script") && draft.status !== "published" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPublishDialog(draft)}
                              data-testid={`button-publish-${draft.id}`}
                            >
                              <Upload className="h-3.5 w-3.5 mr-1" />
                              Publish
                            </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" data-testid={`button-more-${draft.id}`}>
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => {
                                setEditingDraft(draft);
                                setEditContent(draft.content);
                                setEditTitle(draft.title);
                              }}>
                                <PenLine className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDuplicate(draft.id)}
                                disabled={isDuplicating}
                              >
                                {isDuplicating ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <Copy className="h-4 w-4 mr-2" />
                                )}
                                Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleCopyToClipboard(draft.content)}>
                                <ClipboardCopy className="h-4 w-4 mr-2" />
                                Copy Content
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleExport(draft)}>
                                <Download className="h-4 w-4 mr-2" />
                                Export
                              </DropdownMenuItem>
                              {draft.version > 1 && (
                                <DropdownMenuItem onClick={() => handleViewVersions(draft)}>
                                  <History className="h-4 w-4 mr-2" />
                                  Version History
                                </DropdownMenuItem>
                              )}
                              {draft.type === "call_script" && (
                                <DropdownMenuItem onClick={() => handleTtsPreview(draft.content)}>
                                  <Volume2 className="h-4 w-4 mr-2" />
                                  Listen
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => setDeleteDialog(draft)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page <= 1}
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    data-testid="button-prev-page"
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    data-testid="button-next-page"
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="bulk" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Bulk FAQ Generation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Automatically generate FAQ answer drafts from your knowledge base. The AI will identify common topics and create factual answers grounded in your uploaded documents.
              </p>

              <div className="grid grid-cols-3 gap-4 max-w-lg">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Count</label>
                  <Select value={String(bulkCount)} onValueChange={v => setBulkCount(Number(v))}>
                    <SelectTrigger data-testid="select-bulk-count">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[3, 5, 7, 10].map(n => (
                        <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Tone</label>
                  <Select value={bulkTone} onValueChange={setBulkTone}>
                    <SelectTrigger data-testid="select-bulk-tone">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TONES.map(t => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Language</label>
                  <Select value={bulkLanguage} onValueChange={setBulkLanguage}>
                    <SelectTrigger data-testid="select-bulk-language">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map(l => (
                        <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-md bg-muted/50 text-sm">
                <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">
                  Requires a knowledge base with uploaded documents. Generated FAQ drafts can be reviewed and published individually.
                </span>
              </div>

              <Button
                onClick={handleBulkFaq}
                disabled={bulkGenerating}
                data-testid="button-bulk-generate"
              >
                {bulkGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating {bulkCount} FAQs...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate {bulkCount} FAQ Drafts
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!editingDraft} onOpenChange={open => !open && setEditingDraft(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Draft</DialogTitle>
            <DialogDescription>
              Editing creates a new version. Previous versions are preserved.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              placeholder="Draft title"
              data-testid="input-edit-title"
            />
            <Textarea
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              className="min-h-[200px]"
              data-testid="input-edit-content"
            />
            <div className="text-xs text-muted-foreground">
              {editContent.length}/{TYPE_CHAR_LIMITS[editingDraft?.type || "call_script"]} characters
              {editContent.length > TYPE_CHAR_LIMITS[editingDraft?.type || "call_script"] && (
                <span className="text-red-500 ml-2">
                  (exceeds limit by {editContent.length - TYPE_CHAR_LIMITS[editingDraft?.type || "call_script"]})
                </span>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingDraft(null)}>Cancel</Button>
            <Button
              onClick={handleUpdate}
              disabled={saving || editContent.length > TYPE_CHAR_LIMITS[editingDraft?.type || "call_script"]}
              data-testid="button-save-edit"
            >
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!publishDialog} onOpenChange={open => { if (!open) { setPublishDialog(null); setSelectedAgentId(undefined); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publish Draft to Agent</DialogTitle>
            <DialogDescription>
              {publishDialog?.type === "faq_answer"
                ? "This will add or update this FAQ answer in your agent's FAQ entries."
                : "This will set this script as your agent's greeting/opening script."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="p-3 border rounded-md bg-muted/30">
              <p className="text-sm font-medium mb-1">{publishDialog?.title}</p>
              <p className="text-sm text-muted-foreground line-clamp-3">{publishDialog?.content}</p>
            </div>
            {orgAgents.length > 1 && (
              <div>
                <label className="text-sm font-medium mb-1.5 block">Select Agent</label>
                <Select
                  value={selectedAgentId ? String(selectedAgentId) : "default"}
                  onValueChange={v => setSelectedAgentId(v === "default" ? undefined : Number(v))}
                >
                  <SelectTrigger data-testid="select-publish-agent">
                    <SelectValue placeholder="Select agent..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">First available agent</SelectItem>
                    {orgAgents.map(a => (
                      <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {publishDialog?.qualityScore !== null && publishDialog?.qualityScore !== undefined && publishDialog.qualityScore < 0.2 && (
              <div className="flex items-center gap-2 p-2 rounded-md bg-destructive/10 text-sm">
                <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                <span className="text-destructive">
                  Quality score ({Math.round(publishDialog.qualityScore * 100)}%) is below the 20% minimum for publishing.
                </span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPublishDialog(null); setSelectedAgentId(undefined); }}>Cancel</Button>
            <Button
              onClick={handlePublish}
              disabled={publishing || (publishDialog?.qualityScore !== null && publishDialog?.qualityScore !== undefined && publishDialog.qualityScore < 0.2)}
              data-testid="button-confirm-publish"
            >
              {publishing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              Publish to Agent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteDialog} onOpenChange={open => !open && setDeleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Draft</DialogTitle>
            <DialogDescription>
              This will permanently delete this draft and all its version history. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting} data-testid="button-confirm-delete">
              {deleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!versionDialog} onOpenChange={open => { if (!open) { setVersionDialog(null); setVersionHistory([]); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Version History</DialogTitle>
            <DialogDescription>
              Previous versions of &ldquo;{versionDialog?.title}&rdquo;
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {versionsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : versionHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No previous versions found.</p>
            ) : (
              versionHistory.map(ver => (
                <Card key={ver.id} data-testid={`card-version-${ver.id}`}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">v{ver.version}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(ver.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyToClipboard(ver.content)}
                        data-testid={`button-copy-version-${ver.id}`}
                      >
                        <ClipboardCopy className="h-3.5 w-3.5 mr-1" />
                        Copy
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-4 whitespace-pre-wrap">{ver.content}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
