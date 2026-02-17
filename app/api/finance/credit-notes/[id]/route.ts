import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/get-user";
import { finCreditNotes, finCreditNoteLines, finCustomers, finWorkspaces, finInvoices, finAccounts, finJournalEntries, finJournalLines, finAuditLog } from "@/shared/schema";
import { eq, and } from "drizzle-orm";
import { getClientIp } from "@/lib/finance-validation";
import { z } from "zod";
import { settingsLimiter } from "@/lib/rate-limit";

const updateCreditNoteSchema = z.object({
  status: z.enum(["issued", "applied", "voided"], { required_error: "Status is required" }),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rl = await settingsLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const [creditNote] = await db.select({
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
      customerEmail: finCustomers.email,
    }).from(finCreditNotes)
      .leftJoin(finCustomers, eq(finCreditNotes.customerId, finCustomers.id))
      .where(eq(finCreditNotes.id, Number(id)));

    if (!creditNote) {
      return NextResponse.json({ error: "Credit note not found" }, { status: 404 });
    }

    const [workspace] = await db.select().from(finWorkspaces)
      .where(and(eq(finWorkspaces.id, creditNote.workspaceId), eq(finWorkspaces.orgId, auth.orgId)));
    if (!workspace) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const lines = await db.select().from(finCreditNoteLines)
      .where(eq(finCreditNoteLines.creditNoteId, Number(id)));

    return NextResponse.json({ ...creditNote, lines });
  } catch (error) {
    console.error("Get credit note error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rl = await settingsLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const [existing] = await db.select().from(finCreditNotes).where(eq(finCreditNotes.id, Number(id)));
    if (!existing) {
      return NextResponse.json({ error: "Credit note not found" }, { status: 404 });
    }

    const [workspace] = await db.select().from(finWorkspaces)
      .where(and(eq(finWorkspaces.id, existing.workspaceId), eq(finWorkspaces.orgId, auth.orgId)));
    if (!workspace) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateCreditNoteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const { status } = parsed.data;

    const validTransitions: Record<string, string[]> = {
      draft: ["issued"],
      issued: ["applied", "voided"],
    };
    const allowed = validTransitions[existing.status] || [];
    if (!allowed.includes(status)) {
      return NextResponse.json({ error: `Cannot transition from ${existing.status} to ${status}` }, { status: 400 });
    }

    const updated = await db.transaction(async (tx) => {
      const updateData: Record<string, any> = { status };

      if (status === "issued") {
        const revenueAccount = await tx.select().from(finAccounts)
          .where(and(eq(finAccounts.workspaceId, existing.workspaceId), eq(finAccounts.code, "4000")));
        const arAccount = await tx.select().from(finAccounts)
          .where(and(eq(finAccounts.workspaceId, existing.workspaceId), eq(finAccounts.code, "1200")));

        if (revenueAccount.length > 0 && arAccount.length > 0) {
          const total = Number(existing.total || 0);
          const [journalEntry] = await tx.insert(finJournalEntries).values({
            workspaceId: existing.workspaceId,
            entryDate: new Date(),
            reference: existing.creditNoteNumber,
            description: `Credit Note ${existing.creditNoteNumber}`,
            sourceType: "credit_note",
            sourceId: existing.id,
            isPosted: true,
            createdBy: auth.user.id,
          }).returning();

          await tx.insert(finJournalLines).values([
            { journalEntryId: journalEntry.id, accountId: revenueAccount[0].id, debit: String(total), credit: String(0), description: `Revenue reversal - ${existing.creditNoteNumber}` },
            { journalEntryId: journalEntry.id, accountId: arAccount[0].id, debit: String(0), credit: String(total), description: `AR reduction - ${existing.creditNoteNumber}` },
          ]);

          updateData.journalEntryId = journalEntry.id;
        }
      }

      if (status === "applied" && existing.invoiceId) {
        const [invoice] = await tx.select().from(finInvoices).where(eq(finInvoices.id, existing.invoiceId));
        if (invoice) {
          const creditTotal = Number(existing.total || 0);
          const newAmountPaid = Math.max(0, Number(invoice.amountPaid || 0) - creditTotal);
          let newStatus = invoice.status;
          if (newAmountPaid < Number(invoice.total || 0) && invoice.status === "paid") {
            newStatus = "sent";
          }
          await tx.update(finInvoices).set({
            amountPaid: String(newAmountPaid),
            status: newStatus,
            updatedAt: new Date(),
          }).where(eq(finInvoices.id, existing.invoiceId));

          updateData.amountApplied = String(creditTotal);
        }
      }

      const [result] = await tx.update(finCreditNotes)
        .set(updateData)
        .where(eq(finCreditNotes.id, Number(id)))
        .returning();

      const ipAddress = getClientIp(request);
      await tx.insert(finAuditLog).values({
        workspaceId: existing.workspaceId,
        userId: auth.user.id,
        action: "update",
        entityType: "credit_note",
        entityId: Number(id),
        changes: { previousStatus: existing.status, newStatus: status },
        ipAddress,
      });

      return result;
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update credit note error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rl = await settingsLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const [existing] = await db.select().from(finCreditNotes).where(eq(finCreditNotes.id, Number(id)));
    if (!existing) {
      return NextResponse.json({ error: "Credit note not found" }, { status: 404 });
    }

    if (existing.status === "voided") {
      return NextResponse.json({ error: "Credit note is already voided" }, { status: 400 });
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
          reference: `VOID-${existing.creditNoteNumber}`,
          description: `VOID: Credit Note ${existing.creditNoteNumber}`,
          sourceType: "credit_note",
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

      if (existing.status === "applied" && existing.invoiceId) {
        const [invoice] = await tx.select().from(finInvoices).where(eq(finInvoices.id, existing.invoiceId));
        if (invoice) {
          const restoredAmountPaid = Math.max(0, Number(invoice.amountPaid || 0) - Number(existing.amountApplied || 0));
          let newStatus = invoice.status;
          if (restoredAmountPaid >= Number(invoice.total || 0)) {
            newStatus = "paid";
          }
          await tx.update(finInvoices).set({
            amountPaid: String(restoredAmountPaid),
            status: newStatus,
            updatedAt: new Date(),
          }).where(eq(finInvoices.id, existing.invoiceId));
        }
      }

      const [result] = await tx.update(finCreditNotes)
        .set({ status: "voided" })
        .where(eq(finCreditNotes.id, Number(id)))
        .returning();

      const ipAddress = getClientIp(request);
      await tx.insert(finAuditLog).values({
        workspaceId: existing.workspaceId,
        userId: auth.user.id,
        action: "void",
        entityType: "credit_note",
        entityId: Number(id),
        changes: { creditNoteNumber: existing.creditNoteNumber, previousStatus: existing.status },
        ipAddress,
      });

      return result;
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Void credit note error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
