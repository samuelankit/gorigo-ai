"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/components/query-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Loader2, Globe, Phone, Clock, Users, DollarSign, Send, Languages, Settings } from "lucide-react";
import { useToast } from "@/lib/use-toast";

interface Campaign {
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
}

interface Agent {
  id: number;
  name: string;
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

const LANGUAGES = [
  { code: "en-GB", name: "English (UK)" },
  { code: "en-US", name: "English (US)" },
  { code: "fr-FR", name: "French" },
  { code: "de-DE", name: "German" },
  { code: "es-ES", name: "Spanish" },
  { code: "it-IT", name: "Italian" },
  { code: "pt-BR", name: "Portuguese (BR)" },
  { code: "nl-NL", name: "Dutch" },
  { code: "ja-JP", name: "Japanese" },
  { code: "ar-SA", name: "Arabic" },
  { code: "hi-IN", name: "Hindi" },
  { code: "sv-SE", name: "Swedish" },
  { code: "pl-PL", name: "Polish" },
];

function getCountryName(code: string | null): string {
  if (!code) return "-";
  const country = COUNTRIES.find((c) => c.code === code);
  return country ? country.name : code;
}

function getStatusBadge(status: string) {
  switch (status) {
    case "draft":
      return <Badge variant="outline" className="no-default-hover-elevate">{status}</Badge>;
    case "active":
      return <Badge className="no-default-hover-elevate bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">{status}</Badge>;
    case "paused":
      return <Badge className="no-default-hover-elevate bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20">{status}</Badge>;
    case "completed":
      return <Badge variant="outline" className="no-default-hover-elevate">{status}</Badge>;
    case "cancelled":
    case "archived":
      return <Badge variant="destructive" className="no-default-hover-elevate">{status}</Badge>;
    default:
      return <Badge variant="outline" className="no-default-hover-elevate">{status}</Badge>;
  }
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatBudget(spent: string | null, cap: string | null) {
  if (!cap) return "No limit";
  const spentVal = spent ? parseFloat(spent).toFixed(2) : "0.00";
  const capVal = parseFloat(cap).toFixed(2);
  return `$${spentVal} / $${capVal}`;
}

export default function CampaignsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [agentId, setAgentId] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [language, setLanguage] = useState("");
  const [callingHoursStart, setCallingHoursStart] = useState("09:00");
  const [callingHoursEnd, setCallingHoursEnd] = useState("18:00");
  const [callingTimezone, setCallingTimezone] = useState("");
  const [pacingCallsPerMinute, setPacingCallsPerMinute] = useState("5");
  const [pacingMaxConcurrent, setPacingMaxConcurrent] = useState("3");
  const [budgetCap, setBudgetCap] = useState("");
  const [dailySpendLimit, setDailySpendLimit] = useState("");
  const [script, setScript] = useState("");

  const { data: campaigns = [], isLoading: loading } = useQuery<Campaign[]>({
    queryKey: ["/api/campaigns"],
    queryFn: async () => {
      const data = await apiRequest("/api/campaigns");
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: agentsData, isLoading: loadingAgents } = useQuery<{ agents?: Agent[]; agent?: Agent }>({
    queryKey: ["/api/agents/multi"],
    enabled: dialogOpen,
  });

  const agents: Agent[] = agentsData?.agents
    ? agentsData.agents
    : agentsData?.agent
    ? [agentsData.agent]
    : [];

  const createCampaignMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiRequest("/api/campaigns", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: (_data, variables) => {
      toast({ title: "Campaign Created", description: `"${variables.name}" has been created successfully.` });
      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create campaign", variant: "destructive" });
    },
  });

  const handleCountryChange = (code: string) => {
    setCountryCode(code);
    const country = COUNTRIES.find((c) => c.code === code);
    if (country) {
      setCallingTimezone(country.timezone);
    }
  };

  const openDialog = () => {
    setName("");
    setDescription("");
    setAgentId("");
    setCountryCode("");
    setLanguage("");
    setCallingHoursStart("09:00");
    setCallingHoursEnd("18:00");
    setCallingTimezone("");
    setPacingCallsPerMinute("5");
    setPacingMaxConcurrent("3");
    setBudgetCap("");
    setDailySpendLimit("");
    setScript("");
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({ title: "Validation Error", description: "Campaign name is required", variant: "destructive" });
      return;
    }

    createCampaignMutation.mutate({
      name: name.trim(),
      description: description.trim() || null,
      agentId: agentId ? parseInt(agentId) : null,
      countryCode: countryCode || null,
      language: language || null,
      callingHoursStart: callingHoursStart || null,
      callingHoursEnd: callingHoursEnd || null,
      callingTimezone: callingTimezone || null,
      pacingCallsPerMinute: parseInt(pacingCallsPerMinute) || 5,
      pacingMaxConcurrent: parseInt(pacingMaxConcurrent) || 3,
      budgetCap: budgetCap ? budgetCap : null,
      dailySpendLimit: dailySpendLimit ? dailySpendLimit : null,
      script: script.trim() || null,
      scriptLanguage: language || null,
    });
  };

  const totalCampaigns = campaigns.length;
  const activeCampaigns = campaigns.filter((c) => c.status === "active").length;
  const draftCampaigns = campaigns.filter((c) => c.status === "draft").length;
  const totalContacts = campaigns.reduce((sum, c) => sum + (c.totalContacts || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-campaigns-title">Campaigns</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage international outbound calling campaigns</p>
        </div>
        <Button onClick={openDialog} data-testid="button-new-campaign">
          <Plus className="h-4 w-4 mr-2" />
          New Campaign
        </Button>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Campaigns</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-stat-total-campaigns">{loading ? <Skeleton className="h-7 w-12" /> : totalCampaigns}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
            <Phone className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400" data-testid="text-stat-active-campaigns">{loading ? <Skeleton className="h-7 w-12" /> : activeCampaigns}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Draft</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-stat-draft-campaigns">{loading ? <Skeleton className="h-7 w-12" /> : draftCampaigns}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Contacts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-stat-total-contacts">{loading ? <Skeleton className="h-7 w-12" /> : totalContacts}</div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-6">
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : campaigns.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Globe className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm" data-testid="text-no-campaigns">
                No campaigns yet. Create your first international campaign to start reaching contacts worldwide.
              </p>
              <Button onClick={openDialog} variant="outline" className="mt-4" data-testid="button-create-first-campaign">
                <Plus className="h-4 w-4 mr-2" />
                Create Campaign
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Contacts</TableHead>
                  <TableHead className="text-right">Completed</TableHead>
                  <TableHead>Budget</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((campaign) => (
                  <TableRow key={campaign.id} data-testid={`row-campaign-${campaign.id}`}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground" data-testid={`text-campaign-name-${campaign.id}`}>{campaign.name}</p>
                        {campaign.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{campaign.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-sm" data-testid={`text-campaign-country-${campaign.id}`}>{getCountryName(campaign.countryCode)}</span>
                      </div>
                    </TableCell>
                    <TableCell data-testid={`badge-campaign-status-${campaign.id}`}>
                      {getStatusBadge(campaign.status)}
                    </TableCell>
                    <TableCell className="text-right" data-testid={`text-campaign-contacts-${campaign.id}`}>
                      {campaign.totalContacts || 0}
                    </TableCell>
                    <TableCell className="text-right" data-testid={`text-campaign-completed-${campaign.id}`}>
                      {campaign.completedCount || 0}
                    </TableCell>
                    <TableCell data-testid={`text-campaign-budget-${campaign.id}`}>
                      <span className="text-sm">{formatBudget(campaign.budgetSpent, campaign.budgetCap)}</span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(campaign.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Link href={`/dashboard/campaigns/${campaign.id}`}>
                        <Button variant="outline" size="sm" data-testid={`button-view-campaign-${campaign.id}`}>
                          View
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Campaign</DialogTitle>
            <DialogDescription>Set up an international outbound calling campaign.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="campaign-name">Campaign Name *</Label>
                <Input
                  id="campaign-name"
                  placeholder="e.g. UK Spring Follow-ups"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  data-testid="input-campaign-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="campaign-agent">Agent</Label>
                <Select value={agentId} onValueChange={setAgentId}>
                  <SelectTrigger data-testid="select-campaign-agent">
                    <SelectValue placeholder={loadingAgents ? "Loading agents..." : "Select an agent"} />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map((agent) => (
                      <SelectItem key={agent.id} value={String(agent.id)}>
                        {agent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="campaign-description">Description</Label>
              <Input
                id="campaign-description"
                placeholder="Brief description of the campaign"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                data-testid="input-campaign-description"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Target Country</Label>
                <Select value={countryCode} onValueChange={handleCountryChange}>
                  <SelectTrigger data-testid="select-campaign-country">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((country) => (
                      <SelectItem key={country.code} value={country.code}>
                        {country.name} ({country.callingCode})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Language</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger data-testid="select-campaign-language">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="campaign-hours-start">Calling Hours Start</Label>
                <Input
                  id="campaign-hours-start"
                  type="time"
                  value={callingHoursStart}
                  onChange={(e) => setCallingHoursStart(e.target.value)}
                  data-testid="input-calling-hours-start"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="campaign-hours-end">Calling Hours End</Label>
                <Input
                  id="campaign-hours-end"
                  type="time"
                  value={callingHoursEnd}
                  onChange={(e) => setCallingHoursEnd(e.target.value)}
                  data-testid="input-calling-hours-end"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="campaign-timezone">Timezone</Label>
                <Input
                  id="campaign-timezone"
                  value={callingTimezone}
                  onChange={(e) => setCallingTimezone(e.target.value)}
                  placeholder="Auto-set from country"
                  data-testid="input-calling-timezone"
                  readOnly
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="campaign-pacing-cpm">Calls/min</Label>
                <Input
                  id="campaign-pacing-cpm"
                  type="number"
                  min="1"
                  max="60"
                  value={pacingCallsPerMinute}
                  onChange={(e) => setPacingCallsPerMinute(e.target.value)}
                  data-testid="input-pacing-calls-per-minute"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="campaign-pacing-concurrent">Max Concurrent</Label>
                <Input
                  id="campaign-pacing-concurrent"
                  type="number"
                  min="1"
                  max="50"
                  value={pacingMaxConcurrent}
                  onChange={(e) => setPacingMaxConcurrent(e.target.value)}
                  data-testid="input-pacing-max-concurrent"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="campaign-budget-cap">Budget Cap ($)</Label>
                <Input
                  id="campaign-budget-cap"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="No limit"
                  value={budgetCap}
                  onChange={(e) => setBudgetCap(e.target.value)}
                  data-testid="input-budget-cap"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="campaign-daily-limit">Daily Limit ($)</Label>
                <Input
                  id="campaign-daily-limit"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="No limit"
                  value={dailySpendLimit}
                  onChange={(e) => setDailySpendLimit(e.target.value)}
                  data-testid="input-daily-spend-limit"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="campaign-script">Script</Label>
              <Textarea
                id="campaign-script"
                placeholder="Enter the AI agent script for this campaign..."
                value={script}
                onChange={(e) => setScript(e.target.value)}
                rows={4}
                data-testid="textarea-campaign-script"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} data-testid="button-cancel-campaign">
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={createCampaignMutation.isPending} data-testid="button-submit-campaign">
              {createCampaignMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Campaign
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
