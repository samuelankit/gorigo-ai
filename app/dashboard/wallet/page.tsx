"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/lib/use-toast";
import { Wallet, TrendingUp, TrendingDown, Hash, AlertTriangle, Cloud, Key, Server } from "lucide-react";
import { cn } from "@/lib/utils";
import { TalkTimeInfo } from "@/components/talk-time-info";

interface WalletData {
  balance: number;
  currency: string;
  lowBalanceThreshold: number;
  isActive: boolean;
  lowBalance: boolean;
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
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [stats, setStats] = useState<WalletStats | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingWallet, setLoadingWallet] = useState(true);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [error, setError] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [toppingUp, setToppingUp] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [deploymentModel, setDeploymentModel] = useState<string | null>(null);

  const fetchWallet = () => {
    fetch("/api/wallet")
      .then((r) => r.json())
      .then((d) => {
        if (d?.wallet) setWallet(d.wallet);
        if (d?.stats) setStats(d.stats);
      })
      .catch(() => { setError(true); })
      .finally(() => setLoadingWallet(false));
  };

  const fetchTransactions = () => {
    fetch("/api/wallet/transactions?limit=50&offset=0")
      .then((r) => r.json())
      .then((d) => {
        if (d?.transactions) setTransactions(d.transactions);
      })
      .catch(() => { setError(true); })
      .finally(() => setLoadingTransactions(false));
  };

  useEffect(() => {
    fetchWallet();
    fetchTransactions();

    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d?.user?.isDemo) setIsDemo(true);
        if (d?.org?.deploymentModel) setDeploymentModel(d.org.deploymentModel);
      })
      .catch((error) => { console.error("Fetch wallet user data failed:", error); });
  }, []);

  const handleTopUp = async () => {
    const amount = parseFloat(topUpAmount);
    if (!amount || amount <= 0 || amount > 10000) {
      toast({ title: "Invalid amount", description: "Please enter an amount between 0.01 and 10,000.", variant: "destructive" });
      return;
    }

    setToppingUp(true);
    try {
      const res = await fetch("/api/wallet/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to top up");
      }
      const data = await res.json();
      toast({ title: "Top-up successful", description: `Your new balance is £${Number(data.newBalance).toFixed(2)}.` });
      setTopUpAmount("");
      setLoadingWallet(true);
      setLoadingTransactions(true);
      fetchWallet();
      fetchTransactions();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to top up wallet.";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setToppingUp(false);
    }
  };

  const getTypeBadge = (type: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      top_up: { label: "Top Up", className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20" },
      deduction: { label: "Deduction", className: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/20" },
      refund: { label: "Refund", className: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20" },
      adjustment: { label: "Adjustment", className: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20" },
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

      {!loadingWallet && wallet?.lowBalance && (
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
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-12 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </CardContent>
        </Card>
      ) : (
        <Card data-testid="card-wallet-balance">
          <CardContent className="p-6">
            <p className="text-sm font-medium text-muted-foreground mb-1">Current Balance</p>
            <p className="text-4xl font-bold text-foreground" data-testid="text-wallet-balance">
              £{Number(wallet?.balance ?? 0).toFixed(2)}
            </p>
            <p className="text-sm text-muted-foreground mt-1" data-testid="text-wallet-currency">
              {wallet?.currency ?? "GBP"}
            </p>
          </CardContent>
        </Card>
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
              <Button onClick={handleTopUp} disabled={toppingUp} data-testid="button-topup">
                {toppingUp ? "Processing..." : "Top Up"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

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
