import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { departments } from "@/shared/schema";
import { eq, and } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";
import { requireOrgRole } from "@/lib/permissions";
import { generalLimiter } from "@/lib/rate-limit";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rl = await generalLimiter(request);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { id } = await params;
    const deptId = parseInt(id);

    const [dept] = await db
      .select({
        id: departments.id,
        name: departments.name,
        spendingCap: departments.spendingCap,
        spentThisMonth: departments.spentThisMonth,
        spendingCapResetAt: departments.spendingCapResetAt,
        budgetAlertSentAt: departments.budgetAlertSentAt,
      })
      .from(departments)
      .where(and(eq(departments.id, deptId), eq(departments.orgId, auth.orgId)))
      .limit(1);

    if (!dept) return NextResponse.json({ error: "Department not found" }, { status: 404 });

    const cap = dept.spendingCap ? parseFloat(dept.spendingCap) : null;
    const spent = parseFloat(dept.spentThisMonth || "0");
    const remaining = cap !== null ? Math.max(0, cap - spent) : null;
    const percentage = cap !== null && cap > 0 ? Math.min(100, (spent / cap) * 100) : null;

    return NextResponse.json({
      budget: {
        departmentId: dept.id,
        departmentName: dept.name,
        cap,
        spent,
        remaining,
        percentage,
        isUnlimited: cap === null,
        isExceeded: cap !== null && spent >= cap,
        alertThresholds: { amber: 60, red: 80, exceeded: 100 },
        resetAt: dept.spendingCapResetAt,
        lastAlertAt: dept.budgetAlertSentAt,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rl = await generalLimiter(request);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const perm = requireOrgRole(auth, "ADMIN");
    if (!perm.allowed) return NextResponse.json({ error: perm.error }, { status: perm.status || 403 });

    const { id } = await params;
    const deptId = parseInt(id);

    const [dept] = await db
      .select()
      .from(departments)
      .where(and(eq(departments.id, deptId), eq(departments.orgId, auth.orgId)))
      .limit(1);

    if (!dept) return NextResponse.json({ error: "Department not found" }, { status: 404 });

    const [updated] = await db
      .update(departments)
      .set({
        spentThisMonth: "0",
        spendingCapResetAt: new Date(),
        budgetAlertSentAt: null,
        updatedAt: new Date(),
      })
      .where(eq(departments.id, deptId))
      .returning();

    return NextResponse.json({ department: updated, message: "Monthly spend reset successfully" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
