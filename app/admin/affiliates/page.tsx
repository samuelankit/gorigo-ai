"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  Link2,
  Plus,
  Pencil,
  Ban,
  Users,
  MousePointerClick,
  UserPlus,
  PoundSterling,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Percent,
} from "lucide-react";

interface Affiliate {
  id: number;
  code: string;
  name: string;
  email: string;
  ownerType: string;
  commissionRate: number;
  commissionType: string;
  totalClicks: number;
  totalSignups: number;
  totalEarnings: number;
  pendingPayout: number;
  lifetimePayouts: number;
  cookieDurationDays: number;
  status: string;
  notes?: string;
  createdAt: string;
}

interface AffiliateStats {
  totalAffiliates: number;
  activeAffiliates: number;
  totalClicks: number;
  totalSignups: number;
  totalEarnings: number;
  totalPending: number;
  totalPayouts: number;
}

function formatCurrency(amount: number | string) {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(num || 0);
}

function formatDate(d: string | null): string {
  if (!d) return "-";
  return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function AdminAffiliatesPage() {
  const [affiliatesList, setAffiliatesList] = useState<Affiliate[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<AffiliateStats | null>(null);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [ownerTypeFilter, setOwnerTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(0);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<Affiliate | null>(null);
  const [saving, setSaving] = useState(false);

  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formCommissionRate, setFormCommissionRate] = useState("");
  const [formOwnerType, setFormOwnerType] = useState("platform");
  const [formNotes, setFormNotes] = useState("");

  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editCommissionRate, setEditCommissionRate] = useState("");
  const [editOwnerType, setEditOwnerType] = useState("platform");
  const [editNotes, setEditNotes] = useState("");
  const [editStatus, setEditStatus] = useState("active");

  const PAGE_SIZE = 25;

  const fetchAffiliates = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(page * PAGE_SIZE) });
      if (search) params.set("search", search);
      if (ownerTypeFilter !== "all") params.set("ownerType", ownerTypeFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/admin/affiliates?${params}`);
      const data = await res.json();
      if (data && !data.error) {
        setAffiliatesList(data.affiliates ?? []);
        setTotal(data.total ?? 0);
        setStats(data.stats ?? null);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, [search, ownerTypeFilter, statusFilter, page]);

  useEffect(() => { fetchAffiliates(); }, [fetchAffiliates]);
  useEffect(() => { setPage(0); }, [search, ownerTypeFilter, statusFilter]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleCreate = async () => {
    if (!formName || !formEmail) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: formName,
        email: formEmail,
        ownerType: formOwnerType,
      };
      if (formCommissionRate) body.commissionRate = parseFloat(formCommissionRate);
      if (formNotes) body.notes = formNotes;
      const res = await fetch("/api/admin/affiliates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setCreateDialogOpen(false);
        resetCreateForm();
        fetchAffiliates();
      }
    } catch {} finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!editId) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = { id: editId };
      if (editName) body.name = editName;
      if (editEmail) body.email = editEmail;
      if (editCommissionRate) body.commissionRate = parseFloat(editCommissionRate);
      body.ownerType = editOwnerType;
      body.status = editStatus;
      if (editNotes) body.notes = editNotes;
      const res = await fetch("/api/admin/affiliates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setEditDialogOpen(false);
        fetchAffiliates();
      }
    } catch {} finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!deactivateTarget) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/affiliates?id=${deactivateTarget.id}`, { method: "DELETE" });
      if (res.ok) {
        setDeactivateDialogOpen(false);
        setDeactivateTarget(null);
        fetchAffiliates();
      }
    } catch {} finally {
      setSaving(false);
    }
  };

  const openEditDialog = (a: Affiliate) => {
    setEditId(a.id);
    setEditName(a.name);
    setEditEmail(a.email);
    setEditCommissionRate(String(a.commissionRate ?? ""));
    setEditOwnerType(a.ownerType || "platform");
    setEditNotes(a.notes || "");
    setEditStatus(a.status || "active");
    setEditDialogOpen(true);
  };

  const openDeactivateDialog = (a: Affiliate) => {
    setDeactivateTarget(a);
    setDeactivateDialogOpen(true);
  };

  const resetCreateForm = () => {
    setFormName("");
    setFormEmail("");
    setFormCommissionRate("");
    setFormOwnerType("platform");
    setFormNotes("");
  };

  const conversionRate = (clicks: number, signups: number) => {
    if (!clicks) return "0%";
    return ((signups / clicks) * 100).toFixed(1) + "%";
  };

  if (loading && !stats) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-affiliates-title">
            <Link2 className="h-6 w-6 text-muted-foreground" />
            Affiliate Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Manage affiliate partners, commissions, and performance tracking</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" onClick={fetchAffiliates} disabled={loading} data-testid="button-refresh-affiliates">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={() => { resetCreateForm(); setCreateDialogOpen(true); }} data-testid="button-create-affiliate">
            <Plus className="h-4 w-4 mr-2" />
            Create Affiliate
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-stat-total">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Total Affiliates</p>
                <p className="text-2xl font-bold mt-1" data-testid="text-stat-total">{stats?.totalAffiliates ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1" data-testid="text-stat-active">{stats?.activeAffiliates ?? 0} active</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card data-testid="card-stat-clicks">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Clicks / Signups</p>
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex items-center gap-1">
                    <MousePointerClick className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-lg font-bold" data-testid="text-stat-clicks">{(stats?.totalClicks ?? 0).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <UserPlus className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-lg font-bold" data-testid="text-stat-signups">{(stats?.totalSignups ?? 0).toLocaleString()}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1" data-testid="text-stat-conversion">
                  {conversionRate(stats?.totalClicks ?? 0, stats?.totalSignups ?? 0)} conversion
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card data-testid="card-stat-earnings">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Total Earnings</p>
                <p className="text-2xl font-bold mt-1" data-testid="text-stat-earnings">{formatCurrency(stats?.totalEarnings ?? 0)}</p>
                <p className="text-xs text-muted-foreground mt-1" data-testid="text-stat-payouts">{formatCurrency(stats?.totalPayouts ?? 0)} paid out</p>
              </div>
              <PoundSterling className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card data-testid="card-stat-pending">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Pending Payouts</p>
                <p className="text-2xl font-bold mt-1" data-testid="text-stat-pending">{formatCurrency(stats?.totalPending ?? 0)}</p>
                <p className="text-xs text-muted-foreground mt-1">{stats?.totalAffiliates ?? 0} affiliates</p>
              </div>
              <Percent className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <CardTitle className="text-base">All Affiliates</CardTitle>
            <Badge variant="secondary" data-testid="text-affiliates-count">{total} affiliates</Badge>
          </div>
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name, email, or code..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="input-affiliates-search"
              />
            </div>
            <Select value={ownerTypeFilter} onValueChange={setOwnerTypeFilter}>
              <SelectTrigger className="w-[130px]" data-testid="select-filter-owner-type">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="platform">Platform</SelectItem>
                <SelectItem value="partner">Partner</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]" data-testid="select-filter-status">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="deactivated">Deactivated</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {affiliatesList.length === 0 ? (
            <div className="text-center py-12">
              <Link2 className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground" data-testid="text-no-affiliates">No affiliates found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table data-testid="table-affiliates">
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Commission</TableHead>
                    <TableHead>Clicks</TableHead>
                    <TableHead>Signups</TableHead>
                    <TableHead>Conv.</TableHead>
                    <TableHead>Earnings</TableHead>
                    <TableHead>Pending</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {affiliatesList.map((a) => {
                    const clicks = Number(a.totalClicks) || 0;
                    const signups = Number(a.totalSignups) || 0;
                    return (
                      <TableRow key={a.id} data-testid={`row-affiliate-${a.id}`}>
                        <TableCell className="font-mono text-sm" data-testid={`text-code-${a.id}`}>{a.code}</TableCell>
                        <TableCell className="font-medium" data-testid={`text-name-${a.id}`}>{a.name}</TableCell>
                        <TableCell className="text-sm" data-testid={`text-email-${a.id}`}>{a.email}</TableCell>
                        <TableCell data-testid={`text-type-${a.id}`}>
                          <Badge variant={a.ownerType === "partner" ? "default" : "secondary"}>
                            {a.ownerType === "partner" ? "Partner" : "Platform"}
                          </Badge>
                        </TableCell>
                        <TableCell data-testid={`text-commission-${a.id}`}>{a.commissionRate}%</TableCell>
                        <TableCell data-testid={`text-clicks-${a.id}`}>{clicks.toLocaleString()}</TableCell>
                        <TableCell data-testid={`text-signups-${a.id}`}>{signups.toLocaleString()}</TableCell>
                        <TableCell className="text-sm text-muted-foreground" data-testid={`text-conversion-${a.id}`}>
                          {conversionRate(clicks, signups)}
                        </TableCell>
                        <TableCell data-testid={`text-earnings-${a.id}`}>{formatCurrency(a.totalEarnings)}</TableCell>
                        <TableCell data-testid={`text-pending-${a.id}`}>{formatCurrency(a.pendingPayout)}</TableCell>
                        <TableCell data-testid={`text-status-${a.id}`}>
                          <Badge variant={a.status === "active" ? "default" : a.status === "deactivated" ? "destructive" : "secondary"}>
                            {a.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(a.createdAt)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(a)}
                              data-testid={`button-edit-${a.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {a.status === "active" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openDeactivateDialog(a)}
                                data-testid={`button-deactivate-${a.id}`}
                              >
                                <Ban className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-2 mt-4">
              <p className="text-sm text-muted-foreground">
                Page {page + 1} of {totalPages}
              </p>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)} data-testid="button-affiliates-prev">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)} data-testid="button-affiliates-next">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md" data-testid="dialog-create-affiliate">
          <DialogHeader>
            <DialogTitle>Create Affiliate</DialogTitle>
            <DialogDescription>Add a new affiliate partner to the platform.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label htmlFor="create-name">Name</Label>
              <Input
                id="create-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Affiliate name"
                data-testid="input-create-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-email">Email</Label>
              <Input
                id="create-email"
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="affiliate@example.com"
                data-testid="input-create-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-commission">Commission Rate (%)</Label>
              <Input
                id="create-commission"
                type="number"
                step="0.1"
                min="0"
                max="50"
                value={formCommissionRate}
                onChange={(e) => setFormCommissionRate(e.target.value)}
                placeholder="10"
                data-testid="input-create-commission"
              />
            </div>
            <div className="space-y-2">
              <Label>Owner Type</Label>
              <Select value={formOwnerType} onValueChange={setFormOwnerType}>
                <SelectTrigger data-testid="select-create-owner-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="platform">Platform</SelectItem>
                  <SelectItem value="partner">Partner</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-notes">Notes</Label>
              <Textarea
                id="create-notes"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Optional notes..."
                data-testid="input-create-notes"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)} data-testid="button-cancel-create">
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={saving || !formName || !formEmail}
                data-testid="button-submit-create"
              >
                {saving ? "Creating..." : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md" data-testid="dialog-edit-affiliate">
          <DialogHeader>
            <DialogTitle>Edit Affiliate</DialogTitle>
            <DialogDescription>Update affiliate details and settings.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Affiliate name"
                data-testid="input-edit-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="affiliate@example.com"
                data-testid="input-edit-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-commission">Commission Rate (%)</Label>
              <Input
                id="edit-commission"
                type="number"
                step="0.1"
                min="0"
                max="50"
                value={editCommissionRate}
                onChange={(e) => setEditCommissionRate(e.target.value)}
                placeholder="10"
                data-testid="input-edit-commission"
              />
            </div>
            <div className="space-y-2">
              <Label>Owner Type</Label>
              <Select value={editOwnerType} onValueChange={setEditOwnerType}>
                <SelectTrigger data-testid="select-edit-owner-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="platform">Platform</SelectItem>
                  <SelectItem value="partner">Partner</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger data-testid="select-edit-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="deactivated">Deactivated</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Optional notes..."
                data-testid="input-edit-notes"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)} data-testid="button-cancel-edit">
                Cancel
              </Button>
              <Button
                onClick={handleEdit}
                disabled={saving || !editName || !editEmail}
                data-testid="button-submit-edit"
              >
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deactivateDialogOpen} onOpenChange={setDeactivateDialogOpen}>
        <DialogContent className="max-w-sm" data-testid="dialog-deactivate-affiliate">
          <DialogHeader>
            <DialogTitle>Deactivate Affiliate</DialogTitle>
            <DialogDescription>
              Are you sure you want to deactivate <span className="font-medium">{deactivateTarget?.name}</span>?
              This will stop all tracking and commission accrual for this affiliate. This action can be reversed by editing the affiliate later.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setDeactivateDialogOpen(false)} data-testid="button-cancel-deactivate">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeactivate}
              disabled={saving}
              data-testid="button-confirm-deactivate"
            >
              {saving ? "Deactivating..." : "Deactivate"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
