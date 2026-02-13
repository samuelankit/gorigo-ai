import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/get-user";
import { finJournalEntries, finJournalLines, finWorkspaces, finAuditLog } from "@/shared/schema";
import { eq, and, sql, desc, ilike, or, gte, lte } from "drizzle-orm";
import { createJournalSchema, getClientIp } from "@/lib/finance-validation";

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
    const search = request.nextUrl.searchParams.get("search");
    const dateFrom = request.nextUrl.searchParams.get("dateFrom");
    const dateTo = request.nextUrl.searchParams.get("dateTo");

    const conditions: any[] = [eq(finJournalEntries.workspaceId, Number(workspaceId))];
    if (search) {
      conditions.push(or(
        ilike(finJournalEntries.reference, `%${search}%`),
        ilike(finJournalEntries.description, `%${search}%`)
      )!);
    }
    if (dateFrom) {
      conditions.push(gte(finJournalEntries.entryDate, new Date(dateFrom)));
    }
    if (dateTo) {
      conditions.push(lte(finJournalEntries.entryDate, new Date(dateTo)));
    }

    const [countResult] = await db.select({ count: sql<number>`count(*)` })
      .from(finJournalEntries)
      .where(and(...conditions));
    const total = Number(countResult.count);

    const entries = await db.select().from(finJournalEntries)
      .where(and(...conditions))
      .orderBy(desc(finJournalEntries.entryDate))
      .limit(limit)
      .offset(offset);

    const result = [];
    for (const entry of entries) {
      const lines = await db.select().from(finJournalLines)
        .where(eq(finJournalLines.journalEntryId, entry.id));
      result.push({ ...entry, lines });
    }

    return NextResponse.json({
      entries: result,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("List journal entries error:", error);
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
    const parsed = createJournalSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const { workspaceId, entryDate, reference, description, lines } = parsed.data;

    const [workspace] = await db.select().from(finWorkspaces)
      .where(and(eq(finWorkspaces.id, workspaceId), eq(finWorkspaces.orgId, auth.orgId)));
    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    let totalDebits = 0;
    let totalCredits = 0;
    for (const line of lines) {
      totalDebits += line.debit || 0;
      totalCredits += line.credit || 0;
    }

    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      return NextResponse.json({ error: `Journal entry must balance. Debits: ${totalDebits}, Credits: ${totalCredits}` }, { status: 400 });
    }

    const result = await db.transaction(async (tx) => {
      const [entry] = await tx.insert(finJournalEntries).values({
        workspaceId,
        entryDate: entryDate ? new Date(entryDate) : new Date(),
        reference: reference || null,
        description: description || null,
        isManual: true,
        isPosted: true,
        createdBy: auth.user.id,
      }).returning();

      for (const line of lines) {
        await tx.insert(finJournalLines).values({
          journalEntryId: entry.id,
          accountId: line.accountId,
          debit: String(line.debit || 0),
          credit: String(line.credit || 0),
          description: line.description || null,
        });
      }

      const ipAddress = getClientIp(request);
      await tx.insert(finAuditLog).values({
        workspaceId,
        userId: auth.user.id,
        action: "create",
        entityType: "journal_entry",
        entityId: entry.id,
        changes: { reference, totalDebits, totalCredits, lineCount: lines.length },
        ipAddress,
      });

      const savedLines = await tx.select().from(finJournalLines)
        .where(eq(finJournalLines.journalEntryId, entry.id));

      return { ...entry, lines: savedLines };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Create journal entry error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
