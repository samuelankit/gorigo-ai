"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, Plus, Pencil, CheckCircle2, XCircle, Ban, Download, Network, ShoppingBag, Link2 } from "lucide-react";

interface Partner {
  id: number;
  name: string;
  contactEmail: string;
  contactName?: string;
  tier: string;
  status: string;
  partnerType?: string;
  parentPartnerId?: number;
  wholesaleRatePerMinute: number;
  monthlyPlatformFee: number;
  whitelabelMode: string;
  maxClients: number;
  canCreateResellers?: boolean;
  canSellDirect?: boolean;
  canCreateAffiliates?: boolean;
  notes?: string;
  clientCount?: number;
  createdAt: string;
}

export default function PartnersPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center p-8"><div className="animate-pulse text-muted-foreground">Loading...</div></div>}>
      <PartnersContent />
    </Suspense>
  );
}

function PartnersContent() {
  const searchParams = useSearchParams();
  const initialFilter = searchParams.get("filter") || "all";

  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [approvalPartner, setApprovalPartner] = useState<Partner | null>(null);
  const [approvalAction, setApprovalAction] = useState<"approve" | "reject">("approve");
  const [approvalNotes, setApprovalNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState(initialFilter);
  const [typeFilter, setTypeFilter] = useState("all");

  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formContactName, setFormContactName] = useState("");
  const [formTier, setFormTier] = useState("BRONZE");
  const [formRate, setFormRate] = useState("");
  const [formResellerRate, setFormResellerRate] = useState("");
  const [formFee, setFormFee] = useState("");
  const [formRevenueShare, setFormRevenueShare] = useState("");
  const [formWhitelabel, setFormWhitelabel] = useState("co-branded");
  const [formMaxClients, setFormMaxClients] = useState("");
  const [formMaxResellers, setFormMaxResellers] = useState("");
  const [formCanCreateResellers, setFormCanCreateResellers] = useState(true);
  const [formCanSellDirect, setFormCanSellDirect] = useState(true);
  const [formCanCreateAffiliates, setFormCanCreateAffiliates] = useState(true);
  const [formNotes, setFormNotes] = useState("");

  const fetchPartners = () => {
    setLoading(true);
    fetch("/api/admin/partners")
      .then((r) => r.json())
      .then((d) => {
        if (d?.partners) setPartners(d.partners);
        else if (Array.isArray(d)) setPartners(d);
      })
      .catch(() => { setError(true); })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPartners();
  }, []);

  const filteredPartners = partners.filter((p) => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (typeFilter === "business_partner" && p.partnerType === "reseller") return false;
    if (typeFilter === "reseller" && p.partnerType !== "reseller") return false;
    return true;
  });

  const handleCreate = async () => {
    if (!formName || !formEmail) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: formName,
        contactEmail: formEmail,
        contactName: formContactName || undefined,
        tier: formTier,
        whitelabelMode: formWhitelabel,
        status: "pending",
        canCreateResellers: formCanCreateResellers,
        canSellDirect: formCanSellDirect,
        canCreateAffiliates: formCanCreateAffiliates,
      };
      if (formRate) body.wholesaleRatePerMinute = parseFloat(formRate);
      if (formResellerRate) body.resellerRatePerMinute = parseFloat(formResellerRate);
      if (formFee) body.monthlyPlatformFee = parseFloat(formFee);
      if (formRevenueShare) body.revenueSharePercent = parseFloat(formRevenueShare);
      if (formMaxClients) body.maxClients = parseInt(formMaxClients);
      if (formMaxResellers) body.maxResellers = parseInt(formMaxResellers);
      if (formNotes) body.notes = formNotes;

      const res = await fetch("/api/admin/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setDialogOpen(false);
        resetForm();
        fetchPartners();
      }
    } catch (error) {
      console.error("Create partner failed:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleApproval = async () => {
    if (!approvalPartner) return;
    setSaving(true);
    try {
      const newStatus = approvalAction === "approve" ? "active" : "rejected";
      const body: Record<string, unknown> = { status: newStatus };
      if (approvalNotes) body.notes = approvalNotes;

      const res = await fetch(`/api/admin/partners/${approvalPartner.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setApprovalDialogOpen(false);
        setApprovalPartner(null);
        setApprovalNotes("");
        fetchPartners();
      }
    } catch (error) {
      console.error("Partner approval action failed:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (partner: Partner) => {
    const newStatus = partner.status === "active" ? "suspended" : "active";
    try {
      const res = await fetch(`/api/admin/partners/${partner.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchPartners();
      }
    } catch (error) {
      console.error("Toggle partner status failed:", error);
    }
  };

  const openApprovalDialog = (partner: Partner, action: "approve" | "reject") => {
    setApprovalPartner(partner);
    setApprovalAction(action);
    setApprovalNotes("");
    setApprovalDialogOpen(true);
  };

  const resetForm = () => {
    setFormName("");
    setFormEmail("");
    setFormContactName("");
    setFormTier("BRONZE");
    setFormRate("");
    setFormResellerRate("");
    setFormFee("");
    setFormRevenueShare("");
    setFormWhitelabel("co-branded");
    setFormMaxClients("");
    setFormMaxResellers("");
    setFormCanCreateResellers(true);
    setFormCanSellDirect(true);
    setFormCanCreateAffiliates(true);
    setFormNotes("");
  };

  const exportCSV = () => {
    const headers = ["Name", "Contact Email", "Type", "Tier", "Status", "Rate/min", "Channels", "Clients", "Created"];
    const rows = filteredPartners.map((p) => {
      const channels = [];
      if (p.canCreateResellers) channels.push("Resellers");
      if (p.canSellDirect) channels.push("Direct");
      if (p.canCreateAffiliates) channels.push("Affiliates");
      return [
        p.name,
        p.contactEmail,
        p.partnerType === "reseller" ? "Reseller" : "Business Partner",
        p.tier,
        p.status,
        String(p.wholesaleRatePerMinute ?? 0),
        channels.join("+") || "None",
        String(p.clientCount ?? 0),
        p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "",
      ];
    });
    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `partners-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getTierBadgeClass = (tier: string) => {
    switch (tier) {
      case "GOLD":
        return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400";
      case "SILVER":
        return "bg-slate-500/10 text-slate-600 dark:text-slate-400";
      case "BRONZE":
      default:
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
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

  const pendingCount = partners.filter((p) => p.status === "pending").length;
  const businessPartnerCount = partners.filter((p) => p.partnerType !== "reseller").length;
  const resellerCount = partners.filter((p) => p.partnerType === "reseller").length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-500/10">
            <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground" data-testid="text-partners-title">
              Partner Management
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage business partners, resellers, and distribution channels.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={exportCSV} data-testid="button-export-partners">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={() => setDialogOpen(true)} data-testid="button-add-partner">
            <Plus className="h-4 w-4 mr-2" />
            Add Business Partner
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Total Partners</p>
            <p className="text-xl font-bold text-foreground" data-testid="stat-total-partners">{partners.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Business Partners</p>
            <p className="text-xl font-bold text-foreground" data-testid="stat-business-partners">{businessPartnerCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Resellers</p>
            <p className="text-xl font-bold text-foreground" data-testid="stat-resellers">{resellerCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Pending Approval</p>
            <p className="text-xl font-bold text-foreground" data-testid="stat-pending">{pendingCount}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48" data-testid="select-status-filter">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending Approval</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-48" data-testid="select-type-filter">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="business_partner">Business Partners</SelectItem>
            <SelectItem value="reseller">Resellers</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="dialog-add-partner">
          <DialogHeader>
            <DialogTitle>Add New Business Partner</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label htmlFor="partner-name">Name *</Label>
              <Input id="partner-name" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Partner name" data-testid="input-partner-name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="partner-email">Contact Email *</Label>
              <Input id="partner-email" type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="email@example.com" data-testid="input-partner-email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="partner-contact-name">Contact Name</Label>
              <Input id="partner-contact-name" value={formContactName} onChange={(e) => setFormContactName(e.target.value)} placeholder="Contact person" data-testid="input-partner-contact-name" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tier</Label>
                <Select value={formTier} onValueChange={setFormTier}>
                  <SelectTrigger data-testid="select-partner-tier">
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
                <Label>Whitelabel Mode</Label>
                <Select value={formWhitelabel} onValueChange={setFormWhitelabel}>
                  <SelectTrigger data-testid="select-partner-whitelabel">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="white-label">White Label</SelectItem>
                    <SelectItem value="co-branded">Co-branded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="partner-rate">Wholesale Rate/min</Label>
                <Input id="partner-rate" type="number" step="0.01" value={formRate} onChange={(e) => setFormRate(e.target.value)} placeholder="0.05" data-testid="input-partner-rate" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="partner-reseller-rate">Reseller Rate/min</Label>
                <Input id="partner-reseller-rate" type="number" step="0.01" value={formResellerRate} onChange={(e) => setFormResellerRate(e.target.value)} placeholder="0.04" data-testid="input-partner-reseller-rate" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="partner-fee">Monthly Fee</Label>
                <Input id="partner-fee" type="number" step="0.01" value={formFee} onChange={(e) => setFormFee(e.target.value)} placeholder="0.00" data-testid="input-partner-fee" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="partner-revenue-share">Revenue Share %</Label>
                <Input id="partner-revenue-share" type="number" step="0.1" value={formRevenueShare} onChange={(e) => setFormRevenueShare(e.target.value)} placeholder="10" data-testid="input-partner-revenue-share" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="partner-max-clients">Max Clients</Label>
                <Input id="partner-max-clients" type="number" value={formMaxClients} onChange={(e) => setFormMaxClients(e.target.value)} placeholder="50" data-testid="input-partner-max-clients" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="partner-max-resellers">Max Resellers</Label>
                <Input id="partner-max-resellers" type="number" value={formMaxResellers} onChange={(e) => setFormMaxResellers(e.target.value)} placeholder="20" data-testid="input-partner-max-resellers" />
              </div>
            </div>
            <div className="space-y-3 pt-2">
              <p className="text-sm font-medium text-foreground">Channel Capabilities</p>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Network className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Create Resellers</span>
                </div>
                <Switch checked={formCanCreateResellers} onCheckedChange={setFormCanCreateResellers} data-testid="switch-can-create-resellers" />
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Sell Direct (D2C)</span>
                </div>
                <Switch checked={formCanSellDirect} onCheckedChange={setFormCanSellDirect} data-testid="switch-can-sell-direct" />
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Create Affiliates</span>
                </div>
                <Switch checked={formCanCreateAffiliates} onCheckedChange={setFormCanCreateAffiliates} data-testid="switch-can-create-affiliates" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="partner-notes">Notes</Label>
              <Textarea id="partner-notes" value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Additional notes..." data-testid="input-partner-notes" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} data-testid="button-cancel-partner">Cancel</Button>
              <Button onClick={handleCreate} disabled={saving || !formName || !formEmail} data-testid="button-submit-partner">
                {saving ? "Creating..." : "Create Partner"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
        <DialogContent className="max-w-md" data-testid="dialog-approval">
          <DialogHeader>
            <DialogTitle>
              {approvalAction === "approve" ? "Approve Partner" : "Reject Partner"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {approvalPartner && (
              <div className="space-y-2">
                <p className="text-sm text-foreground">
                  <span className="font-semibold">{approvalPartner.name}</span>
                  <span className="text-muted-foreground"> ({approvalPartner.contactEmail})</span>
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="default" className={`no-default-hover-elevate ${getTierBadgeClass(approvalPartner.tier)}`}>
                    {approvalPartner.tier}
                  </Badge>
                  <Badge variant="default" className="no-default-hover-elevate bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    {approvalPartner.partnerType === "reseller" ? "Reseller" : "Business Partner"}
                  </Badge>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="approval-notes">Notes (optional)</Label>
              <Textarea
                id="approval-notes"
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder={approvalAction === "approve" ? "Approval notes..." : "Reason for rejection..."}
                data-testid="input-approval-notes"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setApprovalDialogOpen(false)} data-testid="button-cancel-approval">
                Cancel
              </Button>
              <Button
                onClick={handleApproval}
                disabled={saving}
                variant={approvalAction === "approve" ? "default" : "destructive"}
                data-testid="button-confirm-approval"
              >
                {saving
                  ? "Processing..."
                  : approvalAction === "approve"
                  ? "Approve Partner"
                  : "Reject Partner"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-6">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-3">
                <Building2 className="w-6 h-6 text-muted-foreground/60" />
              </div>
              <p className="text-sm text-muted-foreground" data-testid="text-partners-error">Failed to load partners. Please try again later.</p>
            </div>
          ) : filteredPartners.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-3">
                <Building2 className="w-6 h-6 text-muted-foreground/60" />
              </div>
              <p className="text-sm text-muted-foreground" data-testid="text-no-partners">No partners found.</p>
            </div>
          ) : (
            <Table data-testid="table-partners">
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Channels</TableHead>
                  <TableHead>Clients</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Rate/min</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPartners.map((partner) => (
                  <TableRow key={partner.id} data-testid={`row-partner-${partner.id}`}>
                    <TableCell className="font-medium">{partner.name}</TableCell>
                    <TableCell>
                      <Badge
                        variant="default"
                        className={`no-default-hover-elevate ${
                          partner.partnerType === "reseller"
                            ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400"
                            : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                        }`}
                      >
                        {partner.partnerType === "reseller" ? "Reseller" : "Business Partner"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{partner.contactEmail}</TableCell>
                    <TableCell>
                      <Badge variant="default" className={`no-default-hover-elevate ${getTierBadgeClass(partner.tier)}`}>
                        {partner.tier}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 flex-wrap">
                        {partner.canCreateResellers && (
                          <Badge variant="default" className="no-default-hover-elevate bg-purple-500/10 text-purple-600 dark:text-purple-400" title="Can create resellers">
                            <Network className="h-3 w-3" />
                          </Badge>
                        )}
                        {partner.canSellDirect && (
                          <Badge variant="default" className="no-default-hover-elevate bg-green-500/10 text-green-600 dark:text-green-400" title="Can sell direct">
                            <ShoppingBag className="h-3 w-3" />
                          </Badge>
                        )}
                        {partner.canCreateAffiliates && (
                          <Badge variant="default" className="no-default-hover-elevate bg-orange-500/10 text-orange-600 dark:text-orange-400" title="Can create affiliates">
                            <Link2 className="h-3 w-3" />
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{partner.clientCount ?? 0}</TableCell>
                    <TableCell>
                      <Badge variant="default" className={`no-default-hover-elevate ${getStatusBadgeClass(partner.status)}`}>
                        {partner.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(partner.wholesaleRatePerMinute ?? 0)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {partner.status === "pending" && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openApprovalDialog(partner, "approve")}
                              title="Approve"
                              data-testid={`button-approve-partner-${partner.id}`}
                            >
                              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openApprovalDialog(partner, "reject")}
                              title="Reject"
                              data-testid={`button-reject-partner-${partner.id}`}
                            >
                              <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                            </Button>
                          </>
                        )}
                        <Button variant="ghost" size="icon" asChild data-testid={`button-edit-partner-${partner.id}`}>
                          <Link href={`/admin/partners/${partner.id}`}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                        {partner.status !== "pending" && partner.status !== "rejected" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleStatus(partner)}
                            title={partner.status === "active" ? "Suspend" : "Activate"}
                            data-testid={`button-toggle-partner-${partner.id}`}
                          >
                            {partner.status === "active" ? (
                              <Ban className="h-4 w-4 text-red-600 dark:text-red-400" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                            )}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
