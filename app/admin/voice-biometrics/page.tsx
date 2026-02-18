"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Fingerprint, Search, RefreshCw, Plus, ShieldAlert, Settings, Mic,
  AlertTriangle, CheckCircle, Clock, Activity, Eye, Trash2, X,
} from "lucide-react";

function fmtDate(d: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
function fmtDateTime(d: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function statusVariant(s: string): "default" | "destructive" | "secondary" | "outline" {
  if (s === "active") return "default";
  if (s === "deleted") return "destructive";
  return "secondary";
}

function severityVariant(s: string): "default" | "destructive" | "secondary" | "outline" {
  if (s === "critical" || s === "high") return "destructive";
  if (s === "medium") return "default";
  return "secondary";
}

export default function VoiceBiometricsPage() {
  const [tab, setTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any>(null);
  const [voiceprints, setVoiceprints] = useState<any[]>([]);
  const [vpSearch, setVpSearch] = useState("");
  const [vpStatus, setVpStatus] = useState("all");
  const [fraudAlerts, setFraudAlerts] = useState<any[]>([]);
  const [fraudFilter, setFraudFilter] = useState("all");
  const [config, setConfig] = useState<any>(null);
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [detailVp, setDetailVp] = useState<any>(null);
  const [deleteVp, setDeleteVp] = useState<any>(null);
  const [fraudPhone, setFraudPhone] = useState("");
  const [fraudResult, setFraudResult] = useState<any>(null);
  const [fraudChecking, setFraudChecking] = useState(false);
  const [enrollForm, setEnrollForm] = useState({
    contactPhone: "", enrollmentMethod: "text-independent", verificationMode: "active",
    passphraseText: "", consentMethod: "verbal", consentText: "",
  });
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  const fetchTab = useCallback(async (t: string) => {
    setLoading(true);
    try {
      if (t === "overview") {
        const r = await fetch("/api/admin/voice-biometrics/analytics?orgId=1");
        const d = await r.json();
        if (!d.error) setAnalytics(d);
      } else if (t === "voiceprints") {
        const p = new URLSearchParams({ orgId: "1" });
        if (vpSearch) p.set("phone", vpSearch);
        if (vpStatus !== "all") p.set("status", vpStatus);
        const r = await fetch(`/api/admin/voice-biometrics/voiceprints?${p}`);
        const d = await r.json();
        if (!d.error) setVoiceprints(Array.isArray(d) ? d : d.voiceprints ?? []);
      } else if (t === "fraud") {
        const r = await fetch("/api/admin/voice-biometrics/fraud-alerts?orgId=1");
        const d = await r.json();
        if (!d.error) setFraudAlerts(Array.isArray(d) ? d : d.alerts ?? []);
      } else if (t === "config") {
        const r = await fetch("/api/admin/voice-biometrics/config?orgId=1");
        const d = await r.json();
        if (!d.error) setConfig(d);
      }
    } catch (e: any) { setErrMsg(e?.message || "Operation failed. Please try again."); }
    finally { setLoading(false); }
  }, [vpSearch, vpStatus]);

  useEffect(() => { fetchTab(tab); }, [tab]);
  useEffect(() => { if (tab === "voiceprints") fetchTab("voiceprints"); }, [vpSearch, vpStatus]);

  const handleEnroll = async () => {
    if (!enrollForm.consentText.trim()) return;
    setSaving(true);
    try {
      await fetch("/api/admin/voice-biometrics/voiceprints", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...enrollForm, orgId: 1 }),
      });
      setEnrollOpen(false);
      setEnrollForm({ contactPhone: "", enrollmentMethod: "text-independent", verificationMode: "active", passphraseText: "", consentMethod: "verbal", consentText: "" });
      fetchTab("voiceprints");
    } catch (e: any) { setErrMsg(e?.message || "Operation failed. Please try again."); } finally { setSaving(false); }
  };

  const handleGdprDelete = async () => {
    if (!deleteVp) return;
    if (!window.confirm("This will permanently anonymize this voiceprint (GDPR). Continue?")) return;
    setSaving(true);
    try {
      await fetch(`/api/admin/voice-biometrics/voiceprints/${deleteVp.id}`, { method: "DELETE" });
      setDeleteVp(null);
      fetchTab("voiceprints");
    } catch (e: any) { setErrMsg(e?.message || "Operation failed. Please try again."); } finally { setSaving(false); }
  };

  const handleResolve = async (id: number) => {
    setSaving(true);
    try {
      await fetch(`/api/admin/voice-biometrics/fraud-alerts/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolved: true }),
      });
      setFraudAlerts((prev) => prev.map((a) => a.id === id ? { ...a, resolved: true, status: "resolved" } : a));
    } catch (e: any) { setErrMsg(e?.message || "Operation failed. Please try again."); } finally { setSaving(false); }
  };

  const handleFraudCheck = async () => {
    if (!fraudPhone.trim()) return;
    setFraudChecking(true);
    try {
      const r = await fetch("/api/admin/voice-biometrics/fraud-check", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: fraudPhone, orgId: 1 }),
      });
      const d = await r.json();
      setFraudResult(d);
    } catch (e: any) { setErrMsg(e?.message || "Operation failed. Please try again."); } finally { setFraudChecking(false); }
  };

  const handleSaveConfig = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await fetch("/api/admin/voice-biometrics/config", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...config, orgId: 1 }),
      });
    } catch (e: any) { setErrMsg(e?.message || "Operation failed. Please try again."); } finally { setSaving(false); }
  };

  const filteredAlerts = fraudFilter === "all" ? fraudAlerts
    : fraudAlerts.filter((a) => fraudFilter === "resolved" ? (a.resolved || a.status === "resolved") : (!a.resolved && a.status !== "resolved"));

  const kpi = analytics?.summary ?? analytics ?? {};

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-violet-500/10">
            <Fingerprint className="w-5 h-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-voice-biometrics-title">Voice Biometrics</h1>
            <p className="text-sm text-muted-foreground">Manage voiceprints, fraud detection, and biometric configuration.</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => fetchTab(tab)} disabled={loading} data-testid="button-refresh">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />Refresh
        </Button>
      </div>

      {errMsg && (
        <div className="mx-4 mb-2 p-3 bg-destructive/10 border border-destructive/30 rounded-md flex items-center justify-between gap-2" data-testid="error-banner">
          <span className="text-sm text-destructive">{errMsg}</span>
          <Button size="icon" variant="ghost" onClick={() => setErrMsg("")} data-testid="button-dismiss-error"><X className="h-4 w-4" /></Button>
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList data-testid="tabs-list">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="voiceprints" data-testid="tab-voiceprints">Voiceprints</TabsTrigger>
          <TabsTrigger value="fraud" data-testid="tab-fraud">Fraud Detection</TabsTrigger>
          <TabsTrigger value="config" data-testid="tab-config">Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-4">
          {loading && !analytics ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { label: "Total Voiceprints", value: kpi.totalVoiceprints ?? kpi.total ?? 0, icon: Fingerprint },
                  { label: "Total Attempts", value: kpi.totalAttempts ?? kpi.attempts ?? 0, icon: Activity },
                  { label: "Success Rate", value: `${(parseFloat(kpi.successRate ?? kpi.verificationSuccessRate ?? "0") * (parseFloat(kpi.successRate ?? "0") > 1 ? 1 : 100)).toFixed(1)}%`, icon: CheckCircle },
                  { label: "Avg Verification Time", value: `${Math.round(kpi.avgVerificationTime ?? kpi.avgTime ?? 0)}ms`, icon: Clock },
                  { label: "Spoofing Incidents", value: kpi.spoofingIncidents ?? kpi.spoofingCount ?? 0, icon: ShieldAlert },
                ].map(({ label, value, icon: Icon }) => (
                  <Card key={label} data-testid={`card-kpi-${label.toLowerCase().replace(/\s+/g, "-")}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{label}</p>
                          <p className="text-2xl font-bold mt-1" data-testid={`text-kpi-${label.toLowerCase().replace(/\s+/g, "-")}`}>{value}</p>
                        </div>
                        <Icon className="h-8 w-8 text-muted-foreground/30" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {(analytics?.trends ?? analytics?.dailyTrends ?? []).length > 0 && (
                <Card data-testid="card-trends-summary">
                  <CardHeader className="pb-2"><CardTitle className="text-base">Recent Trends</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      {(analytics.trends ?? analytics.dailyTrends).slice(-3).map((t: any, i: number) => (
                        <div key={i} className="p-3">
                          <p className="text-xs text-muted-foreground">{fmtDate(t.date)}</p>
                          <p className="text-lg font-bold mt-1">{t.attempts ?? t.count ?? 0}</p>
                          <p className="text-xs text-muted-foreground">attempts</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="voiceprints" className="space-y-4 mt-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by phone..." className="pl-9" value={vpSearch} onChange={(e) => setVpSearch(e.target.value)} data-testid="input-vp-search" />
            </div>
            <Select value={vpStatus} onValueChange={setVpStatus}>
              <SelectTrigger className="w-[140px]" data-testid="select-vp-status">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="deleted">Deleted</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => setEnrollOpen(true)} data-testid="button-enroll-new">
              <Plus className="h-4 w-4 mr-2" />Enroll New
            </Button>
          </div>
          {loading && voiceprints.length === 0 ? <Skeleton className="h-64" /> : voiceprints.length === 0 ? (
            <Card><CardContent className="py-12 text-center">
              <Mic className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground" data-testid="text-no-voiceprints">No voiceprints found.</p>
            </CardContent></Card>
          ) : (
            <Card><CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Phone</TableHead><TableHead>Status</TableHead><TableHead>Enrollment</TableHead>
                    <TableHead>Mode</TableHead><TableHead>Quality</TableHead><TableHead>Verifications</TableHead>
                    <TableHead>Last Verified</TableHead><TableHead>Created</TableHead><TableHead></TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {voiceprints.map((vp: any) => (
                      <TableRow key={vp.id} className="cursor-pointer" onClick={() => setDetailVp(vp)} data-testid={`row-vp-${vp.id}`}>
                        <TableCell className="text-sm font-mono" data-testid={`text-vp-phone-${vp.id}`}>{vp.contactPhone ?? vp.phone ?? "-"}</TableCell>
                        <TableCell data-testid={`text-vp-status-${vp.id}`}>
                          <Badge variant={statusVariant(vp.status)}>{vp.status}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{vp.enrollmentMethod ?? "-"}</TableCell>
                        <TableCell className="text-sm">{vp.verificationMode ?? "-"}</TableCell>
                        <TableCell className="text-sm" data-testid={`text-vp-quality-${vp.id}`}>{vp.qualityScore != null ? parseFloat(vp.qualityScore).toFixed(2) : "-"}</TableCell>
                        <TableCell className="text-sm" data-testid={`text-vp-verifications-${vp.id}`}>{vp.totalVerifications ?? 0}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{fmtDate(vp.lastVerifiedAt ?? vp.lastVerified)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{fmtDate(vp.createdAt)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); setDetailVp(vp); }} data-testid={`button-vp-view-${vp.id}`}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); setDeleteVp(vp); }} data-testid={`button-vp-delete-${vp.id}`}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="fraud" className="space-y-4 mt-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={fraudFilter} onValueChange={setFraudFilter}>
              <SelectTrigger className="w-[160px]" data-testid="select-fraud-filter">
                <SelectValue placeholder="All Alerts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Alerts</SelectItem>
                <SelectItem value="unresolved">Unresolved</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {loading && fraudAlerts.length === 0 ? <Skeleton className="h-64" /> : filteredAlerts.length === 0 ? (
            <Card><CardContent className="py-12 text-center">
              <ShieldAlert className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground" data-testid="text-no-fraud-alerts">No fraud alerts found.</p>
            </CardContent></Card>
          ) : (
            <Card><CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Alert Type</TableHead><TableHead>Severity</TableHead><TableHead>Description</TableHead>
                    <TableHead>Created</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {filteredAlerts.map((a: any) => (
                      <TableRow key={a.id} data-testid={`row-fraud-${a.id}`}>
                        <TableCell className="text-sm font-medium" data-testid={`text-fraud-type-${a.id}`}>{a.alertType ?? a.type ?? "-"}</TableCell>
                        <TableCell data-testid={`text-fraud-severity-${a.id}`}>
                          <Badge variant={severityVariant(a.severity)}>{a.severity}</Badge>
                        </TableCell>
                        <TableCell className="text-sm max-w-[300px] truncate" data-testid={`text-fraud-desc-${a.id}`}>{a.description ?? "-"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{fmtDateTime(a.createdAt)}</TableCell>
                        <TableCell data-testid={`text-fraud-status-${a.id}`}>
                          <Badge variant={(a.resolved || a.status === "resolved") ? "default" : "outline"}>
                            {(a.resolved || a.status === "resolved") ? "Resolved" : "Unresolved"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {!(a.resolved || a.status === "resolved") && (
                            <Button variant="outline" onClick={() => handleResolve(a.id)} disabled={saving} data-testid={`button-resolve-${a.id}`}>
                              {saving ? "Saving..." : "Resolve"}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent></Card>
          )}
          <Card data-testid="card-fraud-check">
            <CardHeader className="pb-2"><CardTitle className="text-base">Cross-Account Fraud Check</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 flex-wrap">
                <Input placeholder="Enter phone number..." value={fraudPhone} onChange={(e) => setFraudPhone(e.target.value)} className="max-w-xs" data-testid="input-fraud-phone" />
                <Button onClick={handleFraudCheck} disabled={fraudChecking || !fraudPhone.trim()} data-testid="button-fraud-check">
                  {fraudChecking ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}Check
                </Button>
              </div>
              {fraudResult && (
                <div className="mt-4 p-4 rounded-lg border space-y-2" data-testid="fraud-check-result">
                  <p className="text-sm font-medium">Result: <Badge variant={fraudResult.flagged || fraudResult.riskLevel === "high" ? "destructive" : "default"} data-testid="text-fraud-check-status">
                    {fraudResult.flagged ? "Flagged" : fraudResult.riskLevel ?? "Clear"}
                  </Badge></p>
                  {fraudResult.matchCount != null && <p className="text-sm text-muted-foreground" data-testid="text-fraud-matches">Matches: {fraudResult.matchCount}</p>}
                  {fraudResult.details && <p className="text-sm text-muted-foreground" data-testid="text-fraud-details">{fraudResult.details}</p>}
                  {fraudResult.accounts && <p className="text-sm text-muted-foreground" data-testid="text-fraud-accounts">Accounts: {JSON.stringify(fraudResult.accounts)}</p>}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config" className="mt-4">
          {loading && !config ? <Skeleton className="h-96" /> : !config ? (
            <Card><CardContent className="py-12 text-center">
              <Settings className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground" data-testid="text-no-config">No configuration found.</p>
            </CardContent></Card>
          ) : (
            <Card data-testid="card-config">
              <CardHeader className="pb-2"><CardTitle className="text-base">Voice Biometrics Configuration</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">General</h3>
                    {[
                      { key: "isEnabled", label: "Enabled" },
                      { key: "antiSpoofingEnabled", label: "Anti-Spoofing" },
                      { key: "livenessDetection", label: "Liveness Detection" },
                      { key: "replayDetection", label: "Replay Detection" },
                      { key: "syntheticDetection", label: "Synthetic Detection" },
                      { key: "deepfakeDetection", label: "Deepfake Detection" },
                      { key: "continuousAuthEnabled", label: "Continuous Auth" },
                    ].map(({ key, label }) => (
                      <div key={key} className="flex items-center justify-between gap-4">
                        <Label className="text-sm">{label}</Label>
                        <Switch checked={!!config[key]} onCheckedChange={(v) => setConfig({ ...config, [key]: v })} data-testid={`switch-${key}`} />
                      </div>
                    ))}
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Thresholds & Settings</h3>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm">Verification Threshold (0-1)</Label>
                        <Input type="number" min="0" max="1" step="0.01" value={config.verificationThreshold ?? ""} onChange={(e) => setConfig({ ...config, verificationThreshold: e.target.value })} data-testid="input-verification-threshold" />
                      </div>
                      <div>
                        <Label className="text-sm">High Security Threshold (0-1)</Label>
                        <Input type="number" min="0" max="1" step="0.01" value={config.highSecurityThreshold ?? ""} onChange={(e) => setConfig({ ...config, highSecurityThreshold: e.target.value })} data-testid="input-high-security-threshold" />
                      </div>
                      <div>
                        <Label className="text-sm">Spoofing Action</Label>
                        <Select value={config.spoofingAction ?? "flag"} onValueChange={(v) => setConfig({ ...config, spoofingAction: v })}>
                          <SelectTrigger data-testid="select-spoofing-action"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="flag">Flag</SelectItem>
                            <SelectItem value="block">Block</SelectItem>
                            <SelectItem value="step-up">Step-Up</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm">Fallback Method</Label>
                        <Select value={config.fallbackMethod ?? "pin"} onValueChange={(v) => setConfig({ ...config, fallbackMethod: v })}>
                          <SelectTrigger data-testid="select-fallback-method"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pin">PIN</SelectItem>
                            <SelectItem value="sms">SMS</SelectItem>
                            <SelectItem value="security-question">Security Question</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm">Max Enrollment Samples</Label>
                        <Input type="number" min="1" value={config.maxEnrollmentSamples ?? ""} onChange={(e) => setConfig({ ...config, maxEnrollmentSamples: parseInt(e.target.value) || 0 })} data-testid="input-max-enrollment-samples" />
                      </div>
                      <div>
                        <Label className="text-sm">Re-Enrollment Prompt (days)</Label>
                        <Input type="number" min="0" value={config.reEnrollmentPromptDays ?? ""} onChange={(e) => setConfig({ ...config, reEnrollmentPromptDays: parseInt(e.target.value) || 0 })} data-testid="input-re-enrollment-days" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleSaveConfig} disabled={saving} data-testid="button-save-config">
                    {saving && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}Save Configuration
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={enrollOpen} onOpenChange={setEnrollOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto" data-testid="dialog-enroll">
          <DialogHeader>
            <DialogTitle>Enroll New Voiceprint</DialogTitle>
            <DialogDescription>Create a new voiceprint enrollment with consent.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm">Phone Number</Label>
              <Input value={enrollForm.contactPhone} onChange={(e) => setEnrollForm({ ...enrollForm, contactPhone: e.target.value })} placeholder="+1234567890" data-testid="input-enroll-phone" />
            </div>
            <div>
              <Label className="text-sm">Enrollment Method</Label>
              <Select value={enrollForm.enrollmentMethod} onValueChange={(v) => setEnrollForm({ ...enrollForm, enrollmentMethod: v })}>
                <SelectTrigger data-testid="select-enroll-method"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="text-independent">Text-Independent</SelectItem>
                  <SelectItem value="text-dependent">Text-Dependent</SelectItem>
                  <SelectItem value="passphrase">Passphrase</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">Verification Mode</Label>
              <Select value={enrollForm.verificationMode} onValueChange={(v) => setEnrollForm({ ...enrollForm, verificationMode: v })}>
                <SelectTrigger data-testid="select-enroll-mode"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="passive">Passive</SelectItem>
                  <SelectItem value="continuous">Continuous</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {enrollForm.enrollmentMethod === "passphrase" && (
              <div>
                <Label className="text-sm">Passphrase Text</Label>
                <Input value={enrollForm.passphraseText} onChange={(e) => setEnrollForm({ ...enrollForm, passphraseText: e.target.value })} placeholder="Enter passphrase..." data-testid="input-enroll-passphrase" />
              </div>
            )}
            <div>
              <Label className="text-sm">Consent Method</Label>
              <Select value={enrollForm.consentMethod} onValueChange={(v) => setEnrollForm({ ...enrollForm, consentMethod: v })}>
                <SelectTrigger data-testid="select-enroll-consent-method"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="verbal">Verbal</SelectItem>
                  <SelectItem value="written">Written</SelectItem>
                  <SelectItem value="digital">Digital</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">Consent Text <span className="text-destructive">*</span></Label>
              <Textarea value={enrollForm.consentText} onChange={(e) => setEnrollForm({ ...enrollForm, consentText: e.target.value })} placeholder="I consent to..." rows={3} data-testid="input-enroll-consent-text" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEnrollOpen(false)} data-testid="button-enroll-cancel">Cancel</Button>
            <Button onClick={handleEnroll} disabled={saving || !enrollForm.consentText.trim()} data-testid="button-enroll-submit">
              {saving && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}Enroll
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detailVp} onOpenChange={(o) => { if (!o) setDetailVp(null); }}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto" data-testid="dialog-vp-detail">
          <DialogHeader>
            <DialogTitle>Voiceprint Details</DialogTitle>
            <DialogDescription>Voiceprint #{detailVp?.id}</DialogDescription>
          </DialogHeader>
          {detailVp && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Phone</p><p className="font-medium font-mono" data-testid="text-detail-phone">{detailVp.contactPhone ?? detailVp.phone}</p></div>
                <div><p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Status</p><Badge variant={statusVariant(detailVp.status)} data-testid="text-detail-status">{detailVp.status}</Badge></div>
                <div><p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Enrollment</p><p className="font-medium" data-testid="text-detail-enrollment">{detailVp.enrollmentMethod}</p></div>
                <div><p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Mode</p><p className="font-medium" data-testid="text-detail-mode">{detailVp.verificationMode}</p></div>
                <div><p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Quality</p><p className="font-medium" data-testid="text-detail-quality">{detailVp.qualityScore != null ? parseFloat(detailVp.qualityScore).toFixed(2) : "-"}</p></div>
                <div><p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Verifications</p><p className="font-medium" data-testid="text-detail-verifications">{detailVp.totalVerifications ?? 0}</p></div>
                <div><p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Last Verified</p><p className="font-medium">{fmtDateTime(detailVp.lastVerifiedAt ?? detailVp.lastVerified)}</p></div>
                <div><p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Created</p><p className="font-medium">{fmtDateTime(detailVp.createdAt)}</p></div>
              </div>
              {(detailVp.verificationHistory ?? detailVp.history ?? []).length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 mt-4">Verification History</p>
                  <div className="space-y-2">
                    {(detailVp.verificationHistory ?? detailVp.history ?? []).slice(0, 10).map((h: any, i: number) => (
                      <div key={i} className="flex items-center justify-between gap-2 p-2 rounded border text-xs" data-testid={`row-history-${i}`}>
                        <Badge variant={h.success || h.result === "success" ? "default" : "destructive"}>
                          {h.success || h.result === "success" ? "Pass" : "Fail"}
                        </Badge>
                        <span className="text-muted-foreground">{h.confidenceScore != null ? `${(parseFloat(h.confidenceScore) * 100).toFixed(0)}%` : "-"}</span>
                        <span className="text-muted-foreground">{fmtDateTime(h.createdAt ?? h.date)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteVp} onOpenChange={(o) => { if (!o) setDeleteVp(null); }}>
        <DialogContent data-testid="dialog-gdpr-delete">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-destructive" />GDPR Deletion</DialogTitle>
            <DialogDescription>This will permanently soft-delete the voiceprint and all associated biometric data. This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <p className="text-sm">Are you sure you want to delete the voiceprint for <strong>{deleteVp?.contactPhone ?? deleteVp?.phone}</strong>?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteVp(null)} data-testid="button-delete-cancel">Cancel</Button>
            <Button variant="destructive" onClick={handleGdprDelete} disabled={saving} data-testid="button-delete-confirm">
              {saving && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}Delete Voiceprint
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
