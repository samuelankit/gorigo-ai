import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/get-user";
import { finWorkspaces, finAccounts, finJournalEntries, finJournalLines, finInvoices, finCustomers, finPayments } from "@/shared/schema";
import { eq, and, sql, gte, lte, inArray } from "drizzle-orm";
import { settingsLimiter } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  try {
    const rl = await settingsLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = request.nextUrl.searchParams.get("workspaceId");
    const reportType = request.nextUrl.searchParams.get("type");
    const dateFrom = request.nextUrl.searchParams.get("dateFrom");
    const dateTo = request.nextUrl.searchParams.get("dateTo");

    if (!workspaceId || !reportType) {
      return NextResponse.json({ error: "workspaceId and type are required" }, { status: 400 });
    }

    const wsId = Number(workspaceId);
    const [workspace] = await db.select().from(finWorkspaces)
      .where(and(eq(finWorkspaces.id, wsId), eq(finWorkspaces.orgId, auth.orgId)));
    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    if (reportType === "pnl") {
      return await generatePnl(wsId, dateFrom, dateTo);
    } else if (reportType === "aging") {
      return await generateAging(wsId);
    } else if (reportType === "cashflow") {
      return await generateCashflow(wsId, dateFrom, dateTo);
    }

    return NextResponse.json({ error: "Invalid report type. Use: pnl, aging, cashflow" }, { status: 400 });
  } catch (error) {
    console.error("Finance reports error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function generatePnl(wsId: number, dateFrom: string | null, dateTo: string | null) {
  const conditions = [eq(finJournalEntries.workspaceId, wsId)];
  if (dateFrom) conditions.push(gte(finJournalEntries.entryDate, new Date(dateFrom)));
  if (dateTo) conditions.push(lte(finJournalEntries.entryDate, new Date(dateTo)));

  const incomeAccounts = await db.select().from(finAccounts)
    .where(and(eq(finAccounts.workspaceId, wsId), eq(finAccounts.type, "income")));

  const expenseAccounts = await db.select().from(finAccounts)
    .where(and(eq(finAccounts.workspaceId, wsId), eq(finAccounts.type, "expense")));

  const allAccountIds = [...incomeAccounts, ...expenseAccounts].map(a => a.id);

  const lines = allAccountIds.length > 0 ? await db.select({
    accountId: finJournalLines.accountId,
    totalDebit: sql<number>`COALESCE(SUM(${finJournalLines.debit}), 0)`,
    totalCredit: sql<number>`COALESCE(SUM(${finJournalLines.credit}), 0)`,
  }).from(finJournalLines)
    .innerJoin(finJournalEntries, eq(finJournalLines.journalEntryId, finJournalEntries.id))
    .where(and(
      ...conditions,
      inArray(finJournalLines.accountId, allAccountIds),
    ))
    .groupBy(finJournalLines.accountId) : [];

  const accountMap = new Map([...incomeAccounts, ...expenseAccounts].map(a => [a.id, a]));

  const income = incomeAccounts.map(acc => {
    const line = lines.find(l => l.accountId === acc.id);
    return {
      accountId: acc.id,
      code: acc.code,
      name: acc.name,
      amount: line ? Number(line.totalCredit) - Number(line.totalDebit) : 0,
    };
  });

  const expenses = expenseAccounts.map(acc => {
    const line = lines.find(l => l.accountId === acc.id);
    return {
      accountId: acc.id,
      code: acc.code,
      name: acc.name,
      amount: line ? Number(line.totalDebit) - Number(line.totalCredit) : 0,
    };
  });

  const totalIncome = income.reduce((sum, i) => sum + i.amount, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  return NextResponse.json({
    type: "pnl",
    dateFrom,
    dateTo,
    income,
    expenses,
    totalIncome,
    totalExpenses,
    netProfit: totalIncome - totalExpenses,
  });
}

async function generateAging(wsId: number) {
  const invoices = await db.select({
    id: finInvoices.id,
    invoiceNumber: finInvoices.invoiceNumber,
    customerId: finInvoices.customerId,
    customerName: finCustomers.name,
    total: finInvoices.total,
    amountPaid: finInvoices.amountPaid,
    dueDate: finInvoices.dueDate,
  }).from(finInvoices)
    .leftJoin(finCustomers, eq(finInvoices.customerId, finCustomers.id))
    .where(and(
      eq(finInvoices.workspaceId, wsId),
      sql`${finInvoices.status} != 'draft'`,
      sql`${finInvoices.status} != 'paid'`,
    ));

  const now = new Date();
  const buckets = { current: 0, days30: 0, days60: 0, days90plus: 0 };
  const details: any[] = [];

  for (const inv of invoices) {
    const outstanding = Number(inv.total || 0) - Number(inv.amountPaid || 0);
    if (outstanding <= 0) continue;

    const dueDate = inv.dueDate ? new Date(inv.dueDate) : now;
    const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

    let bucket: string;
    if (daysOverdue <= 0) { bucket = "current"; buckets.current += outstanding; }
    else if (daysOverdue <= 30) { bucket = "1-30"; buckets.days30 += outstanding; }
    else if (daysOverdue <= 60) { bucket = "31-60"; buckets.days60 += outstanding; }
    else { bucket = "90+"; buckets.days90plus += outstanding; }

    details.push({
      invoiceNumber: inv.invoiceNumber,
      customerName: inv.customerName,
      outstanding,
      daysOverdue: Math.max(0, daysOverdue),
      bucket,
    });
  }

  return NextResponse.json({
    type: "aging",
    buckets,
    total: buckets.current + buckets.days30 + buckets.days60 + buckets.days90plus,
    details,
  });
}

async function generateCashflow(wsId: number, dateFrom: string | null, dateTo: string | null) {
  const conditions = [eq(finPayments.workspaceId, wsId)];
  if (dateFrom) conditions.push(gte(finPayments.paymentDate, new Date(dateFrom)));
  if (dateTo) conditions.push(lte(finPayments.paymentDate, new Date(dateTo)));

  const payments = await db.select({
    month: sql<string>`TO_CHAR(${finPayments.paymentDate}, 'YYYY-MM')`,
    type: finPayments.type,
    total: sql<number>`COALESCE(SUM(${finPayments.amount}), 0)`,
  }).from(finPayments)
    .where(and(...conditions))
    .groupBy(sql`TO_CHAR(${finPayments.paymentDate}, 'YYYY-MM')`, finPayments.type);

  const monthMap: Record<string, { inflow: number; outflow: number }> = {};
  for (const p of payments) {
    if (!monthMap[p.month]) monthMap[p.month] = { inflow: 0, outflow: 0 };
    if (p.type === "received") {
      monthMap[p.month].inflow += Number(p.total);
    } else {
      monthMap[p.month].outflow += Number(p.total);
    }
  }

  const cashflow = Object.entries(monthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      inflow: data.inflow,
      outflow: data.outflow,
      net: data.inflow - data.outflow,
    }));

  return NextResponse.json({
    type: "cashflow",
    dateFrom,
    dateTo,
    cashflow,
  });
}
