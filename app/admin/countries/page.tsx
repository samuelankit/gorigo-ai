"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Globe, Search, Pencil, RefreshCw, Shield, Phone, FileText,
  Scale, Clock, Database, BookOpen, CheckCircle2, XCircle, CreditCard,
} from "lucide-react";

interface Country {
  id: number; isoCode: string; name: string; callingCode: string;
  timezone: string; currency: string; tier: number; status: string;
  region: string; requiresKyc: boolean; requiresLocalPresence: boolean;
  sanctioned: boolean;
}

interface ComplianceProfile {
  id: number; countryId: number;
  callingHoursStart: string | null; callingHoursEnd: string | null; callingHoursTimezone: string | null;
  restrictedDays: string[] | null;
  dncRegistryName: string | null; dncRegistryUrl: string | null; dncCheckMethod: string | null;
  aiDisclosureRequired: boolean | null; aiDisclosureScript: string | null; aiDisclosureLanguage: string | null;
  recordingConsentType: string | null; recordingConsentScript: string | null;
  maxCallAttemptsPerDay: number | null; maxCallAttemptsPerWeek: number | null; coolingOffHours: number | null;
  dataRetentionDays: number | null; dataResidencyRequired: boolean | null; dataResidencyRegion: string | null;
  regulatoryBody: string | null; regulatoryUrl: string | null;
}

interface RateCard {
  id: number; countryId: number; deploymentModel: string;
  direction: string; numberType: string;
  surchargePerMinute: string; twilioEstimatedCost: string; marginPercent: string;
  isActive: boolean;
}

export default function AdminCountriesPage() {
  const [activeTab, setActiveTab] = useState("countries");
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [editCountry, setEditCountry] = useState<Country | null>(null);
  const [editForm, setEditForm] = useState<Partial<Country>>({});
  const [saving, setSaving] = useState(false);

  const [complianceCountryId, setComplianceCountryId] = useState<string>("");
  const [compliance, setCompliance] = useState<ComplianceProfile | null>(null);
  const [complianceLoading, setComplianceLoading] = useState(false);
  const [editCompliance, setEditCompliance] = useState(false);
  const [complianceForm, setComplianceForm] = useState<Partial<ComplianceProfile>>({});
  const [complianceSaving, setComplianceSaving] = useState(false);

  const [rateCountryId, setRateCountryId] = useState<string>("");
  const [rateCards, setRateCards] = useState<RateCard[]>([]);
  const [rateCardsLoading, setRateCardsLoading] = useState(false);
  const [editRateCard, setEditRateCard] = useState<RateCard | null>(null);
  const [rateForm, setRateForm] = useState<Partial<RateCard>>({});
  const [rateSaving, setRateSaving] = useState(false);

  const fetchCountries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/countries");
      const data = await res.json();
      if (Array.isArray(data)) setCountries(data);
      else if (data?.countries) setCountries(data.countries);
    } catch (error) { console.error("Fetch countries failed:", error); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchCountries(); }, [fetchCountries]);

  const fetchCompliance = useCallback(async (id: string) => {
    if (!id) return;
    setComplianceLoading(true);
    try {
      const res = await fetch(`/api/countries/${id}`);
      const data = await res.json();
      setCompliance(data?.compliance || null);
    } catch (error) { console.error("Fetch country compliance failed:", error); } finally { setComplianceLoading(false); }
  }, []);

  const fetchRateCards = useCallback(async (id: string) => {
    if (!id) return;
    setRateCardsLoading(true);
    try {
      const res = await fetch(`/api/countries/${id}/rate-cards`);
      const data = await res.json();
      if (Array.isArray(data)) setRateCards(data);
      else if (data?.rateCards) setRateCards(data.rateCards);
      else setRateCards([]);
    } catch (error) { console.error("Fetch country rate cards failed:", error); } finally { setRateCardsLoading(false); }
  }, []);

  useEffect(() => { if (complianceCountryId) fetchCompliance(complianceCountryId); }, [complianceCountryId, fetchCompliance]);
  useEffect(() => { if (rateCountryId) fetchRateCards(rateCountryId); }, [rateCountryId, fetchRateCards]);

  const handleEditCountry = (country: Country) => {
    setEditCountry(country);
    setEditForm({ ...country });
  };

  const handleSaveCountry = async () => {
    if (!editCountry) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/countries/${editCountry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (res.ok) { setEditCountry(null); fetchCountries(); }
    } catch (error) { console.error("Save country failed:", error); } finally { setSaving(false); }
  };

  const handleEditCompliance = () => {
    setEditCompliance(true);
    setComplianceForm(compliance ? { ...compliance } : { countryId: Number(complianceCountryId) });
  };

  const handleSaveCompliance = async () => {
    if (!complianceCountryId) return;
    setComplianceSaving(true);
    try {
      const res = await fetch(`/api/countries/${complianceCountryId}/compliance`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(complianceForm),
      });
      if (res.ok) { setEditCompliance(false); fetchCompliance(complianceCountryId); }
    } catch (error) { console.error("Save country compliance failed:", error); } finally { setComplianceSaving(false); }
  };

  const handleEditRateCard = (card: RateCard) => {
    setEditRateCard(card);
    setRateForm({ ...card });
  };

  const handleSaveRateCard = async () => {
    if (!editRateCard || !rateCountryId) return;
    setRateSaving(true);
    try {
      const res = await fetch(`/api/countries/${rateCountryId}/rate-cards`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rateForm),
      });
      if (res.ok) { setEditRateCard(null); fetchRateCards(rateCountryId); }
    } catch (error) { console.error("Save country rate card failed:", error); } finally { setRateSaving(false); }
  };

  const filtered = countries.filter((c) => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.isoCode.toLowerCase().includes(search.toLowerCase())) return false;
    if (tierFilter !== "all" && c.tier !== Number(tierFilter)) return false;
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    return true;
  });

  const ratesByModel = rateCards.reduce<Record<string, RateCard[]>>((acc, rc) => {
    const key = rc.deploymentModel || "unknown";
    if (!acc[key]) acc[key] = [];
    acc[key].push(rc);
    return acc;
  }, {});

  if (loading && countries.length === 0) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Globe className="h-6 w-6 text-violet-500" />
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-countries-title">Countries Management</h1>
            <p className="text-sm text-muted-foreground">Manage international calling countries, compliance profiles, and rate cards.</p>
          </div>
        </div>
        <Button variant="outline" onClick={fetchCountries} disabled={loading} data-testid="button-refresh-countries">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto" data-testid="tabs-countries">
          <TabsTrigger value="countries" data-testid="tab-countries">
            <Globe className="h-3.5 w-3.5 mr-1.5" />
            Countries List
          </TabsTrigger>
          <TabsTrigger value="compliance" data-testid="tab-compliance">
            <Shield className="h-3.5 w-3.5 mr-1.5" />
            Compliance Profiles
          </TabsTrigger>
          <TabsTrigger value="ratecards" data-testid="tab-ratecards">
            <CreditCard className="h-3.5 w-3.5 mr-1.5" />
            Rate Cards
          </TabsTrigger>
        </TabsList>

        <TabsContent value="countries" className="space-y-4 mt-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search country name or code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                data-testid="input-countries-search"
              />
            </div>
            <Select value={tierFilter} onValueChange={setTierFilter}>
              <SelectTrigger className="w-[120px]" data-testid="select-tier-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tiers</SelectItem>
                <SelectItem value="1">Tier 1</SelectItem>
                <SelectItem value="2">Tier 2</SelectItem>
                <SelectItem value="3">Tier 3</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px]" data-testid="select-status-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="secondary" className="no-default-hover-elevate" data-testid="text-countries-count">
              {filtered.length} countries
            </Badge>
          </div>

          <Card>
            <CardContent className="p-0">
              {filtered.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Globe className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No countries found.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table data-testid="table-countries">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Flag</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Calling Code</TableHead>
                        <TableHead>Currency</TableHead>
                        <TableHead>Tier</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Region</TableHead>
                        <TableHead className="w-[50px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((country) => (
                        <TableRow key={country.id} data-testid={`row-country-${country.id}`}>
                          <TableCell>
                            <Badge variant="outline" className="no-default-hover-elevate font-mono text-xs" data-testid={`text-country-iso-${country.id}`}>
                              {country.isoCode}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium" data-testid={`text-country-name-${country.id}`}>{country.name}</TableCell>
                          <TableCell className="font-mono text-sm" data-testid={`text-country-code-${country.id}`}>{country.callingCode}</TableCell>
                          <TableCell className="text-sm" data-testid={`text-country-currency-${country.id}`}>{country.currency}</TableCell>
                          <TableCell data-testid={`text-country-tier-${country.id}`}>
                            <Badge
                              variant="secondary"
                              className={`no-default-hover-elevate text-xs ${country.tier === 1 ? "bg-green-500/10 text-green-600 dark:text-green-400" : country.tier === 2 ? "bg-blue-500/10 text-blue-600 dark:text-blue-400" : ""}`}
                            >
                              Tier {country.tier}
                            </Badge>
                          </TableCell>
                          <TableCell data-testid={`text-country-status-${country.id}`}>
                            <Badge
                              variant="secondary"
                              className={`no-default-hover-elevate text-xs ${country.status === "active" ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-red-500/10 text-red-600 dark:text-red-400"}`}
                            >
                              {country.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground" data-testid={`text-country-region-${country.id}`}>{country.region}</TableCell>
                          <TableCell>
                            <Button size="icon" variant="ghost" onClick={() => handleEditCountry(country)} data-testid={`button-edit-country-${country.id}`}>
                              <Pencil className="h-3.5 w-3.5" />
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

        <TabsContent value="compliance" className="space-y-4 mt-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={complianceCountryId} onValueChange={(v) => { setComplianceCountryId(v); setCompliance(null); setEditCompliance(false); }}>
              <SelectTrigger className="w-[250px]" data-testid="select-compliance-country">
                <SelectValue placeholder="Select a country..." />
              </SelectTrigger>
              <SelectContent>
                {countries.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.name} ({c.isoCode})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {complianceCountryId && !editCompliance && (
              <Button variant="outline" onClick={handleEditCompliance} data-testid="button-edit-compliance">
                <Pencil className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            )}
          </div>

          {!complianceCountryId && (
            <div className="py-12 text-center text-muted-foreground">
              <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Select a country to view its compliance profile.</p>
            </div>
          )}

          {complianceCountryId && complianceLoading && (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}
            </div>
          )}

          {complianceCountryId && !complianceLoading && !editCompliance && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card data-testid="card-calling-hours">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2"><Clock className="h-4 w-4" /> Calling Hours</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between gap-2"><span className="text-muted-foreground">Start</span><span data-testid="text-calling-start">{compliance?.callingHoursStart || "-"}</span></div>
                  <div className="flex justify-between gap-2"><span className="text-muted-foreground">End</span><span data-testid="text-calling-end">{compliance?.callingHoursEnd || "-"}</span></div>
                  <div className="flex justify-between gap-2"><span className="text-muted-foreground">Timezone</span><span data-testid="text-calling-tz">{compliance?.callingHoursTimezone || "-"}</span></div>
                </CardContent>
              </Card>

              <Card data-testid="card-dnc-registry">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2"><Phone className="h-4 w-4" /> DNC Registry</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between gap-2"><span className="text-muted-foreground">Name</span><span data-testid="text-dnc-name">{compliance?.dncRegistryName || "-"}</span></div>
                  <div className="flex justify-between gap-2"><span className="text-muted-foreground">Method</span><span data-testid="text-dnc-method">{compliance?.dncCheckMethod || "-"}</span></div>
                </CardContent>
              </Card>

              <Card data-testid="card-ai-disclosure">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4" /> AI Disclosure</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Required</span>
                    <span data-testid="text-ai-required">
                      {compliance?.aiDisclosureRequired ? <CheckCircle2 className="h-4 w-4 text-green-500 inline" /> : <XCircle className="h-4 w-4 text-muted-foreground inline" />}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2"><span className="text-muted-foreground">Language</span><span data-testid="text-ai-language">{compliance?.aiDisclosureLanguage || "-"}</span></div>
                  {compliance?.aiDisclosureScript && (
                    <div><span className="text-muted-foreground">Script</span><p className="mt-1 text-xs bg-muted/50 rounded-md p-2" data-testid="text-ai-script">{compliance.aiDisclosureScript}</p></div>
                  )}
                </CardContent>
              </Card>

              <Card data-testid="card-recording-consent">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2"><Scale className="h-4 w-4" /> Recording Consent</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between gap-2"><span className="text-muted-foreground">Type</span><span data-testid="text-consent-type">{compliance?.recordingConsentType || "-"}</span></div>
                  {compliance?.recordingConsentScript && (
                    <div><span className="text-muted-foreground">Script</span><p className="mt-1 text-xs bg-muted/50 rounded-md p-2" data-testid="text-consent-script">{compliance.recordingConsentScript}</p></div>
                  )}
                </CardContent>
              </Card>

              <Card data-testid="card-call-limits">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2"><Phone className="h-4 w-4" /> Call Limits</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between gap-2"><span className="text-muted-foreground">Max / Day</span><span data-testid="text-max-day">{compliance?.maxCallAttemptsPerDay ?? "-"}</span></div>
                  <div className="flex justify-between gap-2"><span className="text-muted-foreground">Max / Week</span><span data-testid="text-max-week">{compliance?.maxCallAttemptsPerWeek ?? "-"}</span></div>
                  <div className="flex justify-between gap-2"><span className="text-muted-foreground">Cooling Off (hrs)</span><span data-testid="text-cooling-off">{compliance?.coolingOffHours ?? "-"}</span></div>
                </CardContent>
              </Card>

              <Card data-testid="card-data-retention">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2"><Database className="h-4 w-4" /> Data Retention</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between gap-2"><span className="text-muted-foreground">Retention Days</span><span data-testid="text-retention-days">{compliance?.dataRetentionDays ?? "-"}</span></div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Residency Required</span>
                    <span data-testid="text-residency-required">{compliance?.dataResidencyRequired ? "Yes" : "No"}</span>
                  </div>
                  <div className="flex justify-between gap-2"><span className="text-muted-foreground">Region</span><span data-testid="text-residency-region">{compliance?.dataResidencyRegion || "-"}</span></div>
                </CardContent>
              </Card>

              <Card className="md:col-span-2" data-testid="card-regulatory">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2"><BookOpen className="h-4 w-4" /> Regulatory Body</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between gap-2"><span className="text-muted-foreground">Body</span><span data-testid="text-regulatory-body">{compliance?.regulatoryBody || "-"}</span></div>
                  <div className="flex justify-between gap-2"><span className="text-muted-foreground">URL</span><span data-testid="text-regulatory-url">{compliance?.regulatoryUrl || "-"}</span></div>
                </CardContent>
              </Card>
            </div>
          )}

          {complianceCountryId && editCompliance && (
            <Card data-testid="card-edit-compliance">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Edit Compliance Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Calling Hours Start</Label>
                    <Input value={complianceForm.callingHoursStart || ""} onChange={(e) => setComplianceForm({ ...complianceForm, callingHoursStart: e.target.value })} placeholder="08:00" data-testid="input-calling-start" />
                  </div>
                  <div className="space-y-2">
                    <Label>Calling Hours End</Label>
                    <Input value={complianceForm.callingHoursEnd || ""} onChange={(e) => setComplianceForm({ ...complianceForm, callingHoursEnd: e.target.value })} placeholder="21:00" data-testid="input-calling-end" />
                  </div>
                  <div className="space-y-2">
                    <Label>Timezone</Label>
                    <Input value={complianceForm.callingHoursTimezone || ""} onChange={(e) => setComplianceForm({ ...complianceForm, callingHoursTimezone: e.target.value })} placeholder="America/New_York" data-testid="input-calling-tz" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>DNC Registry Name</Label>
                    <Input value={complianceForm.dncRegistryName || ""} onChange={(e) => setComplianceForm({ ...complianceForm, dncRegistryName: e.target.value })} data-testid="input-dnc-name" />
                  </div>
                  <div className="space-y-2">
                    <Label>DNC Check Method</Label>
                    <Input value={complianceForm.dncCheckMethod || ""} onChange={(e) => setComplianceForm({ ...complianceForm, dncCheckMethod: e.target.value })} data-testid="input-dnc-method" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>AI Disclosure Required</Label>
                    <Select value={complianceForm.aiDisclosureRequired ? "true" : "false"} onValueChange={(v) => setComplianceForm({ ...complianceForm, aiDisclosureRequired: v === "true" })}>
                      <SelectTrigger data-testid="select-ai-required"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>AI Disclosure Language</Label>
                    <Input value={complianceForm.aiDisclosureLanguage || ""} onChange={(e) => setComplianceForm({ ...complianceForm, aiDisclosureLanguage: e.target.value })} data-testid="input-ai-language" />
                  </div>
                  <div className="space-y-2">
                    <Label>Recording Consent Type</Label>
                    <Input value={complianceForm.recordingConsentType || ""} onChange={(e) => setComplianceForm({ ...complianceForm, recordingConsentType: e.target.value })} data-testid="input-consent-type" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>AI Disclosure Script</Label>
                    <Input value={complianceForm.aiDisclosureScript || ""} onChange={(e) => setComplianceForm({ ...complianceForm, aiDisclosureScript: e.target.value })} data-testid="input-ai-script" />
                  </div>
                  <div className="space-y-2">
                    <Label>Recording Consent Script</Label>
                    <Input value={complianceForm.recordingConsentScript || ""} onChange={(e) => setComplianceForm({ ...complianceForm, recordingConsentScript: e.target.value })} data-testid="input-consent-script" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Max Calls / Day</Label>
                    <Input type="number" value={complianceForm.maxCallAttemptsPerDay ?? ""} onChange={(e) => setComplianceForm({ ...complianceForm, maxCallAttemptsPerDay: e.target.value ? Number(e.target.value) : null })} data-testid="input-max-day" />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Calls / Week</Label>
                    <Input type="number" value={complianceForm.maxCallAttemptsPerWeek ?? ""} onChange={(e) => setComplianceForm({ ...complianceForm, maxCallAttemptsPerWeek: e.target.value ? Number(e.target.value) : null })} data-testid="input-max-week" />
                  </div>
                  <div className="space-y-2">
                    <Label>Cooling Off Hours</Label>
                    <Input type="number" value={complianceForm.coolingOffHours ?? ""} onChange={(e) => setComplianceForm({ ...complianceForm, coolingOffHours: e.target.value ? Number(e.target.value) : null })} data-testid="input-cooling-off" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Data Retention Days</Label>
                    <Input type="number" value={complianceForm.dataRetentionDays ?? ""} onChange={(e) => setComplianceForm({ ...complianceForm, dataRetentionDays: e.target.value ? Number(e.target.value) : null })} data-testid="input-retention-days" />
                  </div>
                  <div className="space-y-2">
                    <Label>Data Residency Required</Label>
                    <Select value={complianceForm.dataResidencyRequired ? "true" : "false"} onValueChange={(v) => setComplianceForm({ ...complianceForm, dataResidencyRequired: v === "true" })}>
                      <SelectTrigger data-testid="select-residency-required"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Yes</SelectItem>
                        <SelectItem value="false">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Residency Region</Label>
                    <Input value={complianceForm.dataResidencyRegion || ""} onChange={(e) => setComplianceForm({ ...complianceForm, dataResidencyRegion: e.target.value })} data-testid="input-residency-region" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Regulatory Body</Label>
                    <Input value={complianceForm.regulatoryBody || ""} onChange={(e) => setComplianceForm({ ...complianceForm, regulatoryBody: e.target.value })} data-testid="input-regulatory-body" />
                  </div>
                  <div className="space-y-2">
                    <Label>Regulatory URL</Label>
                    <Input value={complianceForm.regulatoryUrl || ""} onChange={(e) => setComplianceForm({ ...complianceForm, regulatoryUrl: e.target.value })} data-testid="input-regulatory-url" />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="outline" onClick={() => setEditCompliance(false)} data-testid="button-cancel-compliance">Cancel</Button>
                  <Button onClick={handleSaveCompliance} disabled={complianceSaving} data-testid="button-save-compliance">
                    {complianceSaving ? "Saving..." : "Save Profile"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="ratecards" className="space-y-4 mt-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={rateCountryId} onValueChange={(v) => { setRateCountryId(v); setRateCards([]); }}>
              <SelectTrigger className="w-[250px]" data-testid="select-rate-country">
                <SelectValue placeholder="Select a country..." />
              </SelectTrigger>
              <SelectContent>
                {countries.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>{c.name} ({c.isoCode})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {rateCards.length > 0 && (
              <Badge variant="secondary" className="no-default-hover-elevate" data-testid="text-rate-count">
                {rateCards.length} rate cards
              </Badge>
            )}
          </div>

          {!rateCountryId && (
            <div className="py-12 text-center text-muted-foreground">
              <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Select a country to view its rate cards.</p>
            </div>
          )}

          {rateCountryId && rateCardsLoading && (
            <div className="space-y-4">
              {[1, 2].map((i) => <Skeleton key={i} className="h-48" />)}
            </div>
          )}

          {rateCountryId && !rateCardsLoading && rateCards.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">
              <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No rate cards found for this country.</p>
            </div>
          )}

          {rateCountryId && !rateCardsLoading && Object.entries(ratesByModel).map(([model, cards]) => (
            <Card key={model} data-testid={`card-rate-model-${model}`}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  {model.charAt(0).toUpperCase() + model.slice(1).replace(/_/g, " ")}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Direction</TableHead>
                        <TableHead>Number Type</TableHead>
                        <TableHead>Surcharge/min</TableHead>
                        <TableHead>Twilio Est. Cost</TableHead>
                        <TableHead>Margin %</TableHead>
                        <TableHead>Active</TableHead>
                        <TableHead className="w-[50px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cards.map((rc) => (
                        <TableRow key={rc.id} data-testid={`row-rate-${rc.id}`}>
                          <TableCell className="text-sm" data-testid={`text-rate-direction-${rc.id}`}>{rc.direction}</TableCell>
                          <TableCell className="text-sm" data-testid={`text-rate-type-${rc.id}`}>{rc.numberType}</TableCell>
                          <TableCell className="font-mono text-sm" data-testid={`text-rate-surcharge-${rc.id}`}>{rc.surchargePerMinute}</TableCell>
                          <TableCell className="font-mono text-sm" data-testid={`text-rate-twilio-${rc.id}`}>{rc.twilioEstimatedCost}</TableCell>
                          <TableCell className="text-sm" data-testid={`text-rate-margin-${rc.id}`}>{rc.marginPercent}%</TableCell>
                          <TableCell data-testid={`text-rate-active-${rc.id}`}>
                            <Badge
                              variant="secondary"
                              className={`no-default-hover-elevate text-xs ${rc.isActive ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-red-500/10 text-red-600 dark:text-red-400"}`}
                            >
                              {rc.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button size="icon" variant="ghost" onClick={() => handleEditRateCard(rc)} data-testid={`button-edit-rate-${rc.id}`}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      <Dialog open={!!editCountry} onOpenChange={(open) => { if (!open) setEditCountry(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" data-testid="dialog-edit-country">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-muted-foreground" />
              Edit Country
            </DialogTitle>
            <DialogDescription>Update country details</DialogDescription>
          </DialogHeader>
          {editCountry && (
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={editForm.name || ""} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} data-testid="input-edit-name" />
                </div>
                <div className="space-y-2">
                  <Label>ISO Code</Label>
                  <Input value={editForm.isoCode || ""} onChange={(e) => setEditForm({ ...editForm, isoCode: e.target.value })} data-testid="input-edit-iso" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Calling Code</Label>
                  <Input value={editForm.callingCode || ""} onChange={(e) => setEditForm({ ...editForm, callingCode: e.target.value })} data-testid="input-edit-calling-code" />
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Input value={editForm.currency || ""} onChange={(e) => setEditForm({ ...editForm, currency: e.target.value })} data-testid="input-edit-currency" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tier</Label>
                  <Select value={String(editForm.tier || 1)} onValueChange={(v) => setEditForm({ ...editForm, tier: Number(v) })}>
                    <SelectTrigger data-testid="select-edit-tier"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Tier 1</SelectItem>
                      <SelectItem value="2">Tier 2</SelectItem>
                      <SelectItem value="3">Tier 3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={editForm.status || "active"} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                    <SelectTrigger data-testid="select-edit-status"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Region</Label>
                  <Input value={editForm.region || ""} onChange={(e) => setEditForm({ ...editForm, region: e.target.value })} data-testid="input-edit-region" />
                </div>
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Input value={editForm.timezone || ""} onChange={(e) => setEditForm({ ...editForm, timezone: e.target.value })} data-testid="input-edit-timezone" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setEditCountry(null)} data-testid="button-cancel-edit-country">Cancel</Button>
                <Button onClick={handleSaveCountry} disabled={saving} data-testid="button-save-country">
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editRateCard} onOpenChange={(open) => { if (!open) setEditRateCard(null); }}>
        <DialogContent className="max-w-md" data-testid="dialog-edit-rate">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              Edit Rate Card
            </DialogTitle>
            <DialogDescription>Update rate card details</DialogDescription>
          </DialogHeader>
          {editRateCard && (
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Direction</Label>
                  <Input value={rateForm.direction || ""} onChange={(e) => setRateForm({ ...rateForm, direction: e.target.value })} data-testid="input-edit-direction" />
                </div>
                <div className="space-y-2">
                  <Label>Number Type</Label>
                  <Input value={rateForm.numberType || ""} onChange={(e) => setRateForm({ ...rateForm, numberType: e.target.value })} data-testid="input-edit-number-type" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Surcharge/min</Label>
                  <Input value={rateForm.surchargePerMinute || ""} onChange={(e) => setRateForm({ ...rateForm, surchargePerMinute: e.target.value })} data-testid="input-edit-surcharge" />
                </div>
                <div className="space-y-2">
                  <Label>Twilio Est. Cost</Label>
                  <Input value={rateForm.twilioEstimatedCost || ""} onChange={(e) => setRateForm({ ...rateForm, twilioEstimatedCost: e.target.value })} data-testid="input-edit-twilio-cost" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Margin %</Label>
                  <Input value={rateForm.marginPercent || ""} onChange={(e) => setRateForm({ ...rateForm, marginPercent: e.target.value })} data-testid="input-edit-margin" />
                </div>
                <div className="space-y-2">
                  <Label>Active</Label>
                  <Select value={rateForm.isActive ? "true" : "false"} onValueChange={(v) => setRateForm({ ...rateForm, isActive: v === "true" })}>
                    <SelectTrigger data-testid="select-edit-rate-active"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Active</SelectItem>
                      <SelectItem value="false">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setEditRateCard(null)} data-testid="button-cancel-edit-rate">Cancel</Button>
                <Button onClick={handleSaveRateCard} disabled={rateSaving} data-testid="button-save-rate">
                  {rateSaving ? "Saving..." : "Save Rate Card"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
