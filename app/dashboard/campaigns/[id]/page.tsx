"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Globe,
  ArrowLeft,
  Play,
  Pause,
  Upload,
  Loader2,
  Phone,
  Clock,
  Users,
  Check,
  X,
  AlertTriangle,
  Ban,
  DollarSign,
  Languages,
  Settings,
  MapPin,
  Download,
  Share2,
  WifiOff,
  CircleDollarSign,
  Timer,
  TrendingUp,
  XCircle,
  SkipForward,
  CheckCircle2,
} from "lucide-react";
import { useToast } from "@/lib/use-toast";
import { apiRequest } from "@/components/query-provider";

interface CampaignDetail {
  id: number;
  name: string;
  description: string | null;
  agentId: number | null;
  status: string;
  totalContacts: number;
  completedCount: number;
  failedCount: number;
  answeredCount: number;
  optOutCount: number;
  convertedCount: number;
  countryCode: string | null;
  language: string | null;
  callingHoursStart: string | null;
  callingHoursEnd: string | null;
  callingTimezone: string | null;
  pacingCallsPerMinute: number;
  pacingMaxConcurrent: number;
  budgetCap: string | null;
  budgetSpent: string | null;
  dailySpendLimit: string | null;
  scheduledAt: string | null;
  createdAt: string;
  campaignType: string;
  script: string | null;
  scriptLanguage: string | null;
  pendingCount: number;
  validCount: number;
  invalidCount: number;
  dncBlockedCount: number;
  estimatedCost: string | null;
  lockedAmount: string | null;
  costCapReached: boolean;
  consentConfirmed: boolean;
  approvedAt: string | null;
  startedAt: string | null;
}

interface ProgressData {
  campaignId: number;
  status: string;
  totalContacts: number;
  completed: number;
  failed: number;
  skipped: number;
  pending: number;
  inProgress: number;
  progressPercent: number;
  budgetSpent: string;
  estimatedCost: string;
  lockedAmount: string;
  costCapReached: boolean;
  estimatedTimeRemainingMinutes: number | null;
}

interface Contact {
  id: number;
  phoneNumber: string;
  phoneNumberE164: string;
  contactName: string | null;
  contactEmail: string | null;
  countryCode: string | null;
  status: string;
  dncResult: string | null;
  callAttempts: number;
  attemptCount?: number;
  lastCallDisposition?: string | null;
  completedAt?: string | null;
  callDuration?: number | null;
  callCost?: string | null;
  createdAt: string;
}

interface ContactsResponse {
  contacts: Contact[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface ImportResult {
  imported: number;
  valid: number;
  invalid: number;
  dncBlocked: number;
  duplicatesSkipped: number;
}

const COUNTRIES = [
  { code: "GB", name: "United Kingdom", callingCode: "+44", timezone: "Europe/London" },
  { code: "US", name: "United States", callingCode: "+1", timezone: "America/New_York" },
  { code: "FR", name: "France", callingCode: "+33", timezone: "Europe/Paris" },
  { code: "DE", name: "Germany", callingCode: "+49", timezone: "Europe/Berlin" },
  { code: "IN", name: "India", callingCode: "+91", timezone: "Asia/Kolkata" },
  { code: "CA", name: "Canada", callingCode: "+1", timezone: "America/Toronto" },
  { code: "AU", name: "Australia", callingCode: "+61", timezone: "Australia/Sydney" },
  { code: "ES", name: "Spain", callingCode: "+34", timezone: "Europe/Madrid" },
  { code: "IT", name: "Italy", callingCode: "+39", timezone: "Europe/Rome" },
  { code: "NL", name: "Netherlands", callingCode: "+31", timezone: "Europe/Amsterdam" },
  { code: "JP", name: "Japan", callingCode: "+81", timezone: "Asia/Tokyo" },
  { code: "BR", name: "Brazil", callingCode: "+55", timezone: "America/Sao_Paulo" },
  { code: "MX", name: "Mexico", callingCode: "+52", timezone: "America/Mexico_City" },
  { code: "AE", name: "United Arab Emirates", callingCode: "+971", timezone: "Asia/Dubai" },
  { code: "SG", name: "Singapore", callingCode: "+65", timezone: "Asia/Singapore" },
  { code: "ZA", name: "South Africa", callingCode: "+27", timezone: "Africa/Johannesburg" },
  { code: "IE", name: "Ireland", callingCode: "+353", timezone: "Europe/Dublin" },
  { code: "SE", name: "Sweden", callingCode: "+46", timezone: "Europe/Stockholm" },
  { code: "CH", name: "Switzerland", callingCode: "+41", timezone: "Europe/Zurich" },
  { code: "PL", name: "Poland", callingCode: "+48", timezone: "Europe/Warsaw" },
];

function getCountryName(code: string | null): string {
  if (!code) return "-";
  const country = COUNTRIES.find((c) => c.code === code);
  return country ? country.name : code;
}

function getCampaignStatusBadge(status: string) {
  switch (status) {
    case "draft":
      return <Badge variant="outline" className="no-default-hover-elevate">{status}</Badge>;
    case "approved":
      return <Badge className="no-default-hover-elevate bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">{status}</Badge>;
    case "running":
    case "active":
      return <Badge className="no-default-hover-elevate bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">{status}</Badge>;
    case "paused":
      return <Badge className="no-default-hover-elevate bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20">{status}</Badge>;
    case "completed":
      return <Badge className="no-default-hover-elevate bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">{status}</Badge>;
    case "expired":
      return <Badge className="no-default-hover-elevate bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20">expired</Badge>;
    case "cancelled":
    case "archived":
      return <Badge variant="destructive" className="no-default-hover-elevate">{status}</Badge>;
    default:
      return <Badge variant="outline" className="no-default-hover-elevate">{status}</Badge>;
  }
}

function getContactStatusBadge(status: string) {
  switch (status) {
    case "completed":
    case "answered":
    case "valid":
      return <Badge className="no-default-hover-elevate bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">{status === "valid" ? "valid" : "answered"}</Badge>;
    case "no_answer":
      return <Badge variant="outline" className="no-default-hover-elevate">no answer</Badge>;
    case "failed":
    case "invalid":
      return <Badge variant="destructive" className="no-default-hover-elevate">{status}</Badge>;
    case "dnc_blocked":
    case "skipped":
      return <Badge className="no-default-hover-elevate bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20">{status === "dnc_blocked" ? "blocked" : "skipped"}</Badge>;
    case "cancelled":
      return <Badge variant="outline" className="no-default-hover-elevate text-muted-foreground">cancelled</Badge>;
    case "pending":
    case "queued":
      return <Badge variant="outline" className="no-default-hover-elevate">{status}</Badge>;
    case "in_progress":
    case "calling":
      return <Badge className="no-default-hover-elevate bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">in progress</Badge>;
    default:
      return <Badge variant="outline" className="no-default-hover-elevate">{status}</Badge>;
  }
}

function CircularProgress({ percent, size = 120, strokeWidth = 10 }: { percent: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="text-emerald-500 transition-all duration-500"
        />
      </svg>
      <span className="absolute text-xl font-bold text-foreground">{percent}%</span>
    </div>
  );
}

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const campaignId = params.id as string;

  const [contactsPage, setContactsPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [importText, setImportText] = useState("");
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [cancelSheetOpen, setCancelSheetOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [extendAmount, setExtendAmount] = useState("10");

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    setIsOnline(navigator.onLine);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const isActiveCampaign = (status?: string) =>
    status === "running" || status === "active" || status === "approved";

  const { data: campaign, isLoading: loading } = useQuery<CampaignDetail>({
    queryKey: ["/api/campaigns", campaignId],
    queryFn: () => apiRequest(`/api/campaigns/${campaignId}`, { method: "GET" }),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (isActiveCampaign(status)) return 10000;
      return 30000;
    },
    enabled: !!campaignId,
  });

  const { data: progress, isLoading: progressLoading } = useQuery<ProgressData>({
    queryKey: ["/api/campaigns", campaignId, "progress"],
    queryFn: () => apiRequest(`/api/campaigns/${campaignId}/progress`, { method: "GET" }),
    refetchInterval: (query) => {
      if (isActiveCampaign(campaign?.status)) return 10000;
      return 30000;
    },
    enabled: !!campaignId,
  });

  const statusParam = statusFilter !== "all" ? `&status=${statusFilter}` : "";
  const { data: contactsData, isLoading: contactsLoading } = useQuery<ContactsResponse>({
    queryKey: ["/api/campaigns", campaignId, "contacts", contactsPage, statusFilter],
    queryFn: () => apiRequest(`/api/campaigns/${campaignId}/contacts?page=${contactsPage}&limit=50${statusParam}`, { method: "GET" }),
    enabled: !!campaignId,
  });

  const contacts = contactsData?.contacts ?? [];
  const contactsTotalPages = contactsData?.totalPages ?? 1;
  const contactsTotalCount = contactsData?.totalCount ?? 0;

  const pauseMutation = useMutation({
    mutationFn: () => apiRequest(`/api/campaigns/${campaignId}/pause`, {
      method: "POST",
      body: JSON.stringify({ reason: "Manually paused" }),
    }),
    onSuccess: () => {
      toast({ title: "Campaign Paused", description: "Your campaign has been paused." });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns", campaignId, "progress"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message || "Failed to pause campaign", variant: "destructive" });
    },
  });

  const resumeMutation = useMutation({
    mutationFn: () => apiRequest(`/api/campaigns/${campaignId}/resume`, { method: "POST" }),
    onSuccess: () => {
      toast({ title: "Campaign Resumed", description: "Your campaign is running again." });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns", campaignId, "progress"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message || "Failed to resume campaign", variant: "destructive" });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => apiRequest(`/api/campaigns/${campaignId}`, {
      method: "DELETE",
    }),
    onSuccess: () => {
      toast({ title: "Campaign Cancelled", description: "Locked funds have been returned to your wallet." });
      setCancelSheetOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns", campaignId, "progress"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message || "Failed to cancel campaign", variant: "destructive" });
    },
  });

  const extendMutation = useMutation({
    mutationFn: (additionalAmount: number) => apiRequest(`/api/campaigns/${campaignId}/extend`, {
      method: "POST",
      body: JSON.stringify({ additionalAmount }),
    }),
    onSuccess: () => {
      toast({ title: "Funds Added", description: "Additional funds locked and campaign resumed." });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns", campaignId, "progress"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message || "Failed to add funds. Your balance may have changed.", variant: "destructive" });
    },
  });

  const completeMutation = useMutation({
    mutationFn: () => apiRequest(`/api/campaigns/${campaignId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: "completed" }),
    }),
    onSuccess: () => {
      toast({ title: "Campaign Completed", description: "Excess locked funds have been returned to your wallet." });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns", campaignId, "progress"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message || "Failed to complete campaign", variant: "destructive" });
    },
  });

  const statusChangeMutation = useMutation({
    mutationFn: ({ status, reason }: { status: string; reason?: string }) =>
      apiRequest(`/api/campaigns/${campaignId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status, ...(reason ? { reason } : {}) }),
      }),
    onSuccess: (_, variables) => {
      toast({ title: "Status Updated", description: `Campaign status changed to "${variables.status}".` });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns", campaignId, "progress"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message || "Failed to update status", variant: "destructive" });
    },
  });

  const importMutation = useMutation({
    mutationFn: (contactsPayload: Array<{ phone: string; name?: string; email?: string }>) =>
      apiRequest(`/api/campaigns/${campaignId}/contacts/import`, {
        method: "POST",
        body: JSON.stringify({ contacts: contactsPayload }),
      }),
    onSuccess: (result: any) => {
      setImportResult({
        imported: result.imported,
        valid: result.valid,
        invalid: result.invalid,
        dncBlocked: result.dncBlocked,
        duplicatesSkipped: result.duplicatesSkipped,
      });
      setImportText("");
      toast({ title: "Import Complete", description: `${result.imported} contacts imported.` });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns", campaignId, "contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns", campaignId, "progress"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message || "Failed to import contacts", variant: "destructive" });
    },
  });

  const handleImport = () => {
    const lines = importText.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
    if (lines.length === 0) {
      toast({ title: "Validation Error", description: "Please enter at least one phone number", variant: "destructive" });
      return;
    }
    const contactsPayload = lines.map((line) => {
      const parts = line.split(",").map((p) => p.trim());
      return { phone: parts[0], name: parts[1] || undefined, email: parts[2] || undefined };
    });
    importMutation.mutate(contactsPayload);
  };

  const handleExport = async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        const res = await fetch(`/api/campaigns/${campaignId}/export`);
        const csvText = await res.text();
        const blob = new Blob([csvText], { type: "text/csv" });
        const file = new File([blob], `campaign-${campaignId}-results.csv`, { type: "text/csv" });
        await navigator.share({ files: [file], title: `Campaign ${campaign?.name} Results` });
      } else {
        window.open(`/api/campaigns/${campaignId}/export`, "_blank");
      }
    } catch {
      window.open(`/api/campaigns/${campaignId}/export`, "_blank");
    }
  };

  const handleFilterChange = (value: string) => {
    setStatusFilter(value);
    setContactsPage(1);
  };

  const anyActionPending = pauseMutation.isPending || resumeMutation.isPending ||
    cancelMutation.isPending || extendMutation.isPending || completeMutation.isPending ||
    statusChangeMutation.isPending;

  const showProgress = campaign && (
    isActiveCampaign(campaign.status) ||
    campaign.status === "paused" ||
    campaign.status === "completed" ||
    campaign.status === "cancelled"
  );

  const budgetSpent = parseFloat(progress?.budgetSpent || campaign?.budgetSpent || "0");
  const estimatedCost = parseFloat(progress?.estimatedCost || campaign?.estimatedCost || "0");
  const lockedAmount = parseFloat(progress?.lockedAmount || campaign?.lockedAmount || "0");
  const costCapReached = progress?.costCapReached || campaign?.costCapReached || false;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="py-6">
                <Skeleton className="h-7 w-16" />
                <Skeleton className="h-4 w-24 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="space-y-6">
        <Link href="/dashboard/campaigns">
          <Button variant="ghost" size="sm" data-testid="button-back-campaigns">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Campaigns
          </Button>
        </Link>
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground" data-testid="text-campaign-not-found">Campaign not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 lg:pb-6">
      {!isOnline && (
        <Card className="border-amber-300 dark:border-amber-700" data-testid="card-offline-banner">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <WifiOff className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">You're offline</p>
                <p className="text-xs text-muted-foreground">Showing last known data. Progress will auto-refresh when you reconnect.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {campaign.status === "expired" && (
        <Card className="border-orange-300 dark:border-orange-700" data-testid="card-expired-banner">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400 shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Campaign Expired</p>
                <p className="text-xs text-muted-foreground">This campaign didn't start within 24 hours. Funds have been returned to your wallet.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {costCapReached && (campaign.status === "paused" || campaign.status === "running") && (
        <Card className="border-amber-300 dark:border-amber-700" data-testid="card-cost-cap-banner">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <CircleDollarSign className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Cost Cap Reached</p>
                  <p className="text-sm text-muted-foreground">
                    Your campaign has used {"\u00A3"}{budgetSpent.toFixed(2)} of {"\u00A3"}{lockedAmount.toFixed(2)} locked. Approve additional funds to continue.
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={extendAmount}
                      onChange={(e) => setExtendAmount(e.target.value)}
                      className="w-24"
                      min="1"
                      step="1"
                      data-testid="input-extend-amount"
                    />
                    <Button
                      onClick={() => extendMutation.mutate(parseFloat(extendAmount) || 10)}
                      disabled={anyActionPending}
                      data-testid="button-extend-funds"
                    >
                      {extendMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <TrendingUp className="h-4 w-4 mr-2" />}
                      Add & Continue
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => completeMutation.mutate()}
                    disabled={anyActionPending}
                    data-testid="button-complete-now"
                  >
                    {completeMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                    Complete Campaign Now
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <Link href="/dashboard/campaigns">
            <Button variant="ghost" size="icon" data-testid="button-back-campaigns">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-foreground" data-testid="text-campaign-name">{campaign.name}</h1>
              {getCampaignStatusBadge(campaign.status)}
            </div>
            {campaign.description && (
              <p className="text-sm text-muted-foreground mt-1">{campaign.description}</p>
            )}
          </div>
        </div>
        <div className="hidden lg:flex items-center gap-2 flex-wrap">
          {(campaign.status === "completed" || campaign.status === "cancelled") && (
            <Button variant="outline" onClick={handleExport} data-testid="button-export-results">
              <Download className="h-4 w-4 mr-2" />
              Download Results
            </Button>
          )}
          {campaign.status === "draft" && (
            <Button
              onClick={() => statusChangeMutation.mutate({ status: "active" })}
              disabled={anyActionPending}
              data-testid="button-start-campaign"
            >
              {statusChangeMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
              Start Campaign
            </Button>
          )}
          {(campaign.status === "running" || campaign.status === "active") && (
            <Button
              variant="outline"
              onClick={() => pauseMutation.mutate()}
              disabled={anyActionPending}
              data-testid="button-pause-campaign"
            >
              {pauseMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Pause className="h-4 w-4 mr-2" />}
              Pause
            </Button>
          )}
          {campaign.status === "paused" && !costCapReached && (
            <Button
              onClick={() => resumeMutation.mutate()}
              disabled={anyActionPending}
              data-testid="button-resume-campaign"
            >
              {resumeMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
              Resume
            </Button>
          )}
          {(campaign.status === "running" || campaign.status === "active" || campaign.status === "paused") && (
            <Button
              variant="destructive"
              onClick={() => setCancelSheetOpen(true)}
              disabled={anyActionPending}
              data-testid="button-cancel-campaign"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          )}
          {(campaign.status === "draft" || campaign.status === "paused") && !isActiveCampaign(campaign.status) && campaign.status !== "running" && (
            <Button
              variant="destructive"
              onClick={() => cancelMutation.mutate()}
              disabled={anyActionPending}
              data-testid="button-archive-campaign"
            >
              <Ban className="h-4 w-4 mr-2" />
              Archive
            </Button>
          )}
        </div>
      </div>

      {showProgress && progress && (
        <div className="space-y-4">
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-[auto_1fr]">
            <Card className="flex items-center justify-center p-6 lg:hidden" data-testid="card-circular-progress">
              <div className="flex flex-col items-center gap-2">
                <CircularProgress percent={progress.progressPercent} />
                <p className="text-sm text-muted-foreground mt-1" data-testid="text-progress-count">
                  {progress.completed + progress.failed + progress.skipped} of {progress.totalContacts} contacts
                </p>
                {progress.estimatedTimeRemainingMinutes !== null && progress.estimatedTimeRemainingMinutes > 0 && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Timer className="h-3 w-3" />
                    <span data-testid="text-time-remaining">~{progress.estimatedTimeRemainingMinutes} min remaining</span>
                  </div>
                )}
              </div>
            </Card>

            <Card className="hidden lg:block" data-testid="card-bar-progress">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm font-medium text-foreground" data-testid="text-progress-label">
                    {progress.completed + progress.failed + progress.skipped} of {progress.totalContacts} contacts processed
                  </p>
                  <p className="text-sm font-bold text-foreground">{progress.progressPercent}%</p>
                </div>
                <Progress value={progress.progressPercent} className="h-3" data-testid="progress-bar" />
                {progress.estimatedTimeRemainingMinutes !== null && progress.estimatedTimeRemainingMinutes > 0 && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Timer className="h-3 w-3" />
                    <span data-testid="text-time-remaining-desktop">~{progress.estimatedTimeRemainingMinutes} minutes remaining</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 lg:col-span-2">
              <Card className="bg-emerald-500/5 dark:bg-emerald-500/10" data-testid="card-stat-completed">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <p className="text-xs font-medium text-muted-foreground">Completed</p>
                  </div>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400" data-testid="text-progress-completed">{progress.completed}</p>
                </CardContent>
              </Card>
              <Card className="bg-red-500/5 dark:bg-red-500/10" data-testid="card-stat-failed">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <p className="text-xs font-medium text-muted-foreground">Failed</p>
                  </div>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400" data-testid="text-progress-failed">{progress.failed}</p>
                </CardContent>
              </Card>
              <Card className="bg-amber-500/5 dark:bg-amber-500/10" data-testid="card-stat-skipped">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <SkipForward className="h-4 w-4 text-amber-500" />
                    <p className="text-xs font-medium text-muted-foreground">Skipped</p>
                  </div>
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400" data-testid="text-progress-skipped">{progress.skipped}</p>
                </CardContent>
              </Card>
              <Card data-testid="card-stat-pending">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <p className="text-xs font-medium text-muted-foreground">Pending</p>
                  </div>
                  <p className="text-2xl font-bold text-foreground" data-testid="text-progress-pending">{progress.pending}</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {(estimatedCost > 0 || lockedAmount > 0) && (
            <Card data-testid="card-cost-tracker">
              <CardContent className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Estimated</p>
                    <p className="text-lg font-bold text-foreground" data-testid="text-cost-estimated">{"\u00A3"}{estimatedCost.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Spent</p>
                    <p className="text-lg font-bold text-foreground" data-testid="text-cost-spent">{"\u00A3"}{budgetSpent.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Locked</p>
                    <p className="text-lg font-bold text-foreground" data-testid="text-cost-locked">{"\u00A3"}{lockedAmount.toFixed(2)}</p>
                  </div>
                </div>
                {lockedAmount > 0 && (
                  <div className="mt-3">
                    <Progress
                      value={lockedAmount > 0 ? Math.min((budgetSpent / lockedAmount) * 100, 100) : 0}
                      className="h-2"
                      data-testid="progress-cost"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {lockedAmount > 0 ? Math.round((budgetSpent / lockedAmount) * 100) : 0}% of locked funds used
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {!showProgress && (
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Contacts</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-stat-total-contacts">{campaign.totalContacts || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Valid / Ready</CardTitle>
              <Check className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400" data-testid="text-stat-valid-contacts">{campaign.validCount || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">DNC Blocked</CardTitle>
              <Ban className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400" data-testid="text-stat-dnc-blocked">{campaign.dncBlockedCount || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Invalid</CardTitle>
              <X className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400" data-testid="text-stat-invalid-contacts">{campaign.invalidCount || 0}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Campaign Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-start gap-2">
              <Globe className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Country</p>
                <p className="text-sm font-medium" data-testid="text-detail-country">{getCountryName(campaign.countryCode)}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Languages className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Language</p>
                <p className="text-sm font-medium" data-testid="text-detail-language">{campaign.language || "-"}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Clock className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Calling Hours</p>
                <p className="text-sm font-medium" data-testid="text-detail-calling-hours">
                  {campaign.callingHoursStart && campaign.callingHoursEnd
                    ? `${campaign.callingHoursStart} - ${campaign.callingHoursEnd}`
                    : "-"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Timezone</p>
                <p className="text-sm font-medium" data-testid="text-detail-timezone">{campaign.callingTimezone || "-"}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Settings className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Pacing</p>
                <p className="text-sm font-medium" data-testid="text-detail-pacing">
                  {campaign.pacingCallsPerMinute || 5} calls/min, {campaign.pacingMaxConcurrent || 3} concurrent
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <DollarSign className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Budget</p>
                <p className="text-sm font-medium" data-testid="text-detail-budget">
                  {campaign.budgetCap
                    ? `${"\u00A3"}${parseFloat(campaign.budgetSpent || "0").toFixed(2)} / ${"\u00A3"}${parseFloat(campaign.budgetCap).toFixed(2)}`
                    : estimatedCost > 0 ? `Est. ${"\u00A3"}${estimatedCost.toFixed(2)}` : "No limit"}
                  {campaign.dailySpendLimit && (
                    <span className="text-muted-foreground"> (daily: {"\u00A3"}{parseFloat(campaign.dailySpendLimit).toFixed(2)})</span>
                  )}
                </p>
              </div>
            </div>
          </div>
          {campaign.script && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex items-start gap-2">
                <Phone className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground mb-1">Script</p>
                  <p className="text-sm whitespace-pre-wrap bg-muted/50 rounded-md p-3" data-testid="text-detail-script">
                    {campaign.script}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="contacts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="contacts" data-testid="tab-contacts">Contact List</TabsTrigger>
          <TabsTrigger value="import" data-testid="tab-import">Import Contacts</TabsTrigger>
        </TabsList>

        <TabsContent value="contacts" className="space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground">Filter:</Label>
              <Select value={statusFilter} onValueChange={handleFilterChange}>
                <SelectTrigger className="w-[140px]" data-testid="select-contact-status-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="valid">Valid</SelectItem>
                  <SelectItem value="completed">Answered</SelectItem>
                  <SelectItem value="no_answer">No Answer</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="invalid">Invalid</SelectItem>
                  <SelectItem value="dnc_blocked">Blocked</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground" data-testid="text-contacts-count">
              {contactsTotalCount} contact{contactsTotalCount !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="block lg:hidden space-y-3" data-testid="contact-cards-mobile">
            {contactsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-md" />
                ))}
              </div>
            ) : contacts.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Users className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground" data-testid="text-no-contacts-mobile">No contacts found.</p>
                </CardContent>
              </Card>
            ) : (
              contacts.map((contact) => (
                <Card key={contact.id} data-testid={`card-contact-${contact.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate" data-testid={`text-contact-name-${contact.id}`}>
                          {contact.contactName || "Unknown"}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono" data-testid={`text-contact-phone-${contact.id}`}>
                          {contact.phoneNumberE164 || contact.phoneNumber || "No phone"}
                        </p>
                      </div>
                      <div data-testid={`badge-contact-status-${contact.id}`}>
                        {getContactStatusBadge(contact.status)}
                      </div>
                    </div>
                    {(contact.callDuration !== undefined || contact.callCost) && (
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        {contact.callDuration !== undefined && contact.callDuration !== null && (
                          <span>{Math.floor(contact.callDuration / 60)}m {contact.callDuration % 60}s</span>
                        )}
                        {contact.callCost && (
                          <span>{"\u00A3"}{parseFloat(contact.callCost).toFixed(2)}</span>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          <Card className="hidden lg:block">
            <CardContent className="p-0">
              {contactsLoading ? (
                <div className="p-6 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : contacts.length === 0 ? (
                <div className="py-12 text-center">
                  <Users className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground" data-testid="text-no-contacts">No contacts found. Import contacts to get started.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Phone Number</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Country</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>DNC Result</TableHead>
                      <TableHead className="text-right">Attempts</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contacts.map((contact) => (
                      <TableRow key={contact.id} data-testid={`row-contact-${contact.id}`}>
                        <TableCell className="font-mono text-sm" data-testid={`text-contact-phone-${contact.id}`}>
                          {contact.phoneNumberE164 || contact.phoneNumber}
                        </TableCell>
                        <TableCell data-testid={`text-contact-name-${contact.id}`}>
                          {contact.contactName || "-"}
                        </TableCell>
                        <TableCell data-testid={`text-contact-country-${contact.id}`}>
                          {getCountryName(contact.countryCode)}
                        </TableCell>
                        <TableCell data-testid={`badge-contact-status-${contact.id}`}>
                          {getContactStatusBadge(contact.status)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground" data-testid={`text-contact-dnc-${contact.id}`}>
                          {contact.dncResult || "-"}
                        </TableCell>
                        <TableCell className="text-right" data-testid={`text-contact-attempts-${contact.id}`}>
                          {contact.callAttempts || contact.attemptCount || 0}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {contactsTotalPages > 1 && (
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                Page {contactsPage} of {contactsTotalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={contactsPage <= 1}
                  onClick={() => setContactsPage((p) => Math.max(1, p - 1))}
                  data-testid="button-contacts-prev"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={contactsPage >= contactsTotalPages}
                  onClick={() => setContactsPage((p) => p + 1)}
                  data-testid="button-contacts-next"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="import" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Import Contacts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="import-contacts">Paste phone numbers (one per line)</Label>
                <p className="text-xs text-muted-foreground">
                  Format: +441234567890, John Smith, john@example.com (name and email are optional)
                </p>
                <Textarea
                  id="import-contacts"
                  placeholder={"+441234567890, John Smith, john@example.com\n+14155551234, Jane Doe\n+33612345678"}
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  rows={8}
                  data-testid="textarea-import-contacts"
                />
              </div>
              <Button onClick={handleImport} disabled={importMutation.isPending} data-testid="button-import-contacts">
                {importMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Import Contacts
                  </>
                )}
              </Button>

              {importResult && (
                <Card className="bg-muted/30">
                  <CardContent className="py-4">
                    <p className="text-sm font-medium mb-3" data-testid="text-import-result-title">Import Results</p>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      <div className="text-center">
                        <p className="text-lg font-bold" data-testid="text-import-total">{importResult.imported}</p>
                        <p className="text-xs text-muted-foreground">Imported</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400" data-testid="text-import-valid">{importResult.valid}</p>
                        <p className="text-xs text-muted-foreground">Valid</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-red-600 dark:text-red-400" data-testid="text-import-invalid">{importResult.invalid}</p>
                        <p className="text-xs text-muted-foreground">Invalid</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400" data-testid="text-import-dnc">{importResult.dncBlocked}</p>
                        <p className="text-xs text-muted-foreground">DNC Blocked</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold" data-testid="text-import-duplicates">{importResult.duplicatesSkipped}</p>
                        <p className="text-xs text-muted-foreground">Duplicates</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Sheet open={cancelSheetOpen} onOpenChange={setCancelSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-xl">
          <SheetHeader>
            <SheetTitle>Cancel Campaign?</SheetTitle>
            <SheetDescription>
              {progress && progress.pending > 0
                ? `${progress.pending} contacts haven't been called yet. `
                : ""}
              Locked funds will be returned to your wallet.
            </SheetDescription>
          </SheetHeader>
          <SheetFooter className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button
              variant="destructive"
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
              className="w-full sm:w-auto"
              data-testid="button-confirm-cancel"
            >
              {cancelMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
              Yes, Cancel Campaign
            </Button>
            <Button
              variant="outline"
              onClick={() => setCancelSheetOpen(false)}
              className="w-full sm:w-auto"
              data-testid="button-keep-running"
            >
              Keep Running
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t p-3 lg:hidden z-50" data-testid="mobile-action-bar">
        <div className="flex items-center gap-2 max-w-lg mx-auto">
          {(campaign.status === "completed" || campaign.status === "cancelled") && (
            <Button className="flex-1" variant="outline" onClick={handleExport} data-testid="button-export-results-mobile">
              <Share2 className="h-4 w-4 mr-2" />
              Share Results
            </Button>
          )}
          {campaign.status === "draft" && (
            <Button
              className="flex-1"
              onClick={() => statusChangeMutation.mutate({ status: "active" })}
              disabled={anyActionPending}
              data-testid="button-start-campaign-mobile"
            >
              {statusChangeMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
              Start Campaign
            </Button>
          )}
          {(campaign.status === "running" || campaign.status === "active") && (
            <>
              <Button
                className="flex-1"
                variant="outline"
                onClick={() => pauseMutation.mutate()}
                disabled={anyActionPending}
                data-testid="button-pause-mobile"
              >
                {pauseMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Pause className="h-4 w-4 mr-2" />}
                Pause
              </Button>
              <Button
                variant="destructive"
                onClick={() => setCancelSheetOpen(true)}
                disabled={anyActionPending}
                data-testid="button-cancel-mobile"
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </>
          )}
          {campaign.status === "paused" && !costCapReached && (
            <>
              <Button
                className="flex-1"
                onClick={() => resumeMutation.mutate()}
                disabled={anyActionPending}
                data-testid="button-resume-mobile"
              >
                {resumeMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                Resume
              </Button>
              <Button
                variant="destructive"
                onClick={() => setCancelSheetOpen(true)}
                disabled={anyActionPending}
                data-testid="button-cancel-paused-mobile"
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </>
          )}
          {costCapReached && (campaign.status === "paused" || campaign.status === "running") && (
            <>
              <Button
                className="flex-1"
                onClick={() => extendMutation.mutate(parseFloat(extendAmount) || 10)}
                disabled={anyActionPending}
                data-testid="button-extend-mobile"
              >
                {extendMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <TrendingUp className="h-4 w-4 mr-2" />}
                Add Funds & Continue
              </Button>
              <Button
                variant="outline"
                onClick={() => completeMutation.mutate()}
                disabled={anyActionPending}
                data-testid="button-complete-mobile"
              >
                {completeMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
