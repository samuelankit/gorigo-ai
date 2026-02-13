"use client";

import { useEffect, useState, useMemo } from "react";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Wallet, Plus, AlertTriangle, DollarSign, CreditCard, Search,
  ArrowUpDown, TrendingDown,
} from "lucide-react";

interface WalletData {
  id: number;
  orgId: number;
  orgName: string | null;
  balance: number;
  currency: string;
  lowBalanceThreshold: number;
  isActive: boolean;
  updatedAt: string;
}

interface WalletSummary {
  totalBalance: number;
  walletCount: number;
  lowBalanceCount: number;
}

type SortKey = "orgName" | "balance" | "updatedAt";
type SortDir = "asc" | "desc";

export default function AdminWalletsPage() {
  const [wallets, setWallets] = useState<WalletData[]>([]);
  const [summary, setSummary] = useState<WalletSummary>({ totalBalance: 0, walletCount: 0, lowBalanceCount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("balance");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const [formOrgId, setFormOrgId] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formDescription, setFormDescription] = useState("");

  const fetchWallets = () => {
    setLoading(true);
    setError(false);
    fetch("/api/admin/wallet")
      .then((r) => r.json())
      .then((d) => {
        if (d?.wallets) setWallets(d.wallets);
        if (d?.summary) setSummary(d.summary);
      })
      .catch(() => { setError(true); })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchWallets();
  }, []);

  const handleTopUp = async () => {
    if (!formOrgId || !formAmount) return;
    const amount = parseFloat(formAmount);
    if (isNaN(amount) || amount <= 0) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        orgId: parseInt(formOrgId),
        amount,
      };
      if (formDescription) body.description = formDescription;

      const res = await fetch("/api/admin/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setDialogOpen(false);
        resetForm();
        fetchWallets();
      }
    } catch {
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormOrgId("");
    setFormAmount("");
    setFormDescription("");
  };

  const openTopUpForOrg = (orgId: number) => {
    setFormOrgId(String(orgId));
    setFormAmount("");
    setFormDescription("");
    setDialogOpen(true);
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(amount);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  };

  const isLowBalance = (w: WalletData) => w.balance <= w.lowBalanceThreshold;

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir(key === "balance" ? "asc" : "desc");
    }
  };

  const filteredWallets = useMemo(() => {
    let result = [...wallets];

    if (searchInput.trim()) {
      const lower = searchInput.trim().toLowerCase();
      result = result.filter((w) =>
        (w.orgName && w.orgName.toLowerCase().includes(lower)) ||
        String(w.orgId).includes(lower)
      );
    }

    if (statusFilter === "low") {
      result = result.filter((w) => isLowBalance(w));
    } else if (statusFilter === "active") {
      result = result.filter((w) => w.isActive);
    } else if (statusFilter === "inactive") {
      result = result.filter((w) => !w.isActive);
    }

    result.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "orgName") {
        cmp = (a.orgName || "").localeCompare(b.orgName || "");
      } else if (sortKey === "balance") {
        cmp = a.balance - b.balance;
      } else if (sortKey === "updatedAt") {
        cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [wallets, searchInput, statusFilter, sortKey, sortDir]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-violet-500/10">
            <Wallet className="w-5 h-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground" data-testid="text-wallets-title">
              Platform Wallets
            </h1>
            <p className="text-sm text-muted-foreground">Manage organisation wallets and top-up balances.</p>
          </div>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }} data-testid="button-topup-wallet">
          <Plus className="h-4 w-4 mr-2" />
          Top Up Wallet
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : !error && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-4 h-4 text-emerald-500" />
                <p className="text-sm text-muted-foreground">Total Balance</p>
              </div>
              <p className="text-2xl font-bold" data-testid="text-total-balance">{formatCurrency(summary.totalBalance)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <CreditCard className="w-4 h-4 text-blue-500" />
                <p className="text-sm text-muted-foreground">Active Wallets</p>
              </div>
              <p className="text-2xl font-bold" data-testid="text-wallet-count">{summary.walletCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <p className="text-sm text-muted-foreground">Low Balance</p>
              </div>
              <p className="text-2xl font-bold" data-testid="text-low-balance-count">{summary.lowBalanceCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="w-4 h-4 text-red-500" />
                <p className="text-sm text-muted-foreground">Avg Balance</p>
              </div>
              <p className="text-2xl font-bold" data-testid="text-avg-balance">
                {summary.walletCount > 0 ? formatCurrency(summary.totalBalance / summary.walletCount) : "N/A"}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-sm">
          <Input
            placeholder="Search by org name..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            data-testid="input-search-wallets"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40" data-testid="select-wallet-status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Wallets</SelectItem>
            <SelectItem value="low">Low Balance</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md" data-testid="dialog-topup-wallet">
          <DialogHeader>
            <DialogTitle>Top Up Wallet</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Organisation</Label>
              <Select value={formOrgId} onValueChange={setFormOrgId}>
                <SelectTrigger data-testid="select-topup-org">
                  <SelectValue placeholder="Select organisation" />
                </SelectTrigger>
                <SelectContent>
                  {wallets.map((w) => (
                    <SelectItem key={w.orgId} value={String(w.orgId)}>
                      {w.orgName || `Org #${w.orgId}`} — {formatCurrency(w.balance)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="topup-amount">Amount (GBP)</Label>
              <Input
                id="topup-amount"
                type="number"
                step="0.01"
                min="0.01"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                placeholder="100.00"
                data-testid="input-topup-amount"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="topup-description">Description (optional)</Label>
              <Textarea
                id="topup-description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Admin top-up for..."
                data-testid="input-topup-description"
              />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" data-testid="button-cancel-topup">Cancel</Button>
              </DialogClose>
              <Button
                onClick={handleTopUp}
                disabled={saving || !formOrgId || !formAmount || parseFloat(formAmount) <= 0}
                data-testid="button-submit-topup"
              >
                {saving ? "Processing..." : "Top Up"}
              </Button>
            </DialogFooter>
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
                <Wallet className="w-6 h-6 text-muted-foreground/60" />
              </div>
              <p className="text-sm text-muted-foreground" data-testid="text-wallets-error">Failed to load wallets.</p>
            </div>
          ) : filteredWallets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-3">
                <Wallet className="w-6 h-6 text-muted-foreground/60" />
              </div>
              <p className="text-sm text-muted-foreground" data-testid="text-no-wallets">No wallets found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table data-testid="table-wallets">
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Button variant="ghost" size="sm" onClick={() => toggleSort("orgName")} className="gap-1 -ml-3" data-testid="button-sort-name">
                        Org Name
                        <ArrowUpDown className="h-3 w-3" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" size="sm" onClick={() => toggleSort("balance")} className="gap-1 -ml-3" data-testid="button-sort-balance">
                        Balance
                        <ArrowUpDown className="h-3 w-3" />
                      </Button>
                    </TableHead>
                    <TableHead>Threshold</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>
                      <Button variant="ghost" size="sm" onClick={() => toggleSort("updatedAt")} className="gap-1 -ml-3" data-testid="button-sort-updated">
                        Last Updated
                        <ArrowUpDown className="h-3 w-3" />
                      </Button>
                    </TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWallets.map((w) => (
                    <TableRow key={w.id} data-testid={`row-wallet-${w.id}`}>
                      <TableCell className="font-medium">{w.orgName || `Org #${w.orgId}`}</TableCell>
                      <TableCell data-testid={`text-balance-${w.id}`}>
                        <span className={isLowBalance(w) ? "text-amber-600 dark:text-amber-400 font-semibold" : ""}>
                          {formatCurrency(w.balance)}
                        </span>
                        {isLowBalance(w) && (
                          <AlertTriangle className="inline-block w-3.5 h-3.5 ml-1.5 text-amber-500" />
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground" data-testid={`text-threshold-${w.id}`}>
                        {formatCurrency(w.lowBalanceThreshold)}
                      </TableCell>
                      <TableCell>
                        {w.isActive ? (
                          <Badge variant="secondary" className="no-default-hover-elevate bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">Active</Badge>
                        ) : (
                          <Badge variant="destructive" className="no-default-hover-elevate">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{w.updatedAt ? formatDate(w.updatedAt) : "-"}</TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openTopUpForOrg(w.orgId)}
                          data-testid={`button-topup-${w.id}`}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Top Up
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
    </div>
  );
}
