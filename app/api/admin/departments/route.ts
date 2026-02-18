import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { departments, departmentMembers, users } from "@/shared/schema";
import { eq, and, sql, count } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";
import { requireOrgRole } from "@/lib/permissions";
import { generalLimiter } from "@/lib/rate-limit";
import { z } from "zod";

const createDeptSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  managerId: z.number().int().positive().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const rl = await generalLimiter(request);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const deptRows = await db
      .select({
        id: departments.id,
        orgId: departments.orgId,
        name: departments.name,
        description: departments.description,
        managerId: departments.managerId,
        status: departments.status,
        color: departments.color,
        createdAt: departments.createdAt,
        updatedAt: departments.updatedAt,
        memberCount: sql<number>`(SELECT COUNT(*) FROM department_members WHERE department_id = ${departments.id})`.as("member_count"),
      })
      .from(departments)
      .where(eq(departments.orgId, auth.orgId))
      .orderBy(departments.name);

    const deptsWithManager = await Promise.all(
      deptRows.map(async (dept) => {
        let manager = null;
        if (dept.managerId) {
          const [m] = await db
            .select({ id: users.id, email: users.email, businessName: users.businessName })
            .from(users)
            .where(eq(users.id, dept.managerId))
            .limit(1);
          manager = m || null;
        }
        return { ...dept, manager };
      })
    );

    return NextResponse.json({ departments: deptsWithManager });
  } catch (err: any) {
    console.error("[Departments] GET error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const rl = await generalLimiter(request);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const auth = await getAuthenticatedUser();
    const perm = requireOrgRole(auth, "ADMIN");
    if (!perm.allowed) {
      return NextResponse.json({ error: perm.error }, { status: perm.status || 403 });
    }

    const body = await request.json();
    const parsed = createDeptSchema.parse(body);

    const [existing] = await db
      .select()
      .from(departments)
      .where(and(eq(departments.orgId, auth!.orgId!), eq(departments.name, parsed.name)))
      .limit(1);
    if (existing) {
      return NextResponse.json({ error: "A department with this name already exists" }, { status: 409 });
    }

    const [dept] = await db
      .insert(departments)
      .values({
        orgId: auth!.orgId!,
        name: parsed.name,
        description: parsed.description || null,
        color: parsed.color || "#6366f1",
        managerId: parsed.managerId || null,
      })
      .returning();

    if (parsed.managerId) {
      await db.insert(departmentMembers).values({
        departmentId: dept.id,
        userId: parsed.managerId,
        departmentRole: "MANAGER",
      }).onConflictDoNothing();
    }

    return NextResponse.json({ department: dept }, { status: 201 });
  } catch (err: any) {
    if (err.name === "ZodError") {
      return NextResponse.json({ error: "Invalid input", details: err.errors }, { status: 400 });
    }
    console.error("[Departments] POST error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
