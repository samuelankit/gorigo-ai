"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
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
} from "lucide-react";
import { useToast } from "@/lib/use-toast";

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

function getContactStatusBadge(status: string) {
  switch (status) {
    case "valid":
      return <Badge className="no-default-hover-elevate bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">{status}</Badge>;
    case "invalid":
      return <Badge variant="destructive" className="no-default-hover-elevate">{status}</Badge>;
    case "dnc_blocked":
      return <Badge className="no-default-hover-elevate bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20">dnc blocked</Badge>;
    case "pending":
      return <Badge variant="outline" className="no-default-hover-elevate">{status}</Badge>;
    default:
      return <Badge variant="outline" className="no-default-hover-elevate">{status}</Badge>;
  }
}

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactsPage, setContactsPage] = useState(1);
  const [contactsTotalPages, setContactsTotalPages] = useState(1);
  const [contactsTotalCount, setContactsTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState("all");

  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const fetchCampaign = useCallback(() => {
    setLoading(true);
    fetch(`/api/campaigns/${campaignId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load campaign");
        return r.json();
      })
      .then((data) => setCampaign(data))
      .catch(() => {
        toast({ title: "Error", description: "Failed to load campaign details", variant: "destructive" });
      })
      .finally(() => setLoading(false));
  }, [campaignId]);

  const fetchContacts = useCallback(() => {
    setContactsLoading(true);
    const statusParam = statusFilter !== "all" ? `&status=${statusFilter}` : "";
    fetch(`/api/campaigns/${campaignId}/contacts?page=${contactsPage}&limit=50${statusParam}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load contacts");
        return r.json();
      })
      .then((data: ContactsResponse) => {
        setContacts(data.contacts);
        setContactsTotalPages(data.totalPages);
        setContactsTotalCount(data.totalCount);
      })
      .catch(() => {
        toast({ title: "Error", description: "Failed to load contacts", variant: "destructive" });
      })
      .finally(() => setContactsLoading(false));
  }, [campaignId, contactsPage, statusFilter]);

  useEffect(() => {
    fetchCampaign();
  }, [fetchCampaign]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const handleStatusChange = async (newStatus: string, reason?: string) => {
    setActionLoading(true);
    try {
      const body: Record<string, string> = { status: newStatus };
      if (reason) body.reason = reason;

      const res = await fetch(`/api/campaigns/${campaignId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update status");
      }

      toast({ title: "Status Updated", description: `Campaign status changed to "${newStatus}".` });
      fetchCampaign();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to update status", variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleArchive = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to archive");
      }
      toast({ title: "Archived", description: "Campaign has been archived." });
      router.push("/dashboard/campaigns");
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to archive", variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleImport = async () => {
    const lines = importText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) {
      toast({ title: "Validation Error", description: "Please enter at least one phone number", variant: "destructive" });
      return;
    }

    const contactsPayload = lines.map((line) => {
      const parts = line.split(",").map((p) => p.trim());
      return {
        phone: parts[0],
        name: parts[1] || undefined,
        email: parts[2] || undefined,
      };
    });

    setImporting(true);
    setImportResult(null);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/contacts/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contacts: contactsPayload }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to import contacts");
      }

      const result = await res.json();
      setImportResult({
        imported: result.imported,
        valid: result.valid,
        invalid: result.invalid,
        dncBlocked: result.dncBlocked,
        duplicatesSkipped: result.duplicatesSkipped,
      });
      setImportText("");
      toast({ title: "Import Complete", description: `${result.imported} contacts imported.` });
      fetchContacts();
      fetchCampaign();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to import contacts", variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const handleFilterChange = (value: string) => {
    setStatusFilter(value);
    setContactsPage(1);
  };

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
    <div className="space-y-6">
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
        <div className="flex items-center gap-2 flex-wrap">
          {campaign.status === "draft" && (
            <Button
              onClick={() => handleStatusChange("active")}
              disabled={actionLoading}
              data-testid="button-start-campaign"
            >
              {actionLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
              Start Campaign
            </Button>
          )}
          {campaign.status === "active" && (
            <Button
              variant="outline"
              onClick={() => handleStatusChange("paused", "Manual pause")}
              disabled={actionLoading}
              data-testid="button-pause-campaign"
            >
              {actionLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Pause className="h-4 w-4 mr-2" />}
              Pause
            </Button>
          )}
          {campaign.status === "paused" && (
            <Button
              onClick={() => handleStatusChange("active")}
              disabled={actionLoading}
              data-testid="button-resume-campaign"
            >
              {actionLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
              Resume
            </Button>
          )}
          {(campaign.status === "draft" || campaign.status === "paused") && (
            <Button
              variant="destructive"
              onClick={handleArchive}
              disabled={actionLoading}
              data-testid="button-archive-campaign"
            >
              {actionLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Ban className="h-4 w-4 mr-2" />}
              Archive
            </Button>
          )}
        </div>
      </div>

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
                    ? `$${parseFloat(campaign.budgetSpent || "0").toFixed(2)} / $${parseFloat(campaign.budgetCap).toFixed(2)}`
                    : "No limit"}
                  {campaign.dailySpendLimit && (
                    <span className="text-muted-foreground"> (daily: ${parseFloat(campaign.dailySpendLimit).toFixed(2)})</span>
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
                  <SelectItem value="invalid">Invalid</SelectItem>
                  <SelectItem value="dnc_blocked">DNC Blocked</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground" data-testid="text-contacts-count">
              {contactsTotalCount} contact{contactsTotalCount !== 1 ? "s" : ""}
            </p>
          </div>

          <Card>
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
                          {contact.callAttempts || 0}
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
              <Button onClick={handleImport} disabled={importing} data-testid="button-import-contacts">
                {importing ? (
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
    </div>
  );
}
