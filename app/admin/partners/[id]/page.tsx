"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Building2,
  Users,
  DollarSign,
  Network,
  Link2,
  Plus,
  FileText,
  Store,
} from "lucide-react";

interface Partner {
  id: number;
  name: string;
  contactEmail: string;
  contactName?: string;
  tier: string;
  status: string;
  partnerType: string;
  parentPartnerId?: number | null;
  wholesaleRatePerMinute: number;
  resellerRatePerMinute: number;
  monthlyPlatformFee: number;
  revenueSharePercent: number;
  whitelabelMode: string;
  maxClients: number;
  maxResellers: number;
  canCreateResellers: boolean;
  canSellDirect: boolean;
  canCreateAffiliates: boolean;
  customDomain?: string;
  partnerCode?: string;
  brandingLogo?: string;
  brandingPrimaryColor?: string;
  brandingCompanyName?: string;
  mobileAppEnabled?: boolean;
  notes?: string;
}

interface Reseller {
  id: number;
  name: string;
  contactEmail: string;
  contactName?: string;
  tier: string;
  status: string;
  partnerType: string;
  wholesaleRatePerMinute: number;
  revenueSharePercent: number;
  canSellDirect: boolean;
  canCreateAffiliates: boolean;
  createdAt: string;
  clientCount: number;
}

interface PartnerClient {
  id: number;
  orgId: number;
  orgName?: string;
  status?: string;
  retailRatePerMinute?: number;
}

interface Affiliate {
  id: number;
  code: string;
  name: string;
  commissionRate: number;
  totalEarnings: number;
  status: string;
}

type TabKey = "details" | "resellers" | "clients" | "affiliates";

export default function EditPartnerPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [partner, setPartner] = useState<Partner | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("details");

  const [clientCount, setClientCount] = useState(0);
  const [resellerCount, setResellerCount] = useState(0);
  const [affiliateCount, setAffiliateCount] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [parentPartnerName, setParentPartnerName] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactName, setContactName] = useState("");
  const [tier, setTier] = useState("BRONZE");
  const [status, setStatus] = useState("active");
  const [rate, setRate] = useState("");
  const [fee, setFee] = useState("");
  const [whitelabelMode, setWhitelabelMode] = useState("co-branded");
  const [maxClients, setMaxClients] = useState("");
  const [customDomain, setCustomDomain] = useState("");
  const [brandingPrimaryColor, setBrandingPrimaryColor] = useState("");
  const [brandingCompanyName, setBrandingCompanyName] = useState("");
  const [notes, setNotes] = useState("");
  const [revenueSharePercent, setRevenueSharePercent] = useState("");
  const [resellerRatePerMinute, setResellerRatePerMinute] = useState("");
  const [maxResellers, setMaxResellers] = useState("");
  const [canCreateResellers, setCanCreateResellers] = useState(false);
  const [canSellDirect, setCanSellDirect] = useState(false);
  const [canCreateAffiliates, setCanCreateAffiliates] = useState(false);
  const [partnerCode, setPartnerCode] = useState("");
  const [brandingLogo, setBrandingLogo] = useState("");
  const [mobileAppEnabled, setMobileAppEnabled] = useState(false);

  const [resellers, setResellers] = useState<Reseller[]>([]);
  const [resellersLoading, setResellersLoading] = useState(false);
  const [clients, setClients] = useState<PartnerClient[]>([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [affiliatesLoading, setAffiliatesLoading] = useState(false);

  const [resellerDialogOpen, setResellerDialogOpen] = useState(false);
  const [resellerSaving, setResellerSaving] = useState(false);
  const [rName, setRName] = useState("");
  const [rEmail, setREmail] = useState("");
  const [rContactName, setRContactName] = useState("");
  const [rTier, setRTier] = useState("BRONZE");
  const [rRate, setRRate] = useState("");
  const [rRevShare, setRRevShare] = useState("");
  const [rMaxClients, setRMaxClients] = useState("");
  const [rCanSellDirect, setRCanSellDirect] = useState(true);
  const [rCanCreateAffiliates, setRCanCreateAffiliates] = useState(true);
  const [rNotes, setRNotes] = useState("");

  useEffect(() => {
    fetch(`/api/admin/partners/${id}`)
      .then((r) => r.json())
      .then((d) => {
        const p = d?.partner || d;
        if (p) {
          setPartner(p);
          setName(p.name || "");
          setContactEmail(p.contactEmail || "");
          setContactName(p.contactName || "");
          setTier(p.tier || "BRONZE");
          setStatus(p.status || "active");
          setRate(String(p.wholesaleRatePerMinute ?? ""));
          setFee(String(p.monthlyPlatformFee ?? ""));
          setWhitelabelMode(p.whitelabelMode || "co-branded");
          setMaxClients(String(p.maxClients ?? ""));
          setCustomDomain(p.customDomain || "");
          setBrandingPrimaryColor(p.brandingPrimaryColor || "");
          setBrandingCompanyName(p.brandingCompanyName || "");
          setNotes(p.notes || "");
          setRevenueSharePercent(String(p.revenueSharePercent ?? ""));
          setResellerRatePerMinute(String(p.resellerRatePerMinute ?? ""));
          setMaxResellers(String(p.maxResellers ?? ""));
          setCanCreateResellers(!!p.canCreateResellers);
          setCanSellDirect(!!p.canSellDirect);
          setCanCreateAffiliates(!!p.canCreateAffiliates);
          setPartnerCode(p.partnerCode || "");
          setBrandingLogo(p.brandingLogo || "");
          setMobileAppEnabled(!!p.mobileAppEnabled);
        }
        if (d?.clientCount !== undefined) setClientCount(d.clientCount);
        if (d?.clients) setClients(d.clients);
        if (d?.resellerCount !== undefined) setResellerCount(d.resellerCount);
        if (d?.affiliateCount !== undefined) setAffiliateCount(d.affiliateCount);
        if (d?.totalRevenue !== undefined) setTotalRevenue(d.totalRevenue);
        if (d?.parentPartnerName) setParentPartnerName(d.parentPartnerName);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const fetchResellers = () => {
    setResellersLoading(true);
    fetch(`/api/admin/partners/${id}/resellers`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.resellers) setResellers(d.resellers);
        else if (Array.isArray(d)) setResellers(d);
      })
      .catch(() => {})
      .finally(() => setResellersLoading(false));
  };

  const fetchClients = () => {
    setClientsLoading(true);
    fetch(`/api/admin/partners/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.clients) setClients(d.clients);
        else setClients([]);
      })
      .catch(() => {})
      .finally(() => setClientsLoading(false));
  };

  const fetchAffiliates = () => {
    setAffiliatesLoading(true);
    fetch(`/api/admin/affiliates?ownerType=partner&ownerId=${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.affiliates) setAffiliates(d.affiliates);
        else if (Array.isArray(d)) setAffiliates(d);
        else setAffiliates([]);
      })
      .catch(() => {})
      .finally(() => setAffiliatesLoading(false));
  };

  useEffect(() => {
    if (activeTab === "resellers" && resellers.length === 0 && !resellersLoading) {
      fetchResellers();
    } else if (activeTab === "clients" && clients.length === 0 && !clientsLoading) {
      fetchClients();
    } else if (activeTab === "affiliates" && affiliates.length === 0 && !affiliatesLoading) {
      fetchAffiliates();
    }
  }, [activeTab]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name,
        contactEmail,
        contactName: contactName || undefined,
        tier,
        status,
        whitelabelMode,
        customDomain: customDomain || undefined,
        partnerCode: partnerCode || undefined,
        brandingLogo: brandingLogo || undefined,
        brandingPrimaryColor: brandingPrimaryColor || undefined,
        brandingCompanyName: brandingCompanyName || undefined,
        mobileAppEnabled,
        notes: notes || undefined,
        canCreateResellers,
        canSellDirect,
        canCreateAffiliates,
      };
      if (rate) body.wholesaleRatePerMinute = parseFloat(rate);
      if (fee) body.monthlyPlatformFee = parseFloat(fee);
      if (maxClients) body.maxClients = parseInt(maxClients);
      if (revenueSharePercent) body.revenueSharePercent = parseFloat(revenueSharePercent);
      if (resellerRatePerMinute) body.resellerRatePerMinute = parseFloat(resellerRatePerMinute);
      if (maxResellers) body.maxResellers = parseInt(maxResellers);

      const res = await fetch(`/api/admin/partners/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        router.push("/admin/partners");
      }
    } catch {
    } finally {
      setSaving(false);
    }
  };

  const handleCreateReseller = async () => {
    if (!rName || !rEmail) return;
    setResellerSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: rName,
        contactEmail: rEmail,
        contactName: rContactName || undefined,
        tier: rTier,
        canSellDirect: rCanSellDirect,
        canCreateAffiliates: rCanCreateAffiliates,
        notes: rNotes || undefined,
      };
      if (rRate) body.wholesaleRatePerMinute = parseFloat(rRate);
      if (rRevShare) body.revenueSharePercent = parseFloat(rRevShare);
      if (rMaxClients) body.maxClients = parseInt(rMaxClients);

      const res = await fetch(`/api/admin/partners/${id}/resellers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setResellerDialogOpen(false);
        resetResellerForm();
        fetchResellers();
      }
    } catch {
    } finally {
      setResellerSaving(false);
    }
  };

  const resetResellerForm = () => {
    setRName("");
    setREmail("");
    setRContactName("");
    setRTier("BRONZE");
    setRRate("");
    setRRevShare("");
    setRMaxClients("");
    setRCanSellDirect(true);
    setRCanCreateAffiliates(true);
    setRNotes("");
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(amount);

  const getTierBadgeClass = (t: string) => {
    switch (t) {
      case "GOLD":
        return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400";
      case "SILVER":
        return "bg-slate-500/10 text-slate-600 dark:text-slate-400";
      case "BRONZE":
      default:
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
    }
  };

  const getStatusBadgeClass = (s: string) => {
    switch (s) {
      case "active":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
      case "pending":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
      case "rejected":
      case "suspended":
        return "bg-red-500/10 text-red-600 dark:text-red-400";
      default:
        return "";
    }
  };

  const tabs: { key: TabKey; label: string; icon: typeof FileText }[] = [
    { key: "details", label: "Details", icon: FileText },
    ...(partner?.partnerType === "business_partner"
      ? [{ key: "resellers" as TabKey, label: "Resellers", icon: Network }]
      : []),
    { key: "clients", label: "Direct Clients", icon: Store },
    { key: "affiliates", label: "Affiliates", icon: Link2 },
  ];

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Partner not found.</p>
        <Button variant="outline" asChild className="mt-4">
          <Link href="/admin/partners">Back to Partners</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="icon" asChild data-testid="button-back-partners">
          <Link href="/admin/partners">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex items-center gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-foreground" data-testid="text-partner-name">
                {partner.name}
              </h1>
              <Badge
                variant="default"
                className={`no-default-hover-elevate ${
                  partner.partnerType === "business_partner"
                    ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                    : "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                }`}
                data-testid="badge-partner-type"
              >
                {partner.partnerType === "business_partner" ? "Business Partner" : "Reseller"}
              </Badge>
              <Badge
                variant="default"
                className={`no-default-hover-elevate ${getStatusBadgeClass(partner.status)}`}
                data-testid="badge-partner-status"
              >
                {partner.status}
              </Badge>
            </div>
            {partner.parentPartnerId && parentPartnerName && (
              <p className="text-sm text-muted-foreground mt-1">
                Parent:{" "}
                <Link
                  href={`/admin/partners/${partner.parentPartnerId}`}
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                  data-testid="link-parent-partner"
                >
                  {parentPartnerName}
                </Link>
              </p>
            )}
            {!partner.parentPartnerId && (
              <p className="text-sm text-muted-foreground mt-1">Edit partner details and manage channels</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-violet-500/10 to-transparent dark:from-violet-500/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Total Clients</p>
                <p className="text-2xl font-bold text-foreground" data-testid="stat-partner-clients">
                  {clientCount}
                </p>
              </div>
              <div className="w-12 h-12 bg-violet-500 rounded-full flex items-center justify-center shrink-0">
                <Users className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-transparent dark:from-blue-500/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Resellers</p>
                <p className="text-2xl font-bold text-foreground" data-testid="stat-partner-resellers">
                  {resellerCount}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center shrink-0">
                <Network className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/10 to-transparent dark:from-purple-500/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Affiliates</p>
                <p className="text-2xl font-bold text-foreground" data-testid="stat-partner-affiliates">
                  {affiliateCount}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center shrink-0">
                <Link2 className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/10 to-transparent dark:from-amber-500/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Total Revenue</p>
                <p className="text-2xl font-bold text-foreground" data-testid="stat-partner-revenue">
                  {formatCurrency(totalRevenue)}
                </p>
              </div>
              <div className="w-12 h-12 bg-amber-500 rounded-full flex items-center justify-center shrink-0">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {tabs.map((tab) => (
          <Button
            key={tab.key}
            variant={activeTab === tab.key ? "default" : "ghost"}
            onClick={() => setActiveTab(tab.key)}
            data-testid={`tab-${tab.key}`}
          >
            <tab.icon className="h-4 w-4 mr-2" />
            {tab.label}
          </Button>
        ))}
      </div>

      {activeTab === "details" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Partner Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name</Label>
                <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} data-testid="input-edit-name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Contact Email</Label>
                <Input id="edit-email" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} data-testid="input-edit-email" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-contact-name">Contact Name</Label>
                <Input id="edit-contact-name" value={contactName} onChange={(e) => setContactName(e.target.value)} data-testid="input-edit-contact-name" />
              </div>
              <div className="space-y-2">
                <Label>Tier</Label>
                <Select value={tier} onValueChange={setTier}>
                  <SelectTrigger data-testid="select-edit-tier">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BRONZE">Bronze</SelectItem>
                    <SelectItem value="SILVER">Silver</SelectItem>
                    <SelectItem value="GOLD">Gold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger data-testid="select-edit-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Whitelabel Mode</Label>
                <Select value={whitelabelMode} onValueChange={setWhitelabelMode}>
                  <SelectTrigger data-testid="select-edit-whitelabel">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="white-label">White Label</SelectItem>
                    <SelectItem value="co-branded">Co-branded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-rate">Rate/min</Label>
                <Input id="edit-rate" type="number" step="0.01" value={rate} onChange={(e) => setRate(e.target.value)} data-testid="input-edit-rate" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-fee">Monthly Fee</Label>
                <Input id="edit-fee" type="number" step="0.01" value={fee} onChange={(e) => setFee(e.target.value)} data-testid="input-edit-fee" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-max-clients">Max Clients</Label>
                <Input id="edit-max-clients" type="number" value={maxClients} onChange={(e) => setMaxClients(e.target.value)} data-testid="input-edit-max-clients" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-revenue-share">Revenue Share %</Label>
                <Input id="edit-revenue-share" type="number" step="0.1" value={revenueSharePercent} onChange={(e) => setRevenueSharePercent(e.target.value)} data-testid="input-edit-revenue-share" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-reseller-rate">Reseller Rate/min</Label>
                <Input id="edit-reseller-rate" type="number" step="0.01" value={resellerRatePerMinute} onChange={(e) => setResellerRatePerMinute(e.target.value)} data-testid="input-edit-reseller-rate" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-max-resellers">Max Resellers</Label>
                <Input id="edit-max-resellers" type="number" value={maxResellers} onChange={(e) => setMaxResellers(e.target.value)} data-testid="input-edit-max-resellers" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-domain">Custom Domain</Label>
                <Input id="edit-domain" value={customDomain} onChange={(e) => setCustomDomain(e.target.value)} placeholder="partner.example.com" data-testid="input-edit-domain" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-branding-color">Branding Primary Color</Label>
                <Input id="edit-branding-color" value={brandingPrimaryColor} onChange={(e) => setBrandingPrimaryColor(e.target.value)} placeholder="#3B82F6" data-testid="input-edit-branding-color" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-branding-name">Branding Company Name</Label>
              <Input id="edit-branding-name" value={brandingCompanyName} onChange={(e) => setBrandingCompanyName(e.target.value)} data-testid="input-edit-branding-name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea id="edit-notes" value={notes} onChange={(e) => setNotes(e.target.value)} data-testid="input-edit-notes" />
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Mobile App Branding</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Mobile App Enabled</p>
                    <p className="text-xs text-muted-foreground">Allow this partner's clients to use the GoRigo mobile app with their branding</p>
                  </div>
                  <Switch
                    checked={mobileAppEnabled}
                    onCheckedChange={setMobileAppEnabled}
                    data-testid="switch-mobile-app-enabled"
                  />
                </div>
                {mobileAppEnabled && (
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label htmlFor="edit-partner-code">Partner Code</Label>
                      <Input
                        id="edit-partner-code"
                        value={partnerCode}
                        onChange={(e) => setPartnerCode(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ""))}
                        placeholder="e.g. ACME-CALL"
                        data-testid="input-edit-partner-code"
                      />
                      <p className="text-xs text-muted-foreground">Clients enter this code in the GoRigo app to load your branding. Letters, numbers, hyphens and underscores only.</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-branding-logo">Logo URL</Label>
                      <Input
                        id="edit-branding-logo"
                        value={brandingLogo}
                        onChange={(e) => setBrandingLogo(e.target.value)}
                        placeholder="https://example.com/logo.png"
                        data-testid="input-edit-branding-logo"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Channel Capabilities</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Can Create Resellers</p>
                    <p className="text-xs text-muted-foreground">Allow this partner to create sub-resellers</p>
                  </div>
                  <Switch
                    checked={canCreateResellers}
                    onCheckedChange={setCanCreateResellers}
                    data-testid="switch-can-create-resellers"
                  />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Can Sell Direct</p>
                    <p className="text-xs text-muted-foreground">Allow direct sales to end clients</p>
                  </div>
                  <Switch
                    checked={canSellDirect}
                    onCheckedChange={setCanSellDirect}
                    data-testid="switch-can-sell-direct"
                  />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">Can Create Affiliates</p>
                    <p className="text-xs text-muted-foreground">Allow this partner to create affiliate links</p>
                  </div>
                  <Switch
                    checked={canCreateAffiliates}
                    onCheckedChange={setCanCreateAffiliates}
                    data-testid="switch-can-create-affiliates"
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end pt-2">
              <Button onClick={handleSave} disabled={saving} data-testid="button-save-partner">
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "resellers" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
            <CardTitle className="text-base">Sub-Resellers</CardTitle>
            <Button onClick={() => setResellerDialogOpen(true)} data-testid="button-add-reseller">
              <Plus className="h-4 w-4 mr-2" />
              Add Reseller
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {resellersLoading ? (
              <div className="space-y-3 p-6">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : resellers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-3">
                  <Network className="w-6 h-6 text-muted-foreground/60" />
                </div>
                <p className="text-sm text-muted-foreground" data-testid="text-no-resellers">No resellers found.</p>
              </div>
            ) : (
              <Table data-testid="table-resellers">
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Clients</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resellers.map((r) => (
                    <TableRow key={r.id} data-testid={`row-reseller-${r.id}`}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell className="text-sm">{r.contactEmail}</TableCell>
                      <TableCell>
                        <Badge variant="default" className={`no-default-hover-elevate ${getTierBadgeClass(r.tier)}`}>
                          {r.tier}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="default" className={`no-default-hover-elevate ${getStatusBadgeClass(r.status)}`}>
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{r.clientCount ?? 0}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" asChild data-testid={`button-view-reseller-${r.id}`}>
                          <Link href={`/admin/partners/${r.id}`}>
                            <Building2 className="h-4 w-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "clients" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Direct Clients</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {clientsLoading ? (
              <div className="space-y-3 p-6">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : clients.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-3">
                  <Store className="w-6 h-6 text-muted-foreground/60" />
                </div>
                <p className="text-sm text-muted-foreground" data-testid="text-no-clients">No direct clients found.</p>
              </div>
            ) : (
              <Table data-testid="table-clients">
                <TableHeader>
                  <TableRow>
                    <TableHead>Organization</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Retail Rate/min</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((c, idx) => (
                    <TableRow key={c.id || idx} data-testid={`row-client-${c.id || idx}`}>
                      <TableCell className="font-medium">{c.orgName || `Org #${c.orgId}`}</TableCell>
                      <TableCell>
                        <Badge variant="default" className={`no-default-hover-elevate ${getStatusBadgeClass(c.status || "active")}`}>
                          {c.status || "active"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {c.retailRatePerMinute !== undefined ? formatCurrency(c.retailRatePerMinute) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "affiliates" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Affiliate Links</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {affiliatesLoading ? (
              <div className="space-y-3 p-6">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : affiliates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-3">
                  <Link2 className="w-6 h-6 text-muted-foreground/60" />
                </div>
                <p className="text-sm text-muted-foreground" data-testid="text-no-affiliates">No affiliate links found.</p>
              </div>
            ) : (
              <Table data-testid="table-affiliates">
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Commission Rate</TableHead>
                    <TableHead>Total Earnings</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {affiliates.map((a) => (
                    <TableRow key={a.id} data-testid={`row-affiliate-${a.id}`}>
                      <TableCell className="font-mono text-sm">{a.code}</TableCell>
                      <TableCell className="font-medium">{a.name}</TableCell>
                      <TableCell className="text-sm">{a.commissionRate}%</TableCell>
                      <TableCell className="text-sm">{formatCurrency(a.totalEarnings ?? 0)}</TableCell>
                      <TableCell>
                        <Badge variant="default" className={`no-default-hover-elevate ${getStatusBadgeClass(a.status)}`}>
                          {a.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={resellerDialogOpen} onOpenChange={setResellerDialogOpen}>
        <DialogContent className="max-w-lg" data-testid="dialog-add-reseller">
          <DialogHeader>
            <DialogTitle>Add New Reseller</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label htmlFor="reseller-name">Name *</Label>
              <Input id="reseller-name" value={rName} onChange={(e) => setRName(e.target.value)} placeholder="Reseller name" data-testid="input-reseller-name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reseller-email">Contact Email *</Label>
              <Input id="reseller-email" type="email" value={rEmail} onChange={(e) => setREmail(e.target.value)} placeholder="email@example.com" data-testid="input-reseller-email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reseller-contact-name">Contact Name</Label>
              <Input id="reseller-contact-name" value={rContactName} onChange={(e) => setRContactName(e.target.value)} placeholder="Contact person" data-testid="input-reseller-contact-name" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tier</Label>
                <Select value={rTier} onValueChange={setRTier}>
                  <SelectTrigger data-testid="select-reseller-tier">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BRONZE">Bronze</SelectItem>
                    <SelectItem value="SILVER">Silver</SelectItem>
                    <SelectItem value="GOLD">Gold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reseller-max-clients">Max Clients</Label>
                <Input id="reseller-max-clients" type="number" value={rMaxClients} onChange={(e) => setRMaxClients(e.target.value)} placeholder="25" data-testid="input-reseller-max-clients" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reseller-rate">Wholesale Rate/min</Label>
                <Input id="reseller-rate" type="number" step="0.01" value={rRate} onChange={(e) => setRRate(e.target.value)} placeholder="0.04" data-testid="input-reseller-rate" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reseller-rev-share">Revenue Share %</Label>
                <Input id="reseller-rev-share" type="number" step="0.1" value={rRevShare} onChange={(e) => setRRevShare(e.target.value)} placeholder="10" data-testid="input-reseller-rev-share" />
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Can Sell Direct</p>
                  <p className="text-xs text-muted-foreground">Allow direct sales to end clients</p>
                </div>
                <Switch
                  checked={rCanSellDirect}
                  onCheckedChange={setRCanSellDirect}
                  data-testid="switch-reseller-can-sell-direct"
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">Can Create Affiliates</p>
                  <p className="text-xs text-muted-foreground">Allow creation of affiliate links</p>
                </div>
                <Switch
                  checked={rCanCreateAffiliates}
                  onCheckedChange={setRCanCreateAffiliates}
                  data-testid="switch-reseller-can-create-affiliates"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reseller-notes">Notes</Label>
              <Textarea id="reseller-notes" value={rNotes} onChange={(e) => setRNotes(e.target.value)} placeholder="Additional notes..." data-testid="input-reseller-notes" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setResellerDialogOpen(false)} data-testid="button-cancel-reseller">
                Cancel
              </Button>
              <Button onClick={handleCreateReseller} disabled={resellerSaving || !rName || !rEmail} data-testid="button-submit-reseller">
                {resellerSaving ? "Creating..." : "Create Reseller"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
