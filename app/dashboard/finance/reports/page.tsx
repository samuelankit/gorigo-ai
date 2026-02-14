"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { FileText, TrendingUp, Clock, BarChart3, Loader2, Download } from "lucide-react";

interface Workspace { id: number; name: string; type: string; currency: string; }
interface PnlRow { accountCode: string; accountName: string; accountType: string; total: number; }
interface AgingDetail { invoiceNumber: string; customerName: string; outstanding: number; daysOverdue: number; bucket: string; }
interface CashflowRow { month: string; received: number; paid: number; net: number; }

export default function ReportsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center p-8"><div className="animate-pulse text-muted-foreground">Loading...</div></div>}>
      <ReportsContent />
    </Suspense>
  );
}

function ReportsContent() {
  const searchParams = useSearchParams();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWsId, setActiveWsId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [reportTab, setReportTab] = useState("pnl");

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [pnlData, setPnlData] = useState<PnlRow[]>([]);
  const [agingData, setAgingData] = useState<AgingDetail[]>([]);
  const [cashflowData, setCashflowData] = useState<CashflowRow[]>([]);
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    fetch("/api/finance/workspaces")
      .then((r) => r.json())
      .then((data) => {
        if (data.workspaces?.length) {
          setWorkspaces(data.workspaces);
          const wsParam = searchParams.get("ws");
          setActiveWsId(wsParam || String(data.workspaces[0].id));
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [searchParams]);

  const activeWs = workspaces.find((w) => String(w.id) === activeWsId);
  const sym = activeWs?.currency === "USD" ? "$" : activeWs?.currency === "EUR" ? "\u20ac" : "\u00a3";
  const fmt = (v: number) => `${sym}${Math.abs(v).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const fetchReport = useCallback(async (type: string) => {
    if (!activeWsId) return;
    setReportLoading(true);
    try {
      const params = new URLSearchParams({ workspaceId: activeWsId, type });
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      const res = await fetch(`/api/finance/reports?${params}`);
      const data = await res.json();
      if (type === "pnl") {
        const rows: PnlRow[] = [
          ...(data.income || []).map((r: any) => ({ accountCode: r.code, accountName: r.name, accountType: "income", total: r.amount })),
          ...(data.expenses || []).map((r: any) => ({ accountCode: r.code, accountName: r.name, accountType: "expense", total: r.amount })),
        ];
        setPnlData(rows);
      } else if (type === "aging") {
        setAgingData(data.details || []);
      } else if (type === "cashflow") {
        const rows: CashflowRow[] = (data.cashflow || []).map((r: any) => ({
          month: r.month,
          received: r.inflow,
          paid: r.outflow,
          net: r.net,
        }));
        setCashflowData(rows);
      }
    } catch {}
    setReportLoading(false);
  }, [activeWsId, dateFrom, dateTo]);

  useEffect(() => {
    if (activeWsId) fetchReport(reportTab);
  }, [activeWsId, reportTab, fetchReport]);

  const incomeRows = pnlData.filter((r) => r.accountType === "income");
  const expenseRows = pnlData.filter((r) => r.accountType === "expense");
  const totalIncome = incomeRows.reduce((s, r) => s + r.total, 0);
  const totalExpenses = expenseRows.reduce((s, r) => s + r.total, 0);
  const netProfit = totalIncome - totalExpenses;

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-5" data-testid="page-finance-reports">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold">Financial Reports</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Profit & Loss, Customer Aging, Cash Flow</p>
        </div>
        <Select value={activeWsId} onValueChange={setActiveWsId}>
          <SelectTrigger className="h-8 w-[180px] text-xs">
            <SelectValue placeholder="Workspace" />
          </SelectTrigger>
          <SelectContent>
            {workspaces.map((ws) => (
              <SelectItem key={ws.id} value={String(ws.id)}>{ws.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-3">
          <div className="flex items-end gap-3 flex-wrap">
            <div>
              <Label className="text-[10px] text-muted-foreground">From</Label>
              <Input type="date" className="h-8 text-xs mt-0.5 w-36" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} data-testid="input-date-from" />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">To</Label>
              <Input type="date" className="h-8 text-xs mt-0.5 w-36" value={dateTo} onChange={(e) => setDateTo(e.target.value)} data-testid="input-date-to" />
            </div>
            <Button size="sm" variant="outline" onClick={() => fetchReport(reportTab)} data-testid="button-refresh-report">
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs value={reportTab} onValueChange={setReportTab}>
        <TabsList>
          <TabsTrigger value="pnl" className="text-xs gap-1.5" data-testid="tab-pnl">
            <TrendingUp className="h-3.5 w-3.5" /> Profit & Loss
          </TabsTrigger>
          <TabsTrigger value="aging" className="text-xs gap-1.5" data-testid="tab-aging">
            <Clock className="h-3.5 w-3.5" /> Customer Aging
          </TabsTrigger>
          <TabsTrigger value="cashflow" className="text-xs gap-1.5" data-testid="tab-cashflow">
            <BarChart3 className="h-3.5 w-3.5" /> Cash Flow
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pnl" className="mt-4">
          {reportLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold" data-testid="text-pnl-title">Profit & Loss Statement</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left p-3 font-semibold text-[11px] uppercase text-muted-foreground">Account</th>
                      <th className="text-right p-3 font-semibold text-[11px] uppercase text-muted-foreground">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-emerald-500/5"><td colSpan={2} className="p-3 font-semibold text-emerald-700 dark:text-emerald-400">Income</td></tr>
                    {incomeRows.length === 0 ? (
                      <tr><td colSpan={2} className="p-3 text-center text-muted-foreground">No income recorded</td></tr>
                    ) : (
                      incomeRows.map((r) => (
                        <tr key={r.accountCode} className="border-b last:border-0">
                          <td className="p-3 pl-6">{r.accountCode} - {r.accountName}</td>
                          <td className="p-3 text-right font-medium text-emerald-600 dark:text-emerald-400">{fmt(r.total)}</td>
                        </tr>
                      ))
                    )}
                    <tr className="bg-muted/30 font-semibold">
                      <td className="p-3">Total Income</td>
                      <td className="p-3 text-right text-emerald-600 dark:text-emerald-400" data-testid="text-total-income">{fmt(totalIncome)}</td>
                    </tr>

                    <tr className="bg-destructive/5"><td colSpan={2} className="p-3 font-semibold text-destructive">Expenses</td></tr>
                    {expenseRows.length === 0 ? (
                      <tr><td colSpan={2} className="p-3 text-center text-muted-foreground">No expenses recorded</td></tr>
                    ) : (
                      expenseRows.map((r) => (
                        <tr key={r.accountCode} className="border-b last:border-0">
                          <td className="p-3 pl-6">{r.accountCode} - {r.accountName}</td>
                          <td className="p-3 text-right font-medium text-destructive">{fmt(r.total)}</td>
                        </tr>
                      ))
                    )}
                    <tr className="bg-muted/30 font-semibold">
                      <td className="p-3">Total Expenses</td>
                      <td className="p-3 text-right text-destructive" data-testid="text-total-expenses">{fmt(totalExpenses)}</td>
                    </tr>

                    <tr className="bg-primary/5 font-bold text-sm">
                      <td className="p-3">Net Profit / (Loss)</td>
                      <td className={`p-3 text-right ${netProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`} data-testid="text-net-profit">
                        {netProfit < 0 ? `(${fmt(netProfit)})` : fmt(netProfit)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="aging" className="mt-4">
          {reportLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold" data-testid="text-aging-title">Customer Aging Report</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left p-3 font-semibold text-[11px] uppercase text-muted-foreground">Invoice</th>
                        <th className="text-left p-3 font-semibold text-[11px] uppercase text-muted-foreground">Customer</th>
                        <th className="text-left p-3 font-semibold text-[11px] uppercase text-muted-foreground">Bucket</th>
                        <th className="text-right p-3 font-semibold text-[11px] uppercase text-muted-foreground">Days Overdue</th>
                        <th className="text-right p-3 font-semibold text-[11px] uppercase text-muted-foreground">Outstanding</th>
                      </tr>
                    </thead>
                    <tbody>
                      {agingData.length === 0 ? (
                        <tr><td colSpan={5} className="p-6 text-center text-muted-foreground" data-testid="text-no-aging">No outstanding invoices</td></tr>
                      ) : (
                        agingData.map((row) => (
                          <tr key={row.invoiceNumber} className="border-b last:border-0">
                            <td className="p-3 font-medium">{row.invoiceNumber}</td>
                            <td className="p-3">{row.customerName}</td>
                            <td className="p-3">{row.bucket}</td>
                            <td className="p-3 text-right">{row.daysOverdue}</td>
                            <td className="p-3 text-right font-semibold">{fmt(row.outstanding)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="cashflow" className="mt-4">
          {reportLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold" data-testid="text-cashflow-title">Cash Flow Summary</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left p-3 font-semibold text-[11px] uppercase text-muted-foreground">Month</th>
                        <th className="text-right p-3 font-semibold text-[11px] uppercase text-muted-foreground">Money In</th>
                        <th className="text-right p-3 font-semibold text-[11px] uppercase text-muted-foreground">Money Out</th>
                        <th className="text-right p-3 font-semibold text-[11px] uppercase text-muted-foreground">Net</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cashflowData.length === 0 ? (
                        <tr><td colSpan={4} className="p-6 text-center text-muted-foreground" data-testid="text-no-cashflow">No payment data available</td></tr>
                      ) : (
                        cashflowData.map((row) => (
                          <tr key={row.month} className="border-b last:border-0">
                            <td className="p-3 font-medium">{row.month}</td>
                            <td className="p-3 text-right text-emerald-600 dark:text-emerald-400">+{fmt(row.received)}</td>
                            <td className="p-3 text-right text-destructive">-{fmt(row.paid)}</td>
                            <td className={`p-3 text-right font-semibold ${row.net >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                              {row.net >= 0 ? "+" : "-"}{fmt(row.net)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
