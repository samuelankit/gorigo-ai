import { NextRequest, NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api-error";
import { db } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/get-user";
import { finCreditNotes, finCreditNoteLines, finCustomers, finWorkspaces, finInvoices, finAuditLog } from "@/shared/schema";
import { eq, and, sql, desc, ilike, or, ne, sum } from "drizzle-orm";
import { createCreditNoteSchema, getClientIp } from "@/lib/finance-validation";
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

    const conditions: any[] = [eq(finCreditNotes.workspaceId, Number(workspaceId))];
    if (statusFilter) conditions.push(eq(finCreditNotes.status, statusFilter));
    if (customerIdFilter) conditions.push(eq(finCreditNotes.customerId, Number(customerIdFilter)));
    if (search) {
      conditions.push(or(
        ilike(finCreditNotes.creditNoteNumber, `%${search}%`),
        ilike(finCustomers.name, `%${search}%`)
      )!);
    }

    const [countResult] = await db.select({ count: sql<number>`count(*)` })
      .from(finCreditNotes)
      .leftJoin(finCustomers, eq(finCreditNotes.customerId, finCustomers.id))
      .where(and(...conditions));
    const total = Number(countResult.count);

    const creditNotes = await db.select({
      id: finCreditNotes.id,
      workspaceId: finCreditNotes.workspaceId,
      invoiceId: finCreditNotes.invoiceId,
      customerId: finCreditNotes.customerId,
      creditNoteNumber: finCreditNotes.creditNoteNumber,
      status: finCreditNotes.status,
      issueDate: finCreditNotes.issueDate,
      reason: finCreditNotes.reason,
      subtotal: finCreditNotes.subtotal,
      taxTotal: finCreditNotes.taxTotal,
      total: finCreditNotes.total,
      amountApplied: finCreditNotes.amountApplied,
      journalEntryId: finCreditNotes.journalEntryId,
      createdAt: finCreditNotes.createdAt,
      customerName: finCustomers.name,
    }).from(finCreditNotes)
      .leftJoin(finCustomers, eq(finCreditNotes.customerId, finCustomers.id))
      .where(and(...conditions))
      .orderBy(desc(finCreditNotes.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      creditNotes,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return handleRouteError(error, "CreditNotes");
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
    const parsed = createCreditNoteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const { workspaceId, invoiceId, customerId, reason, lines } = parsed.data;

    const [workspace] = await db.select().from(finWorkspaces)
      .where(and(eq(finWorkspaces.id, workspaceId), eq(finWorkspaces.orgId, auth.orgId)));
    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    let creditNoteTotal = 0;
    for (const line of lines) {
      const qty = line.quantity || 1;
      const lineAmount = qty * line.unitPrice;
      const lineTax = lineAmount * ((line.taxRate || 0) / 100);
      creditNoteTotal += lineAmount + lineTax;
    }

    if (invoiceId) {
      const [invoice] = await db.select().from(finInvoices)
        .where(and(eq(finInvoices.id, invoiceId), eq(finInvoices.workspaceId, workspaceId)));
      if (!invoice) {
        return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
      }
      if (invoice.status !== "sent" && invoice.status !== "paid") {
        return NextResponse.json({ error: `Cannot create credit note for invoice with status "${invoice.status}". Invoice must be sent or paid.` }, { status: 400 });
      }
      if (customerId && invoice.customerId !== customerId) {
        return NextResponse.json({ error: "Invoice does not belong to the specified customer" }, { status: 400 });
      }
      const [existingCredits] = await db.select({
        total: sql<string>`COALESCE(SUM(${finCreditNotes.total}), '0')`,
      }).from(finCreditNotes)
        .where(and(
          eq(finCreditNotes.invoiceId, invoiceId),
          ne(finCreditNotes.status, "voided"),
        ));
      const existingCreditTotal = Number(existingCredits?.total || 0);
      const remaining = Number(invoice.total) - Number(invoice.amountPaid) - existingCreditTotal;
      if (creditNoteTotal > remaining + 0.01) {
        return NextResponse.json({ error: "Credit note total exceeds remaining invoice balance" }, { status: 400 });
      }
    }

    const result = await db.transaction(async (tx) => {
      const seqResult = await tx.execute(
        sql`UPDATE fin_workspaces SET next_credit_note_number = next_credit_note_number + 1 WHERE id = ${workspaceId} RETURNING next_credit_note_number - 1 as current_number`
      );
      const currentNumber = Number((seqResult as any)[0]?.current_number ?? 1001);
      const creditNoteNumber = `${workspace.creditNotePrefix || "CN"}-${String(currentNumber).padStart(4, "0")}`;

      let subtotal = 0;
      let taxTotal = 0;
      const computedLines: Array<{ description: string; quantity: number; unitPrice: number; taxRate: number; lineTotal: number; accountId?: number }> = [];

      for (const line of lines) {
        const qty = line.quantity || 1;
        const lineAmount = qty * line.unitPrice;
        const lineTax = lineAmount * ((line.taxRate || 0) / 100);
        subtotal += lineAmount;
        taxTotal += lineTax;
        computedLines.push({
          description: line.description,
          quantity: qty,
          unitPrice: line.unitPrice,
          taxRate: line.taxRate || 0,
          lineTotal: lineAmount + lineTax,
          accountId: line.accountId,
        });
      }
      const total = subtotal + taxTotal;

      const [creditNote] = await tx.insert(finCreditNotes).values({
        workspaceId,
        invoiceId: invoiceId || null,
        customerId,
        creditNoteNumber,
        status: "draft",
        issueDate: new Date(),
        reason,
        subtotal: String(subtotal),
        taxTotal: String(taxTotal),
        total: String(total),
        amountApplied: String(0),
      }).returning();

      for (const line of computedLines) {
        await tx.insert(finCreditNoteLines).values({
          creditNoteId: creditNote.id,
          description: line.description,
          quantity: String(line.quantity),
          unitPrice: String(line.unitPrice),
          taxRate: String(line.taxRate),
          lineTotal: String(line.lineTotal),
          accountId: line.accountId || null,
        });
      }

      const ipAddress = getClientIp(request);
      await tx.insert(finAuditLog).values({
        workspaceId,
        userId: auth.user.id,
        action: "create",
        entityType: "credit_note",
        entityId: creditNote.id,
        changes: { creditNoteNumber, customerId, invoiceId, total, reason },
        ipAddress,
      });

      const insertedLines = await tx.select().from(finCreditNoteLines)
        .where(eq(finCreditNoteLines.creditNoteId, creditNote.id));

      return { ...creditNote, lines: insertedLines };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "CreditNotes");
  }
}
