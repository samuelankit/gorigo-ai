"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/lib/use-toast";
import { cn } from "@/lib/utils";
import { Check, CreditCard, DollarSign, PhoneCall, Users, Clock, Crown, ArrowUpRight, ArrowDownRight, Download, Wallet, ExternalLink, FileText, CalendarDays, Cloud, Key, Server } from "lucide-react";
import { TalkTimeInfo } from "@/components/talk-time-info";

interface Usage {
  id: number;
  minutesUsed: number;
  minuteLimit: number;
  callCount: number;
  leadsCaptured: number;
  spendingCap: number | null;
}

interface Plan {
  id: number;
  name: string;
  minutesIncluded: number;
  pricePerMonth: number;
  overagePerMinute: number;
}

interface Subscription {
  id: number;
  planId: number;
  status: string;
}

interface Transaction {
  id: number;
  type: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  referenceType: string | null;
  createdAt: string;
}

interface RateInfo {
  category: string;
  ratePerMinute: number;
  includesAiCost: boolean;
  includesTelephonyCost: boolean;
}

const DEPLOYMENT_MODEL_INFO: Record<string, { label: string; icon: typeof Cloud; description: string; color: string }> = {
  managed: { label: "Managed", icon: Cloud, description: "Full-service: AI, telephony & platform costs included in rate", color: "text-blue-600 dark:text-blue-400" },
  byok: { label: "BYOK", icon: Key, description: "Platform fee only. You provide your own API keys for AI & telephony", color: "text-amber-600 dark:text-amber-400" },
  self_hosted: { label: "Self-Hosted", icon: Server, description: "License fee per usage. You run your own infrastructure", color: "text-emerald-600 dark:text-emerald-400" },
};

function getTypeBadge(type: string) {
  switch (type) {
    case "credit":
      return <Badge variant="default" className="no-default-hover-elevate bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">Credit</Badge>;
    case "debit":
      return <Badge variant="default" className="no-default-hover-elevate bg-red-500/10 text-red-600 dark:text-red-400">Debit</Badge>;
    case "refund":
      return <Badge variant="default" className="no-default-hover-elevate bg-blue-500/10 text-blue-600 dark:text-blue-400">Refund</Badge>;
    default:
      return <Badge variant="secondary" className="no-default-hover-elevate">{type}</Badge>;
  }
}

function formatTxDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default function BillingPage() {
  const { toast } = useToast();
  const [usage, setUsage] = useState<Usage | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(true);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [error, setError] = useState(false);
  const [spendingCap, setSpendingCap] = useState("");
  const [savingCap, setSavingCap] = useState(false);
  const [switchingPlan, setSwitchingPlan] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTx, setLoadingTx] = useState(true);
  const [txFilter, setTxFilter] = useState("all");
  const [deploymentModel, setDeploymentModel] = useState<string>("managed");
  const [rates, setRates] = useState<RateInfo[]>([]);
  const [statementMonth, setStatementMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  useEffect(() => {
    fetch("/api/usage")
      .then((r) => r.json())
      .then((d) => {
        if (d?.usage) {
          setUsage(d.usage);
          setSpendingCap(d.usage.spendingCap?.toString() ?? "");
        }
        if (d?.deploymentModel) setDeploymentModel(d.deploymentModel);
        if (d?.rates) setRates(d.rates);
      })
      .catch(() => { setError(true); })
      .finally(() => setLoadingUsage(false));

    fetch("/api/billing/plans")
      .then((r) => r.json())
      .then((d) => {
        if (d?.plans) setPlans(d.plans);
      })
      .catch(() => { setError(true); })
      .finally(() => setLoadingPlans(false));

    fetch("/api/billing/subscription")
      .then((r) => r.json())
      .then((d) => {
        if (d?.subscription) setSubscription(d.subscription);
      })
      .catch(() => { setError(true); });

    fetch("/api/wallet/transactions?limit=500&offset=0")
      .then((r) => r.json())
      .then((d) => {
        if (d?.transactions) setTransactions(d.transactions);
      })
      .catch(() => {})
      .finally(() => setLoadingTx(false));
  }, []);

  const handleSaveSpendingCap = async () => {
    setSavingCap(true);
    try {
      const res = await fetch("/api/usage/spending-cap", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spendingCap: spendingCap ? parseFloat(spendingCap) : null }),
      });
      if (!res.ok) throw new Error("Failed");
      toast({ title: "Spending cap saved", description: spendingCap ? `Cap set to $${spendingCap}.` : "Spending cap removed." });
    } catch {
      toast({ title: "Error", description: "Failed to save spending cap.", variant: "destructive" });
    } finally {
      setSavingCap(false);
    }
  };

  const handleSwitchPlan = async (planId: number) => {
    setSwitchingPlan(planId);
    try {
      const res = await fetch("/api/billing/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, status: "active" }),
      });
      if (!res.ok) throw new Error("Failed to switch plan");
      const data = await res.json();
      if (data?.subscription) setSubscription(data.subscription);
      toast({ title: "Plan updated", description: "Your subscription has been updated." });
    } catch {
      toast({ title: "Error", description: "Failed to switch plan.", variant: "destructive" });
    } finally {
      setSwitchingPlan(null);
    }
  };

  const minutePercent = usage ? Math.min((usage.minutesUsed / (usage.minuteLimit || 1)) * 100, 100) : 0;
  const currentPlan = plans.find((p) => p.id === subscription?.planId);

  const filteredTx = txFilter === "all" ? transactions : transactions.filter((tx) => tx.type === txFilter);

  const exportTransactionsCsv = () => {
    const rows = [["Date", "Type", "Amount", "Balance After", "Description", "Reference"]];
    filteredTx.forEach((tx) => {
      rows.push([
        formatTxDate(tx.createdAt),
        tx.type,
        (tx.amount >= 0 ? "+" : "") + Math.abs(tx.amount).toFixed(2),
        Number(tx.balanceAfter).toFixed(2),
        tx.description || "",
        tx.referenceType || "",
      ]);
    });
    const escField = (f: string) => f.includes(",") || f.includes('"') || f.includes("\n") ? `"${f.replace(/"/g, '""')}"` : f;
    const csv = rows.map((r) => r.map(escField).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `billing-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getMonthlyTransactions = () => {
    const [year, month] = statementMonth.split("-").map(Number);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);
    return transactions.filter((tx) => {
      const d = new Date(tx.createdAt);
      return d >= start && d <= end;
    });
  };

  const exportMonthlyStatement = () => {
    const monthTx = getMonthlyTransactions();
    const [year, month] = statementMonth.split("-").map(Number);
    const monthName = new Date(year, month - 1).toLocaleString("en-GB", { month: "long", year: "numeric" });

    const totalCredits = monthTx.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
    const totalDebits = monthTx.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
    const netChange = totalCredits - totalDebits;

    const rows: string[][] = [
      ["GoRigo - Monthly Billing Statement"],
      [`Period: ${monthName}`],
      [`Generated: ${new Date().toLocaleDateString("en-GB")}`],
      [],
      ["Summary"],
      [`Total Credits,£${totalCredits.toFixed(2)}`],
      [`Total Debits,£${totalDebits.toFixed(2)}`],
      [`Net Change,${netChange >= 0 ? "+" : ""}£${netChange.toFixed(2)}`],
      [`Transactions,${monthTx.length}`],
      [],
      ["Date", "Type", "Amount", "Balance After", "Description", "Reference"],
    ];

    monthTx.forEach((tx) => {
      rows.push([
        formatTxDate(tx.createdAt),
        tx.type,
        `${tx.amount >= 0 ? "+" : ""}£${Math.abs(tx.amount).toFixed(2)}`,
        `£${Number(tx.balanceAfter).toFixed(2)}`,
        tx.description || "",
        tx.referenceType || "",
      ]);
    });

    const escapeCsvField = (field: string) => {
      if (field.includes(",") || field.includes('"') || field.includes("\n")) {
        return `"${field.replace(/"/g, '""')}"`;
      }
      return field;
    };
    const csv = rows.map((r) => r.map(escapeCsvField).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gorigo-statement-${statementMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const monthlyTxCount = getMonthlyTransactions().length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center shrink-0">
              <CreditCard className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-foreground" data-testid="text-billing-title">
              Billing & Usage
            </h1>
          </div>
          <p className="text-muted-foreground text-sm">Monitor your usage and manage your subscription. Billed by talk time<TalkTimeInfo /> only.</p>
        </div>
      </div>

      {!loadingUsage && (
        <Card data-testid="card-deployment-model">
          <CardContent className="flex items-center gap-4 py-4">
            {(() => {
              const info = DEPLOYMENT_MODEL_INFO[deploymentModel] || DEPLOYMENT_MODEL_INFO.managed;
              const ModelIcon = info.icon;
              return (
                <>
                  <div className={cn("flex items-center justify-center w-10 h-10 rounded-lg shrink-0", deploymentModel === "managed" ? "bg-blue-500/10" : deploymentModel === "byok" ? "bg-amber-500/10" : "bg-emerald-500/10")}>
                    <ModelIcon className={cn("w-5 h-5", info.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-foreground" data-testid="text-deployment-model-label">{info.label} Deployment</span>
                      <Badge variant="outline" className="text-xs no-default-hover-elevate">{deploymentModel}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{info.description}</p>
                  </div>
                  {rates.length > 0 && (
                    <div className="flex items-center gap-4 flex-wrap">
                      {rates.map((r) => (
                        <div key={r.category} className="text-right">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                            {r.category === "voice_inbound" ? "Inbound" : r.category === "voice_outbound" ? "Outbound" : "AI Chat"}
                          </p>
                          <p className="text-sm font-mono font-semibold text-foreground" data-testid={`text-rate-${r.category}`}>
                            {"\u00A3"}{Number(r.ratePerMinute).toFixed(4)}/min
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {error && (
        <div className="text-center py-4" data-testid="text-billing-error">
          <p className="text-sm text-muted-foreground">Some billing data failed to load. Information shown may be incomplete.</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {loadingUsage ? (
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
                    <p className="text-sm font-medium text-muted-foreground mb-1">Total Calls</p>
                    <p className="text-2xl font-bold text-foreground" data-testid="text-usage-calls">
                      {usage?.callCount ?? 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center shrink-0">
                    <PhoneCall className="h-5 w-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-violet-500/10 to-transparent dark:from-violet-500/20">
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Leads Captured</p>
                    <p className="text-2xl font-bold text-foreground" data-testid="text-usage-leads">
                      {usage?.leadsCaptured ?? 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-violet-500 rounded-full flex items-center justify-center shrink-0">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-emerald-500/10 to-transparent dark:from-emerald-500/20">
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Minutes Used</p>
                    <p className="text-2xl font-bold text-foreground">
                      {Math.round(usage?.minutesUsed ?? 0)} / {usage?.minuteLimit ?? 0}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center shrink-0">
                    <Clock className="h-5 w-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {!loadingUsage && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Minutes Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Usage this period</span>
                <span className="font-medium" data-testid="text-usage-minutes">
                  {Math.round(usage?.minutesUsed ?? 0)} / {usage?.minuteLimit ?? 0}
                </span>
              </div>
              <Progress value={minutePercent} className="h-2" data-testid="progress-minutes" />
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-amber-200 dark:border-amber-800/40">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-500/20 rounded-lg flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <CardTitle className="text-base">Spending Cap</CardTitle>
              <CardDescription>Set a monthly spending limit for overage charges.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3 flex-wrap">
            <div className="space-y-2 flex-1 min-w-48">
              <Label htmlFor="spendingCap">Monthly Cap ($)</Label>
              <Input
                id="spendingCap"
                type="number"
                value={spendingCap}
                onChange={(e) => setSpendingCap(e.target.value)}
                placeholder="100"
                data-testid="input-spending-cap"
              />
            </div>
            <Button onClick={handleSaveSpendingCap} disabled={savingCap} data-testid="button-save-cap">
              {savingCap ? "Saving..." : "Save"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-bold text-foreground mb-4">Available Plans</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {(loadingPlans ? [null, null, null] : plans).map((plan, index) => {
            if (!plan) {
              return <Skeleton key={index} className="h-80 w-full rounded-md" />;
            }
            const isCurrentPlan = subscription?.planId === plan.id;
            return (
              <Card
                key={plan.id}
                className={cn(
                  isCurrentPlan && "bg-gradient-to-br from-blue-500/5 to-transparent dark:from-blue-500/10 border-primary"
                )}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg">{plan.name}</CardTitle>
                      <CardDescription>${plan.pricePerMonth}/month</CardDescription>
                    </div>
                    {isCurrentPlan && (
                      <Badge className="no-default-hover-elevate shrink-0">Current</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary shrink-0" />
                      <span>{plan.minutesIncluded} minutes included</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary shrink-0" />
                      <span>${plan.overagePerMinute}/min overage</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary shrink-0" />
                      <span>AI-powered calls</span>
                    </div>
                  </div>
                  <Separator />
                  {isCurrentPlan ? (
                    <Button
                      variant="secondary"
                      className="w-full"
                      disabled
                      data-testid={`button-plan-current-${plan.id}`}
                    >
                      Current Plan
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      onClick={() => handleSwitchPlan(plan.id)}
                      disabled={switchingPlan === plan.id}
                      data-testid={`button-switch-plan-${plan.id}`}
                    >
                      {switchingPlan === plan.id ? "Switching..." : "Switch Plan"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <div className="space-y-1">
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Transaction History
            </CardTitle>
            <CardDescription>Recent debits and credits to your wallet.</CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={txFilter} onValueChange={setTxFilter}>
              <SelectTrigger className="w-28" data-testid="select-tx-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="debit">Debits</SelectItem>
                <SelectItem value="credit">Credits</SelectItem>
                <SelectItem value="refund">Refunds</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={exportTransactionsCsv} disabled={filteredTx.length === 0} data-testid="button-export-billing-csv">
              <Download className="w-4 h-4 mr-1.5" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingTx ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : filteredTx.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted mb-3">
                <Wallet className="w-5 h-5 text-muted-foreground/60" />
              </div>
              <p className="text-sm text-muted-foreground" data-testid="text-no-billing-transactions">
                No transactions found.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTx.slice(0, 25).map((tx) => (
                  <TableRow key={tx.id} data-testid={`row-billing-tx-${tx.id}`}>
                    <TableCell className="text-sm whitespace-nowrap text-muted-foreground">
                      {formatTxDate(tx.createdAt)}
                    </TableCell>
                    <TableCell>{getTypeBadge(tx.type)}</TableCell>
                    <TableCell className="text-sm max-w-xs truncate">{tx.description || "-"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{tx.referenceType || "-"}</TableCell>
                    <TableCell className="text-right">
                      <span className={`text-sm font-medium flex items-center justify-end gap-1 ${
                        tx.amount >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                      }`}>
                        {tx.amount >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {tx.amount >= 0 ? "+" : ""}£{Math.abs(tx.amount).toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      £{Number(tx.balanceAfter).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {filteredTx.length > 25 && (
            <div className="flex justify-center mt-4">
              <Button variant="outline" size="sm" onClick={() => window.location.href = "/dashboard/wallet"} data-testid="button-view-all-tx">
                <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                View all in Wallet
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <div className="space-y-1">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Monthly Statement
            </CardTitle>
            <CardDescription>Download a billing statement for any month.</CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <Input
                type="month"
                value={statementMonth}
                onChange={(e) => setStatementMonth(e.target.value)}
                className="w-44"
                data-testid="input-statement-month"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={exportMonthlyStatement}
              disabled={monthlyTxCount === 0}
              data-testid="button-export-statement"
            >
              <Download className="w-4 h-4 mr-1.5" />
              Download ({monthlyTxCount})
            </Button>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}
