import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/get-user";
import { finBills, finBillLines, finSuppliers, finWorkspaces, finAccounts, finJournalEntries, finJournalLines, finAuditLog } from "@/shared/schema";
import { eq, and } from "drizzle-orm";
import { updateBillSchema, getClientIp } from "@/lib/finance-validation";
import { settingsLimiter } from "@/lib/rate-limit";

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
    const [bill] = await db.select({
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
      supplierEmail: finSuppliers.email,
    }).from(finBills)
      .leftJoin(finSuppliers, eq(finBills.supplierId, finSuppliers.id))
      .where(eq(finBills.id, Number(id)));

    if (!bill) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    const [workspace] = await db.select().from(finWorkspaces)
      .where(and(eq(finWorkspaces.id, bill.workspaceId), eq(finWorkspaces.orgId, auth.orgId)));
    if (!workspace) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const lines = await db.select().from(finBillLines)
      .where(eq(finBillLines.billId, Number(id)));

    return NextResponse.json({ ...bill, lines });
  } catch (error) {
    console.error("Get bill error:", error);
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
    const [existing] = await db.select().from(finBills).where(eq(finBills.id, Number(id)));
    if (!existing) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    const [workspace] = await db.select().from(finWorkspaces)
      .where(and(eq(finWorkspaces.id, existing.workspaceId), eq(finWorkspaces.orgId, auth.orgId)));
    if (!workspace) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateBillSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    if (parsed.data.status) {
      const validTransitions: Record<string, string[]> = {
        draft: ["received", "voided"],
        received: ["paid", "voided"],
      };
      const allowed = validTransitions[existing.status] || [];
      if (!allowed.includes(parsed.data.status)) {
        return NextResponse.json({ error: `Cannot transition from ${existing.status} to ${parsed.data.status}` }, { status: 400 });
      }
    }

    const updateData: Record<string, unknown> = { ...parsed.data, updatedAt: new Date() };
    if (updateData.dueDate && typeof updateData.dueDate === "string") {
      updateData.dueDate = new Date(updateData.dueDate as string);
    }

    const updated = await db.transaction(async (tx) => {
      const [result] = await tx.update(finBills)
        .set(updateData as any)
        .where(eq(finBills.id, Number(id)))
        .returning();

      const ipAddress = getClientIp(request);
      await tx.insert(finAuditLog).values({
        workspaceId: existing.workspaceId,
        userId: auth.user.id,
        action: "update",
        entityType: "bill",
        entityId: Number(id),
        changes: updateData,
        ipAddress,
      });

      return result;
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update bill error:", error);
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
    const [existing] = await db.select().from(finBills).where(eq(finBills.id, Number(id)));
    if (!existing) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    if (existing.status === "voided") {
      return NextResponse.json({ error: "Bill is already voided" }, { status: 400 });
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
          reference: `VOID-${existing.billNumber}`,
          description: `VOID: Bill ${existing.billNumber}`,
          sourceType: "bill",
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

      const [result] = await tx.update(finBills)
        .set({ status: "voided", updatedAt: new Date() })
        .where(eq(finBills.id, Number(id)))
        .returning();

      const ipAddress = getClientIp(request);
      await tx.insert(finAuditLog).values({
        workspaceId: existing.workspaceId,
        userId: auth.user.id,
        action: "void",
        entityType: "bill",
        entityId: Number(id),
        changes: { billNumber: existing.billNumber, previousStatus: existing.status },
        ipAddress,
      });

      return result;
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Void bill error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
