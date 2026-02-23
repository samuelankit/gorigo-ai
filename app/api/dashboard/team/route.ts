import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orgs, orgMembers, users, departments, departmentMembers, agents, teamActivityLog } from "@/shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";
import { generalLimiter } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  try {
    const rl = await generalLimiter(request);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const orgId = auth.orgId;
    const [org] = await db.select().from(orgs).where(eq(orgs.id, orgId)).limit(1);
    if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

    if (!["team", "custom"].includes(org.deploymentModel || "")) {
      return NextResponse.json({ error: "Team dashboard requires Team or Custom deployment model" }, { status: 403 });
    }

    const members = await db
      .select({
        userId: orgMembers.userId,
        role: orgMembers.role,
        email: users.email,
        businessName: users.businessName,
      })
      .from(orgMembers)
      .innerJoin(users, eq(orgMembers.userId, users.id))
      .where(eq(orgMembers.orgId, orgId));

    const depts = await db
      .select()
      .from(departments)
      .where(and(eq(departments.orgId, orgId), eq(departments.status, "active")));

    const deptMemberCounts = await db
      .select({
        departmentId: departmentMembers.departmentId,
        count: sql<number>`count(*)::int`,
      })
      .from(departmentMembers)
      .innerJoin(departments, eq(departmentMembers.departmentId, departments.id))
      .where(eq(departments.orgId, orgId))
      .groupBy(departmentMembers.departmentId);

    const sharedAgentsList = await db
      .select({
        id: agents.id,
        name: agents.name,
        visibility: agents.visibility,
        status: agents.status,
        departmentName: agents.departmentName,
      })
      .from(agents)
      .where(and(
        eq(agents.orgId, orgId),
        eq(agents.visibility, "shared")
      ));

    const recentActivity = await db
      .select({
        id: teamActivityLog.id,
        userId: teamActivityLog.userId,
        action: teamActivityLog.action,
        entityType: teamActivityLog.entityType,
        entityId: teamActivityLog.entityId,
        details: teamActivityLog.details,
        createdAt: teamActivityLog.createdAt,
        userEmail: users.email,
        userName: users.businessName,
      })
      .from(teamActivityLog)
      .innerJoin(users, eq(teamActivityLog.userId, users.id))
      .where(eq(teamActivityLog.orgId, orgId))
      .orderBy(desc(teamActivityLog.createdAt))
      .limit(50);

    const memberCountMap = new Map(deptMemberCounts.map(d => [d.departmentId, d.count]));

    const departmentStats = depts.map(dept => ({
      id: dept.id,
      name: dept.name,
      color: dept.color,
      status: dept.status,
      memberCount: memberCountMap.get(dept.id) || 0,
      spendingCap: dept.spendingCap ? parseFloat(dept.spendingCap) : null,
      spentThisMonth: parseFloat(dept.spentThisMonth || "0"),
      budgetPercentage: dept.spendingCap
        ? Math.min(100, (parseFloat(dept.spentThisMonth || "0") / parseFloat(dept.spendingCap)) * 100)
        : null,
    }));

    return NextResponse.json({
      orgName: org.name,
      deploymentModel: org.deploymentModel,
      stats: {
        totalMembers: members.length,
        activeDepartments: depts.length,
        sharedAgents: sharedAgentsList.length,
      },
      members: members.map(m => ({
        userId: m.userId,
        email: m.email,
        name: m.businessName || m.email,
        role: m.role,
        roleLabel: m.role === "VIEWER" ? "Board Member" : m.role,
      })),
      departments: departmentStats,
      sharedAgents: sharedAgentsList,
      recentActivity,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
