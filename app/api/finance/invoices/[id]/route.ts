import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/get-user";
import { finInvoices, finInvoiceLines, finCustomers, finWorkspaces, finAccounts, finJournalEntries, finJournalLines, finAuditLog } from "@/shared/schema";
import { eq, and } from "drizzle-orm";
import { updateInvoiceSchema, getClientIp } from "@/lib/finance-validation";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const [invoice] = await db.select({
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
      customerEmail: finCustomers.email,
    }).from(finInvoices)
      .leftJoin(finCustomers, eq(finInvoices.customerId, finCustomers.id))
      .where(eq(finInvoices.id, Number(id)));

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const [workspace] = await db.select().from(finWorkspaces)
      .where(and(eq(finWorkspaces.id, invoice.workspaceId), eq(finWorkspaces.orgId, auth.orgId)));
    if (!workspace) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const lines = await db.select().from(finInvoiceLines)
      .where(eq(finInvoiceLines.invoiceId, Number(id)));

    return NextResponse.json({ ...invoice, lines });
  } catch (error) {
    console.error("Get invoice error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const [existing] = await db.select().from(finInvoices).where(eq(finInvoices.id, Number(id)));
    if (!existing) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const [workspace] = await db.select().from(finWorkspaces)
      .where(and(eq(finWorkspaces.id, existing.workspaceId), eq(finWorkspaces.orgId, auth.orgId)));
    if (!workspace) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateInvoiceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    if (parsed.data.status) {
      const validTransitions: Record<string, string[]> = {
        draft: ["sent", "voided"],
        sent: ["paid", "voided"],
      };
      const allowed = validTransitions[existing.status] || [];
      if (!allowed.includes(parsed.data.status)) {
        return NextResponse.json({ error: `Cannot transition from ${existing.status} to ${parsed.data.status}` }, { status: 400 });
      }
    }

    const updateData: Record<string, any> = { ...parsed.data };

    const updated = await db.transaction(async (tx) => {
      if (parsed.data.status === "sent" && !existing.journalEntryId) {
        const arAccount = await tx.select().from(finAccounts)
          .where(and(eq(finAccounts.workspaceId, existing.workspaceId), eq(finAccounts.code, "1200")));
        const revenueAccount = await tx.select().from(finAccounts)
          .where(and(eq(finAccounts.workspaceId, existing.workspaceId), eq(finAccounts.code, "4000")));

        if (arAccount.length > 0 && revenueAccount.length > 0) {
          const [journalEntry] = await tx.insert(finJournalEntries).values({
            workspaceId: existing.workspaceId,
            entryDate: new Date(),
            reference: existing.invoiceNumber,
            description: `Invoice ${existing.invoiceNumber} sent`,
            sourceType: "invoice",
            sourceId: existing.id,
            isPosted: true,
            createdBy: auth.user.id,
          }).returning();

          await tx.insert(finJournalLines).values([
            { journalEntryId: journalEntry.id, accountId: arAccount[0].id, debit: String(Number(existing.total || 0)), credit: String(0), description: `AR - ${existing.invoiceNumber}` },
            { journalEntryId: journalEntry.id, accountId: revenueAccount[0].id, debit: String(0), credit: String(Number(existing.total || 0)), description: `Revenue - ${existing.invoiceNumber}` },
          ]);

          updateData.journalEntryId = journalEntry.id;
        }
      }

      updateData.updatedAt = new Date();
      const [result] = await tx.update(finInvoices)
        .set(updateData)
        .where(eq(finInvoices.id, Number(id)))
        .returning();

      const ipAddress = getClientIp(request);
      await tx.insert(finAuditLog).values({
        workspaceId: existing.workspaceId,
        userId: auth.user.id,
        action: "update",
        entityType: "invoice",
        entityId: Number(id),
        changes: updateData,
        ipAddress,
      });

      return result;
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update invoice error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const [existing] = await db.select().from(finInvoices).where(eq(finInvoices.id, Number(id)));
    if (!existing) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (existing.status === "voided") {
      return NextResponse.json({ error: "Invoice is already voided" }, { status: 400 });
    }

    const [workspace] = await db.select().from(finWorkspaces)
      .where(and(eq(finWorkspaces.id, existing.workspaceId), eq(finWorkspaces.orgId, auth.orgId)));
    if (!workspace) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await db.transaction(async (tx) => {
      if (existing.journalEntryId && existing.status !== "draft") {
        const originalLines = await tx.select().from(finJournalLines)
          .where(eq(finJournalLines.journalEntryId, existing.journalEntryId));

        const [reversingEntry] = await tx.insert(finJournalEntries).values({
          workspaceId: existing.workspaceId,
          entryDate: new Date(),
          reference: `VOID-${existing.invoiceNumber}`,
          description: `VOID: Invoice ${existing.invoiceNumber}`,
          sourceType: "invoice",
          sourceId: existing.id,
          isPosted: true,
          createdBy: auth.user.id,
        }).returning();

        if (originalLines.length > 0) {
          await tx.insert(finJournalLines).values(
            originalLines.map((line) => ({
              journalEntryId: reversingEntry.id,
              accountId: line.accountId,
              debit: line.credit,
              credit: line.debit,
              description: `VOID: ${line.description || ""}`,
            }))
          );
        }
      }

      const [result] = await tx.update(finInvoices)
        .set({ status: "voided", updatedAt: new Date() })
        .where(eq(finInvoices.id, Number(id)))
        .returning();

      const ipAddress = getClientIp(request);
      await tx.insert(finAuditLog).values({
        workspaceId: existing.workspaceId,
        userId: auth.user.id,
        action: "void",
        entityType: "invoice",
        entityId: Number(id),
        changes: { invoiceNumber: existing.invoiceNumber, previousStatus: existing.status },
        ipAddress,
      });

      return result;
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Void invoice error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
