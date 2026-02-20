"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/lib/use-toast";
import {
  Clock, CheckCircle2, XCircle, AlertTriangle, Banknote,
  ArrowDownToLine, RefreshCw, DollarSign, Users, Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Label } from "@/components/ui/label";

interface WithdrawalItem {
  id: number;
  partnerId: number;
  partnerName: string;
  partnerEmail: string;
  amount: string;
  currency: string;
  status: string;
  stripeTransferId: string | null;
  adminNote: string | null;
  rejectionReason: string | null;
  requestedAt: string | null;
  reviewedAt: string | null;
  paidAt: string | null;
  stripeConnectAccountId: string | null;
  stripeConnectOnboardingComplete: boolean;
}

interface Stats {
  total: number;
  pending: number;
  approved: number;
  paid: number;
  rejected: number;
  totalPaidAmount: number;
  totalPendingAmount: number;
}

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; color: string }> = {
  pending: { label: "Pending", variant: "secondary", color: "text-amber-500" },
  approved: { label: "Approved", variant: "default", color: "text-blue-500" },
  paid: { label: "Paid", variant: "default", color: "text-green-500" },
  rejected: { label: "Rejected", variant: "destructive", color: "text-red-500" },
  failed: { label: "Failed", variant: "destructive", color: "text-red-500" },
};

export default function AdminWithdrawalsPage() {
  const { toast } = useToast();
  const [withdrawals, setWithdrawals] = useState<WithdrawalItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [stripeConfigured, setStripeConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalItem | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | "pay" | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);

  const fetchData = () => {
    setLoading(true);
    fetch(`/api/admin/withdrawals?status=${filter}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          toast({ title: "Error", description: d.error, variant: "destructive" });
        } else {
          setWithdrawals(d.withdrawals || []);
          setStats(d.stats || null);
          setStripeConfigured(d.stripeConfigured || false);
        }
      })
      .catch(() => {
        toast({ title: "Error", description: "Failed to load withdrawals", variant: "destructive" });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [filter]);

  const handleAction = async () => {
    if (!selectedWithdrawal || !actionType) return;
    setProcessing(true);

    try {
      const res = await fetch("/api/admin/withdrawals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          withdrawalId: selectedWithdrawal.id,
          action: actionType,
          adminNote: adminNote || undefined,
          rejectionReason: rejectionReason || undefined,
        }),
      });
      const result = await res.json();
      if (!res.ok) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      } else {
        toast({ title: "Success", description: result.message });
        setSelectedWithdrawal(null);
        setActionType(null);
        setAdminNote("");
        setRejectionReason("");
        fetchData();
      }
    } catch {
      toast({ title: "Error", description: "Action failed", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-admin-withdrawals-title">Withdrawal Management</h1>
          <p className="text-muted-foreground text-sm">Review and process partner withdrawal requests</p>
        </div>
        <div className="flex items-center gap-2">
          {!stripeConfigured && (
            <Badge variant="outline" className="text-amber-600 border-amber-300">
              <AlertTriangle className="h-3 w-3 mr-1" /> Stripe Not Configured
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={fetchData} data-testid="button-refresh-admin-withdrawals">
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Refresh
          </Button>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card data-testid="card-stat-pending">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pending Review</p>
                  <p className="text-xl font-bold">{stats.pending}</p>
                  <p className="text-xs text-muted-foreground">£{stats.totalPendingAmount.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-approved">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <CheckCircle2 className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Approved</p>
                  <p className="text-xl font-bold">{stats.approved}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-paid">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Banknote className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Paid</p>
                  <p className="text-xl font-bold">{stats.paid}</p>
                  <p className="text-xs text-muted-foreground">£{stats.totalPaidAmount.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-rejected">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <XCircle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Rejected</p>
                  <p className="text-xl font-bold">{stats.rejected}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card data-testid="card-withdrawals-table">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Withdrawal Requests</CardTitle>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[140px]" data-testid="select-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {withdrawals.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ArrowDownToLine className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>No withdrawal requests found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {withdrawals.map((w) => {
                const config = STATUS_CONFIG[w.status] || STATUS_CONFIG.pending;
                return (
                  <div
                    key={w.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    data-testid={`row-admin-withdrawal-${w.id}`}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{w.partnerName}</p>
                        <p className="text-xs text-muted-foreground truncate">{w.partnerEmail}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-bold">£{parseFloat(w.amount).toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">
                          {w.requestedAt ? new Date(w.requestedAt).toLocaleDateString("en-GB", {
                            day: "numeric", month: "short", year: "numeric"
                          }) : "N/A"}
                        </p>
                      </div>

                      <Badge variant={config.variant} className="text-[10px] min-w-[70px] justify-center">
                        {config.label}
                      </Badge>

                      <div className="flex gap-1">
                        {w.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              variant="default"
                              className="h-7 text-xs"
                              onClick={() => { setSelectedWithdrawal(w); setActionType("approve"); }}
                              data-testid={`button-approve-${w.id}`}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-7 text-xs"
                              onClick={() => { setSelectedWithdrawal(w); setActionType("reject"); }}
                              data-testid={`button-reject-${w.id}`}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                        {w.status === "approved" && (
                          <>
                            <Button
                              size="sm"
                              variant="default"
                              className="h-7 text-xs"
                              onClick={() => { setSelectedWithdrawal(w); setActionType("pay"); }}
                              data-testid={`button-pay-${w.id}`}
                            >
                              Mark Paid
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-7 text-xs"
                              onClick={() => { setSelectedWithdrawal(w); setActionType("reject"); }}
                              data-testid={`button-reject-approved-${w.id}`}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                        {w.stripeTransferId && (
                          <span className="text-[10px] text-muted-foreground ml-1 self-center" title={w.stripeTransferId}>
                            {w.stripeTransferId.slice(0, 12)}...
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!actionType && !!selectedWithdrawal} onOpenChange={() => {
        setActionType(null);
        setSelectedWithdrawal(null);
        setAdminNote("");
        setRejectionReason("");
      }}>
        <DialogContent data-testid="dialog-withdrawal-action">
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve" && "Approve Withdrawal"}
              {actionType === "reject" && "Reject Withdrawal"}
              {actionType === "pay" && "Process Payment"}
            </DialogTitle>
            <DialogDescription>
              {selectedWithdrawal && (
                <>
                  £{parseFloat(selectedWithdrawal.amount).toFixed(2)} withdrawal request from {selectedWithdrawal.partnerName}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {actionType === "reject" && (
              <div>
                <Label htmlFor="rejection-reason">Rejection Reason</Label>
                <Textarea
                  id="rejection-reason"
                  placeholder="Explain why this withdrawal is being rejected..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  data-testid="textarea-rejection-reason"
                />
              </div>
            )}

            <div>
              <Label htmlFor="admin-note">Admin Note (optional)</Label>
              <Input
                id="admin-note"
                placeholder="Internal note..."
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                data-testid="input-admin-note"
              />
            </div>

            {actionType === "pay" && selectedWithdrawal && (
              <div className="p-3 bg-muted rounded-lg text-sm">
                {selectedWithdrawal.stripeConnectAccountId && selectedWithdrawal.stripeConnectOnboardingComplete && stripeConfigured ? (
                  <p className="text-green-600 dark:text-green-400">
                    <CheckCircle2 className="h-4 w-4 inline mr-1" />
                    Payment will be processed via Stripe Connect automatically.
                  </p>
                ) : (
                  <p className="text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="h-4 w-4 inline mr-1" />
                    No Stripe Connect. This will be marked as manually paid.
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setActionType(null); setSelectedWithdrawal(null); }} data-testid="button-cancel-action">
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={processing || (actionType === "reject" && !rejectionReason)}
              variant={actionType === "reject" ? "destructive" : "default"}
              data-testid="button-confirm-action"
            >
              {processing ? "Processing..." : (
                actionType === "approve" ? "Approve" :
                actionType === "reject" ? "Reject" :
                "Process Payment"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
