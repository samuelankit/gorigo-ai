"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/components/query-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/lib/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Settings, Building2, Lock, Shield, User, Clock, Phone, AlertTriangle, Webhook, Plus, Trash2, Edit, Eye, EyeOff, Copy, Loader2, Cloud, Key, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
const DAY_LABELS: Record<string, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

const TIMEZONES = [
  { value: "America/New_York", label: "Eastern (America/New_York)" },
  { value: "America/Chicago", label: "Central (America/Chicago)" },
  { value: "America/Denver", label: "Mountain (America/Denver)" },
  { value: "America/Los_Angeles", label: "Pacific (America/Los_Angeles)" },
  { value: "Europe/London", label: "London (Europe/London)" },
  { value: "Europe/Paris", label: "Paris (Europe/Paris)" },
  { value: "Asia/Tokyo", label: "Tokyo (Asia/Tokyo)" },
  { value: "Asia/Shanghai", label: "Shanghai (Asia/Shanghai)" },
  { value: "Australia/Sydney", label: "Sydney (Australia/Sydney)" },
];

const PACKAGE_INFO: Record<string, { name: string; rate: string; description: string; color: string; bgColor: string }> = {
  individual: { name: "Individual", rate: "\u00a30.20/min", description: "AI + Telephony included", color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-500/10" },
  team: { name: "Team", rate: "\u00a30.18/min", description: "For your whole company", color: "text-indigo-600 dark:text-indigo-400", bgColor: "bg-indigo-500/10" },
  custom: { name: "Custom", rate: "Custom", description: "Bespoke rates and features", color: "text-violet-600 dark:text-violet-400", bgColor: "bg-violet-500/10" },
};

const PACKAGE_ICONS: Record<string, typeof Cloud> = {
  individual: Cloud,
  team: Key,
  custom: Cloud,
};

type DaySchedule = { open: string; close: string };
type Schedule = Record<string, DaySchedule>;

interface BusinessHoursData {
  enabled: boolean;
  schedule: Schedule;
  timezone: string;
  holidayDates: string[];
}

const DEFAULT_SCHEDULE: Schedule = {
  monday: { open: "09:00", close: "17:00" },
  tuesday: { open: "09:00", close: "17:00" },
  wednesday: { open: "09:00", close: "17:00" },
  thursday: { open: "09:00", close: "17:00" },
  friday: { open: "09:00", close: "17:00" },
  saturday: { open: "09:00", close: "17:00" },
  sunday: { open: "09:00", close: "17:00" },
};

export default function SettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");

  const [deploymentModel, setDeploymentModel] = useState<string>("individual");
  const [showPackageSwitch, setShowPackageSwitch] = useState(false);
  const [pendingPackage, setPendingPackage] = useState<string>("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [complianceDisclosure, setComplianceDisclosure] = useState(true);

  const [openaiKey, setOpenaiKey] = useState("");
  const [openaiBaseUrl, setOpenaiBaseUrl] = useState("");
  const [openaiValid, setOpenaiValid] = useState<boolean | null>(null);

  const [businessHoursEnabled, setBusinessHoursEnabled] = useState(false);
  const [schedule, setSchedule] = useState<Schedule>(DEFAULT_SCHEDULE);
  const [closedDays, setClosedDays] = useState<Record<string, boolean>>({});
  const [timezone, setTimezone] = useState("America/New_York");
  const [voicemailEnabled, setVoicemailEnabled] = useState(false);
  const [voicemailGreeting, setVoicemailGreeting] = useState("");

  const [maxConcurrentCalls, setMaxConcurrentCalls] = useState(5);
  const [minCallBalance, setMinCallBalance] = useState(1.0);
  const [platformMinCallBalance, setPlatformMinCallBalance] = useState(1.0);
  const [activeCalls, setActiveCalls] = useState(0);

  interface PhoneNumber {
    id: number;
    phoneNumber: string;
    friendlyName: string | null;
    capabilities: Record<string, boolean> | null;
    isActive: boolean;
    createdAt: string;
  }

  interface WebhookRecord {
    id: number;
    url: string;
    events: string[] | null;
    secret: string | null;
    isActive: boolean;
    lastTriggered: string | null;
    failureCount: number;
    createdAt: string;
  }
  const WEBHOOK_EVENTS = [
    "call.started", "call.completed", "call.failed",
    "lead.created", "lead.updated",
    "agent.updated", "transcript.ready",
    "wallet.low_balance", "wallet.recharged",
  ];
  const [showAddWebhook, setShowAddWebhook] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookEvents, setWebhookEvents] = useState<string[]>([]);
  const [editingWebhook, setEditingWebhook] = useState<WebhookRecord | null>(null);
  const [visibleSecrets, setVisibleSecrets] = useState<Record<number, boolean>>({});

  const [defaultAgentVisibility, setDefaultAgentVisibility] = useState("shared");
  const [budgetAlertThreshold, setBudgetAlertThreshold] = useState(80);
  const [teamDescription, setTeamDescription] = useState("");
  const [teamSettingsLoaded, setTeamSettingsLoaded] = useState(false);

  const { data: authData, isLoading: loading } = useQuery<any>({
    queryKey: ["/api/auth/me"],
    select: (d: any) => {
      return d;
    },
  });

  const profileLoaded = !!authData?.user;
  if (profileLoaded && businessName === "" && authData.user.businessName) {
    setBusinessName(authData.user.businessName || "");
    setEmail(authData.user.email || "");
    if (authData.org?.deploymentModel) setDeploymentModel(authData.org.deploymentModel);
  }

  const { data: agentData } = useQuery<any>({
    queryKey: ["/api/agents"],
  });
  if (agentData?.agent && complianceDisclosure !== (agentData.agent.complianceDisclosure ?? true)) {
    if (agentData.agent.complianceDisclosure !== undefined) {
      setComplianceDisclosure(agentData.agent.complianceDisclosure ?? true);
    }
  }

  const { data: businessHoursRaw, isLoading: loadingBusinessHours } = useQuery<any>({
    queryKey: ["/api/settings/business-hours"],
  });
  const bhLoaded = !!businessHoursRaw;
  if (bhLoaded && !loadingBusinessHours) {
    const bh = businessHoursRaw.businessHours as BusinessHoursData | null;
    if (bh && businessHoursEnabled === false && bh.enabled) {
      setBusinessHoursEnabled(bh.enabled);
      if (bh.schedule) {
        const normalizedSchedule: Schedule = {};
        const closed: Record<string, boolean> = {};
        for (const day of DAYS) {
          const dayData = bh.schedule[day];
          if (!dayData || (dayData.open === "" && dayData.close === "")) {
            closed[day] = true;
            normalizedSchedule[day] = { open: "", close: "" };
          } else {
            normalizedSchedule[day] = dayData;
          }
        }
        setSchedule(normalizedSchedule);
        setClosedDays(closed);
      }
    }
    if (businessHoursRaw.voicemailEnabled !== undefined && voicemailEnabled !== businessHoursRaw.voicemailEnabled) {
      setVoicemailEnabled(businessHoursRaw.voicemailEnabled ?? false);
    }
    if (businessHoursRaw.voicemailGreeting && voicemailGreeting === "") {
      setVoicemailGreeting(businessHoursRaw.voicemailGreeting);
    }
    if (businessHoursRaw.timezone && timezone === "America/New_York" && businessHoursRaw.timezone !== "America/New_York") {
      setTimezone(businessHoursRaw.timezone);
    }
  }

  const { data: callLimitsRaw, isLoading: loadingCallLimits } = useQuery<any>({
    queryKey: ["/api/settings/call-limits"],
  });
  if (callLimitsRaw && !loadingCallLimits) {
    if (callLimitsRaw.maxConcurrentCalls !== undefined && maxConcurrentCalls === 5 && callLimitsRaw.maxConcurrentCalls !== 5) {
      setMaxConcurrentCalls(callLimitsRaw.maxConcurrentCalls ?? 5);
    }
    if (callLimitsRaw.minCallBalance !== undefined && minCallBalance === 1.0) {
      const parsed = parseFloat(callLimitsRaw.minCallBalance) || 1.0;
      if (parsed !== 1.0) setMinCallBalance(parsed);
    }
    if (callLimitsRaw.platformMinCallBalance !== undefined && platformMinCallBalance === 1.0) {
      const floor = parseFloat(callLimitsRaw.platformMinCallBalance) || 1.0;
      if (floor !== 1.0) setPlatformMinCallBalance(floor);
    }
    if (callLimitsRaw.activeCalls !== undefined && activeCalls === 0 && callLimitsRaw.activeCalls !== 0) {
      setActiveCalls(callLimitsRaw.activeCalls);
    }
  }

  const { data: phonesRaw, isLoading: loadingPhones } = useQuery<any>({
    queryKey: ["/api/phone-numbers"],
  });
  const phoneNumbers: PhoneNumber[] = phonesRaw?.phoneNumbers || [];

  const { data: webhooksRaw, isLoading: loadingWebhooks } = useQuery<any>({
    queryKey: ["/api/webhooks"],
  });
  const webhookList: WebhookRecord[] = Array.isArray(webhooksRaw) ? webhooksRaw : [];

  const isTeamOrCustom = deploymentModel === "team" || deploymentModel === "custom";

  const { data: teamSettingsRaw, isLoading: loadingTeamSettings } = useQuery<any>({
    queryKey: ["/api/settings/team"],
    enabled: isTeamOrCustom,
  });
  if (teamSettingsRaw?.settings && !teamSettingsLoaded) {
    setDefaultAgentVisibility(teamSettingsRaw.settings.defaultAgentVisibility || "shared");
    setBudgetAlertThreshold(teamSettingsRaw.settings.budgetAlertThreshold ?? 80);
    setTeamDescription(teamSettingsRaw.settings.teamDescription || "");
    setTeamSettingsLoaded(true);
  }

  const saveTeamSettingsMutation = useMutation({
    mutationFn: () =>
      apiRequest("/api/settings/team", {
        method: "PUT",
        body: JSON.stringify({
          defaultAgentVisibility,
          budgetAlertThreshold,
          teamDescription: teamDescription.trim(),
        }),
      }),
    onSuccess: () => {
      toast({ title: "Team settings updated", description: "Your team settings have been saved." });
      queryClient.invalidateQueries({ queryKey: ["/api/settings/team"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save team settings.", variant: "destructive" });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: () => apiRequest("/api/settings/profile", { method: "PUT", body: JSON.stringify({ businessName }) }),
    onSuccess: () => {
      toast({ title: "Profile updated", description: "Your business profile has been saved." });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update profile.", variant: "destructive" });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: () => apiRequest("/api/settings/password", { method: "PUT", body: JSON.stringify({ currentPassword, newPassword }) }),
    onSuccess: () => {
      toast({ title: "Password updated", description: "Your password has been changed." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (e: any) => {
      toast({ title: "Error", description: e.message || "Failed to change password.", variant: "destructive" });
    },
  });

  const handleChangePassword = () => {
    if (newPassword !== confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match.", variant: "destructive" });
      return;
    }
    if (newPassword.length < 8) {
      toast({ title: "Error", description: "Password must be at least 8 characters.", variant: "destructive" });
      return;
    }
    changePasswordMutation.mutate();
  };

  const complianceMutation = useMutation({
    mutationFn: (checked: boolean) =>
      apiRequest("/api/agents", { method: "PUT", body: JSON.stringify({ complianceDisclosure: checked }) }),
    onSuccess: () => {
      toast({ title: "Updated", description: "Compliance setting saved." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update compliance setting.", variant: "destructive" });
    },
  });

  const handleComplianceToggle = (checked: boolean) => {
    setComplianceDisclosure(checked);
    complianceMutation.mutate(checked);
  };

  const validateOpenaiMutation = useMutation({
    mutationFn: () =>
      apiRequest("/api/settings/integrations", {
        method: "POST",
        body: JSON.stringify({ action: "validate_openai", apiKey: openaiKey, baseUrl: openaiBaseUrl || undefined }),
      }),
    onSuccess: (data: any) => {
      setOpenaiValid(data.valid);
      toast({ title: data.valid ? "OpenAI key is valid" : "OpenAI key invalid", description: data.error || `${(data.models || []).length} models available`, variant: data.valid ? "default" : "destructive" });
    },
    onError: () => {
      toast({ title: "Validation failed", variant: "destructive" });
    },
  });

  const switchPackageMutation = useMutation({
    mutationFn: () =>
      apiRequest("/api/onboarding/deployment-model", { method: "PUT", body: JSON.stringify({ deploymentModel: pendingPackage }) }),
    onSuccess: () => {
      setDeploymentModel(pendingPackage);
      setShowPackageSwitch(false);
      toast({ title: "Package updated", description: "Your deployment package has been changed. Active calls will continue at the previous rate." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to switch package.", variant: "destructive" });
    },
  });

  const saveBusinessHoursMutation = useMutation({
    mutationFn: () =>
      apiRequest("/api/settings/business-hours", {
        method: "PUT",
        body: JSON.stringify({
          businessHours: {
            enabled: businessHoursEnabled,
            schedule: Object.fromEntries(
              Object.entries(schedule).map(([day, times]) =>
                [day, closedDays[day] ? null : times]
              )
            ),
            timezone,
            holidayDates: [],
          },
          voicemailEnabled,
          voicemailGreeting,
          timezone,
        }),
      }),
    onSuccess: () => {
      toast({ title: "Business hours updated", description: "Your business hours and voicemail settings have been saved." });
      queryClient.invalidateQueries({ queryKey: ["/api/settings/business-hours"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save business hours.", variant: "destructive" });
    },
  });

  const saveCallLimitsMutation = useMutation({
    mutationFn: () =>
      apiRequest("/api/settings/call-limits", { method: "PUT", body: JSON.stringify({ maxConcurrentCalls, minCallBalance }) }),
    onSuccess: () => {
      toast({ title: "Call limits updated", description: "Your call limit settings have been saved." });
      queryClient.invalidateQueries({ queryKey: ["/api/settings/call-limits"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save call limits.", variant: "destructive" });
    },
  });

  const handleSaveCallLimits = () => {
    if (maxConcurrentCalls < 1 || maxConcurrentCalls > 100) {
      toast({ title: "Error", description: "Max concurrent calls must be between 1 and 100.", variant: "destructive" });
      return;
    }
    if (minCallBalance < platformMinCallBalance) {
      toast({ title: "Below platform floor", description: `Minimum call balance cannot be set below £${platformMinCallBalance.toFixed(2)}.`, variant: "destructive" });
      return;
    }
    saveCallLimitsMutation.mutate();
  };

  const saveWebhookMutation = useMutation({
    mutationFn: () => {
      const method = editingWebhook ? "PATCH" : "POST";
      const body = editingWebhook
        ? { id: editingWebhook.id, url: webhookUrl.trim(), events: webhookEvents }
        : { url: webhookUrl.trim(), events: webhookEvents };
      return apiRequest("/api/webhooks", { method, body: JSON.stringify(body) });
    },
    onSuccess: () => {
      toast({ title: editingWebhook ? "Webhook updated" : "Webhook created" });
      setShowAddWebhook(false);
      setEditingWebhook(null);
      setWebhookUrl("");
      setWebhookEvents([]);
      queryClient.invalidateQueries({ queryKey: ["/api/webhooks"] });
    },
    onError: () => {
      toast({ title: "Error saving webhook", variant: "destructive" });
    },
  });

  const toggleWebhookMutation = useMutation({
    mutationFn: (wh: WebhookRecord) =>
      apiRequest("/api/webhooks", { method: "PATCH", body: JSON.stringify({ id: wh.id, isActive: !wh.isActive }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/webhooks"] });
    },
    onError: () => {
      toast({ title: "Error toggling webhook", variant: "destructive" });
    },
  });

  const deleteWebhookMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/webhooks?id=${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/webhooks"] });
      toast({ title: "Webhook deleted" });
    },
    onError: () => {
      toast({ title: "Error deleting webhook", variant: "destructive" });
    },
  });

  const handleDayScheduleChange = (day: string, field: "open" | "close", value: string) => {
    setSchedule((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  };

  const handleClosedToggle = (day: string, checked: boolean) => {
    setClosedDays((prev) => ({ ...prev, [day]: checked }));
    if (checked) {
      setSchedule((prev) => ({
        ...prev,
        [day]: { open: "", close: "" },
      }));
    } else {
      setSchedule((prev) => ({
        ...prev,
        [day]: { open: "09:00", close: "17:00" },
      }));
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <Skeleton className="h-8 w-48" data-testid="skeleton-settings-title" />
        <Skeleton className="h-48 w-full" data-testid="skeleton-profile" />
        <Skeleton className="h-48 w-full" data-testid="skeleton-security" />
        <Skeleton className="h-48 w-full" data-testid="skeleton-business-hours" />
        <Skeleton className="h-48 w-full" data-testid="skeleton-call-limits" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-slate-500/10 dark:bg-slate-500/20 flex items-center justify-center shrink-0">
          <Settings className="h-6 w-6 text-slate-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-settings-title">Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your account and preferences.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            Business Profile
          </CardTitle>
          <CardDescription>Update your business information.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-5">
          <div className="space-y-2">
            <Label htmlFor="businessName">Business Name</Label>
            <Input
              id="businessName"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              data-testid="input-business-name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={email}
              disabled
              className="opacity-60"
              data-testid="input-email"
            />
            <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
          </div>
          <Button onClick={() => updateProfileMutation.mutate()} disabled={updateProfileMutation.isPending} data-testid="button-update-profile">
            {updateProfileMutation.isPending ? "Saving..." : "Update Profile"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            {(() => { const Icon = PACKAGE_ICONS[deploymentModel] || Cloud; return <div className={cn("w-7 h-7 rounded-md flex items-center justify-center", PACKAGE_INFO[deploymentModel]?.bgColor || "bg-blue-500/10")}><Icon className={cn("h-4 w-4", PACKAGE_INFO[deploymentModel]?.color || "text-blue-600")} /></div>; })()}
            Deployment Package
          </CardTitle>
          <CardDescription>Your current deployment package and pricing tier.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-lg font-semibold" data-testid="text-package-name">{PACKAGE_INFO[deploymentModel]?.name || deploymentModel}</span>
                <Badge variant="secondary" className="no-default-hover-elevate" data-testid="badge-package-rate">{PACKAGE_INFO[deploymentModel]?.rate}</Badge>
              </div>
              <p className="text-sm text-muted-foreground" data-testid="text-package-description">{PACKAGE_INFO[deploymentModel]?.description}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const options = Object.keys(PACKAGE_INFO).filter(k => k !== deploymentModel);
                setPendingPackage(options[0] || "");
                setShowPackageSwitch(true);
              }}
              data-testid="button-change-package"
            >
              Change Package
            </Button>
          </div>
          {deploymentModel === "individual" && (
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="no-default-hover-elevate" data-testid="badge-ai-included">AI Included</Badge>
              <Badge variant="secondary" className="no-default-hover-elevate" data-testid="badge-telephony-included">Telephony Included</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {isTeamOrCustom && (
        loadingTeamSettings ? (
          <Skeleton className="h-64 w-full" data-testid="skeleton-team-settings" />
        ) : (
          <Card className="bg-gradient-to-br from-indigo-500/5 to-transparent dark:from-indigo-500/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="w-7 h-7 rounded-md flex items-center justify-center bg-indigo-500/10">
                  <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                Team Settings
              </CardTitle>
              <CardDescription>Configure team-wide defaults and preferences for your organisation.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-5">
              <div className="space-y-2">
                <Label htmlFor="defaultAgentVisibility">Default Agent Visibility</Label>
                <p className="text-xs text-muted-foreground">Set the default visibility for newly created agents.</p>
                <Select value={defaultAgentVisibility} onValueChange={setDefaultAgentVisibility}>
                  <SelectTrigger data-testid="select-default-agent-visibility">
                    <SelectValue placeholder="Select visibility" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private" data-testid="select-item-visibility-private">Private (Creator only)</SelectItem>
                    <SelectItem value="department" data-testid="select-item-visibility-department">My Department</SelectItem>
                    <SelectItem value="shared" data-testid="select-item-visibility-shared">Whole Company</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="budgetAlertThreshold">Budget Alert Threshold (%)</Label>
                <p className="text-xs text-muted-foreground">
                  Send budget alerts when department spending reaches this percentage of their cap.
                </p>
                <div className="flex items-center gap-3 flex-wrap">
                  <Input
                    id="budgetAlertThreshold"
                    type="number"
                    min={1}
                    max={100}
                    value={budgetAlertThreshold}
                    onChange={(e) => setBudgetAlertThreshold(Math.min(100, Math.max(1, parseInt(e.target.value) || 80)))}
                    className="w-24"
                    data-testid="input-budget-alert-threshold"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="teamDescription">Team Description</Label>
                <p className="text-xs text-muted-foreground">
                  An optional description of your team visible to members.
                </p>
                <Textarea
                  id="teamDescription"
                  value={teamDescription}
                  onChange={(e) => setTeamDescription(e.target.value)}
                  placeholder="Describe your team or organisation..."
                  maxLength={500}
                  data-testid="textarea-team-description"
                />
                <p className="text-xs text-muted-foreground text-right">{teamDescription.length}/500</p>
              </div>

              <Button
                onClick={() => saveTeamSettingsMutation.mutate()}
                disabled={saveTeamSettingsMutation.isPending}
                data-testid="button-save-team-settings"
              >
                {saveTeamSettingsMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                {saveTeamSettingsMutation.isPending ? "Saving..." : "Save Team Settings"}
              </Button>
            </CardContent>
          </Card>
        )
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="h-4 w-4 text-muted-foreground" />
            Security
          </CardTitle>
          <CardDescription>Manage your password and security settings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-5">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <Input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              data-testid="input-current-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              data-testid="input-new-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              data-testid="input-confirm-password"
            />
          </div>
          <Button onClick={handleChangePassword} disabled={changePasswordMutation.isPending} data-testid="button-change-password">
            {changePasswordMutation.isPending ? "Saving..." : "Change Password"}
          </Button>

          <Separator />

          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="space-y-0.5">
              <Label>AI Disclosure</Label>
              <p className="text-xs text-muted-foreground">
                Play an AI disclosure message at the start of each call
              </p>
            </div>
            <Switch
              checked={complianceDisclosure}
              onCheckedChange={handleComplianceToggle}
              data-testid="switch-compliance-disclosure"
            />
          </div>

          <Separator />
          <div className="space-y-2">
            <p className="text-sm font-medium">GDPR Data Export</p>
            <p className="text-sm text-muted-foreground">
              Download a complete export of your account data (agents, calls, knowledge base, billing) in JSON format as required by GDPR Article 15.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  const res = await fetch("/api/account/data-export", { method: "POST" });
                  if (!res.ok) throw new Error("Export failed");
                  const blob = await res.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `gorigo-data-export-${new Date().toISOString().split("T")[0]}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                } catch {
                  alert("Failed to export data. Please try again.");
                }
              }}
              data-testid="button-gdpr-export"
            >
              Download My Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {loadingBusinessHours ? (
        <Skeleton className="h-64 w-full" data-testid="skeleton-business-hours-loading" />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Business Hours
            </CardTitle>
            <CardDescription>Configure when your business accepts calls and voicemail settings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="space-y-0.5">
                <Label>Enable Business Hours</Label>
                <p className="text-xs text-muted-foreground">Restrict calls to your business hours schedule</p>
              </div>
              <Switch
                checked={businessHoursEnabled}
                onCheckedChange={setBusinessHoursEnabled}
                data-testid="switch-business-hours-enabled"
              />
            </div>

            {businessHoursEnabled && (
              <>
                <Separator />
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Weekly Schedule</Label>
                  <div className="space-y-2">
                    {DAYS.map((day) => (
                      <div key={day} className="flex items-center gap-3 flex-wrap">
                        <span className="text-sm w-24 shrink-0" data-testid={`text-day-label-${day}`}>
                          {DAY_LABELS[day]}
                        </span>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={closedDays[day] ?? false}
                            onCheckedChange={(checked) => handleClosedToggle(day, checked === true)}
                            data-testid={`checkbox-closed-${day}`}
                          />
                          <Label className="text-xs text-muted-foreground">Closed</Label>
                        </div>
                        <Input
                          type="time"
                          value={schedule[day]?.open || ""}
                          onChange={(e) => handleDayScheduleChange(day, "open", e.target.value)}
                          disabled={closedDays[day] ?? false}
                          className="w-32"
                          data-testid={`input-open-${day}`}
                        />
                        <span className="text-xs text-muted-foreground">to</span>
                        <Input
                          type="time"
                          value={schedule[day]?.close || ""}
                          onChange={(e) => handleDayScheduleChange(day, "close", e.target.value)}
                          disabled={closedDays[day] ?? false}
                          className="w-32"
                          data-testid={`input-close-${day}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger data-testid="select-timezone">
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value} data-testid={`select-item-timezone-${tz.value}`}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="space-y-0.5">
                  <Label>Voicemail</Label>
                  <p className="text-xs text-muted-foreground">Enable voicemail for missed or after-hours calls</p>
                </div>
                <Switch
                  checked={voicemailEnabled}
                  onCheckedChange={setVoicemailEnabled}
                  data-testid="switch-voicemail-enabled"
                />
              </div>

              {voicemailEnabled && (
                <div className="space-y-2">
                  <Label htmlFor="voicemailGreeting">Voicemail Greeting</Label>
                  <Textarea
                    id="voicemailGreeting"
                    value={voicemailGreeting}
                    onChange={(e) => setVoicemailGreeting(e.target.value)}
                    placeholder="Enter your voicemail greeting message..."
                    data-testid="textarea-voicemail-greeting"
                  />
                </div>
              )}
            </div>

            <Button onClick={() => saveBusinessHoursMutation.mutate()} disabled={saveBusinessHoursMutation.isPending} data-testid="button-save-business-hours">
              {saveBusinessHoursMutation.isPending ? "Saving..." : "Save Business Hours"}
            </Button>
          </CardContent>
        </Card>
      )}

      {loadingCallLimits ? (
        <Skeleton className="h-48 w-full" data-testid="skeleton-call-limits-loading" />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Phone className="h-4 w-4 text-muted-foreground" />
              Call Limits
            </CardTitle>
            <CardDescription>Configure call concurrency and balance requirements.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground">Active Calls:</span>
              <Badge variant="secondary" data-testid="badge-active-calls">{activeCalls}</Badge>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="maxConcurrentCalls">Max Concurrent Calls</Label>
              <Input
                id="maxConcurrentCalls"
                type="number"
                min={1}
                max={100}
                value={maxConcurrentCalls}
                onChange={(e) => setMaxConcurrentCalls(parseInt(e.target.value) || 1)}
                data-testid="input-max-concurrent-calls"
              />
              <p className="text-xs text-muted-foreground">Maximum number of simultaneous calls allowed (1-100)</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="minCallBalance">Minimum Call Balance</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">£</span>
                <Input
                  id="minCallBalance"
                  type="number"
                  min={platformMinCallBalance}
                  step={0.01}
                  value={minCallBalance}
                  onChange={(e) => setMinCallBalance(parseFloat(e.target.value) || platformMinCallBalance)}
                  className="pl-7"
                  data-testid="input-min-call-balance"
                />
              </div>
              <p className="text-xs text-muted-foreground">Minimum account balance required to place calls</p>
              <div className="flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800 px-3 py-2 text-xs text-blue-700 dark:text-blue-300">
                <span className="font-medium">Platform floor: £{platformMinCallBalance.toFixed(2)}</span>
                <span className="text-blue-500 dark:text-blue-400">— You cannot set this lower than the platform minimum.</span>
              </div>
            </div>

            {minCallBalance > 0 && (
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>Calls will be blocked if your account balance falls below £{Math.max(minCallBalance, platformMinCallBalance).toFixed(2)}</span>
              </div>
            )}

            <Button onClick={handleSaveCallLimits} disabled={saveCallLimitsMutation.isPending} data-testid="button-save-call-limits">
              {saveCallLimitsMutation.isPending ? "Saving..." : "Save Call Limits"}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="bg-gradient-to-br from-blue-500/5 to-transparent dark:from-blue-500/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Phone className="h-4 w-4 text-muted-foreground" />
            Phone Numbers
          </CardTitle>
          <CardDescription>Phone numbers assigned to your account for AI calls.</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingPhones ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : phoneNumbers.length === 0 ? (
            <div className="text-center py-6">
              <Phone className="h-7 w-7 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground" data-testid="text-no-phone-numbers">
                No phone numbers assigned yet. Contact your administrator to provision numbers.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {phoneNumbers.map((pn) => (
                <div
                  key={pn.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-md bg-muted/50"
                  data-testid={`phone-number-${pn.id}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-md bg-blue-500/10 flex items-center justify-center shrink-0">
                      <Phone className="h-4 w-4 text-blue-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium font-mono">{pn.phoneNumber}</p>
                      {pn.friendlyName && (
                        <p className="text-xs text-muted-foreground">{pn.friendlyName}</p>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant={pn.isActive ? "secondary" : "outline"}
                    className="no-default-hover-elevate"
                  >
                    {pn.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Webhook className="h-4 w-4 text-muted-foreground" />
                Webhooks
              </CardTitle>
              <CardDescription>Receive HTTP callbacks when events occur.</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setEditingWebhook(null); setWebhookUrl(""); setWebhookEvents([]); setShowAddWebhook(true); }}
              data-testid="button-add-webhook"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 p-5">
          {loadingWebhooks ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : webhookList.length === 0 ? (
            <p className="text-sm text-muted-foreground">No webhooks configured. Add one to receive event notifications.</p>
          ) : (
            <div className="space-y-2">
              {webhookList.map((wh) => (
                <div key={wh.id} className="flex items-start justify-between gap-3 p-3 rounded-md border" data-testid={`webhook-item-${wh.id}`}>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-mono truncate max-w-xs" data-testid={`webhook-url-${wh.id}`}>{wh.url}</span>
                      <Badge variant={wh.isActive ? "secondary" : "outline"} className="no-default-hover-elevate text-xs">
                        {wh.isActive ? "Active" : "Disabled"}
                      </Badge>
                      {(wh.failureCount || 0) > 0 && (
                        <Badge variant="destructive" className="no-default-hover-elevate text-xs">
                          {wh.failureCount} failures
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {(wh.events || []).map((ev) => (
                        <Badge key={ev} variant="outline" className="no-default-hover-elevate text-xs">{ev}</Badge>
                      ))}
                    </div>
                    {wh.secret && (
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-xs text-muted-foreground">Secret:</span>
                        <span className="text-xs font-mono text-muted-foreground">
                          {visibleSecrets[wh.id] ? wh.secret : "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={() => setVisibleSecrets(prev => ({ ...prev, [wh.id]: !prev[wh.id] }))}
                          data-testid={`button-toggle-secret-${wh.id}`}
                        >
                          {visibleSecrets[wh.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={() => {
                            navigator.clipboard.writeText(wh.secret || "");
                            toast({ title: "Secret copied" });
                          }}
                          data-testid={`button-copy-secret-${wh.id}`}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Switch
                      checked={wh.isActive}
                      onCheckedChange={() => toggleWebhookMutation.mutate(wh)}
                      data-testid={`switch-webhook-active-${wh.id}`}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingWebhook(wh);
                        setWebhookUrl(wh.url);
                        setWebhookEvents(wh.events || []);
                        setShowAddWebhook(true);
                      }}
                      data-testid={`button-edit-webhook-${wh.id}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteWebhookMutation.mutate(wh.id)}
                      data-testid={`button-delete-webhook-${wh.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAddWebhook} onOpenChange={setShowAddWebhook}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingWebhook ? "Edit Webhook" : "Add Webhook"}</DialogTitle>
            <DialogDescription>
              {editingWebhook ? "Update the webhook URL and subscribed events." : "Add a new webhook endpoint to receive event notifications."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Endpoint URL</Label>
              <Input
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://example.com/webhook"
                data-testid="input-webhook-url"
              />
            </div>
            <div className="space-y-2">
              <Label>Events</Label>
              <div className="grid grid-cols-2 gap-2">
                {WEBHOOK_EVENTS.map((ev) => (
                  <label key={ev} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={webhookEvents.includes(ev)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setWebhookEvents(prev => [...prev, ev]);
                        } else {
                          setWebhookEvents(prev => prev.filter(e => e !== ev));
                        }
                      }}
                      data-testid={`checkbox-event-${ev}`}
                    />
                    <span className="font-mono text-xs">{ev}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowAddWebhook(false)} data-testid="button-cancel-webhook">
              Cancel
            </Button>
            <Button onClick={() => saveWebhookMutation.mutate()} disabled={!webhookUrl.trim() || saveWebhookMutation.isPending} data-testid="button-save-webhook">
              {saveWebhookMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {editingWebhook ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPackageSwitch} onOpenChange={setShowPackageSwitch}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Switch Package</DialogTitle>
            <DialogDescription>
              Are you sure you want to switch from {PACKAGE_INFO[deploymentModel]?.name} to {PACKAGE_INFO[pendingPackage]?.name}? Active calls will continue at the previous rate.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {Object.entries(PACKAGE_INFO).filter(([k]) => k !== deploymentModel).map(([key, info]) => (
              <label
                key={key}
                className={cn("flex items-center gap-3 p-3 rounded-md border cursor-pointer", pendingPackage === key && "border-primary")}
              >
                <input
                  type="radio"
                  name="pendingPackage"
                  value={key}
                  checked={pendingPackage === key}
                  onChange={() => setPendingPackage(key)}
                  className="accent-primary"
                  data-testid={`radio-package-${key}`}
                />
                <div>
                  <span className="text-sm font-medium">{info.name}</span>
                  <span className="text-xs text-muted-foreground ml-2">{info.rate} — {info.description}</span>
                </div>
              </label>
            ))}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowPackageSwitch(false)} data-testid="button-cancel-package-switch">Cancel</Button>
            <Button onClick={() => switchPackageMutation.mutate()} disabled={switchPackageMutation.isPending} data-testid="button-confirm-package-switch">
              {switchPackageMutation.isPending ? "Switching..." : "Confirm Switch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="bg-gradient-to-br from-slate-500/5 to-transparent dark:from-slate-500/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4 text-muted-foreground" />
            Account Info
          </CardTitle>
          <CardDescription>Account details and information.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 p-5">
          <div className="text-sm">
            <span className="text-muted-foreground">Email: </span>
            <span data-testid="text-account-email">{email}</span>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">Business: </span>
            <span data-testid="text-account-business">{businessName}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
