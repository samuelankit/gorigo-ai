import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/get-user";
import { finInvoices, finBills, finWorkspaces, finJournalLines, finJournalEntries, finAccounts } from "@/shared/schema";
import { eq, and, sql, gte, lt, inArray } from "drizzle-orm";
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
    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
    }

    const wsId = Number(workspaceId);
    const [workspace] = await db.select().from(finWorkspaces)
      .where(and(eq(finWorkspaces.id, wsId), eq(finWorkspaces.orgId, auth.orgId)));
    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [receivable] = await db.select({
      total: sql<number>`COALESCE(SUM(${finInvoices.total} - ${finInvoices.amountPaid}), 0)`,
    }).from(finInvoices)
      .where(and(eq(finInvoices.workspaceId, wsId), sql`${finInvoices.status} != 'draft'`, sql`${finInvoices.status} != 'paid'`));

    const [payable] = await db.select({
      total: sql<number>`COALESCE(SUM(${finBills.total} - ${finBills.amountPaid}), 0)`,
    }).from(finBills)
      .where(and(eq(finBills.workspaceId, wsId), sql`${finBills.status} != 'draft'`, sql`${finBills.status} != 'paid'`));

    const cashAccounts = await db.select().from(finAccounts)
      .where(and(eq(finAccounts.workspaceId, wsId), eq(finAccounts.code, "1000")));
    let cashPosition = 0;
    if (cashAccounts.length > 0) {
      const [cash] = await db.select({
        total: sql<number>`COALESCE(SUM(${finJournalLines.debit} - ${finJournalLines.credit}), 0)`,
      }).from(finJournalLines)
        .innerJoin(finJournalEntries, eq(finJournalLines.journalEntryId, finJournalEntries.id))
        .where(and(
          eq(finJournalEntries.workspaceId, wsId),
          eq(finJournalLines.accountId, cashAccounts[0].id),
        ));
      cashPosition = Number(cash.total);
    }

    const incomeAccounts = await db.select().from(finAccounts)
      .where(and(eq(finAccounts.workspaceId, wsId), eq(finAccounts.type, "income")));
    let incomeThisMonth = 0;
    if (incomeAccounts.length > 0) {
      const incomeIds = incomeAccounts.map(a => a.id);
      const [income] = await db.select({
        total: sql<number>`COALESCE(SUM(${finJournalLines.credit} - ${finJournalLines.debit}), 0)`,
      }).from(finJournalLines)
        .innerJoin(finJournalEntries, eq(finJournalLines.journalEntryId, finJournalEntries.id))
        .where(and(
          eq(finJournalEntries.workspaceId, wsId),
          inArray(finJournalLines.accountId, incomeIds),
          gte(finJournalEntries.entryDate, monthStart),
          lt(finJournalEntries.entryDate, nextMonth),
        ));
      incomeThisMonth = Number(income.total);
    }

    const expenseAccounts = await db.select().from(finAccounts)
      .where(and(eq(finAccounts.workspaceId, wsId), eq(finAccounts.type, "expense")));
    let expensesThisMonth = 0;
    if (expenseAccounts.length > 0) {
      const expenseIds = expenseAccounts.map(a => a.id);
      const [expenses] = await db.select({
        total: sql<number>`COALESCE(SUM(${finJournalLines.debit} - ${finJournalLines.credit}), 0)`,
      }).from(finJournalLines)
        .innerJoin(finJournalEntries, eq(finJournalLines.journalEntryId, finJournalEntries.id))
        .where(and(
          eq(finJournalEntries.workspaceId, wsId),
          inArray(finJournalLines.accountId, expenseIds),
          gte(finJournalEntries.entryDate, monthStart),
          lt(finJournalEntries.entryDate, nextMonth),
        ));
      expensesThisMonth = Number(expenses.total);
    }

    const [overdueInvoices] = await db.select({
      count: sql<number>`COUNT(*)`,
    }).from(finInvoices)
      .where(and(
        eq(finInvoices.workspaceId, wsId),
        sql`${finInvoices.status} != 'draft'`,
        sql`${finInvoices.status} != 'paid'`,
        sql`${finInvoices.dueDate} < NOW()`,
      ));

    const [overdueBills] = await db.select({
      count: sql<number>`COUNT(*)`,
    }).from(finBills)
      .where(and(
        eq(finBills.workspaceId, wsId),
        sql`${finBills.status} != 'draft'`,
        sql`${finBills.status} != 'paid'`,
        sql`${finBills.dueDate} < NOW()`,
      ));

    return NextResponse.json({
      totalReceivable: Number(receivable.total),
      totalPayable: Number(payable.total),
      cashPosition,
      incomeThisMonth,
      expensesThisMonth,
      overdueInvoicesCount: Number(overdueInvoices.count),
      overdueBillsCount: Number(overdueBills.count),
    });
  } catch (error) {
    console.error("Finance summary error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
