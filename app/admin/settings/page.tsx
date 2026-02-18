"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Settings,
  Play,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Save,
  RotateCcw,
  PoundSterling,
  Gauge,
  Shield,
  Zap,
  Webhook,
  Palette,
  Plus,
  Pencil,
  Check,
  X,
  CheckCircle,
} from "lucide-react";

interface SettingsData {
  [key: string]: string;
}

interface AutomationStatus {
  lastRun: {
    timestamp: string;
    autoSuspend: { checked: number; suspended: number; notified: number };
    spendingCap: { checked: number; alerted: number };
    durationMs: number;
  } | null;
  engineRunning: boolean;
}

interface RateCard {
  id: number;
  deploymentModel: string;
  category: string;
  label: string;
  ratePerMinute: string;
  platformFeePerMinute: string;
  includesAiCost: boolean;
  includesTelephonyCost: boolean;
  isActive: boolean;
}

const DEPLOYMENT_LABELS: Record<string, string> = {
  managed: "Managed",
  byok: "BYOK",
  self_hosted: "Self-Hosted",
};

const CATEGORY_LABELS: Record<string, string> = {
  voice_inbound: "Voice Inbound",
  voice_outbound: "Voice Outbound",
  ai_chat: "AI Chat",
};

const DEFAULT_SETTINGS: Record<string, string> = {
  default_wholesale_rate: "0.05",
  default_overage_rate: "0.10",
  min_charge_seconds: "6",
  max_partners: "100",
  max_clients_per_partner: "50",
  max_agents_per_org: "25",
  max_concurrent_calls: "10",
  default_session_timeout_mins: "30",
  low_balance_threshold: "5.00",
  auto_suspend_days_overdue: "7",
  auto_suspend_enabled: "true",
  spending_cap_alerts: "true",
  spending_cap_threshold: "80",
  auto_approve_partners: "false",
  enable_outbound_calling: "true",
  enable_whitelabel: "true",
  enable_co_branding: "true",
  ai_disclosure_enabled: "true",
  ai_disclosure_text: "This call may be handled by an AI assistant.",
  dnc_enforcement: "true",
  pii_redaction: "true",
  call_recording_default: "true",
  call_quality_scoring: "true",
  sentiment_analysis: "true",
  tcpa_compliance: "true",
  webhook_retry_count: "3",
  webhook_retry_delay_seconds: "30",
  webhook_timeout_seconds: "10",
  platform_name: "GoRigo",
  support_email: "support@gorigo.ai",
  support_phone: "",
  branding_primary_color: "#7C3AED",
  default_timezone: "Europe/London",
  default_language: "en-GB",
  business_hours_start: "09:00",
  business_hours_end: "18:00",
  deployment_package_managed_enabled: "true",
  deployment_package_byok_enabled: "false",
  deployment_package_self_hosted_enabled: "false",
};

function SettingInput({ label, description, settingKey, type = "text", settings, onChange, testId, min, max, step, placeholder }: {
  label: string;
  description?: string;
  settingKey: string;
  type?: string;
  settings: SettingsData;
  onChange: (key: string, value: string) => void;
  testId: string;
  min?: string;
  max?: string;
  step?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={settingKey}>{label}</Label>
      <Input
        id={settingKey}
        type={type}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder || DEFAULT_SETTINGS[settingKey] || ""}
        value={settings[settingKey] ?? DEFAULT_SETTINGS[settingKey] ?? ""}
        onChange={(e) => onChange(settingKey, e.target.value)}
        data-testid={testId}
      />
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
  );
}

function SettingSwitch({ label, description, settingKey, settings, onChange, testId }: {
  label: string;
  description?: string;
  settingKey: string;
  settings: SettingsData;
  onChange: (key: string, value: string) => void;
  testId: string;
}) {
  const value = (settings[settingKey] ?? DEFAULT_SETTINGS[settingKey]) === "true";
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <Label htmlFor={settingKey}>{label}</Label>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <Switch
        id={settingKey}
        checked={value}
        onCheckedChange={(val) => onChange(settingKey, String(val))}
        data-testid={testId}
      />
    </div>
  );
}

export default function PlatformSettingsPage() {
  const [settings, setSettings] = useState<SettingsData>({});
  const [originalSettings, setOriginalSettings] = useState<SettingsData>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [automationStatus, setAutomationStatus] = useState<AutomationStatus | null>(null);
  const [triggeringAutomation, setTriggeringAutomation] = useState(false);
  const [activeTab, setActiveTab] = useState("rate-cards");

  const [rateCards, setRateCards] = useState<RateCard[]>([]);
  const [rateCardsLoading, setRateCardsLoading] = useState(true);
  const [editingCard, setEditingCard] = useState<RateCard | null>(null);
  const [newCard, setNewCard] = useState(false);
  const [cardForm, setCardForm] = useState<Partial<RateCard>>({});
  const [cardSaving, setCardSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/settings");
      const d = await res.json();
      if (d?.settings) {
        const map: SettingsData = {};
        if (Array.isArray(d.settings)) {
          d.settings.forEach((s: { key: string; value: string }) => { map[s.key] = s.value; });
        } else {
          Object.assign(map, d.settings);
        }
        setSettings(map);
        setOriginalSettings(map);
      }
    } catch (error) {
      console.error("Fetch admin settings failed:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRateCards = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/rate-cards");
      const d = await res.json();
      if (d?.rateCards) setRateCards(d.rateCards);
    } catch (error) {
      console.error("Fetch rate cards failed:", error);
    } finally {
      setRateCardsLoading(false);
    }
  }, []);

  const fetchAutomation = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/automation");
      const d = await res.json();
      if (d) setAutomationStatus(d);
    } catch (error) {
      console.error("Fetch automation status failed:", error);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
    fetchRateCards();
    fetchAutomation();
  }, [fetchSettings, fetchRateCards, fetchAutomation]);

  const updateSetting = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings);

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus("idle");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      if (res.ok) {
        setSaveStatus("success");
        setOriginalSettings({ ...settings });
        setTimeout(() => setSaveStatus("idle"), 3000);
      } else {
        setSaveStatus("error");
      }
    } catch (error) {
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSettings({ ...originalSettings });
    setSaveStatus("idle");
  };

  const triggerAutomation = async () => {
    setTriggeringAutomation(true);
    try {
      const res = await fetch("/api/admin/automation", { method: "POST" });
      const data = await res.json();
      if (data?.result) {
        setAutomationStatus({ lastRun: data.result, engineRunning: true });
      }
    } catch (error) {
      console.error("Trigger automation failed:", error);
    } finally {
      setTriggeringAutomation(false);
    }
  };

  const startNewCard = () => {
    setNewCard(true);
    setEditingCard(null);
    setCardForm({
      deploymentModel: "managed",
      category: "voice_inbound",
      label: "",
      ratePerMinute: "0.15",
      platformFeePerMinute: "0.05",
      includesAiCost: true,
      includesTelephonyCost: true,
      isActive: true,
    });
  };

  const startEditCard = (card: RateCard) => {
    setEditingCard(card);
    setNewCard(false);
    setCardForm({ ...card });
  };

  const cancelCardEdit = () => {
    setEditingCard(null);
    setNewCard(false);
    setCardForm({});
  };

  const saveCard = async () => {
    setCardSaving(true);
    try {
      if (newCard) {
        const res = await fetch("/api/admin/rate-cards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...cardForm,
            ratePerMinute: Number(cardForm.ratePerMinute),
            platformFeePerMinute: Number(cardForm.platformFeePerMinute),
          }),
        });
        if (res.ok) {
          await fetchRateCards();
          cancelCardEdit();
        }
      } else if (editingCard) {
        const res = await fetch("/api/admin/rate-cards", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingCard.id,
            ...cardForm,
            ratePerMinute: Number(cardForm.ratePerMinute),
            platformFeePerMinute: Number(cardForm.platformFeePerMinute),
          }),
        });
        if (res.ok) {
          await fetchRateCards();
          cancelCardEdit();
        }
      }
    } catch (error) {
      console.error("Save rate card failed:", error);
    } finally {
      setCardSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-60" />
        <Skeleton className="h-10 w-full max-w-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => <Card key={i}><CardContent className="p-6"><Skeleton className="h-32 w-full" /></CardContent></Card>)}
        </div>
      </div>
    );
  }

  const groupedCards = rateCards.reduce((acc: Record<string, RateCard[]>, card) => {
    if (!acc[card.deploymentModel]) acc[card.deploymentModel] = [];
    acc[card.deploymentModel].push(card);
    return acc;
  }, {});

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Settings className="h-6 w-6 text-violet-500" />
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-settings-title">Platform Settings</h1>
            <p className="text-sm text-muted-foreground">Configure pricing, limits, compliance, and platform behaviour.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {saveStatus === "success" && (
            <div className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400" data-testid="text-save-success">
              <CheckCircle className="h-4 w-4" />
              Saved
            </div>
          )}
          {saveStatus === "error" && (
            <span className="text-sm text-destructive" data-testid="text-save-error">Save failed</span>
          )}
          {hasChanges && (
            <Button variant="outline" onClick={handleReset} data-testid="button-reset-settings">
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving || !hasChanges} data-testid="button-save-settings">
            <Save className="h-4 w-4 mr-1" />
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto" data-testid="tabs-settings">
          <TabsTrigger value="rate-cards" data-testid="tab-rate-cards">
            <PoundSterling className="h-3.5 w-3.5 mr-1.5" />
            Rate Cards
          </TabsTrigger>
          <TabsTrigger value="platform" data-testid="tab-platform">
            <Gauge className="h-3.5 w-3.5 mr-1.5" />
            Platform Defaults
          </TabsTrigger>
          <TabsTrigger value="compliance" data-testid="tab-compliance">
            <Shield className="h-3.5 w-3.5 mr-1.5" />
            Compliance
          </TabsTrigger>
          <TabsTrigger value="automation" data-testid="tab-automation">
            <Zap className="h-3.5 w-3.5 mr-1.5" />
            Automation
          </TabsTrigger>
          <TabsTrigger value="integrations" data-testid="tab-integrations">
            <Webhook className="h-3.5 w-3.5 mr-1.5" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="branding" data-testid="tab-branding">
            <Palette className="h-3.5 w-3.5 mr-1.5" />
            Branding
          </TabsTrigger>
          <TabsTrigger value="packages" data-testid="tab-packages">
            <Settings className="h-3.5 w-3.5 mr-1.5" />
            Packages
          </TabsTrigger>
        </TabsList>

        {/* Rate Cards Tab */}
        <TabsContent value="rate-cards" className="space-y-4 mt-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold">Deployment Package Pricing</h2>
              <p className="text-sm text-muted-foreground">Manage per-minute rates for each deployment model and call category.</p>
            </div>
            <Button onClick={startNewCard} disabled={newCard || !!editingCard} data-testid="button-add-rate-card">
              <Plus className="h-4 w-4 mr-1" />
              Add Rate Card
            </Button>
          </div>

          {newCard && (
            <Card className="border-violet-500/50" data-testid="card-new-rate-card">
              <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap pb-3">
                <CardTitle className="text-base">New Rate Card</CardTitle>
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={saveCard} disabled={cardSaving || !cardForm.label} data-testid="button-save-new-card">
                    <Check className="h-3.5 w-3.5 mr-1" />
                    {cardSaving ? "Saving..." : "Save"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={cancelCardEdit} data-testid="button-cancel-new-card">
                    <X className="h-3.5 w-3.5 mr-1" />
                    Cancel
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <RateCardForm form={cardForm} onChange={setCardForm} />
              </CardContent>
            </Card>
          )}

          {rateCardsLoading ? (
            <div className="space-y-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full" />)}</div>
          ) : Object.keys(groupedCards).length === 0 && !newCard ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <p className="text-sm">No rate cards configured. Add your first rate card to set up pricing.</p>
              </CardContent>
            </Card>
          ) : (
            Object.entries(groupedCards).map(([model, cards]) => (
              <Card key={model} data-testid={`card-rate-group-${model}`}>
                <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap pb-3">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{DEPLOYMENT_LABELS[model] || model}</CardTitle>
                    <Badge variant="secondary" className="text-xs no-default-hover-elevate">{cards.length} cards</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {cards.map((card) => (
                      <div key={card.id}>
                        {editingCard?.id === card.id ? (
                          <div className="p-3 rounded-md border border-violet-500/50 space-y-3">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <span className="text-sm font-medium">Editing: {card.label}</span>
                              <div className="flex items-center gap-2">
                                <Button size="sm" onClick={saveCard} disabled={cardSaving} data-testid={`button-save-card-${card.id}`}>
                                  <Check className="h-3.5 w-3.5 mr-1" />
                                  {cardSaving ? "Saving..." : "Save"}
                                </Button>
                                <Button size="sm" variant="outline" onClick={cancelCardEdit}>
                                  <X className="h-3.5 w-3.5 mr-1" />
                                  Cancel
                                </Button>
                              </div>
                            </div>
                            <RateCardForm form={cardForm} onChange={setCardForm} />
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-3 p-3 rounded-md border" data-testid={`row-rate-card-${card.id}`}>
                            <div className="flex items-center gap-3 flex-wrap flex-1 min-w-0">
                              <span className="text-sm font-medium" data-testid={`text-card-label-${card.id}`}>{card.label}</span>
                              <Badge variant="outline" className="text-xs no-default-hover-elevate">{CATEGORY_LABELS[card.category] || card.category}</Badge>
                              {!card.isActive && <Badge variant="secondary" className="text-xs no-default-hover-elevate">Inactive</Badge>}
                              {card.includesAiCost && <Badge variant="secondary" className="text-xs no-default-hover-elevate bg-violet-500/10 text-violet-600 dark:text-violet-400">AI Included</Badge>}
                              {card.includesTelephonyCost && <Badge variant="secondary" className="text-xs no-default-hover-elevate bg-blue-500/10 text-blue-600 dark:text-blue-400">Telephony Included</Badge>}
                            </div>
                            <div className="flex items-center gap-4 shrink-0">
                              <div className="text-right">
                                <p className="text-sm font-bold" data-testid={`text-card-rate-${card.id}`}>£{Number(card.ratePerMinute).toFixed(4)}/min</p>
                                <p className="text-xs text-muted-foreground">Fee: £{Number(card.platformFeePerMinute).toFixed(4)}/min</p>
                              </div>
                              <Button size="icon" variant="ghost" onClick={() => startEditCard(card)} disabled={!!editingCard || newCard} data-testid={`button-edit-card-${card.id}`}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Platform Defaults Tab */}
        <TabsContent value="platform" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card data-testid="card-billing-defaults">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Billing Defaults</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <SettingInput label="Default Wholesale Rate (£/min)" settingKey="default_wholesale_rate" type="number" step="0.01" min="0" settings={settings} onChange={updateSetting} testId="input-default-wholesale-rate" />
                <SettingInput label="Default Overage Rate (£/min)" settingKey="default_overage_rate" type="number" step="0.01" min="0" settings={settings} onChange={updateSetting} testId="input-default-overage-rate" />
                <SettingInput label="Minimum Charge (seconds)" settingKey="min_charge_seconds" type="number" min="1" settings={settings} onChange={updateSetting} testId="input-min-charge-seconds" description="Minimum billable duration for each call" />
                <SettingInput label="Low Balance Threshold (£)" settingKey="low_balance_threshold" type="number" step="0.01" min="0" settings={settings} onChange={updateSetting} testId="input-low-balance-threshold" description="Trigger low balance alerts below this amount" />
              </CardContent>
            </Card>

            <Card data-testid="card-platform-limits">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Platform Limits</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <SettingInput label="Max Partners" settingKey="max_partners" type="number" min="1" settings={settings} onChange={updateSetting} testId="input-max-partners" />
                <SettingInput label="Max Clients Per Partner" settingKey="max_clients_per_partner" type="number" min="1" settings={settings} onChange={updateSetting} testId="input-max-clients-per-partner" />
                <SettingInput label="Max Agents Per Org" settingKey="max_agents_per_org" type="number" min="1" settings={settings} onChange={updateSetting} testId="input-max-agents-per-org" description="Maximum AI agents each organisation can create" />
                <SettingInput label="Max Concurrent Calls" settingKey="max_concurrent_calls" type="number" min="1" settings={settings} onChange={updateSetting} testId="input-max-concurrent-calls" description="Maximum simultaneous calls per organisation" />
                <SettingInput label="Session Timeout (minutes)" settingKey="default_session_timeout_mins" type="number" min="5" settings={settings} onChange={updateSetting} testId="input-session-timeout" />
              </CardContent>
            </Card>
          </div>

          <Card data-testid="card-feature-flags">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Feature Flags</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <SettingSwitch label="Outbound Calling" description="Allow organisations to make outbound AI calls" settingKey="enable_outbound_calling" settings={settings} onChange={updateSetting} testId="switch-enable-outbound" />
              <SettingSwitch label="White-Label" description="Enable white-label branding for Business Partners" settingKey="enable_whitelabel" settings={settings} onChange={updateSetting} testId="switch-enable-whitelabel" />
              <SettingSwitch label="Co-Branding" description="Allow co-branded experiences for partners" settingKey="enable_co_branding" settings={settings} onChange={updateSetting} testId="switch-enable-co-branding" />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compliance Tab */}
        <TabsContent value="compliance" className="space-y-4 mt-4">
          <Card data-testid="card-compliance-ai">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4" />
                AI Disclosure & Compliance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <SettingSwitch label="AI Disclosure on Calls" description="Inform callers they may be speaking with an AI assistant (FCC/TCPA compliance)" settingKey="ai_disclosure_enabled" settings={settings} onChange={updateSetting} testId="switch-ai-disclosure" />
              <div className="space-y-1.5">
                <Label htmlFor="ai_disclosure_text">Disclosure Message</Label>
                <Textarea
                  id="ai_disclosure_text"
                  value={settings.ai_disclosure_text ?? DEFAULT_SETTINGS.ai_disclosure_text}
                  onChange={(e) => updateSetting("ai_disclosure_text", e.target.value)}
                  className="resize-none text-sm"
                  rows={2}
                  data-testid="textarea-ai-disclosure"
                />
                <p className="text-xs text-muted-foreground">Spoken at the start of each AI-handled call</p>
              </div>
              <SettingSwitch label="TCPA Compliance Mode" description="Enforce Telephone Consumer Protection Act regulations" settingKey="tcpa_compliance" settings={settings} onChange={updateSetting} testId="switch-tcpa" />
              <SettingSwitch label="DNC List Enforcement" description="Automatically check Do-Not-Call registries before outbound calls" settingKey="dnc_enforcement" settings={settings} onChange={updateSetting} testId="switch-dnc" />
            </CardContent>
          </Card>

          <Card data-testid="card-compliance-data">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                Data Protection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <SettingSwitch label="PII Auto-Redaction" description="Automatically detect and redact personally identifiable information from transcripts" settingKey="pii_redaction" settings={settings} onChange={updateSetting} testId="switch-pii-redaction" />
              <SettingSwitch label="Call Recording (Default)" description="Record calls by default for quality assurance" settingKey="call_recording_default" settings={settings} onChange={updateSetting} testId="switch-call-recording" />
            </CardContent>
          </Card>

          <Card data-testid="card-compliance-quality">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quality & Analytics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <SettingSwitch label="Call Quality Scoring" description="Score each call on quality metrics after completion" settingKey="call_quality_scoring" settings={settings} onChange={updateSetting} testId="switch-quality-scoring" />
              <SettingSwitch label="Sentiment Analysis" description="Analyse caller sentiment during and after calls" settingKey="sentiment_analysis" settings={settings} onChange={updateSetting} testId="switch-sentiment" />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Automation Tab */}
        <TabsContent value="automation" className="space-y-4 mt-4">
          <Card data-testid="card-automation-engine">
            <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Automation Engine
              </CardTitle>
              <div className="flex items-center gap-2">
                {automationStatus?.engineRunning ? (
                  <Badge variant="secondary" className="no-default-hover-elevate bg-green-500/10 text-green-600 dark:text-green-400">Running</Badge>
                ) : (
                  <Badge variant="secondary" className="no-default-hover-elevate">Stopped</Badge>
                )}
                <Button variant="outline" onClick={triggerAutomation} disabled={triggeringAutomation} data-testid="button-trigger-automation">
                  <Play className="h-3.5 w-3.5 mr-1.5" />
                  {triggeringAutomation ? "Running..." : "Run Now"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {automationStatus?.lastRun ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" />
                      Last Run
                    </div>
                    <p className="text-sm font-medium" data-testid="text-automation-lastrun">
                      {new Date(automationStatus.lastRun.timestamp).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">{automationStatus.lastRun.durationMs}ms</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Auto-Suspend
                    </div>
                    <p className="text-sm font-medium" data-testid="text-automation-suspend">
                      {automationStatus.lastRun.autoSuspend.checked} checked, {automationStatus.lastRun.autoSuspend.suspended} suspended
                    </p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Spending Alerts
                    </div>
                    <p className="text-sm font-medium" data-testid="text-automation-spending">
                      {automationStatus.lastRun.spendingCap.checked} checked, {automationStatus.lastRun.spendingCap.alerted} alerted
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground" data-testid="text-no-automation-run">No automation run completed yet. The engine runs every 10 minutes.</p>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card data-testid="card-auto-suspend">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Auto-Suspension</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <SettingSwitch label="Enable Auto-Suspension" description="Automatically suspend organisations with zero balance after grace period" settingKey="auto_suspend_enabled" settings={settings} onChange={updateSetting} testId="switch-auto-suspend" />
                <SettingInput label="Grace Period (days)" settingKey="auto_suspend_days_overdue" type="number" min="1" max="90" settings={settings} onChange={updateSetting} testId="input-auto-suspend-days" description="Days after zero balance before auto-suspension" />
              </CardContent>
            </Card>

            <Card data-testid="card-spending-alerts">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Spending Alerts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <SettingSwitch label="Spending Cap Alerts" description="Alert when clients approach their spending cap" settingKey="spending_cap_alerts" settings={settings} onChange={updateSetting} testId="switch-spending-alerts" />
                <SettingInput label="Alert Threshold (%)" settingKey="spending_cap_threshold" type="number" min="1" max="100" settings={settings} onChange={updateSetting} testId="input-spending-threshold" description="Alert when usage reaches this percentage of spending cap" />
              </CardContent>
            </Card>
          </div>

          <Card data-testid="card-partner-approval">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Partner Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <SettingSwitch label="Auto-Approve New Partners" description="Skip manual approval for new partner registrations" settingKey="auto_approve_partners" settings={settings} onChange={updateSetting} testId="switch-auto-approve" />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations" className="space-y-4 mt-4">
          <Card data-testid="card-webhook-settings">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Webhook className="h-4 w-4" />
                Webhook Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <SettingInput label="Retry Attempts" settingKey="webhook_retry_count" type="number" min="0" max="10" settings={settings} onChange={updateSetting} testId="input-webhook-retries" description="Number of retry attempts for failed webhook deliveries" />
              <SettingInput label="Retry Delay (seconds)" settingKey="webhook_retry_delay_seconds" type="number" min="5" max="300" settings={settings} onChange={updateSetting} testId="input-webhook-delay" description="Delay between retry attempts" />
              <SettingInput label="Timeout (seconds)" settingKey="webhook_timeout_seconds" type="number" min="3" max="60" settings={settings} onChange={updateSetting} testId="input-webhook-timeout" description="Maximum time to wait for a webhook response" />
            </CardContent>
          </Card>

          <Card data-testid="card-service-config">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">External Service Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between gap-2 p-3 rounded-md border">
                <div>
                  <p className="text-sm font-medium">Twilio (Telephony)</p>
                  <p className="text-xs text-muted-foreground">Programmable Voice for AI agents</p>
                </div>
                {process.env.NEXT_PUBLIC_TWILIO_CONFIGURED === "true" ? (
                  <Badge variant="secondary" className="no-default-hover-elevate bg-green-500/10 text-green-600 dark:text-green-400">Connected</Badge>
                ) : (
                  <Badge variant="secondary" className="no-default-hover-elevate">Not Configured</Badge>
                )}
              </div>
              <div className="flex items-center justify-between gap-2 p-3 rounded-md border">
                <div>
                  <p className="text-sm font-medium">Stripe (Payments)</p>
                  <p className="text-xs text-muted-foreground">Wallet top-ups and payment processing</p>
                </div>
                {process.env.NEXT_PUBLIC_STRIPE_CONFIGURED === "true" ? (
                  <Badge variant="secondary" className="no-default-hover-elevate bg-green-500/10 text-green-600 dark:text-green-400">Connected</Badge>
                ) : (
                  <Badge variant="secondary" className="no-default-hover-elevate">Not Configured</Badge>
                )}
              </div>
              <div className="flex items-center justify-between gap-2 p-3 rounded-md border">
                <div>
                  <p className="text-sm font-medium">OpenAI (AI Models)</p>
                  <p className="text-xs text-muted-foreground">GPT-4o-mini, embeddings, transcription</p>
                </div>
                <Badge variant="secondary" className="no-default-hover-elevate bg-green-500/10 text-green-600 dark:text-green-400">Active</Badge>
              </div>
              <div className="flex items-center justify-between gap-2 p-3 rounded-md border">
                <div>
                  <p className="text-sm font-medium">Anthropic (AI Fallback)</p>
                  <p className="text-xs text-muted-foreground">Claude Sonnet as Tier 2 failover</p>
                </div>
                <Badge variant="secondary" className="no-default-hover-elevate bg-green-500/10 text-green-600 dark:text-green-400">Active</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Branding Tab */}
        <TabsContent value="branding" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card data-testid="card-brand-identity">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  Brand Identity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <SettingInput label="Platform Name" settingKey="platform_name" settings={settings} onChange={updateSetting} testId="input-platform-name" />
                <SettingInput label="Support Email" settingKey="support_email" type="email" settings={settings} onChange={updateSetting} testId="input-support-email" />
                <SettingInput label="Support Phone" settingKey="support_phone" type="tel" settings={settings} onChange={updateSetting} testId="input-support-phone" placeholder="+44 xxx xxx xxxx" />
                <div className="space-y-1.5">
                  <Label htmlFor="branding_primary_color">Primary Brand Colour</Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      id="branding_primary_color"
                      value={settings.branding_primary_color ?? DEFAULT_SETTINGS.branding_primary_color}
                      onChange={(e) => updateSetting("branding_primary_color", e.target.value)}
                      className="h-9 w-12 rounded-md border cursor-pointer"
                      data-testid="input-primary-color"
                    />
                    <Input
                      value={settings.branding_primary_color ?? DEFAULT_SETTINGS.branding_primary_color}
                      onChange={(e) => updateSetting("branding_primary_color", e.target.value)}
                      className="max-w-32"
                      data-testid="input-primary-color-hex"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-regional">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Regional Defaults</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="default_timezone">Default Timezone</Label>
                  <Select
                    value={settings.default_timezone ?? DEFAULT_SETTINGS.default_timezone}
                    onValueChange={(val) => updateSetting("default_timezone", val)}
                  >
                    <SelectTrigger data-testid="select-timezone">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Europe/London">Europe/London (GMT/BST)</SelectItem>
                      <SelectItem value="America/New_York">America/New York (EST/EDT)</SelectItem>
                      <SelectItem value="America/Los_Angeles">America/Los Angeles (PST/PDT)</SelectItem>
                      <SelectItem value="America/Chicago">America/Chicago (CST/CDT)</SelectItem>
                      <SelectItem value="Asia/Dubai">Asia/Dubai (GST)</SelectItem>
                      <SelectItem value="Asia/Singapore">Asia/Singapore (SGT)</SelectItem>
                      <SelectItem value="Australia/Sydney">Australia/Sydney (AEST/AEDT)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="default_language">Default Language</Label>
                  <Select
                    value={settings.default_language ?? DEFAULT_SETTINGS.default_language}
                    onValueChange={(val) => updateSetting("default_language", val)}
                  >
                    <SelectTrigger data-testid="select-language">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en-GB">English (UK)</SelectItem>
                      <SelectItem value="en-US">English (US)</SelectItem>
                      <SelectItem value="es-ES">Spanish</SelectItem>
                      <SelectItem value="fr-FR">French</SelectItem>
                      <SelectItem value="de-DE">German</SelectItem>
                      <SelectItem value="pt-BR">Portuguese (Brazil)</SelectItem>
                      <SelectItem value="ar-SA">Arabic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <SettingInput label="Business Hours Start" settingKey="business_hours_start" type="time" settings={settings} onChange={updateSetting} testId="input-hours-start" />
                <SettingInput label="Business Hours End" settingKey="business_hours_end" type="time" settings={settings} onChange={updateSetting} testId="input-hours-end" />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="packages" className="space-y-4 mt-4">
          <div>
            <h2 className="text-lg font-semibold">Deployment Package Visibility</h2>
            <p className="text-sm text-muted-foreground">Control which deployment packages are visible on the pricing page and available during registration.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Managed</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">Fully managed AI call centre. You handle everything for the client.</p>
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="pkg-managed" className="text-sm">Visible on site</Label>
                  <Switch
                    id="pkg-managed"
                    data-testid="switch-package-managed"
                    checked={settings.deployment_package_managed_enabled === "true"}
                    onCheckedChange={(checked) => updateSetting("deployment_package_managed_enabled", checked ? "true" : "false")}
                  />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Bring Your Own Key (BYOK)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">Clients use their own API keys with your platform for cost control.</p>
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="pkg-byok" className="text-sm">Visible on site</Label>
                  <Switch
                    id="pkg-byok"
                    data-testid="switch-package-byok"
                    checked={settings.deployment_package_byok_enabled === "true"}
                    onCheckedChange={(checked) => updateSetting("deployment_package_byok_enabled", checked ? "true" : "false")}
                  />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Self-Hosted</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">Deploy on client infrastructure with full data sovereignty.</p>
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="pkg-self-hosted" className="text-sm">Visible on site</Label>
                  <Switch
                    id="pkg-self-hosted"
                    data-testid="switch-package-self-hosted"
                    checked={settings.deployment_package_self_hosted_enabled === "true"}
                    onCheckedChange={(checked) => updateSetting("deployment_package_self_hosted_enabled", checked ? "true" : "false")}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">
                Disabled packages will be hidden from the public pricing page and will not appear as options during business registration. The Enterprise / Custom package is always visible as a contact option.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RateCardForm({ form, onChange }: { form: Partial<RateCard>; onChange: (f: Partial<RateCard>) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div className="space-y-1.5">
        <Label>Deployment Model</Label>
        <Select value={form.deploymentModel || "managed"} onValueChange={(v) => onChange({ ...form, deploymentModel: v })}>
          <SelectTrigger data-testid="select-card-model">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="managed">Managed</SelectItem>
            <SelectItem value="byok">BYOK</SelectItem>
            <SelectItem value="self_hosted">Self-Hosted</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Category</Label>
        <Select value={form.category || "voice_inbound"} onValueChange={(v) => onChange({ ...form, category: v })}>
          <SelectTrigger data-testid="select-card-category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="voice_inbound">Voice Inbound</SelectItem>
            <SelectItem value="voice_outbound">Voice Outbound</SelectItem>
            <SelectItem value="ai_chat">AI Chat</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Label</Label>
        <Input
          value={form.label || ""}
          onChange={(e) => onChange({ ...form, label: e.target.value })}
          placeholder="e.g. Standard Inbound"
          data-testid="input-card-label"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Rate Per Minute (£)</Label>
        <Input
          type="number"
          step="0.0001"
          min="0"
          value={form.ratePerMinute || ""}
          onChange={(e) => onChange({ ...form, ratePerMinute: e.target.value })}
          data-testid="input-card-rate"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Platform Fee Per Minute (£)</Label>
        <Input
          type="number"
          step="0.0001"
          min="0"
          value={form.platformFeePerMinute || ""}
          onChange={(e) => onChange({ ...form, platformFeePerMinute: e.target.value })}
          data-testid="input-card-fee"
        />
      </div>
      <div className="space-y-3 pt-1">
        <div className="flex items-center gap-2">
          <Switch checked={form.includesAiCost !== false} onCheckedChange={(v) => onChange({ ...form, includesAiCost: v })} data-testid="switch-card-ai" />
          <Label className="text-sm">Includes AI Cost</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={form.includesTelephonyCost !== false} onCheckedChange={(v) => onChange({ ...form, includesTelephonyCost: v })} data-testid="switch-card-telephony" />
          <Label className="text-sm">Includes Telephony</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={form.isActive !== false} onCheckedChange={(v) => onChange({ ...form, isActive: v })} data-testid="switch-card-active" />
          <Label className="text-sm">Active</Label>
        </div>
      </div>
    </div>
  );
}
