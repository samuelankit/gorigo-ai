import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/get-user";
import { finSuppliers, finWorkspaces, finAuditLog } from "@/shared/schema";
import { eq, and, sql, asc, ilike, or } from "drizzle-orm";
import { createSupplierSchema, getClientIp } from "@/lib/finance-validation";

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

    const conditions: any[] = [eq(finSuppliers.workspaceId, Number(workspaceId))];
    if (search) {
      conditions.push(or(
        ilike(finSuppliers.name, `%${search}%`),
        ilike(finSuppliers.email, `%${search}%`)
      )!);
    }

    const [countResult] = await db.select({ count: sql<number>`count(*)` })
      .from(finSuppliers)
      .where(and(...conditions));
    const total = Number(countResult.count);

    const suppliers = await db.select().from(finSuppliers)
      .where(and(...conditions))
      .orderBy(asc(finSuppliers.name))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      suppliers,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("List suppliers error:", error);
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
    const parsed = createSupplierSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const { workspaceId, name, email, phone, address, taxId, notes, defaultPaymentTerms } = parsed.data;

    const [workspace] = await db.select().from(finWorkspaces)
      .where(and(eq(finWorkspaces.id, workspaceId), eq(finWorkspaces.orgId, auth.orgId)));
    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const [supplier] = await db.insert(finSuppliers).values({
      workspaceId,
      name,
      email: email || null,
      phone: phone || null,
      address: address || null,
      taxId: taxId || null,
      notes: notes || null,
      defaultPaymentTerms: defaultPaymentTerms || 30,
    }).returning();

    const ipAddress = getClientIp(request);
    await db.insert(finAuditLog).values({
      workspaceId,
      userId: auth.user.id,
      action: "create",
      entityType: "supplier",
      entityId: supplier.id,
      changes: { name, email },
      ipAddress,
    });

    return NextResponse.json(supplier, { status: 201 });
  } catch (error) {
    console.error("Create supplier error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
