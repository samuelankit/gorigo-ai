"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/lib/use-toast";
import {
  PhoneIncoming,
  PhoneOutgoing,
  Check,
  ChevronLeft,
  ChevronRight,
  Phone,
  PhoneOff,
  PhoneCall,
  Radio,
  Activity,
  ArrowRightLeft,
  Loader2,
  Smile,
  Frown,
  Meh,
  Star,
  Download,
  Tag,
  StickyNote,
  X,
  Plus,
  Play,
  Pause,
  Volume2,
  VolumeX,
  SkipBack,
  SkipForward,
  User,
  Bot,
  BarChart3,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Clock,
  Headphones,
  CircleDot,
  Zap,
  RefreshCw,
} from "lucide-react";
import { CustomIcon } from "@/components/ui/custom-icon";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend,
} from "recharts";

interface Call {
  id: number;
  direction: string;
  callerNumber: string;
  duration: number;
  status: string;
  summary: string;
  transcript: string;
  leadCaptured: boolean;
  leadName: string;
  leadEmail: string;
  leadPhone: string;
  createdAt: string;
  recordingUrl: string | null;
  callCost: number | null;
  currentState: string;
  turnCount: number;
  handoffTriggered: boolean;
  handoffReason: string | null;
  finalOutcome: string | null;
  twilioCallSid: string | null;
  connectedAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  sentimentScore: number | null;
  sentimentLabel: string | null;
  qualityScore: number | null;
  qualityBreakdown: Record<string, number> | null;
  csatPrediction: number | null;
  resolutionStatus: string | null;
  tags: string[];
  notes: string | null;
}

interface LiveActiveCall {
  id: number;
  direction: string;
  callerNumber: string;
  status: string;
  currentState: string;
  startedAt: string | null;
  connectedAt: string | null;
  agentId: number;
  turnCount: number;
  sentimentScore: number | null;
  sentimentLabel: string | null;
  twilioCallSid: string | null;
  handoffTriggered: boolean;
  agentName: string | null;
  agentType: string | null;
}

interface LiveRecentCall {
  id: number;
  direction: string;
  callerNumber: string;
  status: string;
  duration: number;
  finalOutcome: string | null;
  endedAt: string | null;
  agentName: string | null;
  qualityScore: string | null;
  sentimentLabel: string | null;
  leadCaptured: boolean;
}

interface LiveAgentStatus {
  id: number;
  name: string;
  agentType: string;
  status: string;
  activeCalls: number;
  isOnCall: boolean;
}

interface LiveTodayStats {
  totalToday: number;
  completedToday: number;
  activeNow: number;
  failedToday: number;
  totalMinutesToday: number;
  avgDurationToday: number;
  avgQualityToday: number;
  inboundToday: number;
  outboundToday: number;
}

interface LiveData {
  activeCalls: LiveActiveCall[];
  recentCompleted: LiveRecentCall[];
  todayStats: LiveTodayStats;
  agentStatus: LiveAgentStatus[];
  timestamp: string;
}

const PAGE_SIZE = 10;

function LiveDuration({ startedAt }: { startedAt: string }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = new Date(startedAt).getTime();
    const update = () => {
      setElapsed(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;
  return <span className="font-mono font-semibold">{m}:{s.toString().padStart(2, "0")}</span>;
}

function formatAudioTime(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function AudioPlayer({ src, callId }: { src: string; callId: number }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setCurrentTime(audio.currentTime);
    const onDur = () => setDuration(audio.duration || 0);
    const onEnd = () => setPlaying(false);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onDur);
    audio.addEventListener("ended", onEnd);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onDur);
      audio.removeEventListener("ended", onEnd);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    const bar = progressRef.current;
    if (!audio || !bar || !duration) return;
    const rect = bar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = pct * duration;
  };

  const skip = (delta: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(duration, audio.currentTime + delta));
  };

  const cycleRate = () => {
    const rates = [1, 1.25, 1.5, 2, 0.75];
    const idx = rates.indexOf(playbackRate);
    const next = rates[(idx + 1) % rates.length];
    setPlaybackRate(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="space-y-3" data-testid="audio-player">
      <audio ref={audioRef} src={src} preload="metadata" />
      <div
        ref={progressRef}
        className="relative h-2 bg-muted rounded-full cursor-pointer group"
        onClick={seek}
        data-testid="audio-progress-bar"
      >
        <div
          className="absolute inset-y-0 left-0 bg-blue-500 rounded-full transition-[width] duration-100"
          style={{ width: `${progress}%` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ left: `calc(${progress}% - 6px)` }}
        />
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" onClick={() => skip(-10)} data-testid="button-skip-back">
            <SkipBack className="w-4 h-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={togglePlay} data-testid="button-play-pause">
            {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
          <Button size="icon" variant="ghost" onClick={() => skip(10)} data-testid="button-skip-forward">
            <SkipForward className="w-4 h-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => {
            setMuted(!muted);
            if (audioRef.current) audioRef.current.muted = !muted;
          }} data-testid="button-mute">
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </Button>
        </div>
        <span className="text-xs font-mono text-muted-foreground" data-testid="text-audio-time">
          {formatAudioTime(currentTime)} / {formatAudioTime(duration)}
        </span>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={cycleRate} data-testid="button-playback-rate">
            {playbackRate}x
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => {
              const a = document.createElement("a");
              a.href = src;
              a.download = `call-${callId}-recording.mp3`;
              a.click();
            }}
            data-testid="button-download-recording"
          >
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

interface TranscriptEntry {
  speaker: "agent" | "caller" | "system";
  text: string;
  timestamp?: string;
}

function parseTranscript(raw: string): TranscriptEntry[] {
  if (!raw || !raw.trim()) return [];
  const lines = raw.split("\n").filter((l) => l.trim());
  const entries: TranscriptEntry[] = [];

  for (const line of lines) {
    const match = line.match(/^\[?(\d{1,2}:\d{2}(?::\d{2})?)\]?\s*[-:]?\s*(Agent|AI|Bot|Assistant|System|Caller|Customer|User|Human)\s*[:|-]\s*(.+)/i);
    if (match) {
      const [, ts, spk, text] = match;
      const speaker = /agent|ai|bot|assistant/i.test(spk) ? "agent" : /system/i.test(spk) ? "system" : "caller";
      entries.push({ speaker, text: text.trim(), timestamp: ts });
      continue;
    }
    const matchNoTs = line.match(/^(Agent|AI|Bot|Assistant|System|Caller|Customer|User|Human)\s*[:|-]\s*(.+)/i);
    if (matchNoTs) {
      const [, spk, text] = matchNoTs;
      const speaker = /agent|ai|bot|assistant/i.test(spk) ? "agent" : /system/i.test(spk) ? "system" : "caller";
      entries.push({ speaker, text: text.trim() });
      continue;
    }
    if (entries.length > 0) {
      entries[entries.length - 1].text += " " + line.trim();
    } else {
      entries.push({ speaker: "system", text: line.trim() });
    }
  }
  return entries;
}

function TranscriptViewer({ transcript }: { transcript: string }) {
  const entries = parseTranscript(transcript);

  if (entries.length === 0 || (entries.length === 1 && entries[0].speaker === "system")) {
    return (
      <div className="bg-muted rounded-md p-4 max-h-80 overflow-auto">
        <p className="text-sm text-muted-foreground whitespace-pre-wrap" data-testid="text-call-transcript">
          {transcript}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-80 overflow-auto pr-1" data-testid="transcript-viewer">
      {entries.map((entry, i) => (
        <div
          key={i}
          className={`flex gap-3 ${entry.speaker === "agent" ? "" : "flex-row-reverse"}`}
          data-testid={`transcript-entry-${i}`}
        >
          <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
            entry.speaker === "agent"
              ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
              : entry.speaker === "system"
              ? "bg-muted text-muted-foreground"
              : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          }`}>
            {entry.speaker === "agent" ? <Bot className="w-3.5 h-3.5" /> : entry.speaker === "system" ? <Radio className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
          </div>
          <div className={`max-w-[80%] ${entry.speaker === "agent" ? "" : "text-right"}`}>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs font-medium capitalize">{entry.speaker}</span>
              {entry.timestamp && (
                <span className="text-xs text-muted-foreground font-mono">{entry.timestamp}</span>
              )}
            </div>
            <div className={`text-sm rounded-lg px-3 py-2 inline-block ${
              entry.speaker === "agent"
                ? "bg-blue-500/10 text-foreground"
                : entry.speaker === "system"
                ? "bg-muted text-muted-foreground italic"
                : "bg-muted text-foreground"
            }`}>
              {entry.text}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function getFsmBadgeClass(state: string) {
  switch (state?.toUpperCase()) {
    case "GREETING":
      return "bg-sky-500/10 text-sky-600 dark:text-sky-400";
    case "INTENT_CAPTURE":
      return "bg-violet-500/10 text-violet-600 dark:text-violet-400";
    case "FAQ_RESPONSE":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
    case "LEAD_CAPTURE":
      return "bg-teal-500/10 text-teal-600 dark:text-teal-400";
    case "HANDOFF":
      return "bg-orange-500/10 text-orange-600 dark:text-orange-400";
    case "CLOSING":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
    case "NEGOTIATION":
      return "bg-pink-500/10 text-pink-600 dark:text-pink-400";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function getSentimentBadgeClass(label: string | null) {
  switch (label) {
    case "very_negative":
      return "bg-red-500/10 text-red-600 dark:text-red-400";
    case "negative":
      return "bg-orange-500/10 text-orange-600 dark:text-orange-400";
    case "neutral":
      return "bg-muted text-muted-foreground";
    case "positive":
      return "bg-green-500/10 text-green-600 dark:text-green-400";
    case "very_positive":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function getSentimentIcon(label: string | null) {
  switch (label) {
    case "very_negative":
    case "negative":
      return <Frown className="h-3 w-3 mr-1" />;
    case "positive":
    case "very_positive":
      return <Smile className="h-3 w-3 mr-1" />;
    default:
      return <Meh className="h-3 w-3 mr-1" />;
  }
}

function getQualityColor(score: number) {
  if (score > 80) return "text-green-600 dark:text-green-400";
  if (score >= 50) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

function getResolutionBadgeClass(status: string | null) {
  switch (status) {
    case "resolved":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
    case "escalated":
      return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400";
    case "unresolved":
      return "bg-red-500/10 text-red-600 dark:text-red-400";
    default:
      return "bg-muted text-muted-foreground";
  }
}

const QUALITY_BREAKDOWN_LABELS: Record<string, string> = {
  greeting: "Greeting",
  understanding: "Understanding",
  accuracy: "Accuracy",
  professionalism: "Professionalism",
  resolution: "Resolution",
  efficiency: "Efficiency",
};

export default function CallsPage() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [direction, setDirection] = useState("all");
  const [page, setPage] = useState(0);
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [liveData, setLiveData] = useState<LiveData | null>(null);
  const [liveLoading, setLiveLoading] = useState(true);
  const [liveError, setLiveError] = useState(false);

  const { toast } = useToast();
  const [outboundOpen, setOutboundOpen] = useState(false);
  const [outboundPhone, setOutboundPhone] = useState("");
  const [outboundLoading, setOutboundLoading] = useState(false);
  const [outboundResult, setOutboundResult] = useState<{ ok: boolean; message: string } | null>(null);

  const [editNotes, setEditNotes] = useState("");
  const [editTags, setEditTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [showAnalytics, setShowAnalytics] = useState(false);
  const [analytics, setAnalytics] = useState<{
    dailyTrends: { date: string; callCount: number; avgDuration: number; totalMinutes: number }[];
    outcomeBreakdown: { outcome: string; count: number }[];
    directionBreakdown: { direction: string; count: number }[];
    agentPerformance: { agentId: number; agentName: string; callCount: number; avgDuration: number; avgQuality: number; avgSentiment: number; leadsCapt: number }[];
    sentimentDistribution: { label: string; count: number }[];
  } | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const fetchCalls = (dir: string, offset: number) => {
    setLoading(true);
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: String(offset),
    });
    if (dir !== "all") {
      params.set("direction", dir);
    }
    fetch(`/api/calls?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.calls) setCalls(d.calls);
      })
      .catch((error) => { console.error("Fetch calls failed:", error); })
      .finally(() => setLoading(false));
  };

  const fetchLiveData = useCallback(() => {
    fetch("/api/calls/live")
      .then((r) => r.json())
      .then((d) => {
        if (d && !d.error) {
          setLiveData(d);
          setLiveError(false);
        }
      })
      .catch(() => setLiveError(true))
      .finally(() => setLiveLoading(false));
  }, []);

  useEffect(() => {
    fetchCalls(direction, page * PAGE_SIZE);
  }, [direction, page]);

  useEffect(() => {
    fetchLiveData();
    const interval = setInterval(fetchLiveData, 5000);
    return () => clearInterval(interval);
  }, [fetchLiveData]);

  useEffect(() => {
    if (showAnalytics && !analytics && !analyticsLoading) {
      setAnalyticsLoading(true);
      fetch("/api/calls/analytics")
        .then((r) => r.json())
        .then((d) => {
          if (d && !d.error) setAnalytics(d);
        })
        .catch((error) => { console.error("Fetch call analytics failed:", error); })
        .finally(() => setAnalyticsLoading(false));
    }
  }, [showAnalytics]);

  const handleDirectionChange = (val: string) => {
    setDirection(val);
    setPage(0);
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCost = (cost: number | null) => {
    if (cost === null || cost === undefined) return "-";
    return `£${cost.toFixed(2)}`;
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
      case "failed":
      case "missed":
        return "bg-red-500/10 text-red-600 dark:text-red-400";
      case "in-progress":
      case "in_progress":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
      default:
        return "";
    }
  };

  const handleOutboundCall = async () => {
    if (!outboundPhone.trim()) return;
    setOutboundLoading(true);
    setOutboundResult(null);
    try {
      const res = await fetch("/api/calls/outbound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: outboundPhone.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setOutboundResult({ ok: true, message: "Call initiated successfully." });
        setOutboundPhone("");
        setTimeout(() => {
          fetchCalls(direction, page * PAGE_SIZE);
          fetchLiveData();
        }, 2000);
      } else {
        setOutboundResult({ ok: false, message: data.error || "Failed to initiate call." });
      }
    } catch (error) {
      setOutboundResult({ ok: false, message: "Network error. Please try again." });
    } finally {
      setOutboundLoading(false);
    }
  };

  const handleSelectCall = (call: Call) => {
    setSelectedCall(call);
    setEditNotes(call.notes || "");
    setEditTags(Array.isArray(call.tags) ? call.tags : []);
    setNewTag("");
  };

  const handleSaveNotes = async () => {
    if (!selectedCall) return;
    setSavingNotes(true);
    try {
      const res = await fetch("/api/calls/notes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callId: selectedCall.id,
          notes: editNotes,
          tags: editTags,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      toast({ title: "Saved", description: "Notes and tags updated." });
      setSelectedCall({ ...selectedCall, notes: editNotes, tags: editTags });
      setCalls((prev) =>
        prev.map((c) => (c.id === selectedCall.id ? { ...c, notes: editNotes, tags: editTags } : c))
      );
    } catch (error) {
      toast({ title: "Error", description: "Failed to save notes.", variant: "destructive" });
    } finally {
      setSavingNotes(false);
    }
  };

  const handleAddTag = () => {
    const tag = newTag.trim().toLowerCase();
    if (tag && !editTags.includes(tag)) {
      setEditTags([...editTags, tag]);
      setNewTag("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setEditTags(editTags.filter((t) => t !== tag));
  };

  const handleExportCalls = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/export/calls");
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `calls_export_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "Export complete", description: "CSV file downloaded." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to export calls.", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-500/10">
            <CustomIcon name="vr-phone-mic" size={20} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2 flex-wrap" data-testid="text-calls-title">
              Call Centre
              {(liveData?.activeCalls?.length ?? 0) > 0 && (
                <Badge variant="default" className="no-default-hover-elevate bg-blue-500/10 text-blue-600 dark:text-blue-400" data-testid="badge-active-calls-count">
                  <Radio className="w-3 h-3 mr-1 animate-pulse" />
                  {liveData!.activeCalls.length} live
                </Badge>
              )}
            </h1>
            <p className="text-sm text-muted-foreground">Real-time monitoring and call history.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={handleExportCalls}
            disabled={exporting}
            data-testid="button-export-calls"
          >
            {exporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            Export CSV
          </Button>
          <Button
            onClick={() => {
              setOutboundOpen(true);
              setOutboundResult(null);
            }}
            data-testid="button-make-call"
          >
            <PhoneCall className="w-4 h-4 mr-2" />
            Make Call
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowAnalytics(!showAnalytics)}
            data-testid="button-toggle-analytics"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Analytics
            {showAnalytics ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
          </Button>
        </div>
      </div>

      {showAnalytics && (
        <div className="space-y-4" data-testid="section-call-analytics">
          {analyticsLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (<Skeleton key={i} className="h-64 w-full rounded-md" />))}
            </div>
          ) : analytics ? (
            <>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Call Volume (Last 30 Days)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics.dailyTrends.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center" data-testid="text-no-trends">No call data yet.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={analytics.dailyTrends}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} />
                        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                        <RechartsTooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", color: "hsl(var(--card-foreground))" }} />
                        <Area type="monotone" dataKey="callCount" stroke="hsl(221, 83%, 53%)" fill="hsl(221, 83%, 53%)" fillOpacity={0.15} name="Calls" />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Outcome Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {analytics.outcomeBreakdown.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">No data</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                          <Pie
                            data={analytics.outcomeBreakdown}
                            dataKey="count"
                            nameKey="outcome"
                            cx="50%"
                            cy="50%"
                            outerRadius={65}
                            innerRadius={35}
                            label={({ outcome, count }) => `${outcome}: ${count}`}
                            labelLine={false}
                          >
                            {analytics.outcomeBreakdown.map((_, idx) => (
                              <Cell key={idx} fill={["#3b82f6", "#22c55e", "#ef4444", "#f59e0b", "#8b5cf6", "#6366f1"][idx % 6]} />
                            ))}
                          </Pie>
                          <RechartsTooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Sentiment Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {analytics.sentimentDistribution.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">No data</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={analytics.sentimentDistribution}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                          <RechartsTooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))", color: "hsl(var(--card-foreground))" }} />
                          <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Calls" />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Direction Split</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {analytics.directionBreakdown.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">No data</p>
                    ) : (
                      <div className="space-y-3 py-4">
                        {analytics.directionBreakdown.map((item) => {
                          const total = analytics.directionBreakdown.reduce((s, i) => s + i.count, 0);
                          const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
                          return (
                            <div key={item.direction} className="space-y-1">
                              <div className="flex items-center justify-between gap-3 text-sm">
                                <div className="flex items-center gap-2">
                                  {item.direction === "inbound" ? <PhoneIncoming className="w-3.5 h-3.5 text-blue-500" /> : <PhoneOutgoing className="w-3.5 h-3.5 text-emerald-500" />}
                                  <span className="capitalize">{item.direction}</span>
                                </div>
                                <span className="text-muted-foreground">{item.count} ({pct}%)</span>
                              </div>
                              <Progress value={pct} className="h-1.5" />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {analytics.agentPerformance.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Agent Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Agent</TableHead>
                          <TableHead className="text-right">Calls</TableHead>
                          <TableHead className="text-right">Avg Duration</TableHead>
                          <TableHead className="text-right">Avg Quality</TableHead>
                          <TableHead className="text-right">Leads</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analytics.agentPerformance.map((agent) => (
                          <TableRow key={agent.agentId} data-testid={`row-agent-perf-${agent.agentId}`}>
                            <TableCell className="font-medium">{agent.agentName || `Agent #${agent.agentId}`}</TableCell>
                            <TableCell className="text-right">{agent.callCount}</TableCell>
                            <TableCell className="text-right text-muted-foreground">{Math.floor(agent.avgDuration / 60)}:{String(agent.avgDuration % 60).padStart(2, "0")}</TableCell>
                            <TableCell className="text-right">
                              {agent.avgQuality > 0 ? (
                                <Badge variant="secondary" className="no-default-hover-elevate">{Math.round(agent.avgQuality)}%</Badge>
                              ) : <span className="text-muted-foreground">-</span>}
                            </TableCell>
                            <TableCell className="text-right">{agent.leadsCapt}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">Failed to load analytics.</p>
          )}
        </div>
      )}

      {liveLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-md" />
          ))}
        </div>
      ) : liveData && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" data-testid="section-today-stats">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-500/10">
                  <Phone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-total-today">{liveData.todayStats.totalToday}</p>
                  <p className="text-xs text-muted-foreground">Calls Today</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-500/10">
                  <Clock className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-minutes-today">{liveData.todayStats.totalMinutesToday}</p>
                  <p className="text-xs text-muted-foreground">Minutes Used</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-violet-500/10">
                  <Zap className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-avg-quality">{liveData.todayStats.avgQualityToday > 0 ? `${liveData.todayStats.avgQualityToday}%` : "-"}</p>
                  <p className="text-xs text-muted-foreground">Avg Quality</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-red-500/10">
                  <PhoneOff className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-failed-today">{liveData.todayStats.failedToday}</p>
                  <p className="text-xs text-muted-foreground">Failed Calls</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    Live Calls
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                    </span>
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Auto-refreshes every 5s</span>
                    <Button size="icon" variant="ghost" onClick={fetchLiveData} data-testid="button-refresh-live">
                      <RefreshCw className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {liveData.activeCalls.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8">
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-3">
                        <Headphones className="w-6 h-6 text-muted-foreground/50" />
                      </div>
                      <p className="text-sm text-muted-foreground" data-testid="text-no-active-calls">No active calls right now</p>
                      <p className="text-xs text-muted-foreground/70 mt-1">Calls will appear here in real-time</p>
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {liveData.activeCalls.map((call) => (
                        <Card key={call.id} className="hover-elevate cursor-pointer" data-testid={`card-active-call-${call.id}`}>
                          <CardContent className="p-4 space-y-3">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-2">
                                <span className="relative flex h-2.5 w-2.5">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                                </span>
                                <span className="text-sm font-semibold">{call.callerNumber || "Unknown"}</span>
                              </div>
                              {call.startedAt && <LiveDuration startedAt={call.startedAt} />}
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="default" className={`no-default-hover-elevate ${getFsmBadgeClass(call.currentState)}`} data-testid={`badge-fsm-state-${call.id}`}>
                                {call.currentState || "UNKNOWN"}
                              </Badge>
                              <span className="text-xs text-muted-foreground">Turn {call.turnCount || 0}</span>
                              {call.handoffTriggered && (
                                <Badge variant="default" className="no-default-hover-elevate bg-orange-500/10 text-orange-600 dark:text-orange-400">
                                  <ArrowRightLeft className="h-3 w-3 mr-1" />
                                  Handoff
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <Badge variant="secondary" className="no-default-hover-elevate">
                                {call.direction === "inbound" ? <PhoneIncoming className="h-3 w-3 mr-1" /> : <PhoneOutgoing className="h-3 w-3 mr-1" />}
                                {call.direction}
                              </Badge>
                              {call.agentName && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Bot className="h-3 w-3" />
                                  {call.agentName}
                                </span>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {liveData.recentCompleted.length > 0 && (
                <Card>
                  <CardHeader className="space-y-0 pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <CircleDot className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      Recent Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {liveData.recentCompleted.map((call) => (
                        <div
                          key={call.id}
                          className="flex items-center justify-between gap-3 p-2.5 rounded-md hover-elevate cursor-pointer"
                          data-testid={`row-recent-call-${call.id}`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`flex items-center justify-center w-7 h-7 rounded-full flex-shrink-0 ${
                              call.status === "completed" ? "bg-emerald-500/10" : "bg-red-500/10"
                            }`}>
                              {call.status === "completed" ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              ) : (
                                <PhoneOff className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium">{call.callerNumber || "Unknown"}</span>
                                {call.agentName && (
                                  <span className="text-xs text-muted-foreground">{call.agentName}</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 flex-wrap mt-0.5">
                                <span className="text-xs text-muted-foreground">
                                  {call.duration > 0 ? `${Math.floor(call.duration / 60)}:${String(call.duration % 60).padStart(2, "0")}` : "0:00"}
                                </span>
                                {call.sentimentLabel && (
                                  <Badge variant="default" className={`no-default-hover-elevate text-[10px] py-0 h-4 ${getSentimentBadgeClass(call.sentimentLabel)}`}>
                                    {call.sentimentLabel.replace(/_/g, " ")}
                                  </Badge>
                                )}
                                {call.leadCaptured && (
                                  <Badge variant="default" className="no-default-hover-elevate text-[10px] py-0 h-4 bg-teal-500/10 text-teal-600 dark:text-teal-400">
                                    Lead
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {call.qualityScore && Number(call.qualityScore) > 0 && (
                              <span className={`text-xs font-semibold ${getQualityColor(Number(call.qualityScore))}`}>
                                {Math.round(Number(call.qualityScore))}%
                              </span>
                            )}
                            {call.endedAt && (
                              <span className="text-[10px] text-muted-foreground/70">
                                {new Date(call.endedAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader className="space-y-0 pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Bot className="w-4 h-4" />
                    Agent Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {liveData.agentStatus.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4" data-testid="text-no-agents">No agents configured</p>
                  ) : (
                    <div className="space-y-2">
                      {liveData.agentStatus.map((agent) => (
                        <div
                          key={agent.id}
                          className="flex items-center justify-between gap-3 p-2.5 rounded-md"
                          data-testid={`row-agent-status-${agent.id}`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0 ${
                              agent.isOnCall ? "bg-green-500/10" : agent.status === "active" ? "bg-blue-500/10" : "bg-muted"
                            }`}>
                              <Bot className={`w-4 h-4 ${
                                agent.isOnCall ? "text-green-600 dark:text-green-400" : agent.status === "active" ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground"
                              }`} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{agent.name}</p>
                              <p className="text-xs text-muted-foreground capitalize">{agent.agentType}</p>
                            </div>
                          </div>
                          <div className="flex-shrink-0">
                            {agent.isOnCall ? (
                              <Badge variant="default" className="no-default-hover-elevate bg-green-500/10 text-green-600 dark:text-green-400">
                                <Radio className="w-3 h-3 mr-1 animate-pulse" />
                                {agent.activeCalls} call{agent.activeCalls > 1 ? "s" : ""}
                              </Badge>
                            ) : agent.status === "active" ? (
                              <Badge variant="default" className="no-default-hover-elevate bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                Ready
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="no-default-hover-elevate">
                                {agent.status}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="space-y-0 pb-3">
                  <CardTitle className="text-base">Today Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <PhoneIncoming className="w-3.5 h-3.5 text-blue-500" />
                        <span className="text-sm">Inbound</span>
                      </div>
                      <span className="text-sm font-semibold" data-testid="text-inbound-today">{liveData.todayStats.inboundToday}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <PhoneOutgoing className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-sm">Outbound</span>
                      </div>
                      <span className="text-sm font-semibold" data-testid="text-outbound-today">{liveData.todayStats.outboundToday}</span>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-sm">Completed</span>
                      </div>
                      <span className="text-sm font-semibold" data-testid="text-completed-today">{liveData.todayStats.completedToday}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-sm">Avg Duration</span>
                      </div>
                      <span className="text-sm font-semibold" data-testid="text-avg-duration-today">
                        {liveData.todayStats.avgDurationToday > 0
                          ? `${Math.floor(liveData.todayStats.avgDurationToday / 60)}:${String(Math.round(liveData.todayStats.avgDurationToday % 60)).padStart(2, "0")}`
                          : "-"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}

      <Card>
        <CardHeader className="space-y-4">
          <CardTitle>Calls</CardTitle>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Input
              placeholder="Search by caller number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
              data-testid="input-search-calls"
            />
            <Select value={direction} onValueChange={handleDirectionChange}>
              <SelectTrigger className="w-full sm:w-40" data-testid="select-direction-filter">
                <SelectValue placeholder="Filter direction" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="inbound">Inbound</SelectItem>
                <SelectItem value="outbound">Outbound</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : calls.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-3">
                <PhoneOff className="w-6 h-6 text-muted-foreground/60" />
              </div>
              <p className="text-muted-foreground text-sm" data-testid="text-no-calls">
                No calls found.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date/Time</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead>Caller</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Sentiment</TableHead>
                  <TableHead>Quality</TableHead>
                  <TableHead>Lead</TableHead>
                  <TableHead>Summary</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calls.map((call) => (
                  <TableRow
                    key={call.id}
                    className="cursor-pointer"
                    onClick={() => handleSelectCall(call)}
                    data-testid={`row-call-${call.id}`}
                  >
                    <TableCell className="text-sm whitespace-nowrap">{formatTime(call.createdAt)}</TableCell>
                    <TableCell>
                      <Badge variant={call.direction === "inbound" ? "secondary" : "outline"} className="no-default-hover-elevate">
                        {call.direction === "inbound" ? (
                          <PhoneIncoming className="h-3 w-3 mr-1" />
                        ) : (
                          <PhoneOutgoing className="h-3 w-3 mr-1" />
                        )}
                        {call.direction}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{call.callerNumber || "Unknown"}</TableCell>
                    <TableCell className="text-sm">{formatDuration(call.duration || 0)}</TableCell>
                    <TableCell>
                      <Badge
                        variant="default"
                        className={`no-default-hover-elevate ${getStatusBadgeClass(call.status)}`}
                      >
                        {call.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{formatCost(call.callCost)}</TableCell>
                    <TableCell data-testid={`cell-sentiment-${call.id}`}>
                      {call.sentimentLabel ? (
                        <Badge variant="default" className={`no-default-hover-elevate ${getSentimentBadgeClass(call.sentimentLabel)}`}>
                          {getSentimentIcon(call.sentimentLabel)}
                          {call.sentimentLabel.replace(/_/g, " ")}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell data-testid={`cell-quality-${call.id}`}>
                      {call.qualityScore !== null && call.qualityScore !== undefined ? (
                        <span className={`text-sm font-semibold ${getQualityColor(call.qualityScore)}`}>
                          {call.qualityScore}/100
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {call.leadCaptured && <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
                    </TableCell>
                    <TableCell className="text-sm max-w-48 truncate">
                      {call.summary || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <div className="flex items-center justify-between gap-3 mt-6 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
              data-testid="button-prev-page"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground" data-testid="text-page-info">
              Page {page + 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={calls.length < PAGE_SIZE}
              onClick={() => setPage(page + 1)}
              data-testid="button-next-page"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedCall} onOpenChange={(open) => !open && setSelectedCall(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500/10">
                <Phone className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              Call Details
            </DialogTitle>
            <DialogDescription>
              {selectedCall ? formatTime(selectedCall.createdAt) : ""}
            </DialogDescription>
          </DialogHeader>
          {selectedCall && (
            <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-6 sm:grid-cols-4 text-sm">
                <div>
                  <span className="text-muted-foreground text-xs font-medium uppercase">Direction</span>
                  <p className="font-semibold capitalize mt-1 flex items-center gap-1">
                    {selectedCall.direction === "inbound" ? (
                      <PhoneIncoming className="h-4 w-4" />
                    ) : (
                      <PhoneOutgoing className="h-4 w-4" />
                    )}
                    {selectedCall.direction}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs font-medium uppercase">Duration</span>
                  <p className="font-semibold mt-1">{formatDuration(selectedCall.duration || 0)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs font-medium uppercase">Caller</span>
                  <p className="font-semibold mt-1">{selectedCall.callerNumber || "Unknown"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs font-medium uppercase">Status</span>
                  <p className="mt-1">
                    <Badge
                      variant="default"
                      className={`no-default-hover-elevate ${getStatusBadgeClass(selectedCall.status)}`}
                    >
                      {selectedCall.status}
                    </Badge>
                  </p>
                </div>
              </div>

              <Separator />
              <div className="grid grid-cols-2 gap-6 sm:grid-cols-4 text-sm">
                <div>
                  <span className="text-muted-foreground text-xs font-medium uppercase">FSM State</span>
                  <p className="mt-1">
                    <Badge variant="default" className={`no-default-hover-elevate ${getFsmBadgeClass(selectedCall.currentState)}`} data-testid="badge-detail-fsm-state">
                      {selectedCall.currentState || "N/A"}
                    </Badge>
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs font-medium uppercase">Outcome</span>
                  <p className="mt-1">
                    {selectedCall.finalOutcome ? (
                      <Badge variant="outline" className="no-default-hover-elevate" data-testid="badge-detail-outcome">
                        {selectedCall.finalOutcome}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs font-medium uppercase">Cost</span>
                  <p className="font-semibold mt-1" data-testid="text-detail-cost">{formatCost(selectedCall.callCost)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs font-medium uppercase">Turns</span>
                  <p className="font-semibold mt-1" data-testid="text-detail-turns">{selectedCall.turnCount || 0}</p>
                </div>
              </div>

              {(selectedCall.sentimentLabel !== null || selectedCall.qualityScore !== null || selectedCall.resolutionStatus !== null) && (
                <>
                  <Separator />
                  <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 text-sm">
                    <div>
                      <span className="text-muted-foreground text-xs font-medium uppercase">Sentiment</span>
                      <p className="mt-1 flex items-center gap-2" data-testid="detail-sentiment">
                        {selectedCall.sentimentLabel ? (
                          <>
                            <Badge variant="default" className={`no-default-hover-elevate ${getSentimentBadgeClass(selectedCall.sentimentLabel)}`} data-testid="badge-detail-sentiment">
                              {getSentimentIcon(selectedCall.sentimentLabel)}
                              {selectedCall.sentimentLabel.replace(/_/g, " ")}
                            </Badge>
                            {selectedCall.sentimentScore !== null && (
                              <span className="text-xs text-muted-foreground" data-testid="text-detail-sentiment-score">
                                ({selectedCall.sentimentScore.toFixed(2)})
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs font-medium uppercase">Quality Score</span>
                      <p className="mt-1 flex items-center gap-2" data-testid="detail-quality">
                        {selectedCall.qualityScore !== null && selectedCall.qualityScore !== undefined ? (
                          <>
                            <span className={`font-semibold ${getQualityColor(selectedCall.qualityScore)}`} data-testid="text-detail-quality-score">
                              {selectedCall.qualityScore}/100
                            </span>
                            {selectedCall.csatPrediction !== null && selectedCall.csatPrediction !== undefined && (
                              <span className="text-xs text-muted-foreground flex items-center gap-0.5" data-testid="text-detail-csat">
                                <Star className="h-3 w-3" />
                                {selectedCall.csatPrediction.toFixed(1)}/5
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs font-medium uppercase">Resolution</span>
                      <p className="mt-1" data-testid="detail-resolution">
                        {selectedCall.resolutionStatus ? (
                          <Badge variant="default" className={`no-default-hover-elevate ${getResolutionBadgeClass(selectedCall.resolutionStatus)}`} data-testid="badge-detail-resolution">
                            {selectedCall.resolutionStatus}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </p>
                    </div>
                  </div>
                </>
              )}

              {selectedCall.qualityBreakdown && Object.keys(selectedCall.qualityBreakdown).length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-3" data-testid="detail-quality-breakdown">
                    <p className="text-sm font-semibold">Quality Breakdown</p>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                      {Object.entries(QUALITY_BREAKDOWN_LABELS).map(([key, label]) => {
                        const score = selectedCall.qualityBreakdown?.[key];
                        if (score === undefined || score === null) return null;
                        return (
                          <div key={key} className="space-y-1" data-testid={`quality-breakdown-${key}`}>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs text-muted-foreground">{label}</span>
                              <span className="text-xs font-medium">{score}/10</span>
                            </div>
                            <Progress value={score * 10} className="h-2" />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {selectedCall.recordingUrl && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-sm font-semibold flex items-center gap-2">
                      <Volume2 className="h-4 w-4 text-blue-500" />
                      Recording
                    </p>
                    <AudioPlayer src={selectedCall.recordingUrl} callId={selectedCall.id} />
                  </div>
                </>
              )}

              {selectedCall.handoffTriggered && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-sm font-semibold flex items-center gap-2">
                      <ArrowRightLeft className="h-4 w-4 text-orange-500" />
                      Handoff Triggered
                    </p>
                    <p className="text-sm text-muted-foreground" data-testid="text-handoff-reason">
                      {selectedCall.handoffReason || "No reason recorded."}
                    </p>
                  </div>
                </>
              )}

              {selectedCall.leadCaptured && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-sm font-semibold">Lead Information</p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {selectedCall.leadName && (
                        <div>
                          <span className="text-muted-foreground text-xs">Name</span>
                          <p className="font-medium">{selectedCall.leadName}</p>
                        </div>
                      )}
                      {selectedCall.leadEmail && (
                        <div>
                          <span className="text-muted-foreground text-xs">Email</span>
                          <p className="font-medium">{selectedCall.leadEmail}</p>
                        </div>
                      )}
                      {selectedCall.leadPhone && (
                        <div>
                          <span className="text-muted-foreground text-xs">Phone</span>
                          <p className="font-medium">{selectedCall.leadPhone}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {selectedCall.summary && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-sm font-semibold">Summary</p>
                    <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-call-summary">
                      {selectedCall.summary}
                    </p>
                  </div>
                </>
              )}

              <Separator />
              <div className="space-y-3" data-testid="section-notes-tags">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <StickyNote className="h-4 w-4" />
                  Notes & Tags
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                    {editTags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="gap-1" data-testid={`badge-tag-${tag}`}>
                        {tag}
                        <button onClick={() => handleRemoveTag(tag)} className="ml-0.5" data-testid={`button-remove-tag-${tag}`}>
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                    <div className="flex items-center gap-1">
                      <Input
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTag())}
                        placeholder="Add tag..."
                        className="h-7 w-24 text-xs"
                        data-testid="input-new-tag"
                      />
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleAddTag} data-testid="button-add-tag">
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <Textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Add notes about this call..."
                    rows={3}
                    className="text-sm"
                    data-testid="textarea-notes"
                  />
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      onClick={handleSaveNotes}
                      disabled={savingNotes}
                      data-testid="button-save-notes"
                    >
                      {savingNotes ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Check className="w-3.5 h-3.5 mr-1.5" />}
                      Save
                    </Button>
                  </div>
                </div>
              </div>

              {selectedCall.transcript && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-sm font-semibold flex items-center gap-2">
                      <StickyNote className="h-4 w-4" />
                      Transcript
                    </p>
                    <TranscriptViewer transcript={selectedCall.transcript} />
                  </div>
                </>
              )}

              {selectedCall.twilioCallSid && (
                <>
                  <Separator />
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Twilio SID:</span>
                    <code className="bg-muted px-1.5 py-0.5 rounded text-xs" data-testid="text-twilio-sid">{selectedCall.twilioCallSid}</code>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={outboundOpen} onOpenChange={(open) => { setOutboundOpen(open); if (!open) setOutboundResult(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500/10">
                <PhoneCall className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              Make Outbound Call
            </DialogTitle>
            <DialogDescription>
              Enter the phone number to call. Your AI agent will handle the conversation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="outbound-phone">Phone Number</Label>
              <Input
                id="outbound-phone"
                placeholder="+44 7700 900000"
                value={outboundPhone}
                onChange={(e) => setOutboundPhone(e.target.value)}
                data-testid="input-outbound-phone"
              />
            </div>
            {outboundResult && (
              <p className={`text-sm ${outboundResult.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`} data-testid="text-outbound-result">
                {outboundResult.message}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOutboundOpen(false)} data-testid="button-cancel-outbound">
              Cancel
            </Button>
            <Button onClick={handleOutboundCall} disabled={outboundLoading || !outboundPhone.trim()} data-testid="button-confirm-outbound">
              {outboundLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Phone className="w-4 h-4 mr-2" />}
              Call
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
