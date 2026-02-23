"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Landmark,
  ArrowUpRight,
  ArrowDownLeft,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Receipt,
  ShoppingCart,
  Plus,
  FileText,
  Loader2,
} from "lucide-react";

interface Workspace {
  id: number;
  name: string;
  type: string;
  currency: string;
}

interface Summary {
  totalReceivable: number;
  totalPayable: number;
  cashPosition: number;
  incomeThisMonth: number;
  expensesThisMonth: number;
  overdueInvoices: number;
  overdueBills: number;
}

export default function FinanceHomePage() {
  const [activeWsId, setActiveWsId] = useState<string>("");

  const { data: wsData, isLoading: wsLoading } = useQuery<{ workspaces: Workspace[] }>({
    queryKey: ["/api/finance/workspaces"],
  });

  const workspaces = wsData?.workspaces || [];

  const resolvedWsId = activeWsId || (workspaces.length > 0 ? String(workspaces[0].id) : "");

  const { data: summaryData } = useQuery<{
    totalReceivable?: number;
    totalPayable?: number;
    cashPosition?: number;
    incomeThisMonth?: number;
    expensesThisMonth?: number;
    overdueInvoicesCount?: number;
    overdueBillsCount?: number;
    error?: string;
  }>({
    queryKey: ["/api/finance/summary", { workspaceId: resolvedWsId }],
    queryFn: async () => {
      const res = await fetch(`/api/finance/summary?workspaceId=${resolvedWsId}`);
      if (!res.ok) throw new Error("Failed to fetch summary");
      return res.json();
    },
    enabled: !!resolvedWsId,
  });

  const summary: Summary | null = summaryData && !summaryData.error ? {
    totalReceivable: summaryData.totalReceivable || 0,
    totalPayable: summaryData.totalPayable || 0,
    cashPosition: summaryData.cashPosition || 0,
    incomeThisMonth: summaryData.incomeThisMonth || 0,
    expensesThisMonth: summaryData.expensesThisMonth || 0,
    overdueInvoices: summaryData.overdueInvoicesCount || 0,
    overdueBills: summaryData.overdueBillsCount || 0,
  } : null;

  const activeWs = workspaces.find((w) => String(w.id) === resolvedWsId);
  const currency = activeWs?.currency || "GBP";
  const symbol = currency === "GBP" ? "\u00a3" : currency === "USD" ? "$" : currency === "EUR" ? "\u20ac" : currency;

  const fmt = (val: number) => `${symbol}${Math.abs(val).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (wsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!workspaces.length) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Landmark className="h-10 w-10 text-muted-foreground" />
        <p className="text-muted-foreground text-sm">No finance workspaces found.</p>
        <p className="text-xs text-muted-foreground">Run the finance seed script to get started.</p>
      </div>
    );
  }

  const profit = (summary?.incomeThisMonth || 0) - (summary?.expensesThisMonth || 0);

  return (
    <div className="space-y-5" data-testid="page-finance-home">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold" data-testid="text-finance-title">Finance</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {activeWs?.type === "personal" ? "Personal finances" : activeWs?.name || "Company"} overview
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={resolvedWsId} onValueChange={setActiveWsId}>
            <SelectTrigger className="h-8 w-[180px] text-xs" data-testid="select-workspace">
              <SelectValue placeholder="Select workspace" />
            </SelectTrigger>
            <SelectContent>
              {workspaces.map((ws) => (
                <SelectItem key={ws.id} value={String(ws.id)} data-testid={`option-workspace-${ws.id}`}>
                  {ws.name} ({ws.type})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-cash-position">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Cash Position</span>
              <Landmark className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-xl font-bold" data-testid="text-cash-position">{fmt(summary?.cashPosition || 0)}</p>
          </CardContent>
        </Card>

        <Card data-testid="card-receivable">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Receivable</span>
              <ArrowDownLeft className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-xl font-bold" data-testid="text-receivable">{fmt(summary?.totalReceivable || 0)}</p>
            {(summary?.overdueInvoices || 0) > 0 && (
              <p className="text-[11px] text-destructive mt-1">{summary?.overdueInvoices} overdue</p>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-payable">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Payable</span>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-xl font-bold" data-testid="text-payable">{fmt(summary?.totalPayable || 0)}</p>
            {(summary?.overdueBills || 0) > 0 && (
              <p className="text-[11px] text-destructive mt-1">{summary?.overdueBills} overdue</p>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-profit">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Profit (MTD)</span>
              {profit >= 0 ? (
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-destructive" />
              )}
            </div>
            <p className={`text-xl font-bold ${profit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`} data-testid="text-profit">
              {profit < 0 ? "-" : ""}{fmt(profit)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
            <CardTitle className="text-sm font-semibold">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Link href={`/dashboard/finance/sales?ws=${resolvedWsId}&action=new-invoice`}>
              <Button variant="outline" className="w-full justify-start gap-2 text-xs" data-testid="button-new-invoice">
                <Plus className="h-3.5 w-3.5" />
                Create Invoice
              </Button>
            </Link>
            <Link href={`/dashboard/finance/purchases?ws=${resolvedWsId}&action=new-bill`}>
              <Button variant="outline" className="w-full justify-start gap-2 text-xs" data-testid="button-new-bill">
                <Plus className="h-3.5 w-3.5" />
                Record Expense / Bill
              </Button>
            </Link>
            <Link href={`/dashboard/finance/sales?ws=${resolvedWsId}&tab=customers`}>
              <Button variant="outline" className="w-full justify-start gap-2 text-xs" data-testid="button-view-customers">
                <Receipt className="h-3.5 w-3.5" />
                View Customers
              </Button>
            </Link>
            <Link href={`/dashboard/finance/reports?ws=${resolvedWsId}`}>
              <Button variant="outline" className="w-full justify-start gap-2 text-xs" data-testid="button-view-reports">
                <FileText className="h-3.5 w-3.5" />
                View Reports
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
            <CardTitle className="text-sm font-semibold">Things To Do</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-3">
            {!summary || (summary.overdueInvoices === 0 && summary.overdueBills === 0 && summary.totalReceivable === 0) ? (
              <p className="text-xs text-muted-foreground" data-testid="text-no-todos">All clear! No pending actions.</p>
            ) : (
              <>
                {(summary?.overdueInvoices || 0) > 0 && (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive" className="text-[10px]">Overdue</Badge>
                      <span className="text-xs">{summary?.overdueInvoices} invoice{(summary?.overdueInvoices || 0) > 1 ? "s" : ""} past due</span>
                    </div>
                    <Link href={`/dashboard/finance/sales?ws=${resolvedWsId}&filter=overdue`}>
                      <Button size="sm" variant="ghost" className="text-xs h-7" data-testid="link-overdue-invoices">Chase</Button>
                    </Link>
                  </div>
                )}
                {(summary?.overdueBills || 0) > 0 && (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive" className="text-[10px]">Overdue</Badge>
                      <span className="text-xs">{summary?.overdueBills} bill{(summary?.overdueBills || 0) > 1 ? "s" : ""} to pay</span>
                    </div>
                    <Link href={`/dashboard/finance/purchases?ws=${resolvedWsId}&filter=overdue`}>
                      <Button size="sm" variant="ghost" className="text-xs h-7" data-testid="link-overdue-bills">Pay</Button>
                    </Link>
                  </div>
                )}
                {(summary?.totalReceivable || 0) > 0 && (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px]">Pending</Badge>
                      <span className="text-xs">{fmt(summary?.totalReceivable || 0)} owed to you</span>
                    </div>
                    <Link href={`/dashboard/finance/sales?ws=${resolvedWsId}`}>
                      <Button size="sm" variant="ghost" className="text-xs h-7" data-testid="link-receivable">View</Button>
                    </Link>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
            <CardTitle className="text-sm font-semibold">This Month</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Income</span>
              <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400" data-testid="text-income-month">
                +{fmt(summary?.incomeThisMonth || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Expenses</span>
              <span className="text-sm font-medium text-destructive" data-testid="text-expenses-month">
                -{fmt(summary?.expensesThisMonth || 0)}
              </span>
            </div>
            <div className="border-t pt-2 flex items-center justify-between">
              <span className="text-xs font-medium">Net</span>
              <span className={`text-sm font-bold ${profit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                {profit >= 0 ? "+" : "-"}{fmt(profit)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
            <CardTitle className="text-sm font-semibold">Workspace Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Type</span>
              <Badge variant="secondary" className="text-[10px]" data-testid="text-ws-type">
                {activeWs?.type === "personal" ? "Personal" : "Company"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Currency</span>
              <span className="text-xs font-medium" data-testid="text-ws-currency">{currency}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Name</span>
              <span className="text-xs font-medium" data-testid="text-ws-name">{activeWs?.name}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
