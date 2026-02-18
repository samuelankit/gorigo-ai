import { NextRequest, NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api-error";
import { db } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/get-user";
import { finPayments, finInvoices, finBills, finWorkspaces, finAccounts, finJournalEntries, finJournalLines, finAuditLog } from "@/shared/schema";
import { eq, and, sql, desc, gte, lte } from "drizzle-orm";
import { createPaymentSchema, getClientIp } from "@/lib/finance-validation";
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
    const typeFilter = request.nextUrl.searchParams.get("type");
    const dateFrom = request.nextUrl.searchParams.get("dateFrom");
    const dateTo = request.nextUrl.searchParams.get("dateTo");

    const conditions: any[] = [eq(finPayments.workspaceId, Number(workspaceId))];
    if (typeFilter) conditions.push(eq(finPayments.type, typeFilter));
    if (dateFrom) conditions.push(gte(finPayments.paymentDate, new Date(dateFrom)));
    if (dateTo) conditions.push(lte(finPayments.paymentDate, new Date(dateTo)));

    const [countResult] = await db.select({ count: sql<number>`count(*)` })
      .from(finPayments)
      .where(and(...conditions));
    const total = Number(countResult.count);

    const payments = await db.select().from(finPayments)
      .where(and(...conditions))
      .orderBy(desc(finPayments.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      payments,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return handleRouteError(error, "FinancePayments");
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
    const parsed = createPaymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const { workspaceId, type, invoiceId, billId, amount, paymentDate, method, reference, notes, accountId } = parsed.data;

    const [workspace] = await db.select().from(finWorkspaces)
      .where(and(eq(finWorkspaces.id, workspaceId), eq(finWorkspaces.orgId, auth.orgId)));
    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    if (invoiceId) {
      const [invoice] = await db.select().from(finInvoices)
        .where(and(eq(finInvoices.id, invoiceId), eq(finInvoices.workspaceId, workspaceId)));
      if (!invoice) {
        return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
      }
      if (invoice.status === "draft" || invoice.status === "voided" || invoice.status === "paid") {
        return NextResponse.json({ error: `Cannot apply payment to invoice with status "${invoice.status}"` }, { status: 400 });
      }
      const remaining = Number(invoice.total) - Number(invoice.amountPaid);
      if (amount > remaining) {
        return NextResponse.json({ error: `Payment amount (${amount}) exceeds remaining balance (${remaining})` }, { status: 400 });
      }
    }

    if (billId) {
      const [bill] = await db.select().from(finBills)
        .where(and(eq(finBills.id, billId), eq(finBills.workspaceId, workspaceId)));
      if (!bill) {
        return NextResponse.json({ error: "Bill not found" }, { status: 404 });
      }
      if (bill.status === "draft" || bill.status === "voided" || bill.status === "paid") {
        return NextResponse.json({ error: `Cannot apply payment to bill with status "${bill.status}"` }, { status: 400 });
      }
      const remaining = Number(bill.total) - Number(bill.amountPaid);
      if (amount > remaining) {
        return NextResponse.json({ error: `Payment amount (${amount}) exceeds remaining balance (${remaining})` }, { status: 400 });
      }
    }

    const result = await db.transaction(async (tx) => {
      const [payment] = await tx.insert(finPayments).values({
        workspaceId,
        type,
        invoiceId: invoiceId || null,
        billId: billId || null,
        amount: String(amount),
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        method: method || "bank_transfer",
        reference: reference || null,
        notes: notes || null,
        accountId: accountId || null,
      }).returning();

      if (invoiceId) {
        const [invoice] = await tx.select().from(finInvoices).where(eq(finInvoices.id, invoiceId));
        if (invoice) {
          const newAmountPaid = Number(invoice.amountPaid || 0) + amount;
          const newStatus = newAmountPaid >= Number(invoice.total || 0) ? "paid" : invoice.status;
          await tx.update(finInvoices).set({
            amountPaid: String(newAmountPaid),
            status: newStatus,
            updatedAt: new Date(),
          }).where(eq(finInvoices.id, invoiceId));
        }

        const cashAccount = await tx.select().from(finAccounts)
          .where(and(eq(finAccounts.workspaceId, workspaceId), eq(finAccounts.code, "1000")));
        const arAccount = await tx.select().from(finAccounts)
          .where(and(eq(finAccounts.workspaceId, workspaceId), eq(finAccounts.code, "1200")));

        if (cashAccount.length > 0 && arAccount.length > 0) {
          const [journalEntry] = await tx.insert(finJournalEntries).values({
            workspaceId,
            entryDate: new Date(),
            reference: `PMT-${payment.id}`,
            description: `Payment received${invoice ? ` for ${invoice.invoiceNumber}` : ""}`,
            sourceType: "payment",
            sourceId: payment.id,
            isPosted: true,
            createdBy: auth.user.id,
          }).returning();

          await tx.insert(finJournalLines).values([
            { journalEntryId: journalEntry.id, accountId: cashAccount[0].id, debit: String(amount), credit: String(0), description: "Cash received" },
            { journalEntryId: journalEntry.id, accountId: arAccount[0].id, debit: String(0), credit: String(amount), description: "AR reduction" },
          ]);

          await tx.update(finPayments).set({ journalEntryId: journalEntry.id }).where(eq(finPayments.id, payment.id));
        }
      }

      if (billId) {
        const [bill] = await tx.select().from(finBills).where(eq(finBills.id, billId));
        if (bill) {
          const newAmountPaid = Number(bill.amountPaid || 0) + amount;
          const newStatus = newAmountPaid >= Number(bill.total || 0) ? "paid" : bill.status;
          await tx.update(finBills).set({
            amountPaid: String(newAmountPaid),
            status: newStatus,
            updatedAt: new Date(),
          }).where(eq(finBills.id, billId));
        }

        const apAccount = await tx.select().from(finAccounts)
          .where(and(eq(finAccounts.workspaceId, workspaceId), eq(finAccounts.code, "2000")));
        const cashAccount = await tx.select().from(finAccounts)
          .where(and(eq(finAccounts.workspaceId, workspaceId), eq(finAccounts.code, "1000")));

        if (apAccount.length > 0 && cashAccount.length > 0) {
          const [journalEntry] = await tx.insert(finJournalEntries).values({
            workspaceId,
            entryDate: new Date(),
            reference: `PMT-${payment.id}`,
            description: `Payment made${bill ? ` for ${bill.billNumber}` : ""}`,
            sourceType: "payment",
            sourceId: payment.id,
            isPosted: true,
            createdBy: auth.user.id,
          }).returning();

          await tx.insert(finJournalLines).values([
            { journalEntryId: journalEntry.id, accountId: apAccount[0].id, debit: String(amount), credit: String(0), description: "AP reduction" },
            { journalEntryId: journalEntry.id, accountId: cashAccount[0].id, debit: String(0), credit: String(amount), description: "Cash paid" },
          ]);

          await tx.update(finPayments).set({ journalEntryId: journalEntry.id }).where(eq(finPayments.id, payment.id));
        }
      }

      const ipAddress = getClientIp(request);
      await tx.insert(finAuditLog).values({
        workspaceId,
        userId: auth.user.id,
        action: "create",
        entityType: "payment",
        entityId: payment.id,
        changes: { type, amount, invoiceId, billId },
        ipAddress,
      });

      return payment;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleRouteError(error, "FinancePayments");
  }
}
