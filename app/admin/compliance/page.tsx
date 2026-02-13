"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Shield,
  Phone,
  FileText,
  Search,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  PhoneOff,
  Mic,
  Brain,
  BarChart3,
  Building2,
  RefreshCw,
} from "lucide-react";

interface OverviewData {
  dnc: { totalEntries: number; uniqueOrgs: number; recentAdded: number };
  consent: { totalRecords: number; activeConsents: number; revokedConsents: number; recentRecords: number };
  callCompliance: { totalCalls: number; disclosurePlayed: number; recorded: number; qualityScored: number; sentimentAnalysed: number };
  dncByOrg: { orgId: number; orgName: string; entryCount: number }[];
}

interface DNCEntry {
  id: number;
  orgId: number;
  phoneNumber: string;
  reason: string | null;
  source: string | null;
  notes: string | null;
  expiresAt: string | null;
  createdAt: string | null;
  orgName: string;
}

interface ConsentRecord {
  id: number;
  orgId: number;
  phoneNumber: string;
  consentType: string;
  consentGiven: boolean;
  consentMethod: string | null;
  revokedAt: string | null;
  revokedReason: string | null;
  expiresAt: string | null;
  createdAt: string | null;
  orgName: string;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function StatCard({ title, value, icon: Icon, description, variant = "default" }: {
  title: string;
  value: number | string;
  icon: React.ElementType;
  description?: string;
  variant?: "default" | "success" | "warning" | "danger";
}) {
  const iconColors: Record<string, string> = {
    default: "text-violet-500",
    success: "text-green-500",
    warning: "text-amber-500",
    danger: "text-red-500",
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1" data-testid={`text-stat-${title.toLowerCase().replace(/\s+/g, "-")}`}>{value}</p>
            {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
          </div>
          <Icon className={`h-5 w-5 shrink-0 ${iconColors[variant]}`} />
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminCompliancePage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState("30");
  const [overview, setOverview] = useState<OverviewData | null>(null);

  const [dncEntries, setDncEntries] = useState<DNCEntry[]>([]);
  const [dncTotal, setDncTotal] = useState(0);
  const [dncSearch, setDncSearch] = useState("");
  const [dncPage, setDncPage] = useState(0);
  const [dncLoading, setDncLoading] = useState(false);

  const [consentRecords, setConsentRecords] = useState<ConsentRecord[]>([]);
  const [consentTotal, setConsentTotal] = useState(0);
  const [consentSearch, setConsentSearch] = useState("");
  const [consentStatus, setConsentStatus] = useState("all");
  const [consentPage, setConsentPage] = useState(0);
  const [consentLoading, setConsentLoading] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<DNCEntry | null>(null);
  const [deleting, setDeleting] = useState(false);

  const PAGE_SIZE = 25;

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/compliance?tab=overview&days=${days}`);
      const d = await res.json();
      if (d && !d.error) setOverview(d);
    } catch {} finally {
      setLoading(false);
    }
  }, [days]);

  const fetchDNC = useCallback(async () => {
    setDncLoading(true);
    try {
      const params = new URLSearchParams({ tab: "dnc", limit: String(PAGE_SIZE), offset: String(dncPage * PAGE_SIZE) });
      if (dncSearch) params.set("search", dncSearch);
      const res = await fetch(`/api/admin/compliance?${params}`);
      const d = await res.json();
      if (d?.entries) { setDncEntries(d.entries); setDncTotal(d.total || 0); }
    } catch {} finally {
      setDncLoading(false);
    }
  }, [dncSearch, dncPage]);

  const fetchConsent = useCallback(async () => {
    setConsentLoading(true);
    try {
      const params = new URLSearchParams({ tab: "consent", limit: String(PAGE_SIZE), offset: String(consentPage * PAGE_SIZE) });
      if (consentSearch) params.set("search", consentSearch);
      if (consentStatus !== "all") params.set("status", consentStatus);
      const res = await fetch(`/api/admin/compliance?${params}`);
      const d = await res.json();
      if (d?.records) { setConsentRecords(d.records); setConsentTotal(d.total || 0); }
    } catch {} finally {
      setConsentLoading(false);
    }
  }, [consentSearch, consentStatus, consentPage]);

  useEffect(() => { fetchOverview(); }, [fetchOverview]);
  useEffect(() => { if (activeTab === "dnc") fetchDNC(); }, [activeTab, fetchDNC]);
  useEffect(() => { if (activeTab === "consent") fetchConsent(); }, [activeTab, fetchConsent]);

  const confirmDeleteDNC = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/compliance?id=${deleteTarget.id}&type=dnc`, { method: "DELETE" });
      if (res.ok) {
        fetchDNC();
        setDeleteTarget(null);
      }
    } catch {} finally {
      setDeleting(false);
    }
  };

  const dncTotalPages = Math.ceil(dncTotal / PAGE_SIZE);
  const consentTotalPages = Math.ceil(consentTotal / PAGE_SIZE);

  if (loading && !overview) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2].map((i) => <Skeleton key={i} className="h-64" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-violet-500" />
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-compliance-title">Compliance Centre</h1>
            <p className="text-sm text-muted-foreground">TCPA, DNC enforcement, consent records, and compliance monitoring across all organisations.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={days} onValueChange={(v) => { setDays(v); }}>
            <SelectTrigger className="w-[140px]" data-testid="select-days-range">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="14">Last 14 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => { fetchOverview(); if (activeTab === "dnc") fetchDNC(); if (activeTab === "consent") fetchConsent(); }} data-testid="button-refresh-compliance">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto" data-testid="tabs-compliance">
          <TabsTrigger value="overview" data-testid="tab-overview">
            <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="dnc" data-testid="tab-dnc">
            <PhoneOff className="h-3.5 w-3.5 mr-1.5" />
            DNC List
          </TabsTrigger>
          <TabsTrigger value="consent" data-testid="tab-consent">
            <FileText className="h-3.5 w-3.5 mr-1.5" />
            Consent Records
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          {overview && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="DNC Entries" value={Number(overview.dnc.totalEntries).toLocaleString()} icon={PhoneOff} description={`${Number(overview.dnc.recentAdded)} added in ${days}d`} />
                <StatCard title="Active Consents" value={Number(overview.consent.activeConsents).toLocaleString()} icon={ShieldCheck} variant="success" description={`${Number(overview.consent.revokedConsents)} revoked`} />
                <StatCard title="AI Disclosure Rate" value={Number(overview.callCompliance.totalCalls) > 0 ? `${Math.round((Number(overview.callCompliance.disclosurePlayed) / Number(overview.callCompliance.totalCalls)) * 100)}%` : "N/A"} icon={Shield} variant={Number(overview.callCompliance.totalCalls) > 0 && (Number(overview.callCompliance.disclosurePlayed) / Number(overview.callCompliance.totalCalls)) < 0.9 ? "warning" : "success"} description={`${Number(overview.callCompliance.disclosurePlayed)} of ${Number(overview.callCompliance.totalCalls)} calls`} />
                <StatCard title="Calls Recorded" value={Number(overview.callCompliance.recorded).toLocaleString()} icon={Mic} description={`${Number(overview.callCompliance.qualityScored)} quality scored`} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card data-testid="card-dnc-by-org">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      DNC Entries by Organisation
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {overview.dncByOrg.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Organisation</TableHead>
                            <TableHead className="text-right">Entries</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {overview.dncByOrg.map((org) => (
                            <TableRow key={org.orgId}>
                              <TableCell className="text-sm font-medium" data-testid={`text-dnc-org-${org.orgId}`}>{org.orgName}</TableCell>
                              <TableCell className="text-right">
                                <Badge variant="secondary" className="no-default-hover-elevate">{org.entryCount}</Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-6">No DNC entries found.</p>
                    )}
                  </CardContent>
                </Card>

                <Card data-testid="card-call-compliance">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Brain className="h-4 w-4" />
                      Call Compliance ({days}d)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <ComplianceMetricRow label="AI Disclosure Played" value={Number(overview.callCompliance.disclosurePlayed)} total={Number(overview.callCompliance.totalCalls)} icon={Shield} />
                      <ComplianceMetricRow label="Calls Recorded" value={Number(overview.callCompliance.recorded)} total={Number(overview.callCompliance.totalCalls)} icon={Mic} />
                      <ComplianceMetricRow label="Quality Scored" value={Number(overview.callCompliance.qualityScored)} total={Number(overview.callCompliance.totalCalls)} icon={BarChart3} />
                      <ComplianceMetricRow label="Sentiment Analysed" value={Number(overview.callCompliance.sentimentAnalysed)} total={Number(overview.callCompliance.totalCalls)} icon={Brain} />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card data-testid="card-consent-overview">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Consent Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Total Records</p>
                      <p className="text-xl font-bold" data-testid="text-consent-total">{Number(overview.consent.totalRecords).toLocaleString()}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Active</p>
                      <p className="text-xl font-bold text-green-600 dark:text-green-400" data-testid="text-consent-active">{Number(overview.consent.activeConsents).toLocaleString()}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Revoked</p>
                      <p className="text-xl font-bold text-red-600 dark:text-red-400" data-testid="text-consent-revoked">{Number(overview.consent.revokedConsents).toLocaleString()}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Recent ({days}d)</p>
                      <p className="text-xl font-bold" data-testid="text-consent-recent">{Number(overview.consent.recentRecords).toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* DNC List Tab */}
        <TabsContent value="dnc" className="space-y-4 mt-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search phone number or reason..."
                value={dncSearch}
                onChange={(e) => { setDncSearch(e.target.value); setDncPage(0); }}
                className="pl-9"
                data-testid="input-dnc-search"
              />
            </div>
            <Badge variant="secondary" className="no-default-hover-elevate" data-testid="text-dnc-total">
              {dncTotal.toLocaleString()} entries
            </Badge>
          </div>

          <Card>
            <CardContent className="p-0">
              {dncLoading ? (
                <div className="p-6 space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : dncEntries.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <PhoneOff className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No DNC entries found.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Phone Number</TableHead>
                      <TableHead>Organisation</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Added</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dncEntries.map((entry) => (
                      <TableRow key={entry.id} data-testid={`row-dnc-${entry.id}`}>
                        <TableCell className="font-mono text-sm" data-testid={`text-dnc-phone-${entry.id}`}>{entry.phoneNumber}</TableCell>
                        <TableCell className="text-sm">{entry.orgName}</TableCell>
                        <TableCell>
                          {entry.reason ? (
                            <Badge variant="outline" className="text-xs no-default-hover-elevate">{entry.reason}</Badge>
                          ) : "-"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{entry.source || "-"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(entry.createdAt)}</TableCell>
                        <TableCell>
                          <Button size="icon" variant="ghost" onClick={() => setDeleteTarget(entry)} data-testid={`button-delete-dnc-${entry.id}`}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {dncTotalPages > 1 && (
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                Page {dncPage + 1} of {dncTotalPages}
              </p>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="outline" disabled={dncPage === 0} onClick={() => setDncPage(dncPage - 1)} data-testid="button-dnc-prev">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="outline" disabled={dncPage >= dncTotalPages - 1} onClick={() => setDncPage(dncPage + 1)} data-testid="button-dnc-next">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Consent Records Tab */}
        <TabsContent value="consent" className="space-y-4 mt-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search phone number or consent type..."
                value={consentSearch}
                onChange={(e) => { setConsentSearch(e.target.value); setConsentPage(0); }}
                className="pl-9"
                data-testid="input-consent-search"
              />
            </div>
            <Select value={consentStatus} onValueChange={(v) => { setConsentStatus(v); setConsentPage(0); }}>
              <SelectTrigger className="w-[130px]" data-testid="select-consent-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="revoked">Revoked</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="secondary" className="no-default-hover-elevate" data-testid="text-consent-count">
              {consentTotal.toLocaleString()} records
            </Badge>
          </div>

          <Card>
            <CardContent className="p-0">
              {consentLoading ? (
                <div className="p-6 space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : consentRecords.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No consent records found.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Phone Number</TableHead>
                      <TableHead>Organisation</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {consentRecords.map((record) => (
                      <TableRow key={record.id} data-testid={`row-consent-${record.id}`}>
                        <TableCell className="font-mono text-sm" data-testid={`text-consent-phone-${record.id}`}>{record.phoneNumber}</TableCell>
                        <TableCell className="text-sm">{record.orgName}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs no-default-hover-elevate">{record.consentType}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{record.consentMethod || "-"}</TableCell>
                        <TableCell>
                          {record.revokedAt ? (
                            <Badge variant="secondary" className="no-default-hover-elevate bg-red-500/10 text-red-600 dark:text-red-400 text-xs">Revoked</Badge>
                          ) : record.consentGiven ? (
                            <Badge variant="secondary" className="no-default-hover-elevate bg-green-500/10 text-green-600 dark:text-green-400 text-xs">Active</Badge>
                          ) : (
                            <Badge variant="secondary" className="no-default-hover-elevate text-xs">Denied</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(record.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {consentTotalPages > 1 && (
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                Page {consentPage + 1} of {consentTotalPages}
              </p>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="outline" disabled={consentPage === 0} onClick={() => setConsentPage(consentPage - 1)} data-testid="button-consent-prev">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="outline" disabled={consentPage >= consentTotalPages - 1} onClick={() => setConsentPage(consentPage + 1)} data-testid="button-consent-next">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove DNC Entry</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove <span className="font-mono font-semibold">{deleteTarget?.phoneNumber}</span> from the Do-Not-Call list for <span className="font-semibold">{deleteTarget?.orgName}</span>? This will allow calls to this number.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} data-testid="button-cancel-delete">Cancel</Button>
            <Button variant="destructive" onClick={confirmDeleteDNC} disabled={deleting} data-testid="button-confirm-delete">
              {deleting ? "Removing..." : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ComplianceMetricRow({ label, value, total, icon: Icon }: {
  label: string;
  value: number;
  total: number;
  icon: React.ElementType;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-sm">{label}</span>
          <span className="text-sm font-medium">{value.toLocaleString()} / {total.toLocaleString()} ({pct}%)</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${pct >= 90 ? "bg-green-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500"}`}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
