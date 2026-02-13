import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/get-user";
import { finBills, finBillLines, finSuppliers, finWorkspaces, finAccounts, finJournalEntries, finJournalLines, finAuditLog } from "@/shared/schema";
import { eq, and, sql, desc, ilike, gte, lte, or } from "drizzle-orm";
import { createBillSchema, getClientIp } from "@/lib/finance-validation";

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = request.nextUrl.searchParams.get("workspaceId");
    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
    }

    const [workspace] = await db.select().from(finWorkspaces)
      .where(and(eq(finWorkspaces.id, Number(workspaceId)), eq(finWorkspaces.orgId, auth.orgId)));
    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const page = Math.max(1, Number(request.nextUrl.searchParams.get("page")) || 1);
    const limit = Math.min(200, Math.max(1, Number(request.nextUrl.searchParams.get("limit")) || 50));
    const offset = (page - 1) * limit;
    const statusFilter = request.nextUrl.searchParams.get("status");
    const supplierIdFilter = request.nextUrl.searchParams.get("supplierId");
    const categoryFilter = request.nextUrl.searchParams.get("category");
    const search = request.nextUrl.searchParams.get("search");
    const dateFrom = request.nextUrl.searchParams.get("dateFrom");
    const dateTo = request.nextUrl.searchParams.get("dateTo");

    const conditions: any[] = [eq(finBills.workspaceId, Number(workspaceId))];
    if (statusFilter) conditions.push(eq(finBills.status, statusFilter));
    if (supplierIdFilter) conditions.push(eq(finBills.supplierId, Number(supplierIdFilter)));
    if (categoryFilter) conditions.push(eq(finBills.category, categoryFilter));
    if (dateFrom) conditions.push(gte(finBills.issueDate, new Date(dateFrom)));
    if (dateTo) conditions.push(lte(finBills.issueDate, new Date(dateTo)));
    if (search) {
      conditions.push(or(
        ilike(finBills.billNumber, `%${search}%`),
        ilike(finSuppliers.name, `%${search}%`)
      )!);
    }

    const [countResult] = await db.select({ count: sql<number>`count(*)` })
      .from(finBills)
      .leftJoin(finSuppliers, eq(finBills.supplierId, finSuppliers.id))
      .where(and(...conditions));
    const total = Number(countResult.count);

    const bills = await db.select({
      id: finBills.id,
      workspaceId: finBills.workspaceId,
      supplierId: finBills.supplierId,
      billNumber: finBills.billNumber,
      status: finBills.status,
      category: finBills.category,
      issueDate: finBills.issueDate,
      dueDate: finBills.dueDate,
      subtotal: finBills.subtotal,
      taxAmount: finBills.taxAmount,
      total: finBills.total,
      amountPaid: finBills.amountPaid,
      notes: finBills.notes,
      receiptUrl: finBills.receiptUrl,
      currency: finBills.currency,
      journalEntryId: finBills.journalEntryId,
      createdAt: finBills.createdAt,
      updatedAt: finBills.updatedAt,
      supplierName: finSuppliers.name,
    }).from(finBills)
      .leftJoin(finSuppliers, eq(finBills.supplierId, finSuppliers.id))
      .where(and(...conditions))
      .orderBy(desc(finBills.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      bills,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("List bills error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createBillSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const { workspaceId, supplierId, status, category, issueDate, dueDate, notes, receiptUrl, currency, lines } = parsed.data;

    const [workspace] = await db.select().from(finWorkspaces)
      .where(and(eq(finWorkspaces.id, workspaceId), eq(finWorkspaces.orgId, auth.orgId)));
    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const result = await db.transaction(async (tx) => {
      const numResult = await tx.execute(
        sql`UPDATE fin_workspaces SET next_bill_number = next_bill_number + 1 WHERE id = ${workspaceId} RETURNING next_bill_number - 1 as current_number`
      );
      const currentNumber = (numResult.rows[0] as any).current_number;
      const billNumber = `${workspace.billPrefix}-${String(currentNumber).padStart(4, "0")}`;

      let subtotal = 0;
      let taxAmount = 0;
      if (lines && Array.isArray(lines)) {
        for (const line of lines) {
          const lineAmount = (line.quantity || 1) * (line.unitPrice || 0);
          const lineTax = lineAmount * ((line.taxRate || 0) / 100);
          subtotal += lineAmount;
          taxAmount += lineTax;
        }
      }
      const total = subtotal + taxAmount;

      const [bill] = await tx.insert(finBills).values({
        workspaceId,
        supplierId,
        billNumber,
        status,
        category: category || null,
        issueDate: issueDate ? new Date(issueDate) : new Date(),
        dueDate: dueDate ? new Date(dueDate) : null,
        subtotal: String(subtotal),
        taxAmount: String(taxAmount),
        total: String(total),
        amountPaid: String(0),
        notes: notes || null,
        receiptUrl: receiptUrl || null,
        currency: currency || workspace.currency || "GBP",
      }).returning();

      if (lines && Array.isArray(lines)) {
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const lineAmount = (line.quantity || 1) * (line.unitPrice || 0);
          await tx.insert(finBillLines).values({
            billId: bill.id,
            description: line.description,
            quantity: String(line.quantity || 1),
            unitPrice: String(line.unitPrice || 0),
            taxRate: String(line.taxRate || 0),
            amount: String(lineAmount),
            accountId: line.accountId || null,
            sortOrder: i,
          });
        }
      }

      if (status !== "draft") {
        const apAccount = await tx.select().from(finAccounts)
          .where(and(eq(finAccounts.workspaceId, workspaceId), eq(finAccounts.code, "2000")));

        const expenseAccountId = lines?.[0]?.accountId;
        let expenseAccount = expenseAccountId
          ? await tx.select().from(finAccounts).where(eq(finAccounts.id, expenseAccountId))
          : await tx.select().from(finAccounts).where(and(eq(finAccounts.workspaceId, workspaceId), eq(finAccounts.code, "5000")));

        if (apAccount.length > 0 && expenseAccount.length > 0) {
          const [journalEntry] = await tx.insert(finJournalEntries).values({
            workspaceId,
            entryDate: new Date(),
            reference: billNumber,
            description: `Bill ${billNumber}`,
            sourceType: "bill",
            sourceId: bill.id,
            isPosted: true,
            createdBy: auth.user.id,
          }).returning();

          await tx.insert(finJournalLines).values([
            { journalEntryId: journalEntry.id, accountId: expenseAccount[0].id, debit: String(total), credit: String(0), description: `Expense - ${billNumber}` },
            { journalEntryId: journalEntry.id, accountId: apAccount[0].id, debit: String(0), credit: String(total), description: `AP - ${billNumber}` },
          ]);

          await tx.update(finBills).set({ journalEntryId: journalEntry.id }).where(eq(finBills.id, bill.id));
        }
      }

      const ipAddress = getClientIp(request);
      await tx.insert(finAuditLog).values({
        workspaceId,
        userId: auth.user.id,
        action: "create",
        entityType: "bill",
        entityId: bill.id,
        changes: { billNumber, supplierId, total, status },
        ipAddress,
      });

      return bill;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Create bill error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
