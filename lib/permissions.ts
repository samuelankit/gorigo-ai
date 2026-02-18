import { db } from "@/lib/db";
import { orgMembers, departmentMembers, departments } from "@/shared/schema";
import { eq, and } from "drizzle-orm";
import type { AuthResult } from "@/lib/get-user";

export const ORG_ROLES = ["OWNER", "ADMIN", "MANAGER", "AGENT", "VIEWER"] as const;
export type OrgRole = typeof ORG_ROLES[number];

export const DEPT_ROLES = ["MANAGER", "AGENT", "VIEWER"] as const;
export type DeptRole = typeof DEPT_ROLES[number];

const ORG_ROLE_LEVEL: Record<string, number> = {
  OWNER: 100,
  ADMIN: 80,
  MANAGER: 60,
  AGENT: 40,
  VIEWER: 20,
};

export function getOrgRoleLevel(role: string | null): number {
  return ORG_ROLE_LEVEL[role || ""] || 0;
}

export function hasOrgPermission(auth: AuthResult | null, minRole: OrgRole): boolean {
  if (!auth) return false;
  if (auth.globalRole === "SUPERADMIN") return true;
  return getOrgRoleLevel(auth.role) >= ORG_ROLE_LEVEL[minRole];
}

export function requireOrgRole(auth: AuthResult | null, minRole: OrgRole): { allowed: boolean; error: string | null; status?: number } {
  if (!auth) return { allowed: false, error: "Not authenticated", status: 401 };
  if (!auth.orgId) return { allowed: false, error: "No organization found", status: 404 };
  if (auth.globalRole === "SUPERADMIN") return { allowed: true, error: null };
  if (getOrgRoleLevel(auth.role) < ORG_ROLE_LEVEL[minRole]) {
    return { allowed: false, error: `Requires ${minRole} role or higher`, status: 403 };
  }
  return { allowed: true, error: null };
}

export async function getUserDepartments(userId: number): Promise<Array<{ departmentId: number; departmentRole: string; departmentName: string }>> {
  const rows = await db
    .select({
      departmentId: departmentMembers.departmentId,
      departmentRole: departmentMembers.departmentRole,
      departmentName: departments.name,
    })
    .from(departmentMembers)
    .innerJoin(departments, eq(departmentMembers.departmentId, departments.id))
    .where(eq(departmentMembers.userId, userId));
  return rows;
}

export async function isDepartmentManager(userId: number, departmentId: number): Promise<boolean> {
  const [dept] = await db
    .select()
    .from(departments)
    .where(and(eq(departments.id, departmentId), eq(departments.managerId, userId)))
    .limit(1);
  if (dept) return true;

  const [member] = await db
    .select()
    .from(departmentMembers)
    .where(and(
      eq(departmentMembers.userId, userId),
      eq(departmentMembers.departmentId, departmentId),
      eq(departmentMembers.departmentRole, "MANAGER"),
    ))
    .limit(1);
  return !!member;
}

export async function canManageDepartment(auth: AuthResult | null, departmentId: number): Promise<boolean> {
  if (!auth) return false;
  if (auth.globalRole === "SUPERADMIN") return true;
  if (hasOrgPermission(auth, "ADMIN")) return true;
  return isDepartmentManager(auth.user.id, departmentId);
}

export async function getVisibleDepartmentIds(auth: AuthResult): Promise<number[] | "all"> {
  if (auth.globalRole === "SUPERADMIN" || hasOrgPermission(auth, "ADMIN")) {
    return "all";
  }
  const depts = await getUserDepartments(auth.user.id);
  return depts.map(d => d.departmentId);
}
