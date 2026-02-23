"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/components/query-provider";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/lib/use-toast";
import {
  Upload,
  FileSpreadsheet,
  Keyboard,
  Building2,
  ChevronLeft,
  ChevronRight,
  Shield,
  Wallet,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Users,
  Bot,
  Clock,
  Calendar,
  Info,
  XCircle,
} from "lucide-react";
import { SiGoogle, SiHubspot } from "react-icons/si";
import { CsvUpload } from "@/components/dashboard/data-sources/csv-upload";
import { ManualEntry } from "@/components/dashboard/data-sources/manual-entry";
import CompaniesHouseSearch from "@/components/dashboard/data-sources/companies-house-search";

const WIZARD_STORAGE_KEY = "gorigo_campaign_wizard_state";

interface Agent {
  id: number;
  name: string;
  businessDescription?: string;
}

interface WalletData {
  balance: string;
  lockedBalance: string;
  availableBalance: string;
  currency: string;
}

interface CostEstimate {
  contactCount: number;
  breakdown: {
    callCosts: string;
    avgCallCostPerContact: string;
    tpsCosts: string;
    tpsCheckCostPerContact: string;
    orchestrationFee: string;
  };
  totalEstimate: string;
  currency: string;
}

interface ConnectorResponse {
  id: number;
  connectorType: string;
  name: string;
  status: string;
  oauthEmail?: string;
}

interface CampaignContact {
  id: number;
  contactName: string;
  phoneNumber: string;
  phoneNumberE164?: string;
  email?: string;
  company?: string;
  status: string;
}

type WizardStep = 1 | 2 | 3;
type ContactSource = "csv" | "manual" | "companies-house" | "google-sheets" | "hubspot" | null;

const DAYS_OF_WEEK = [
  { key: "mon", label: "Mon" },
  { key: "tue", label: "Tue" },
  { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" },
  { key: "fri", label: "Fri" },
  { key: "sat", label: "Sat" },
  { key: "sun", label: "Sun" },
];

function loadWizardState() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(WIZARD_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveWizardState(state: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

function clearWizardState() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(WIZARD_STORAGE_KEY);
}

export default function CampaignCreatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const saved = loadWizardState();

  const [step, setStep] = useState<WizardStep>((saved?.step as WizardStep) || 1);
  const [campaignName, setCampaignName] = useState<string>(saved?.campaignName || "");
  const [campaignId, setCampaignId] = useState<number | null>(saved?.campaignId || null);
  const [contactSource, setContactSource] = useState<ContactSource>(saved?.contactSource || null);
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string>(saved?.selectedAgentId || "");
  const [callingHoursStart, setCallingHoursStart] = useState(saved?.callingHoursStart || "09:00");
  const [callingHoursEnd, setCallingHoursEnd] = useState(saved?.callingHoursEnd || "18:00");
  const [callingDays, setCallingDays] = useState<string[]>(saved?.callingDays || ["mon", "tue", "wed", "thu", "fri"]);
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [estimate, setEstimate] = useState<CostEstimate | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);

  useEffect(() => {
    const state = {
      step,
      campaignName,
      campaignId,
      contactSource,
      selectedAgentId,
      callingHoursStart,
      callingHoursEnd,
      callingDays,
    };
    saveWizardState(state);
  }, [step, campaignName, campaignId, contactSource, selectedAgentId, callingHoursStart, callingHoursEnd, callingDays]);

  const { data: agentsData } = useQuery<{ agents?: Agent[]; agent?: Agent }>({
    queryKey: ["/api/agents/multi"],
  });
  const agents: Agent[] = agentsData?.agents
    ? agentsData.agents
    : agentsData?.agent
    ? [agentsData.agent]
    : [];

  const { data: walletData } = useQuery<WalletData>({
    queryKey: ["/api/wallet"],
    enabled: step >= 2,
  });

  const { data: connectors = [] } = useQuery<ConnectorResponse[]>({
    queryKey: ["/api/connectors"],
  });

  const { data: contacts = [], refetch: refetchContacts } = useQuery<CampaignContact[]>({
    queryKey: ["/api/campaigns", campaignId, "contacts"],
    queryFn: () => campaignId ? apiRequest(`/api/campaigns/${campaignId}/contacts`) : Promise.resolve([]),
    enabled: !!campaignId,
  });

  const googleConnector = connectors.find(c => c.connectorType === "google_sheets" && c.status === "active");
  const hubspotConnector = connectors.find(c => c.connectorType === "hubspot" && c.status === "active");

  const createCampaignMutation = useMutation({
    mutationFn: (name: string) =>
      apiRequest("/api/campaigns", {
        method: "POST",
        body: JSON.stringify({
          name,
          orgId: 1,
          status: "draft",
          campaignType: "outbound",
        }),
      }),
    onSuccess: (data: any) => {
      setCampaignId(data.id);
      toast({ title: "Campaign created", description: "Now add your contacts." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const ensureCampaign = useCallback(async () => {
    if (campaignId) return campaignId;
    const name = campaignName.trim() || `Campaign ${new Date().toLocaleDateString("en-GB")}`;
    setCampaignName(name);
    const data = await createCampaignMutation.mutateAsync(name);
    return (data as any).id as number;
  }, [campaignId, campaignName, createCampaignMutation]);

  const handleSourceSelect = async (source: ContactSource) => {
    setContactSource(source);
    if (source === "csv" || source === "manual" || source === "companies-house") {
      if (!campaignId) {
        try {
          await ensureCampaign();
        } catch {
          return;
        }
      }
      setShowSourceModal(true);
    } else if (source === "google-sheets") {
      if (!googleConnector) {
        const returnUrl = encodeURIComponent("/dashboard/campaigns/create?step=1&source=google-sheets");
        window.location.href = `/api/oauth/google/authorize?returnUrl=${returnUrl}`;
      } else {
        setShowSourceModal(true);
      }
    } else if (source === "hubspot") {
      if (!hubspotConnector) {
        const returnUrl = encodeURIComponent("/dashboard/campaigns/create?step=1&source=hubspot");
        window.location.href = `/api/oauth/hubspot/authorize?returnUrl=${returnUrl}`;
      } else {
        setShowSourceModal(true);
      }
    }
  };

  const handleContactsAdded = useCallback(() => {
    setShowSourceModal(false);
    setContactSource(null);
    refetchContacts();
  }, [refetchContacts]);

  const handleEstimate = useCallback(async () => {
    if (!campaignId) return;
    try {
      const data = await apiRequest(`/api/campaigns/${campaignId}/estimate`, {
        method: "POST",
      });
      setEstimate(data as CostEstimate);
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to calculate estimate", variant: "destructive" });
    }
  }, [campaignId, toast]);

  useEffect(() => {
    if (step === 2 && campaignId && contacts.length > 0 && !estimate) {
      handleEstimate();
    }
  }, [step, campaignId, contacts.length, estimate, handleEstimate]);

  const handleApprove = async () => {
    if (!campaignId || !consentConfirmed) return;
    setIsApproving(true);

    try {
      await apiRequest(`/api/campaigns/${campaignId}`, {
        method: "PATCH",
        body: JSON.stringify({
          agentId: selectedAgentId ? parseInt(selectedAgentId) : null,
          callingHoursStart,
          callingHoursEnd,
          consentConfirmed: true,
          consentConfirmedAt: new Date().toISOString(),
        }),
      });

      await apiRequest(`/api/campaigns/${campaignId}/approve?orgId=1&userId=1`, {
        method: "POST",
      });

      clearWizardState();
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
      toast({ title: "Campaign started!", description: "Your campaign is now running." });
      router.push(`/dashboard/campaigns/${campaignId}`);
    } catch (err: any) {
      toast({
        title: "Unable to start campaign",
        description: err.message || "Your balance may have changed. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsApproving(false);
    }
  };

  const goToStep = (s: WizardStep) => {
    if (s === 2 && contacts.length === 0) {
      toast({ title: "Add contacts first", description: "Please add at least one contact before proceeding.", variant: "destructive" });
      return;
    }
    if (s === 2) {
      handleEstimate();
    }
    setStep(s);
  };

  const availableBalance = walletData ? parseFloat(walletData.availableBalance || "0") : 0;
  const totalBalance = walletData ? parseFloat(walletData.balance || "0") : 0;
  const lockedBalance = walletData ? parseFloat(walletData.lockedBalance || "0") : 0;
  const estimateTotal = estimate ? parseFloat(estimate.totalEstimate) : 0;
  const insufficientBalance = estimateTotal > 0 && availableBalance < estimateTotal;
  const balanceAfterLock = availableBalance - estimateTotal;

  const stepLabels = ["Add Contacts", "Configure & Estimate", "Approve & Start"];

  return (
    <div className="min-h-screen flex flex-col" data-testid="page-campaign-create">
      <div className="sticky top-0 z-30 bg-background border-b p-3">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/dashboard/campaigns")}
              data-testid="button-back-campaigns"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold" data-testid="text-wizard-title">New Campaign</h1>
          </div>
          <div className="flex items-center gap-2">
            {stepLabels.map((label, i) => (
              <div key={i} className="flex items-center gap-2 flex-1">
                <div
                  className={`flex items-center justify-center rounded-full text-xs font-medium shrink-0 ${
                    i + 1 <= step
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                  style={{ width: 24, height: 24 }}
                >
                  {i + 1}
                </div>
                <span className={`text-xs hidden sm:inline ${i + 1 <= step ? "text-foreground" : "text-muted-foreground"}`}>
                  {label}
                </span>
                {i < stepLabels.length - 1 && (
                  <div className={`flex-1 h-0.5 ${i + 1 < step ? "bg-primary" : "bg-muted"}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-2xl mx-auto space-y-4">
          {step === 1 && (
            <>
              <div className="space-y-3">
                <Label htmlFor="campaign-name" className="text-sm font-medium">Campaign Name</Label>
                <Input
                  id="campaign-name"
                  placeholder="e.g. Estate Agents Leeds"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  data-testid="input-campaign-name"
                />
              </div>

              {contacts.length > 0 && (
                <Card data-testid="card-contacts-summary">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-muted-foreground" />
                        <span className="font-medium" data-testid="text-contact-count">
                          {contacts.length} contact{contacts.length !== 1 ? "s" : ""} added
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setContactSource(null)}
                        data-testid="button-add-more-contacts"
                      >
                        Add More
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {showDuplicateWarning && duplicateCount > 0 && (
                <Alert data-testid="alert-duplicates">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <span className="font-medium">{duplicateCount} contacts</span> already contacted in the last 30 days.
                    <div className="flex gap-2 mt-2 flex-wrap">
                      <Button size="sm" variant="outline" onClick={() => setShowDuplicateWarning(false)} data-testid="button-skip-duplicates">
                        Skip Duplicates
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setShowDuplicateWarning(false)} data-testid="button-include-anyway">
                        Include Anyway
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-3" data-testid="section-source-selector">
                <Label className="text-sm font-medium text-muted-foreground">Choose how to add contacts</Label>

                <Card
                  className="hover-elevate cursor-pointer"
                  onClick={() => handleSourceSelect("csv")}
                  data-testid="card-source-csv"
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="rounded-md bg-muted p-3 shrink-0">
                      <Upload className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">Upload CSV</p>
                      <p className="text-xs text-muted-foreground">Import from CSV or Excel file</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </CardContent>
                </Card>

                <Card
                  className="hover-elevate cursor-pointer"
                  onClick={() => handleSourceSelect("companies-house")}
                  data-testid="card-source-companies-house"
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="rounded-md bg-muted p-3 shrink-0">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">Search Companies House</p>
                      <p className="text-xs text-muted-foreground">Find UK companies</p>
                    </div>
                    <Badge variant="outline" className="text-xs no-default-hover-elevate no-default-active-elevate shrink-0">Free</Badge>
                  </CardContent>
                </Card>

                <Card
                  className="hover-elevate cursor-pointer"
                  onClick={() => handleSourceSelect("manual")}
                  data-testid="card-source-manual"
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="rounded-md bg-muted p-3 shrink-0">
                      <Keyboard className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">Enter Manually</p>
                      <p className="text-xs text-muted-foreground">Type in a few contacts</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </CardContent>
                </Card>

                <Card
                  className="hover-elevate cursor-pointer"
                  onClick={() => handleSourceSelect("google-sheets")}
                  data-testid="card-source-google-sheets"
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="rounded-md bg-muted p-3 shrink-0">
                      <SiGoogle className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">From Google Sheets</p>
                      <p className="text-xs text-muted-foreground">
                        {googleConnector
                          ? `Connected as ${googleConnector.oauthEmail || "your account"}`
                          : "Connect & import"}
                      </p>
                    </div>
                    {googleConnector ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                  </CardContent>
                </Card>

                <Card
                  className="hover-elevate cursor-pointer"
                  onClick={() => handleSourceSelect("hubspot")}
                  data-testid="card-source-hubspot"
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="rounded-md bg-muted p-3 shrink-0">
                      <SiHubspot className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">From HubSpot</p>
                      <p className="text-xs text-muted-foreground">
                        {hubspotConnector
                          ? `Connected as ${hubspotConnector.oauthEmail || "your account"}`
                          : "Connect & import"}
                      </p>
                    </div>
                    {hubspotConnector ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                  </CardContent>
                </Card>
              </div>

              {contacts.length > 0 && (
                <div className="space-y-2" data-testid="section-contact-preview">
                  <Label className="text-sm font-medium text-muted-foreground">Contact Preview</Label>
                  <div className="space-y-2">
                    {contacts.slice(0, 5).map((c) => (
                      <Card key={c.id} data-testid={`card-contact-preview-${c.id}`}>
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{c.contactName || "Unknown"}</p>
                              <p className="text-xs text-muted-foreground">{c.phoneNumberE164 || c.phoneNumber || "No phone"}</p>
                            </div>
                            <Badge
                              variant="outline"
                              className="text-xs no-default-hover-elevate no-default-active-elevate"
                            >
                              {c.status}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {contacts.length > 5 && (
                      <p className="text-xs text-muted-foreground text-center">
                        ...and {contacts.length - 5} more
                      </p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {step === 2 && (
            <>
              <div className="space-y-3">
                <Label className="text-sm font-medium">Select Agent</Label>
                <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                  <SelectTrigger data-testid="select-agent">
                    <SelectValue placeholder="Choose an AI agent..." />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map((agent) => (
                      <SelectItem key={agent.id} value={String(agent.id)}>
                        <div className="flex items-center gap-2">
                          <Bot className="h-4 w-4 text-muted-foreground" />
                          <span>{agent.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium">Calling Hours</Label>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                    <Input
                      type="time"
                      value={callingHoursStart}
                      onChange={(e) => setCallingHoursStart(e.target.value)}
                      className="w-[130px]"
                      data-testid="input-hours-start"
                    />
                  </div>
                  <span className="text-muted-foreground text-sm">to</span>
                  <Input
                    type="time"
                    value={callingHoursEnd}
                    onChange={(e) => setCallingHoursEnd(e.target.value)}
                    className="w-[130px]"
                    data-testid="input-hours-end"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium">Calling Days</Label>
                <div className="flex gap-1.5 flex-wrap">
                  {DAYS_OF_WEEK.map((day) => {
                    const isSelected = callingDays.includes(day.key);
                    return (
                      <Button
                        key={day.key}
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          setCallingDays((prev) =>
                            isSelected
                              ? prev.filter((d) => d !== day.key)
                              : [...prev, day.key]
                          );
                        }}
                        data-testid={`button-day-${day.key}`}
                      >
                        {day.label}
                      </Button>
                    );
                  })}
                </div>
              </div>

              <Separator />

              <div className="space-y-3" data-testid="section-cost-estimate">
                <Label className="text-sm font-medium">Cost Estimate</Label>
                {!estimate ? (
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-full" />
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-6 w-1/2" />
                  </div>
                ) : (
                  <Card>
                    <CardContent className="p-4 space-y-3">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between gap-2 flex-wrap">
                          <span className="text-muted-foreground">
                            {estimate.contactCount} calls x {estimate.breakdown.avgCallCostPerContact} avg
                          </span>
                          <span data-testid="text-call-costs">{estimate.breakdown.callCosts}</span>
                        </div>
                        <div className="flex justify-between gap-2 flex-wrap">
                          <span className="text-muted-foreground">
                            {estimate.contactCount} compliance checks x {estimate.breakdown.tpsCheckCostPerContact}
                          </span>
                          <span data-testid="text-tps-costs">{estimate.breakdown.tpsCosts}</span>
                        </div>
                        <div className="flex justify-between gap-2 flex-wrap">
                          <span className="text-muted-foreground">Orchestration</span>
                          <span data-testid="text-orchestration-fee">{estimate.breakdown.orchestrationFee}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between gap-2 items-center flex-wrap">
                          <span className="font-semibold">Estimated total</span>
                          <span className="text-lg font-bold" data-testid="text-total-estimate">
                            {estimate.totalEstimate}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {walletData && estimate && (
                <Card className={insufficientBalance ? "border-amber-300 dark:border-amber-700" : ""} data-testid="card-wallet-preview">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Wallet</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Your wallet: <span className="font-medium text-foreground">{Number(walletData.availableBalance).toFixed(2)}</span>
                      {!insufficientBalance && (
                        <span>
                          {" "}&#8594; Available after lock: <span className="font-medium text-foreground">{balanceAfterLock.toFixed(2)}</span>
                        </span>
                      )}
                    </div>
                    {insufficientBalance && (
                      <Alert variant="destructive" className="mt-2" data-testid="alert-insufficient-balance">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          You need {estimateTotal.toFixed(2)} but only have {availableBalance.toFixed(2)} available.{" "}
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-1"
                            onClick={() => router.push("/dashboard/wallet")}
                            data-testid="button-topup-wallet"
                          >
                            Top Up Wallet
                          </Button>
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              )}

              <Card className="bg-muted/30" data-testid="card-reassurance">
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <p className="text-sm text-muted-foreground">
                      You&apos;ll only be charged for actual call time. Unanswered calls are free. Any excess locked funds are returned when the campaign finishes.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {step === 3 && (
            <>
              <div className="space-y-3" data-testid="section-review-summary">
                <Label className="text-sm font-medium text-muted-foreground">Campaign Summary</Label>

                <Card>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-sm font-medium">Contacts</p>
                        <p className="text-xs text-muted-foreground" data-testid="text-summary-contacts">
                          {contacts.length} contact{contacts.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                    <Separator />
                    <div className="flex items-center gap-3">
                      <Bot className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-sm font-medium">Agent</p>
                        <p className="text-xs text-muted-foreground" data-testid="text-summary-agent">
                          {selectedAgentId
                            ? agents.find((a) => a.id === parseInt(selectedAgentId))?.name || "Selected"
                            : "Default agent"}
                        </p>
                      </div>
                    </div>
                    <Separator />
                    <div className="flex items-center gap-3">
                      <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-sm font-medium">Calling Schedule</p>
                        <p className="text-xs text-muted-foreground" data-testid="text-summary-schedule">
                          {callingHoursStart} - {callingHoursEnd}, {callingDays.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(", ")}
                        </p>
                      </div>
                    </div>
                    <Separator />
                    <div className="flex items-center gap-3">
                      <Wallet className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-sm font-medium">Estimated Cost</p>
                        <p className="text-xs text-muted-foreground" data-testid="text-summary-cost">
                          {estimate?.totalEstimate || "Calculating..."}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-primary/30" data-testid="card-consent">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="consent"
                      checked={consentConfirmed}
                      onCheckedChange={(checked) => setConsentConfirmed(!!checked)}
                      className="mt-0.5"
                      data-testid="checkbox-consent"
                    />
                    <label htmlFor="consent" className="text-sm cursor-pointer">
                      <Shield className="h-4 w-4 inline mr-1 text-muted-foreground" />
                      I confirm I have lawful basis to contact these individuals and that this data was obtained in compliance with applicable data protection laws.
                    </label>
                  </div>
                </CardContent>
              </Card>

              {isApproving && (
                <div className="flex items-center justify-center py-6 gap-3" data-testid="loading-approve">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Starting your campaign...</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="sticky bottom-0 z-30 bg-background border-t p-3">
        <div className="max-w-2xl mx-auto flex gap-3">
          {step > 1 && (
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setStep((step - 1) as WizardStep)}
              disabled={isApproving}
              data-testid="button-wizard-back"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          )}

          {step === 1 && (
            <div className="flex items-center justify-between flex-1 gap-3">
              <span className="text-sm text-muted-foreground" data-testid="text-step1-count">
                {contacts.length} contact{contacts.length !== 1 ? "s" : ""} selected
              </span>
              <Button
                onClick={() => goToStep(2)}
                disabled={contacts.length === 0}
                data-testid="button-wizard-next"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}

          {step === 2 && (
            <Button
              className="flex-1"
              onClick={() => goToStep(3)}
              disabled={insufficientBalance}
              data-testid="button-wizard-review"
            >
              Review & Approve
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}

          {step === 3 && (
            <Button
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-800"
              onClick={handleApprove}
              disabled={!consentConfirmed || isApproving || insufficientBalance}
              data-testid="button-approve-start"
            >
              {isApproving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Starting...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Approve & Start Campaign
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      <Dialog open={showSourceModal} onOpenChange={setShowSourceModal}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto p-0 gap-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>
              {contactSource === "csv" && "Upload Contacts"}
              {contactSource === "manual" && "Enter Contacts"}
              {contactSource === "companies-house" && "Search Companies House"}
              {contactSource === "google-sheets" && "Import from Google Sheets"}
              {contactSource === "hubspot" && "Import from HubSpot"}
            </DialogTitle>
          </DialogHeader>
          <div className="p-4">
            {contactSource === "csv" && campaignId && (
              <CsvUpload
                campaignId={campaignId}
                onComplete={handleContactsAdded}
                onCancel={() => setShowSourceModal(false)}
              />
            )}
            {contactSource === "manual" && campaignId && (
              <ManualEntry
                campaignId={campaignId}
                onComplete={handleContactsAdded}
                onCancel={() => setShowSourceModal(false)}
              />
            )}
            {contactSource === "companies-house" && campaignId && (
              <CompaniesHouseSearch
                campaignId={campaignId}
                onAddToCampaign={() => handleContactsAdded()}
                onClose={() => setShowSourceModal(false)}
              />
            )}
            {contactSource === "google-sheets" && (
              <div className="text-center py-8 text-muted-foreground">
                <SiGoogle className="h-8 w-8 mx-auto mb-3" />
                <p className="text-sm">Google Sheets import interface</p>
                <p className="text-xs mt-1">Use Data Sources to import from connected sheets</p>
                <Button
                  variant="outline"
                  className="mt-3"
                  onClick={() => {
                    setShowSourceModal(false);
                    router.push("/dashboard/data-sources");
                  }}
                  data-testid="button-goto-datasources"
                >
                  Go to Data Sources
                </Button>
              </div>
            )}
            {contactSource === "hubspot" && (
              <div className="text-center py-8 text-muted-foreground">
                <SiHubspot className="h-8 w-8 mx-auto mb-3" />
                <p className="text-sm">HubSpot import interface</p>
                <p className="text-xs mt-1">Use Data Sources to import from HubSpot</p>
                <Button
                  variant="outline"
                  className="mt-3"
                  onClick={() => {
                    setShowSourceModal(false);
                    router.push("/dashboard/data-sources");
                  }}
                  data-testid="button-goto-datasources-hubspot"
                >
                  Go to Data Sources
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
