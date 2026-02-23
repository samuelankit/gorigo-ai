"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/components/query-provider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/lib/use-toast";
import {
  Shield, Phone, FileText, Search, Trash2, Plus,
  Check, X, AlertTriangle, Eye, Lock, Download, Loader2,
  Globe, Clock, Languages, MapPin, Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DNCEntry {
  id: number;
  phoneNumber: string;
  reason: string | null;
  source: string | null;
  addedBy: number | null;
  notes: string | null;
  expiresAt: string | null;
  createdAt: string | null;
}

interface ConsentRecord {
  id: number;
  phoneNumber: string;
  consentType: string;
  consentGiven: boolean;
  consentMethod: string | null;
  consentText: string | null;
  ipAddress: string | null;
  callLogId: number | null;
  revokedAt: string | null;
  revokedReason: string | null;
  expiresAt: string | null;
  createdAt: string | null;
}

interface PIIScanResult {
  hasPII: boolean;
  piiCount: number;
  redactedText: string;
  piiTypes: string[];
}

interface CountryOverview {
  id: number;
  isoCode: string;
  name: string;
  callingCode: string;
  timezone: string;
  region: string | null;
  currentLocalTime: string;
  withinCallingHours: boolean;
  callCount: number;
  complianceScore: number;
  issues: string[];
  callingHours: {
    start: string;
    end: string;
    timezone: string;
    restrictedDays: string[];
  } | null;
  dnc: {
    registryName: string | null;
    registryUrl: string | null;
    checkMethod: string | null;
  } | null;
  disclosure: {
    required: boolean | null;
    language: string | null;
    customScript: string | null;
  } | null;
  consent: {
    type: string;
    script: string | null;
  } | null;
  holidays: {
    name: string;
    date: string;
    noCallingAllowed: boolean | null;
    isRecurring: boolean | null;
  }[];
}

interface ComplianceOverviewData {
  countries: CountryOverview[];
  totalDncEntries: number;
  disclosureTexts: Record<string, string>;
  summary: {
    totalCountries: number;
    countriesCallable: number;
    avgComplianceScore: number;
    countriesWithCalls: number;
  };
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  fr: "French",
  de: "German",
  es: "Spanish",
  it: "Italian",
  pt: "Portuguese",
  nl: "Dutch",
  ja: "Japanese",
  ar: "Arabic",
  hi: "Hindi",
  sv: "Swedish",
  pl: "Polish",
};

const CONSENT_TYPE_LABELS: Record<string, string> = {
  one_party: "One-Party",
  two_party: "Two-Party (All-Party)",
  all_party: "All-Party",
};

export default function CompliancePage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedDisclosureLang, setSelectedDisclosureLang] = useState("en");

  const [addPhone, setAddPhone] = useState("");
  const [addReason, setAddReason] = useState("");
  const [checkPhone, setCheckPhone] = useState("");
  const [checkResult, setCheckResult] = useState<{ blocked: boolean } | null>(null);

  const [consentFilter, setConsentFilter] = useState("all");

  const [piiText, setPiiText] = useState("");
  const [piiResult, setPiiResult] = useState<PIIScanResult | null>(null);
  const [exportingDnc, setExportingDnc] = useState(false);

  const { data: overviewRaw, isLoading: loadingOverview } = useQuery<any>({
    queryKey: ["/api/compliance/overview"],
  });
  const overviewData: ComplianceOverviewData | null = overviewRaw?.countries ? overviewRaw : null;

  const { data: dncRaw, isLoading: loadingDnc } = useQuery<any>({
    queryKey: ["/api/compliance/dnc"],
  });
  const dncEntries: DNCEntry[] = dncRaw?.entries || [];

  const { data: consentRaw, isLoading: loadingConsent } = useQuery<any>({
    queryKey: ["/api/compliance/consent"],
  });
  const consentRecords: ConsentRecord[] = consentRaw?.records || [];

  const addDncMutation = useMutation({
    mutationFn: (data: { phoneNumber: string; reason?: string }) =>
      apiRequest("/api/compliance/dnc", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      toast({ title: "Number added to DNC list" });
      setAddPhone("");
      setAddReason("");
      queryClient.invalidateQueries({ queryKey: ["/api/compliance/dnc"] });
    },
    onError: (e: any) => {
      toast({ title: e.message || "Failed to add number", variant: "destructive" });
    },
  });

  const deleteDncMutation = useMutation({
    mutationFn: (phoneNumber: string) =>
      apiRequest(`/api/compliance/dnc?phoneNumber=${encodeURIComponent(phoneNumber)}`, { method: "DELETE" }),
    onSuccess: () => {
      toast({ title: "Number removed from DNC list" });
      queryClient.invalidateQueries({ queryKey: ["/api/compliance/dnc"] });
    },
    onError: (e: any) => {
      toast({ title: e.message || "Failed to remove number", variant: "destructive" });
    },
  });

  const checkDncMutation = useMutation({
    mutationFn: (phoneNumber: string) =>
      apiRequest("/api/compliance/dnc/check", { method: "POST", body: JSON.stringify({ phoneNumber }) }),
    onSuccess: (data: any) => {
      setCheckResult({ blocked: data.blocked });
    },
    onError: (e: any) => {
      toast({ title: e.message || "DNC check failed", variant: "destructive" });
    },
  });

  const piiScanMutation = useMutation({
    mutationFn: (text: string) =>
      apiRequest("/api/compliance/pii-scan", { method: "POST", body: JSON.stringify({ text }) }),
    onSuccess: (data: any) => {
      setPiiResult(data);
    },
    onError: (e: any) => {
      toast({ title: e.message || "PII scan failed", variant: "destructive" });
    },
  });

  const handleAddDnc = () => {
    if (!addPhone.trim()) return;
    addDncMutation.mutate({ phoneNumber: addPhone.trim(), reason: addReason.trim() || undefined });
  };

  const handleDeleteDnc = (phoneNumber: string) => {
    deleteDncMutation.mutate(phoneNumber);
  };

  const handleCheckDnc = () => {
    if (!checkPhone.trim()) return;
    setCheckResult(null);
    checkDncMutation.mutate(checkPhone.trim());
  };

  const handlePiiScan = () => {
    if (!piiText.trim()) return;
    setPiiResult(null);
    piiScanMutation.mutate(piiText);
  };

  const handleExportDnc = async () => {
    setExportingDnc(true);
    try {
      const res = await fetch("/api/export/dnc");
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dnc_export_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Export complete", description: "DNC list CSV downloaded." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to export DNC list.", variant: "destructive" });
    } finally {
      setExportingDnc(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const filteredConsent = consentFilter === "all"
    ? consentRecords
    : consentRecords.filter((r) => r.consentType === consentFilter);

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-emerald-600 dark:text-emerald-400";
    if (score >= 70) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  const getScoreBg = (score: number) => {
    if (score >= 90) return "bg-emerald-500/10 border-emerald-500/20";
    if (score >= 70) return "bg-amber-500/10 border-amber-500/20";
    return "bg-red-500/10 border-red-500/20";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Shield className="h-6 w-6 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-compliance-title">
            Compliance Center
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Per-country compliance, DNC management, calling hours, AI disclosure, and consent.
          </p>
        </div>
      </div>

      <Tabs defaultValue="overview" data-testid="tabs-compliance">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview" data-testid="tab-overview">
            <Globe className="h-4 w-4 mr-1.5" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="hours" data-testid="tab-hours">
            <Clock className="h-4 w-4 mr-1.5" />
            Calling Hours
          </TabsTrigger>
          <TabsTrigger value="disclosure" data-testid="tab-disclosure">
            <Languages className="h-4 w-4 mr-1.5" />
            AI Disclosure
          </TabsTrigger>
          <TabsTrigger value="dnc" data-testid="tab-dnc">
            <Phone className="h-4 w-4 mr-1.5" />
            DNC List
          </TabsTrigger>
          <TabsTrigger value="consent" data-testid="tab-consent">
            <FileText className="h-4 w-4 mr-1.5" />
            Consent
          </TabsTrigger>
          <TabsTrigger value="pii" data-testid="tab-pii">
            <Eye className="h-4 w-4 mr-1.5" />
            PII Scanner
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          {loadingOverview ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-4">
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
              </div>
              <Skeleton className="h-64 w-full" />
            </div>
          ) : overviewData ? (
            <>
              <div className="grid gap-4 sm:grid-cols-4">
                <Card>
                  <CardContent className="p-5">
                    <p className="text-sm font-medium text-muted-foreground">Countries</p>
                    <p className="text-2xl font-bold text-foreground mt-1" data-testid="text-overview-total-countries">
                      {overviewData.summary.totalCountries}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">active markets</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5">
                    <p className="text-sm font-medium text-muted-foreground">Callable Now</p>
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1" data-testid="text-overview-callable">
                      {overviewData.summary.countriesCallable}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">within calling hours</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5">
                    <p className="text-sm font-medium text-muted-foreground">Compliance Score</p>
                    <p className={cn("text-2xl font-bold mt-1", getScoreColor(overviewData.summary.avgComplianceScore))} data-testid="text-overview-avg-score">
                      {overviewData.summary.avgComplianceScore}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">average across all</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5">
                    <p className="text-sm font-medium text-muted-foreground">DNC Entries</p>
                    <p className="text-2xl font-bold text-foreground mt-1" data-testid="text-overview-dnc">
                      {overviewData.totalDncEntries}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">blocked numbers</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Per-Country Compliance Status</CardTitle>
                  <CardDescription className="text-xs">Real-time compliance health for all active markets</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Country</TableHead>
                          <TableHead>Score</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Local Time</TableHead>
                          <TableHead>DNC Registry</TableHead>
                          <TableHead>Consent</TableHead>
                          <TableHead className="text-right">30d Calls</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {overviewData.countries.map((country) => (
                          <TableRow key={country.id} data-testid={`row-overview-${country.isoCode}`}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                <div>
                                  <p className="text-sm font-medium">{country.name}</p>
                                  <p className="text-xs text-muted-foreground">{country.isoCode} {country.callingCode}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className={cn("inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-medium", getScoreBg(country.complianceScore))}>
                                <span className={getScoreColor(country.complianceScore)}>{country.complianceScore}%</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {country.withinCallingHours ? (
                                <Badge className="no-default-hover-elevate bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" data-testid={`badge-status-${country.isoCode}`}>
                                  <Check className="h-3 w-3 mr-1" />
                                  Callable
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="no-default-hover-elevate" data-testid={`badge-status-${country.isoCode}`}>
                                  <Clock className="h-3 w-3 mr-1" />
                                  Outside Hours
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className="text-sm font-mono">{country.currentLocalTime || "--:--"}</span>
                              <span className="text-xs text-muted-foreground ml-1.5">{country.timezone.split("/").pop()?.replace(/_/g, " ")}</span>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm">{country.dnc?.registryName || "-"}</span>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="no-default-hover-elevate text-xs">
                                {CONSENT_TYPE_LABELS[country.consent?.type || ""] || country.consent?.type || "-"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="text-sm font-mono">{country.callCount}</span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Globe className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">No compliance data available.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="hours" className="space-y-4 mt-4">
          {loadingOverview ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : overviewData ? (
            <>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Calling Windows by Country</CardTitle>
                  <CardDescription className="text-xs">
                    Each country has specific hours when calling is permitted, based on local regulations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Country</TableHead>
                          <TableHead>Calling Window</TableHead>
                          <TableHead>Timezone</TableHead>
                          <TableHead>Local Time Now</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Restricted Days</TableHead>
                          <TableHead>Holidays</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {overviewData.countries.map((country) => (
                          <TableRow key={country.id} data-testid={`row-hours-${country.isoCode}`}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                <div>
                                  <p className="text-sm font-medium">{country.name}</p>
                                  <p className="text-xs text-muted-foreground">{country.isoCode}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {country.callingHours ? (
                                <span className="text-sm font-mono">
                                  {country.callingHours.start} - {country.callingHours.end}
                                </span>
                              ) : (
                                <span className="text-sm text-muted-foreground">Not set</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className="text-sm">{country.timezone}</span>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm font-mono">{country.currentLocalTime || "--:--"}</span>
                            </TableCell>
                            <TableCell>
                              {country.withinCallingHours ? (
                                <Badge className="no-default-hover-elevate bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                                  <Check className="h-3 w-3 mr-1" />
                                  Open
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="no-default-hover-elevate">
                                  <X className="h-3 w-3 mr-1" />
                                  Closed
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {country.callingHours?.restrictedDays && country.callingHours.restrictedDays.length > 0 ? (
                                <div className="flex gap-1 flex-wrap">
                                  {country.callingHours.restrictedDays.map((day) => (
                                    <Badge key={day} variant="outline" className="no-default-hover-elevate text-[11px] capitalize">
                                      {day.replace(/_/g, " ")}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">None</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {country.holidays.length > 0 ? (
                                <Badge variant="outline" className="no-default-hover-elevate text-[11px]">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  {country.holidays.length}
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-500" />
                      Currently Callable
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1.5">
                      {overviewData.countries.filter((c) => c.withinCallingHours).map((country) => (
                        <div
                          key={country.id}
                          className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-emerald-500/20 bg-emerald-500/5 text-xs"
                          data-testid={`badge-callable-${country.isoCode}`}
                        >
                          <MapPin className="h-3 w-3 text-emerald-500 shrink-0" />
                          <span className="font-medium">{country.isoCode}</span>
                          <span className="text-muted-foreground font-mono">{country.currentLocalTime}</span>
                        </div>
                      ))}
                      {overviewData.countries.filter((c) => c.withinCallingHours).length === 0 && (
                        <p className="text-sm text-muted-foreground">No countries are within calling hours right now.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      Outside Calling Hours
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1.5">
                      {overviewData.countries.filter((c) => !c.withinCallingHours).map((country) => (
                        <div
                          key={country.id}
                          className="flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs"
                          data-testid={`badge-closed-${country.isoCode}`}
                        >
                          <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="font-medium">{country.isoCode}</span>
                          <span className="text-muted-foreground font-mono">{country.currentLocalTime}</span>
                        </div>
                      ))}
                      {overviewData.countries.filter((c) => !c.withinCallingHours).length === 0 && (
                        <p className="text-sm text-muted-foreground">All countries are currently within calling hours.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : null}
        </TabsContent>

        <TabsContent value="disclosure" className="space-y-4 mt-4">
          {loadingOverview ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : overviewData ? (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Languages className="h-4 w-4 text-muted-foreground" />
                      AI Disclosure Text Preview
                    </CardTitle>
                    <CardDescription className="text-xs">
                      This text is read aloud at the start of every AI call, in the local language
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Select value={selectedDisclosureLang} onValueChange={setSelectedDisclosureLang}>
                      <SelectTrigger data-testid="select-disclosure-language">
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(LANGUAGE_NAMES).map(([code, name]) => (
                          <SelectItem key={code} value={code}>{name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {overviewData.disclosureTexts[selectedDisclosureLang] ? (
                      <div className="rounded-md border bg-muted/30 p-4">
                        <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">
                          {LANGUAGE_NAMES[selectedDisclosureLang] || selectedDisclosureLang}
                        </p>
                        <p className="text-sm leading-relaxed" data-testid="text-disclosure-preview" dir={selectedDisclosureLang === "ar" ? "rtl" : "ltr"}>
                          {overviewData.disclosureTexts[selectedDisclosureLang]}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No disclosure text available for this language.</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      Recording Consent by Country
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Each country requires a specific consent model for call recording
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="rounded-md border bg-muted/30 p-3">
                          <p className="text-xs text-muted-foreground mb-1">One-Party Consent</p>
                          <p className="text-lg font-semibold text-foreground" data-testid="text-one-party-count">
                            {overviewData.countries.filter((c) => c.consent?.type === "one_party").length}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">Only one party needs to know</p>
                        </div>
                        <div className="rounded-md border bg-muted/30 p-3">
                          <p className="text-xs text-muted-foreground mb-1">Two-Party Consent</p>
                          <p className="text-lg font-semibold text-foreground" data-testid="text-two-party-count">
                            {overviewData.countries.filter((c) => c.consent?.type === "two_party").length}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">All parties must consent</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Disclosure & Consent Requirements per Country</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Country</TableHead>
                          <TableHead>AI Disclosure</TableHead>
                          <TableHead>Disclosure Language</TableHead>
                          <TableHead>Recording Consent</TableHead>
                          <TableHead>DNC Registry</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {overviewData.countries.map((country) => (
                          <TableRow key={country.id} data-testid={`row-disclosure-${country.isoCode}`}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                <div>
                                  <p className="text-sm font-medium">{country.name}</p>
                                  <p className="text-xs text-muted-foreground">{country.isoCode}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {country.disclosure?.required ? (
                                <Badge className="no-default-hover-elevate bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                                  <Check className="h-3 w-3 mr-1" />
                                  Required
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="no-default-hover-elevate">
                                  Optional
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className="text-sm">
                                {country.disclosure?.language
                                  ? LANGUAGE_NAMES[country.disclosure.language.split("-")[0]] || country.disclosure.language
                                  : "-"}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "no-default-hover-elevate text-xs",
                                  country.consent?.type === "two_party"
                                    ? "border-amber-500/30 text-amber-600 dark:text-amber-400"
                                    : ""
                                )}
                              >
                                {CONSENT_TYPE_LABELS[country.consent?.type || ""] || country.consent?.type || "-"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm">{country.dnc?.registryName || "-"}</span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : null}
        </TabsContent>

        <TabsContent value="dnc" className="space-y-4 mt-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total DNC Entries</p>
                    {loadingDnc ? (
                      <Skeleton className="h-8 w-16 mt-1" />
                    ) : (
                      <p className="text-2xl font-bold text-foreground" data-testid="text-dnc-count">
                        {dncEntries.length}
                      </p>
                    )}
                  </div>
                  <div className="w-10 h-10 rounded-full bg-red-500/10 dark:bg-red-500/20 flex items-center justify-center shrink-0">
                    <Phone className="h-5 w-5 text-red-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="sm:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">DNC Check</CardTitle>
                <CardDescription className="text-xs">Verify if a number is on the DNC list</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-2 flex-wrap">
                  <div className="flex-1 min-w-[180px]">
                    <Input
                      placeholder="Enter phone number"
                      value={checkPhone}
                      onChange={(e) => {
                        setCheckPhone(e.target.value);
                        setCheckResult(null);
                      }}
                      data-testid="input-dnc-check"
                    />
                  </div>
                  <Button
                    onClick={handleCheckDnc}
                    disabled={checkDncMutation.isPending || !checkPhone.trim()}
                    data-testid="button-dnc-check"
                  >
                    <Search className="h-4 w-4 mr-1.5" />
                    Check
                  </Button>
                  {checkResult !== null && (
                    checkResult.blocked ? (
                      <Badge variant="destructive" className="no-default-hover-elevate" data-testid="badge-dnc-blocked">
                        <X className="h-3 w-3 mr-1" />
                        Blocked
                      </Badge>
                    ) : (
                      <Badge className="no-default-hover-elevate bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" data-testid="badge-dnc-clear">
                        <Check className="h-3 w-3 mr-1" />
                        Clear
                      </Badge>
                    )
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Add Number to DNC List</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2 flex-wrap">
                <div className="flex-1 min-w-[180px]">
                  <Label htmlFor="add-phone" className="text-xs text-muted-foreground mb-1.5 block">Phone Number</Label>
                  <Input
                    id="add-phone"
                    placeholder="e.g. +14155551234"
                    value={addPhone}
                    onChange={(e) => setAddPhone(e.target.value)}
                    data-testid="input-dnc-phone"
                  />
                </div>
                <div className="flex-1 min-w-[180px]">
                  <Label htmlFor="add-reason" className="text-xs text-muted-foreground mb-1.5 block">Reason</Label>
                  <Input
                    id="add-reason"
                    placeholder="e.g. customer request"
                    value={addReason}
                    onChange={(e) => setAddReason(e.target.value)}
                    data-testid="input-dnc-reason"
                  />
                </div>
                <Button
                  onClick={handleAddDnc}
                  disabled={addDncMutation.isPending || !addPhone.trim()}
                  data-testid="button-add-dnc"
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Add to DNC
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
              <CardTitle className="text-sm font-medium">DNC List</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportDnc}
                disabled={exportingDnc || dncEntries.length === 0}
                data-testid="button-export-dnc"
              >
                {exportingDnc ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              {loadingDnc ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : dncEntries.length === 0 ? (
                <div className="text-center py-8">
                  <Phone className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm" data-testid="text-dnc-empty">
                    No numbers on the DNC list yet.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Phone Number</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Added By</TableHead>
                        <TableHead>Added Date</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dncEntries.map((entry) => (
                        <TableRow key={entry.id} data-testid={`row-dnc-${entry.id}`}>
                          <TableCell className="text-sm font-mono">{entry.phoneNumber}</TableCell>
                          <TableCell className="text-sm">{entry.reason || "-"}</TableCell>
                          <TableCell className="text-sm">{entry.source || "-"}</TableCell>
                          <TableCell className="text-sm">{entry.addedBy ?? "-"}</TableCell>
                          <TableCell className="text-sm">{formatDate(entry.createdAt)}</TableCell>
                          <TableCell className="text-sm">{formatDate(entry.expiresAt)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDeleteDnc(entry.phoneNumber)}
                              data-testid={`button-delete-dnc-${entry.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="consent" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-3">
              <div>
                <CardTitle className="text-sm font-medium">Consent Records</CardTitle>
                <CardDescription className="text-xs">View consent records for your organization</CardDescription>
              </div>
              <Select value={consentFilter} onValueChange={setConsentFilter}>
                <SelectTrigger className="w-[180px]" data-testid="select-consent-filter">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="ai_call">AI Call</SelectItem>
                  <SelectItem value="call_recording">Call Recording</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              {loadingConsent ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : filteredConsent.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm" data-testid="text-consent-empty">
                    No consent records found.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Phone Number</TableHead>
                        <TableHead>Consent Type</TableHead>
                        <TableHead>Granted</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>IP Address</TableHead>
                        <TableHead>Call ID</TableHead>
                        <TableHead>Granted At</TableHead>
                        <TableHead>Expires</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredConsent.map((record) => (
                        <TableRow key={record.id} data-testid={`row-consent-${record.id}`}>
                          <TableCell className="text-sm font-mono">{record.phoneNumber}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="no-default-hover-elevate text-xs">
                              {record.consentType}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {record.consentGiven ? (
                              <Badge className="no-default-hover-elevate bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" data-testid={`badge-consent-granted-${record.id}`}>
                                <Check className="h-3 w-3 mr-1" />
                                Yes
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="no-default-hover-elevate" data-testid={`badge-consent-denied-${record.id}`}>
                                <X className="h-3 w-3 mr-1" />
                                No
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">{record.consentMethod || "-"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{record.ipAddress || "-"}</TableCell>
                          <TableCell className="text-sm">{record.callLogId ?? "-"}</TableCell>
                          <TableCell className="text-sm">{formatDate(record.createdAt)}</TableCell>
                          <TableCell className="text-sm">{formatDate(record.expiresAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pii" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Lock className="h-4 w-4 text-muted-foreground" />
                PII Scanner
              </CardTitle>
              <CardDescription className="text-xs">
                Paste text below to scan for personally identifiable information.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="pii-text" className="text-xs text-muted-foreground mb-1.5 block">Text to Scan</Label>
                <Textarea
                  id="pii-text"
                  placeholder="Paste text here to scan for PII such as SSNs, credit cards, emails..."
                  value={piiText}
                  onChange={(e) => setPiiText(e.target.value)}
                  rows={6}
                  data-testid="textarea-pii-input"
                />
              </div>
              <Button
                onClick={handlePiiScan}
                disabled={piiScanMutation.isPending || !piiText.trim()}
                data-testid="button-pii-scan"
              >
                <Search className="h-4 w-4 mr-1.5" />
                Scan for PII
              </Button>
            </CardContent>
          </Card>

          {piiResult && (
            <Card data-testid="card-pii-results">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    {piiResult.hasPII ? (
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                    ) : (
                      <Check className="h-4 w-4 text-emerald-500" />
                    )}
                    Scan Results
                  </CardTitle>
                  <Badge
                    variant={piiResult.hasPII ? "destructive" : "secondary"}
                    className="no-default-hover-elevate"
                    data-testid="badge-pii-count"
                  >
                    {piiResult.piiCount} PII item{piiResult.piiCount !== 1 ? "s" : ""} found
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {piiResult.piiTypes.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">PII Types Found</p>
                    <div className="flex gap-2 flex-wrap">
                      {Array.from(new Set(piiResult.piiTypes)).map((type) => (
                        <Badge key={type} variant="outline" className="no-default-hover-elevate text-xs" data-testid={`badge-pii-type-${type}`}>
                          {type}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Original Text</p>
                    <div className="rounded-md bg-muted/50 p-3 text-sm whitespace-pre-wrap break-words font-mono" data-testid="text-pii-original">
                      {piiText}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Redacted Text</p>
                    <div className="rounded-md bg-muted/50 p-3 text-sm whitespace-pre-wrap break-words font-mono" data-testid="text-pii-redacted">
                      {piiResult.redactedText}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
