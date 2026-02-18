import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { departments, departmentMembers, users } from "@/shared/schema";
import { eq, and } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";
import { requireOrgRole, canManageDepartment } from "@/lib/permissions";
import { generalLimiter } from "@/lib/rate-limit";
import { z } from "zod";

const updateDeptSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  description: z.string().max(500).optional().nullable(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  managerId: z.number().int().positive().optional().nullable(),
  status: z.enum(["active", "archived"]).optional(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rl = await generalLimiter(request);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { id } = await params;
    const deptId = parseInt(id);

    const [dept] = await db.select().from(departments).where(and(eq(departments.id, deptId), eq(departments.orgId, auth.orgId))).limit(1);
    if (!dept) return NextResponse.json({ error: "Department not found" }, { status: 404 });

    const members = await db
      .select({
        id: departmentMembers.id,
        userId: departmentMembers.userId,
        departmentRole: departmentMembers.departmentRole,
        joinedAt: departmentMembers.joinedAt,
        email: users.email,
        businessName: users.businessName,
      })
      .from(departmentMembers)
      .innerJoin(users, eq(departmentMembers.userId, users.id))
      .where(eq(departmentMembers.departmentId, deptId));

    let manager = null;
    if (dept.managerId) {
      const [m] = await db.select({ id: users.id, email: users.email, businessName: users.businessName }).from(users).where(eq(users.id, dept.managerId)).limit(1);
      manager = m || null;
    }

    return NextResponse.json({ department: { ...dept, manager, members } });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rl = await generalLimiter(request);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { id } = await params;
    const deptId = parseInt(id);

    const canManage = await canManageDepartment(auth, deptId);
    if (!canManage) return NextResponse.json({ error: "Access denied" }, { status: 403 });

    const body = await request.json();
    const parsed = updateDeptSchema.parse(body);

    if (parsed.name) {
      const [existing] = await db
        .select()
        .from(departments)
        .where(and(eq(departments.orgId, auth.orgId), eq(departments.name, parsed.name)))
        .limit(1);
      if (existing && existing.id !== deptId) {
        return NextResponse.json({ error: "A department with this name already exists" }, { status: 409 });
      }
    }

    const updateData: any = { updatedAt: new Date() };
    if (parsed.name !== undefined) updateData.name = parsed.name;
    if (parsed.description !== undefined) updateData.description = parsed.description;
    if (parsed.color !== undefined) updateData.color = parsed.color;
    if (parsed.managerId !== undefined) updateData.managerId = parsed.managerId;
    if (parsed.status !== undefined) updateData.status = parsed.status;

    const [updated] = await db.update(departments).set(updateData).where(eq(departments.id, deptId)).returning();
    return NextResponse.json({ department: updated });
  } catch (err: any) {
    if (err.name === "ZodError") return NextResponse.json({ error: "Invalid input", details: err.errors }, { status: 400 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthenticatedUser();
    const perm = requireOrgRole(auth, "ADMIN");
    if (!perm.allowed) return NextResponse.json({ error: perm.error }, { status: perm.status || 403 });

    const { id } = await params;
    const deptId = parseInt(id);

    const [dept] = await db.select().from(departments).where(and(eq(departments.id, deptId), eq(departments.orgId, auth!.orgId!))).limit(1);
    if (!dept) return NextResponse.json({ error: "Department not found" }, { status: 404 });

    await db.delete(departmentMembers).where(eq(departmentMembers.departmentId, deptId));
    await db.delete(departments).where(eq(departments.id, deptId));

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
