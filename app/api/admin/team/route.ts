import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orgMembers, users, departmentMembers, departments } from "@/shared/schema";
import { eq, and } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";
import { requireOrgRole } from "@/lib/permissions";
import { generalLimiter } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/api-error";

export async function GET(request: NextRequest) {
  try {
    const rl = await generalLimiter(request);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const auth = await getAuthenticatedUser();
    const perm = requireOrgRole(auth, "VIEWER");
    if (!perm.allowed) return NextResponse.json({ error: perm.error }, { status: perm.status || 403 });

    const members = await db
      .select({
        id: orgMembers.id,
        userId: orgMembers.userId,
        orgRole: orgMembers.role,
        email: users.email,
        businessName: users.businessName,
        createdAt: users.createdAt,
      })
      .from(orgMembers)
      .innerJoin(users, eq(orgMembers.userId, users.id))
      .where(eq(orgMembers.orgId, auth!.orgId!));

    const enriched = await Promise.all(members.map(async (member) => {
      const depts = await db
        .select({
          departmentId: departmentMembers.departmentId,
          departmentRole: departmentMembers.departmentRole,
          departmentName: departments.name,
        })
        .from(departmentMembers)
        .innerJoin(departments, eq(departmentMembers.departmentId, departments.id))
        .where(eq(departmentMembers.userId, member.userId));

      return { ...member, departments: depts };
    }));

    return NextResponse.json({ members: enriched });
  } catch (err: any) {
    return handleRouteError(err, "AdminTeam");
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser();
    const perm = requireOrgRole(auth, "ADMIN");
    if (!perm.allowed) return NextResponse.json({ error: perm.error }, { status: perm.status || 403 });

    const body = await request.json();
    const { memberId, role } = body;

    if (!memberId || !role) return NextResponse.json({ error: "memberId and role are required" }, { status: 400 });
    if (!["OWNER", "ADMIN", "MANAGER", "AGENT", "VIEWER"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    if (role === "OWNER") {
      const perm2 = requireOrgRole(auth, "OWNER");
      if (!perm2.allowed) return NextResponse.json({ error: "Only OWNER can assign OWNER role" }, { status: 403 });
    }

    const [updated] = await db
      .update(orgMembers)
      .set({ role })
      .where(and(eq(orgMembers.id, memberId), eq(orgMembers.orgId, auth!.orgId!)))
      .returning();

    if (!updated) return NextResponse.json({ error: "Member not found" }, { status: 404 });
    return NextResponse.json({ member: updated });
  } catch (err: any) {
    return handleRouteError(err, "AdminTeam");
  }
}
