import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { departmentMembers, users, orgMembers } from "@/shared/schema";
import { eq, and } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";
import { canManageDepartment } from "@/lib/permissions";
import { generalLimiter } from "@/lib/rate-limit";
import { z } from "zod";

const addMemberSchema = z.object({
  userId: z.number().int().positive(),
  departmentRole: z.enum(["MANAGER", "AGENT", "VIEWER"]).default("AGENT"),
});

const updateMemberSchema = z.object({
  departmentRole: z.enum(["MANAGER", "AGENT", "VIEWER"]),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    const parsed = addMemberSchema.parse(body);

    const [isOrgMember] = await db
      .select()
      .from(orgMembers)
      .where(and(eq(orgMembers.userId, parsed.userId), eq(orgMembers.orgId, auth.orgId)))
      .limit(1);
    if (!isOrgMember) {
      return NextResponse.json({ error: "User is not a member of this organization" }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(departmentMembers)
      .where(and(eq(departmentMembers.departmentId, deptId), eq(departmentMembers.userId, parsed.userId)))
      .limit(1);
    if (existing) {
      return NextResponse.json({ error: "User is already a member of this department" }, { status: 409 });
    }

    const [member] = await db
      .insert(departmentMembers)
      .values({ departmentId: deptId, userId: parsed.userId, departmentRole: parsed.departmentRole })
      .returning();

    return NextResponse.json({ member }, { status: 201 });
  } catch (err: any) {
    if (err.name === "ZodError") return NextResponse.json({ error: "Invalid input", details: err.errors }, { status: 400 });
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
    const { memberId, ...rest } = body;
    const parsed = updateMemberSchema.parse(rest);

    if (!memberId || typeof memberId !== "number" || !Number.isInteger(memberId) || memberId <= 0) {
      return NextResponse.json({ error: "memberId must be a positive integer" }, { status: 400 });
    }

    const [updated] = await db
      .update(departmentMembers)
      .set({ departmentRole: parsed.departmentRole })
      .where(and(eq(departmentMembers.id, memberId), eq(departmentMembers.departmentId, deptId)))
      .returning();

    if (!updated) return NextResponse.json({ error: "Member not found" }, { status: 404 });
    return NextResponse.json({ member: updated });
  } catch (err: any) {
    if (err.name === "ZodError") return NextResponse.json({ error: "Invalid input", details: err.errors }, { status: 400 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rl = await generalLimiter(request);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { id } = await params;
    const deptId = parseInt(id);

    const canManage = await canManageDepartment(auth, deptId);
    if (!canManage) return NextResponse.json({ error: "Access denied" }, { status: 403 });

    const url = new URL(request.url);
    const memberId = url.searchParams.get("memberId");
    if (!memberId) return NextResponse.json({ error: "memberId query param required" }, { status: 400 });

    await db
      .delete(departmentMembers)
      .where(and(eq(departmentMembers.id, parseInt(memberId)), eq(departmentMembers.departmentId, deptId)));

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
