import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/get-user";
import { finInvoices, finInvoiceLines, finCustomers, finWorkspaces, finAccounts, finJournalEntries, finJournalLines, finAuditLog } from "@/shared/schema";
import { eq, and, sql, desc, ilike, gte, lte, or } from "drizzle-orm";
import { createInvoiceSchema, getClientIp } from "@/lib/finance-validation";
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

    const [workspace] = await db.select().from(finWorkspaces)
      .where(and(eq(finWorkspaces.id, Number(workspaceId)), eq(finWorkspaces.orgId, auth.orgId)));
    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const page = Math.max(1, Number(request.nextUrl.searchParams.get("page")) || 1);
    const limit = Math.min(200, Math.max(1, Number(request.nextUrl.searchParams.get("limit")) || 50));
    const offset = (page - 1) * limit;
    const statusFilter = request.nextUrl.searchParams.get("status");
    const customerIdFilter = request.nextUrl.searchParams.get("customerId");
    const search = request.nextUrl.searchParams.get("search");
    const dateFrom = request.nextUrl.searchParams.get("dateFrom");
    const dateTo = request.nextUrl.searchParams.get("dateTo");

    const conditions: any[] = [eq(finInvoices.workspaceId, Number(workspaceId))];
    if (statusFilter) conditions.push(eq(finInvoices.status, statusFilter));
    if (customerIdFilter) conditions.push(eq(finInvoices.customerId, Number(customerIdFilter)));
    if (dateFrom) conditions.push(gte(finInvoices.issueDate, new Date(dateFrom)));
    if (dateTo) conditions.push(lte(finInvoices.issueDate, new Date(dateTo)));
    if (search) {
      conditions.push(or(
        ilike(finInvoices.invoiceNumber, `%${search}%`),
        ilike(finCustomers.name, `%${search}%`)
      )!);
    }

    const [countResult] = await db.select({ count: sql<number>`count(*)` })
      .from(finInvoices)
      .leftJoin(finCustomers, eq(finInvoices.customerId, finCustomers.id))
      .where(and(...conditions));
    const total = Number(countResult.count);

    const invoices = await db.select({
      id: finInvoices.id,
      workspaceId: finInvoices.workspaceId,
      customerId: finInvoices.customerId,
      invoiceNumber: finInvoices.invoiceNumber,
      status: finInvoices.status,
      issueDate: finInvoices.issueDate,
      dueDate: finInvoices.dueDate,
      subtotal: finInvoices.subtotal,
      taxAmount: finInvoices.taxAmount,
      total: finInvoices.total,
      amountPaid: finInvoices.amountPaid,
      notes: finInvoices.notes,
      terms: finInvoices.terms,
      currency: finInvoices.currency,
      journalEntryId: finInvoices.journalEntryId,
      createdAt: finInvoices.createdAt,
      updatedAt: finInvoices.updatedAt,
      customerName: finCustomers.name,
    }).from(finInvoices)
      .leftJoin(finCustomers, eq(finInvoices.customerId, finCustomers.id))
      .where(and(...conditions))
      .orderBy(desc(finInvoices.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      invoices,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("List invoices error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const rl = await settingsLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createInvoiceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const { workspaceId, customerId, status, issueDate, dueDate, notes, terms, currency, lines } = parsed.data;

    const [workspace] = await db.select().from(finWorkspaces)
      .where(and(eq(finWorkspaces.id, workspaceId), eq(finWorkspaces.orgId, auth.orgId)));
    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const result = await db.transaction(async (tx) => {
      const numResult = await tx.execute(
        sql`UPDATE fin_workspaces SET next_invoice_number = next_invoice_number + 1 WHERE id = ${workspaceId} RETURNING next_invoice_number - 1 as current_number`
      );
      const currentNumber = (numResult.rows[0] as any).current_number;
      const invoiceNumber = `${workspace.invoicePrefix}-${String(currentNumber).padStart(4, "0")}`;

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

      const [invoice] = await tx.insert(finInvoices).values({
        workspaceId,
        customerId,
        invoiceNumber,
        status,
        issueDate: issueDate ? new Date(issueDate) : new Date(),
        dueDate: dueDate ? new Date(dueDate) : null,
        subtotal: String(subtotal),
        taxAmount: String(taxAmount),
        total: String(total),
        amountPaid: String(0),
        notes: notes || null,
        terms: terms || null,
        currency: currency || workspace.currency || "GBP",
      }).returning();

      if (lines && Array.isArray(lines)) {
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const lineAmount = (line.quantity || 1) * (line.unitPrice || 0);
          await tx.insert(finInvoiceLines).values({
            invoiceId: invoice.id,
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
        const arAccount = await tx.select().from(finAccounts)
          .where(and(eq(finAccounts.workspaceId, workspaceId), eq(finAccounts.code, "1200")));
        const revenueAccount = await tx.select().from(finAccounts)
          .where(and(eq(finAccounts.workspaceId, workspaceId), eq(finAccounts.code, "4000")));

        if (arAccount.length > 0 && revenueAccount.length > 0) {
          const [journalEntry] = await tx.insert(finJournalEntries).values({
            workspaceId,
            entryDate: new Date(),
            reference: invoiceNumber,
            description: `Invoice ${invoiceNumber}`,
            sourceType: "invoice",
            sourceId: invoice.id,
            isPosted: true,
            createdBy: auth.user.id,
          }).returning();

          await tx.insert(finJournalLines).values([
            { journalEntryId: journalEntry.id, accountId: arAccount[0].id, debit: String(total), credit: String(0), description: `AR - ${invoiceNumber}` },
            { journalEntryId: journalEntry.id, accountId: revenueAccount[0].id, debit: String(0), credit: String(total), description: `Revenue - ${invoiceNumber}` },
          ]);

          await tx.update(finInvoices).set({ journalEntryId: journalEntry.id }).where(eq(finInvoices.id, invoice.id));
        }
      }

      const ipAddress = getClientIp(request);
      await tx.insert(finAuditLog).values({
        workspaceId,
        userId: auth.user.id,
        action: "create",
        entityType: "invoice",
        entityId: invoice.id,
        changes: { invoiceNumber, customerId, total, status },
        ipAddress,
      });

      return invoice;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Create invoice error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
