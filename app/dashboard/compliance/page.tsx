"use client";

import { useEffect, useState } from "react";
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
} from "lucide-react";

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

export default function CompliancePage() {
  const { toast } = useToast();

  const [dncEntries, setDncEntries] = useState<DNCEntry[]>([]);
  const [loadingDnc, setLoadingDnc] = useState(true);
  const [addPhone, setAddPhone] = useState("");
  const [addReason, setAddReason] = useState("");
  const [addingDnc, setAddingDnc] = useState(false);
  const [checkPhone, setCheckPhone] = useState("");
  const [checkResult, setCheckResult] = useState<{ blocked: boolean } | null>(null);
  const [checkingDnc, setCheckingDnc] = useState(false);

  const [consentRecords, setConsentRecords] = useState<ConsentRecord[]>([]);
  const [loadingConsent, setLoadingConsent] = useState(true);
  const [consentFilter, setConsentFilter] = useState("all");

  const [piiText, setPiiText] = useState("");
  const [piiResult, setPiiResult] = useState<PIIScanResult | null>(null);
  const [scanningPii, setScanningPii] = useState(false);
  const [exportingDnc, setExportingDnc] = useState(false);

  const fetchDnc = () => {
    setLoadingDnc(true);
    fetch("/api/compliance/dnc")
      .then((r) => r.json())
      .then((d) => {
        if (d?.entries) setDncEntries(d.entries);
      })
      .catch(() => {
        toast({ title: "Failed to load DNC list", variant: "destructive" });
      })
      .finally(() => setLoadingDnc(false));
  };

  const fetchConsent = () => {
    setLoadingConsent(true);
    fetch("/api/compliance/consent")
      .then((r) => r.json())
      .then((d) => {
        if (d?.records) setConsentRecords(d.records);
      })
      .catch(() => {
        toast({ title: "Failed to load consent records", variant: "destructive" });
      })
      .finally(() => setLoadingConsent(false));
  };

  useEffect(() => {
    fetchDnc();
    fetchConsent();
  }, []);

  const handleAddDnc = async () => {
    if (!addPhone.trim()) return;
    setAddingDnc(true);
    try {
      const res = await fetch("/api/compliance/dnc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: addPhone.trim(), reason: addReason.trim() || undefined }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to add number");
      }
      toast({ title: "Number added to DNC list" });
      setAddPhone("");
      setAddReason("");
      fetchDnc();
    } catch (e: any) {
      toast({ title: e.message || "Failed to add number", variant: "destructive" });
    } finally {
      setAddingDnc(false);
    }
  };

  const handleDeleteDnc = async (phoneNumber: string) => {
    try {
      const res = await fetch(`/api/compliance/dnc?phoneNumber=${encodeURIComponent(phoneNumber)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to remove number");
      }
      toast({ title: "Number removed from DNC list" });
      fetchDnc();
    } catch (e: any) {
      toast({ title: e.message || "Failed to remove number", variant: "destructive" });
    }
  };

  const handleCheckDnc = async () => {
    if (!checkPhone.trim()) return;
    setCheckingDnc(true);
    setCheckResult(null);
    try {
      const res = await fetch("/api/compliance/dnc/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: checkPhone.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Check failed");
      }
      const data = await res.json();
      setCheckResult({ blocked: data.blocked });
    } catch (e: any) {
      toast({ title: e.message || "DNC check failed", variant: "destructive" });
    } finally {
      setCheckingDnc(false);
    }
  };

  const handlePiiScan = async () => {
    if (!piiText.trim()) return;
    setScanningPii(true);
    setPiiResult(null);
    try {
      const res = await fetch("/api/compliance/pii-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: piiText }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Scan failed");
      }
      const data = await res.json();
      setPiiResult(data);
    } catch (e: any) {
      toast({ title: e.message || "PII scan failed", variant: "destructive" });
    } finally {
      setScanningPii(false);
    }
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
    } catch {
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Shield className="h-6 w-6 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-bold text-foreground" data-testid="text-compliance-title">
            Compliance
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage DNC lists, consent records, and scan for PII.
          </p>
        </div>
      </div>

      <Tabs defaultValue="dnc" data-testid="tabs-compliance">
        <TabsList>
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
                    disabled={checkingDnc || !checkPhone.trim()}
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
                  disabled={addingDnc || !addPhone.trim()}
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
                disabled={scanningPii || !piiText.trim()}
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
