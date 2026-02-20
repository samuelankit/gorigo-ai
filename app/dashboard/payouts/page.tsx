"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/lib/use-toast";
import {
  Banknote, Clock, CheckCircle2, XCircle, AlertTriangle,
  ArrowDownToLine, ExternalLink, RefreshCw, Landmark, TrendingUp,
  ShieldCheck, Timer,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface WithdrawalData {
  partnerId: number;
  partnerName: string;
  stripeConnectAccountId: string | null;
  stripeConnectOnboardingComplete: boolean;
  balance: {
    totalEarned: number;
    holding: number;
    available: number;
    withdrawn: number;
    pendingWithdrawal: number;
  };
  canWithdraw: boolean;
  nextWithdrawalDate: string | null;
  minimumWithdrawal: number;
  autoApproveThreshold: number;
  holdingPeriodDays: number;
  withdrawals: any[];
  stripeConfigured: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Clock }> = {
  pending: { label: "Pending Review", variant: "secondary", icon: Clock },
  approved: { label: "Approved", variant: "default", icon: CheckCircle2 },
  paid: { label: "Paid", variant: "default", icon: CheckCircle2 },
  rejected: { label: "Rejected", variant: "destructive", icon: XCircle },
  failed: { label: "Failed", variant: "destructive", icon: AlertTriangle },
};

export default function PayoutsPage() {
  const { toast } = useToast();
  const [data, setData] = useState<WithdrawalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [connectLoading, setConnectLoading] = useState(false);

  const fetchData = () => {
    setLoading(true);
    fetch("/api/withdrawals")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          toast({ title: "Error", description: d.error, variant: "destructive" });
        } else {
          setData(d);
        }
      })
      .catch(() => {
        toast({ title: "Error", description: "Failed to load payout data", variant: "destructive" });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount < (data?.minimumWithdrawal || 50)) {
      toast({
        title: "Invalid amount",
        description: `Minimum withdrawal is £${data?.minimumWithdrawal || 50}`,
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      const result = await res.json();
      if (!res.ok) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      } else {
        toast({ title: "Success", description: result.message });
        setWithdrawAmount("");
        fetchData();
      }
    } catch {
      toast({ title: "Error", description: "Failed to submit withdrawal", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleStripeConnect = async (action: string) => {
    setConnectLoading(true);
    try {
      const res = await fetch("/api/withdrawals/stripe-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const result = await res.json();
      if (!res.ok) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      } else if (result.onboardingUrl) {
        window.open(result.onboardingUrl, "_blank");
      } else if (result.dashboardUrl) {
        window.open(result.dashboardUrl, "_blank");
      } else {
        fetchData();
      }
    } catch {
      toast({ title: "Error", description: "Failed to connect Stripe", variant: "destructive" });
    } finally {
      setConnectLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Partner Account Required</h3>
            <p className="text-muted-foreground">You need a partner account to access payouts. Contact support to get set up.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-payouts-title">Payouts</h1>
          <p className="text-muted-foreground text-sm">Manage your commission withdrawals</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} data-testid="button-refresh-payouts">
          <RefreshCw className="h-4 w-4 mr-1.5" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-total-earned">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Earned</p>
                <p className="text-xl font-bold">£{data.balance.totalEarned.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-holding">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Timer className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Holding ({data.holdingPeriodDays}-day)</p>
                <p className="text-xl font-bold">£{data.balance.holding.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-available">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Banknote className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Available to Withdraw</p>
                <p className="text-xl font-bold text-blue-600 dark:text-blue-400">£{data.balance.available.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-withdrawn">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <ArrowDownToLine className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Withdrawn</p>
                <p className="text-xl font-bold">£{data.balance.withdrawn.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1" data-testid="card-withdraw-form">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Banknote className="h-4 w-4" />
              Request Withdrawal
            </CardTitle>
            <CardDescription>
              Min. £{data.minimumWithdrawal} · Auto-approved under £{data.autoApproveThreshold}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!data.stripeConnectAccountId ? (
              <div className="space-y-3">
                <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <p className="text-sm text-amber-800 dark:text-amber-200 flex items-center gap-2">
                    <Landmark className="h-4 w-4 shrink-0" />
                    Connect your bank account via Stripe to receive payouts
                  </p>
                </div>
                <Button
                  onClick={() => handleStripeConnect("create_account")}
                  disabled={connectLoading || !data.stripeConfigured}
                  className="w-full"
                  data-testid="button-connect-stripe"
                >
                  {connectLoading ? "Connecting..." : "Connect Bank Account"}
                </Button>
                {!data.stripeConfigured && (
                  <p className="text-xs text-muted-foreground">Stripe is not yet configured. Contact support.</p>
                )}
              </div>
            ) : !data.stripeConnectOnboardingComplete ? (
              <div className="space-y-3">
                <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    Complete your Stripe onboarding to start receiving payouts.
                  </p>
                </div>
                <Button
                  onClick={() => handleStripeConnect("get_onboarding_link")}
                  disabled={connectLoading}
                  className="w-full"
                  data-testid="button-complete-onboarding"
                >
                  <ExternalLink className="h-4 w-4 mr-1.5" />
                  {connectLoading ? "Loading..." : "Complete Onboarding"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStripeConnect("check_status")}
                  disabled={connectLoading}
                  className="w-full"
                  data-testid="button-check-status"
                >
                  <RefreshCw className="h-4 w-4 mr-1.5" />
                  Check Status
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                  <ShieldCheck className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
                  <p className="text-xs text-green-700 dark:text-green-300">Bank account connected</p>
                </div>
                <div>
                  <Label htmlFor="withdraw-amount" className="text-sm">Amount (£)</Label>
                  <Input
                    id="withdraw-amount"
                    type="number"
                    min={data.minimumWithdrawal}
                    max={data.balance.available}
                    step="0.01"
                    placeholder={`Min £${data.minimumWithdrawal}`}
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    disabled={!data.canWithdraw || data.balance.available < data.minimumWithdrawal}
                    data-testid="input-withdraw-amount"
                  />
                </div>
                {data.balance.pendingWithdrawal > 0 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    £{data.balance.pendingWithdrawal.toFixed(2)} pending withdrawal
                  </p>
                )}
                {!data.canWithdraw && data.nextWithdrawalDate && (
                  <p className="text-xs text-muted-foreground">
                    Next withdrawal available: {new Date(data.nextWithdrawalDate).toLocaleDateString("en-GB")}
                  </p>
                )}
                <Button
                  className="w-full"
                  onClick={handleWithdraw}
                  disabled={
                    submitting || !data.canWithdraw ||
                    data.balance.available < data.minimumWithdrawal ||
                    !withdrawAmount || parseFloat(withdrawAmount) < data.minimumWithdrawal
                  }
                  data-testid="button-submit-withdrawal"
                >
                  {submitting ? "Processing..." : "Request Withdrawal"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleStripeConnect("dashboard_link")}
                  className="w-full text-xs"
                  data-testid="button-stripe-dashboard"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  View Stripe Dashboard
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2" data-testid="card-withdrawal-history">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Withdrawal History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.withdrawals.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ArrowDownToLine className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No withdrawals yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {data.withdrawals.map((w: any) => {
                  const config = STATUS_CONFIG[w.status] || STATUS_CONFIG.pending;
                  const StatusIcon = config.icon;
                  return (
                    <div
                      key={w.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      data-testid={`row-withdrawal-${w.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <StatusIcon className={cn(
                          "h-4 w-4",
                          w.status === "paid" && "text-green-500",
                          w.status === "rejected" && "text-red-500",
                          w.status === "pending" && "text-amber-500",
                          w.status === "approved" && "text-blue-500",
                        )} />
                        <div>
                          <p className="text-sm font-medium">£{parseFloat(w.amount).toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">
                            {w.requestedAt ? new Date(w.requestedAt).toLocaleDateString("en-GB", {
                              day: "numeric", month: "short", year: "numeric"
                            }) : "N/A"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={config.variant} className="text-[10px]" data-testid={`badge-status-${w.id}`}>
                          {config.label}
                        </Badge>
                        {w.rejectionReason && (
                          <span className="text-xs text-red-500 max-w-[200px] truncate" title={w.rejectionReason}>
                            {w.rejectionReason}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
            <div className="text-xs text-muted-foreground space-y-1">
              <p><strong>How payouts work:</strong></p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>Commissions are held for {data.holdingPeriodDays} days to protect against chargebacks and refunds.</li>
                <li>After the holding period, commissions move to your available balance.</li>
                <li>Minimum withdrawal: £{data.minimumWithdrawal}. Maximum one withdrawal per week.</li>
                <li>Withdrawals under £{data.autoApproveThreshold} are auto-approved. Larger amounts require admin review.</li>
                <li>Payments are processed via Stripe Connect to your linked bank account.</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
