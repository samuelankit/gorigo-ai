import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedUser } from "@/lib/get-user";
import { finCustomers, finWorkspaces, finAuditLog } from "@/shared/schema";
import { eq, and } from "drizzle-orm";
import { getClientIp } from "@/lib/finance-validation";
import { z } from "zod";
import { settingsLimiter } from "@/lib/rate-limit";

const updateCustomerSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  taxId: z.string().max(50).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  defaultPaymentTerms: z.number().int().min(0).max(365).optional(),
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
    const [customer] = await db.select().from(finCustomers).where(eq(finCustomers.id, Number(id)));
    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const [workspace] = await db.select().from(finWorkspaces)
      .where(and(eq(finWorkspaces.id, customer.workspaceId), eq(finWorkspaces.orgId, auth.orgId)));
    if (!workspace) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(customer);
  } catch (error) {
    console.error("Get customer error:", error);
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
    const [existing] = await db.select().from(finCustomers).where(eq(finCustomers.id, Number(id)));
    if (!existing) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const [workspace] = await db.select().from(finWorkspaces)
      .where(and(eq(finWorkspaces.id, existing.workspaceId), eq(finWorkspaces.orgId, auth.orgId)));
    if (!workspace) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateCustomerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const [updated] = await db.update(finCustomers)
      .set(parsed.data)
      .where(eq(finCustomers.id, Number(id)))
      .returning();

    const ipAddress = getClientIp(request);
    await db.insert(finAuditLog).values({
      workspaceId: existing.workspaceId,
      userId: auth.user.id,
      action: "update",
      entityType: "customer",
      entityId: Number(id),
      changes: parsed.data,
      ipAddress,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update customer error:", error);
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
    const [existing] = await db.select().from(finCustomers).where(eq(finCustomers.id, Number(id)));
    if (!existing) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const [workspace] = await db.select().from(finWorkspaces)
      .where(and(eq(finWorkspaces.id, existing.workspaceId), eq(finWorkspaces.orgId, auth.orgId)));
    if (!workspace) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await db.delete(finCustomers).where(eq(finCustomers.id, Number(id)));

    const ipAddress = getClientIp(request);
    await db.insert(finAuditLog).values({
      workspaceId: existing.workspaceId,
      userId: auth.user.id,
      action: "delete",
      entityType: "customer",
      entityId: Number(id),
      changes: { name: existing.name },
      ipAddress,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete customer error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
