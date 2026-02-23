"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/lib/use-toast";
import { Wallet, TrendingUp, TrendingDown, Hash, AlertTriangle, Cloud, Key, Server, Bell, FileText, Lock, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { TalkTimeInfo } from "@/components/talk-time-info";
import { apiRequest } from "@/components/query-provider";

interface WalletData {
  balance: number;
  currency: string;
  lowBalanceThreshold: number;
  isActive: boolean;
  lowBalance: boolean;
  lockedBalance?: number;
  availableBalance?: number;
}

interface WalletStats {
  totalTopUps: number;
  totalDeductions: number;
  transactionCount: number;
}

interface Transaction {
  id: number;
  orgId: number;
  type: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  referenceType: string | null;
  referenceId: string | null;
  createdAt: string;
}

export default function WalletPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [topUpAmount, setTopUpAmount] = useState("");
  const [alertThreshold, setAlertThreshold] = useState("10");
  const [emailAlertsEnabled, setEmailAlertsEnabled] = useState(true);

  const { data: walletData, isLoading: loadingWallet, isError: walletError } = useQuery<{ wallet: WalletData; stats: WalletStats }>({
    queryKey: ["/api/wallet"],
  });

  const wallet = walletData?.wallet ?? null;
  const stats = walletData?.stats ?? null;

  const { data: transactionsData, isLoading: loadingTransactions, isError: transactionsError } = useQuery<{ transactions: Transaction[] }>({
    queryKey: ["/api/wallet/transactions", { limit: 50, offset: 0 }],
    queryFn: () => apiRequest("/api/wallet/transactions?limit=50&offset=0", { method: "GET" }),
  });

  const transactions = transactionsData?.transactions ?? [];

  const { data: meData } = useQuery<{ user?: { isDemo?: boolean }; org?: { deploymentModel?: string } }>({
    queryKey: ["/api/auth/me"],
  });

  const isDemo = meData?.user?.isDemo ?? false;
  const deploymentModel = meData?.org?.deploymentModel ?? null;

  const { data: settingsData } = useQuery<{ lowBalanceThreshold?: number; lowBalanceEmailEnabled?: boolean }>({
    queryKey: ["/api/wallet/settings"],
  });

  useEffect(() => {
    if (settingsData?.lowBalanceThreshold !== undefined) {
      setAlertThreshold(String(settingsData.lowBalanceThreshold));
    }
    if (settingsData?.lowBalanceEmailEnabled !== undefined) {
      setEmailAlertsEnabled(settingsData.lowBalanceEmailEnabled);
    }
  }, [settingsData]);

  const error = walletError || transactionsError;

  const topUpMutation = useMutation({
    mutationFn: async (amount: number) => {
      return apiRequest("/api/wallet/topup", {
        method: "POST",
        body: JSON.stringify({ amount }),
      });
    },
    onSuccess: (data: any) => {
      toast({ title: "Top-up successful", description: `Your new balance is £${Number(data.newBalance).toFixed(2)}.` });
      setTopUpAmount("");
      queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallet/transactions"] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message || "Failed to top up wallet.", variant: "destructive" });
    },
  });

  const saveSettingsMutation = useMutation({
    mutationFn: async (settings: { lowBalanceThreshold: number; lowBalanceEmailEnabled: boolean }) => {
      return apiRequest("/api/wallet/settings", {
        method: "PUT",
        body: JSON.stringify(settings),
      });
    },
    onSuccess: () => {
      toast({ title: "Settings saved", description: "Your alert preferences have been updated." });
      queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wallet/settings"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save alert settings.", variant: "destructive" });
    },
  });

  const handleTopUp = () => {
    const amount = parseFloat(topUpAmount);
    if (!amount || amount <= 0 || amount > 10000) {
      toast({ title: "Invalid amount", description: "Please enter an amount between 0.01 and 10,000.", variant: "destructive" });
      return;
    }
    topUpMutation.mutate(amount);
  };

  const handleSaveAlertSettings = () => {
    const threshold = parseFloat(alertThreshold);
    if (isNaN(threshold) || threshold < 0 || threshold > 10000) {
      toast({ title: "Invalid threshold", description: "Please enter a value between 0 and 10,000.", variant: "destructive" });
      return;
    }
    saveSettingsMutation.mutate({ lowBalanceThreshold: threshold, lowBalanceEmailEnabled: emailAlertsEnabled });
  };

  const getTypeBadge = (type: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      top_up: { label: "Top Up", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20" },
      deduction: { label: "Deduction", className: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/20" },
      refund: { label: "Refund", className: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20" },
      adjustment: { label: "Adjustment", className: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20" },
      fund_lock: { label: "Funds Locked", className: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20" },
      fund_charge: { label: "Campaign Charged", className: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/20" },
      fund_release: { label: "Funds Released", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20" },
      fund_partial_release: { label: "Partial Release", className: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20" },
    };
    const v = variants[type] || { label: type, className: "" };
    return (
      <Badge variant="outline" className={v.className} data-testid={`badge-type-${type}`}>
        {v.label}
      </Badge>
    );
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center shrink-0">
              <Wallet className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-foreground" data-testid="text-wallet-title">
              Wallet
            </h1>
          </div>
          <p className="text-muted-foreground text-sm">Manage your wallet balance and view transaction history. Billed by talk time<TalkTimeInfo /> only.</p>
        </div>
      </div>

      {error && (
        <div className="text-center py-4" data-testid="text-wallet-error">
          <p className="text-sm text-muted-foreground">Some wallet data failed to load. Information shown may be incomplete.</p>
        </div>
      )}

      {!loadingWallet && wallet && wallet.balance <= 5 && (
        <Card className="border-red-200 dark:border-red-800/40" data-testid="card-minimum-balance-warning">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-red-500/20 rounded-lg flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Below Minimum Balance</p>
                <p className="text-sm text-muted-foreground">
                  Your balance (£{Number(wallet.balance).toFixed(2)}) is at or below the required £5.00 minimum. All services (calls, AI features) are blocked until you top up above £5.00.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!loadingWallet && wallet?.lowBalance && wallet.balance > 5 && (
        <Card className="border-amber-200 dark:border-amber-800/40" data-testid="card-low-balance-warning">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-amber-500/20 rounded-lg flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Low Balance Warning</p>
                <p className="text-sm text-muted-foreground">
                  Your wallet balance is below £{Number(wallet.lowBalanceThreshold).toFixed(2)}. Please top up to avoid service interruptions.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {loadingWallet ? (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          <Skeleton className="h-28 w-full rounded-md" />
          <Skeleton className="h-28 w-full rounded-md" />
          <Skeleton className="h-28 w-full rounded-md" />
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          <Card className="bg-emerald-500/5 dark:bg-emerald-500/10" data-testid="card-available-balance">
            <CardContent className="p-5">
              <p className="text-sm font-medium text-muted-foreground mb-1">Available Balance</p>
              <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400" data-testid="text-available-balance">
                £{Number(wallet?.availableBalance ?? wallet?.balance ?? 0).toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Ready to use</p>
            </CardContent>
          </Card>
          <Card className="bg-amber-500/5 dark:bg-amber-500/10" data-testid="card-locked-balance">
            <CardContent className="p-5">
              <p className="text-sm font-medium text-muted-foreground mb-1">Locked for Campaigns</p>
              <p className="text-3xl font-bold text-amber-600 dark:text-amber-400" data-testid="text-locked-balance">
                £{Number(wallet?.lockedBalance ?? 0).toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Reserved for active campaigns</p>
            </CardContent>
          </Card>
          <Card data-testid="card-wallet-balance">
            <CardContent className="p-5">
              <p className="text-sm font-medium text-muted-foreground mb-1">Total Balance</p>
              <p className="text-3xl font-bold text-foreground" data-testid="text-wallet-balance">
                £{Number(wallet?.balance ?? 0).toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground mt-1" data-testid="text-wallet-currency">
                {wallet?.currency ?? "GBP"}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {deploymentModel && (
        <Card data-testid="card-wallet-rate-info">
          <CardContent className="flex items-center justify-between gap-4 p-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className={cn(
                "flex items-center justify-center w-9 h-9 rounded-lg shrink-0",
                deploymentModel === "managed" ? "bg-blue-500/10" : "bg-emerald-500/10"
              )}>
                {deploymentModel === "managed" ? (
                  <Cloud className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                ) : (
                  <Server className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium" data-testid="text-wallet-package">
                  {deploymentModel === "managed" ? "Managed Package" : "Self-Hosted Package"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {deploymentModel === "managed"
                    ? "All costs included in your talk-time rate"
                    : "Licence fee deducted per unit of talk time"}
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="no-default-hover-elevate text-sm" data-testid="badge-wallet-rate">
              {deploymentModel === "managed" ? "£0.20/min" : "£0.12/min"}
            </Badge>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {loadingWallet ? (
          <>
            <Skeleton className="h-32 w-full rounded-md" />
            <Skeleton className="h-32 w-full rounded-md" />
            <Skeleton className="h-32 w-full rounded-md" />
          </>
        ) : (
          <>
            <Card className="bg-gradient-to-br from-blue-500/10 to-transparent dark:from-blue-500/20">
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Total Top-Ups</p>
                    <p className="text-2xl font-bold text-foreground" data-testid="text-stat-topups">
                      £{Number(stats?.totalTopUps ?? 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center shrink-0">
                    <TrendingUp className="h-5 w-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-violet-500/10 to-transparent dark:from-violet-500/20">
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Total Deductions</p>
                    <p className="text-2xl font-bold text-foreground" data-testid="text-stat-deductions">
                      £{Number(stats?.totalDeductions ?? 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-violet-500 rounded-full flex items-center justify-center shrink-0">
                    <TrendingDown className="h-5 w-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-emerald-500/10 to-transparent dark:from-emerald-500/20">
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Transactions</p>
                    <p className="text-2xl font-bold text-foreground" data-testid="text-stat-count">
                      {stats?.transactionCount ?? 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center shrink-0">
                    <Hash className="h-5 w-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top Up Wallet</CardTitle>
          <CardDescription>Add funds to your wallet balance.</CardDescription>
        </CardHeader>
        <CardContent>
          {isDemo ? (
            <p className="text-sm text-muted-foreground" data-testid="text-demo-topup-message">
              Demo accounts cannot top up. Please upgrade to a full account.
            </p>
          ) : (
            <>
              <div className="flex items-end gap-3 flex-wrap">
                <div className="space-y-2 flex-1 min-w-48">
                  <Label htmlFor="topUpAmount">Amount (£)</Label>
                  <Input
                    id="topUpAmount"
                    type="number"
                    value={topUpAmount}
                    onChange={(e) => setTopUpAmount(e.target.value)}
                    placeholder="50.00"
                    min="0.01"
                    max="10000"
                    step="0.01"
                    data-testid="input-topup-amount"
                  />
                </div>
                <Button onClick={handleTopUp} disabled={topUpMutation.isPending} data-testid="button-topup">
                  {topUpMutation.isPending ? "Processing..." : "Top Up"}
                </Button>
              </div>
              {wallet && wallet.balance < 5 && (
                <p className="text-xs text-muted-foreground mt-2" data-testid="text-minimum-topup-hint">
                  Suggested minimum top-up: £{(5 - wallet.balance).toFixed(2)} to restore your account above the £5.00 minimum required for services.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card data-testid="card-alert-settings">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Balance Alerts</CardTitle>
          </div>
          <CardDescription>Get notified when your balance drops below a threshold.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-3 flex-wrap">
            <div className="space-y-2 flex-1 min-w-48">
              <Label htmlFor="alertThreshold">Alert Threshold (£)</Label>
              <Input
                id="alertThreshold"
                type="number"
                value={alertThreshold}
                onChange={(e) => setAlertThreshold(e.target.value)}
                placeholder="10.00"
                min="0"
                max="10000"
                step="0.01"
                data-testid="input-alert-threshold"
              />
              <p className="text-xs text-muted-foreground">You will be alerted when your balance drops below this amount.</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="emailAlerts">Email Alerts</Label>
              <p className="text-xs text-muted-foreground">Receive email notifications for low balance warnings.</p>
            </div>
            <Switch
              id="emailAlerts"
              checked={emailAlertsEnabled}
              onCheckedChange={setEmailAlertsEnabled}
              data-testid="switch-email-alerts"
            />
          </div>
          <Button onClick={handleSaveAlertSettings} disabled={saveSettingsMutation.isPending} variant="outline" data-testid="button-save-alert-settings">
            {saveSettingsMutation.isPending ? "Saving..." : "Save Alert Settings"}
          </Button>
        </CardContent>
      </Card>

      {!loadingWallet && wallet && Number(wallet.lockedBalance ?? 0) > 0 && (
        <Card data-testid="card-locked-funds-breakdown">
          <CardHeader>
            <CardTitle className="text-base">Locked Funds Breakdown</CardTitle>
            <CardDescription>Funds reserved for active campaigns.</CardDescription>
          </CardHeader>
          <CardContent>
            <LockedFundsBreakdown />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Transaction History</CardTitle>
          <CardDescription>Recent wallet transactions.</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingTransactions ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6" data-testid="text-no-transactions">
              No transactions yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="table-transactions">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Date</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Type</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Amount</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">Balance After</th>
                    <th className="text-left py-3 px-2 font-medium text-muted-foreground">Description</th>
                    <th className="text-center py-3 px-2 font-medium text-muted-foreground w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="border-b last:border-0" data-testid={`row-transaction-${tx.id}`}>
                      <td className="py-3 px-2 text-muted-foreground whitespace-nowrap">
                        {formatDate(tx.createdAt)}
                      </td>
                      <td className="py-3 px-2">
                        {getTypeBadge(tx.type)}
                      </td>
                      <td className={`py-3 px-2 text-right font-medium whitespace-nowrap ${tx.amount >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`} data-testid={`text-amount-${tx.id}`}>
                        {tx.amount >= 0 ? "+" : ""}£{Math.abs(tx.amount).toFixed(2)}
                      </td>
                      <td className="py-3 px-2 text-right text-muted-foreground whitespace-nowrap" data-testid={`text-balance-after-${tx.id}`}>
                        £{Number(tx.balanceAfter).toFixed(2)}
                      </td>
                      <td className="py-3 px-2 text-muted-foreground max-w-xs truncate" data-testid={`text-description-${tx.id}`}>
                        {tx.description}
                      </td>
                      <td className="py-3 px-2 text-center">
                        <a
                          href={`/api/wallet/transactions/${tx.id}/receipt`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center w-8 h-8 rounded-md hover:bg-muted transition-colors"
                          title="View Receipt"
                          data-testid={`link-receipt-${tx.id}`}
                        >
                          <FileText className="h-4 w-4 text-muted-foreground" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function LockedFundsBreakdown() {
  const { data: locks = [], isLoading } = useQuery<Array<{
    campaignId: number;
    campaignName: string;
    lockedAmount: string;
    status: string;
  }>>({
    queryKey: ["/api/wallet/locks"],
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (locks.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        No active fund locks.
      </p>
    );
  }

  return (
    <div className="space-y-2" data-testid="list-locked-funds">
      {locks.map((lock) => (
        <div
          key={lock.campaignId}
          className="flex items-center justify-between gap-3 p-3 rounded-md bg-muted/50 flex-wrap"
          data-testid={`row-lock-${lock.campaignId}`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Lock className="h-4 w-4 text-amber-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium truncate" data-testid={`text-lock-campaign-${lock.campaignId}`}>
                {lock.campaignName}
              </p>
              <Badge variant="outline" className="text-xs no-default-hover-elevate no-default-active-elevate mt-0.5">
                {lock.status}
              </Badge>
            </div>
          </div>
          <span className="text-sm font-medium text-amber-600 dark:text-amber-400 whitespace-nowrap" data-testid={`text-lock-amount-${lock.campaignId}`}>
            £{Number(lock.lockedAmount).toFixed(2)}
          </span>
        </div>
      ))}
    </div>
  );
}
