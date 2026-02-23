import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { teamActivityLog, users, orgs } from "@/shared/schema";
import { eq, and, desc, lt } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";
import { requireOrgRole } from "@/lib/permissions";
import { generalLimiter } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/api-error";
import { cleanupOldActivityLogs } from "@/lib/team-activity";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const rl = await generalLimiter(request);
    if (!rl.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const auth = await getAuthenticatedUser();
    const perm = requireOrgRole(auth, "VIEWER");
    if (!perm.allowed) return NextResponse.json({ error: perm.error }, { status: perm.status || 403 });

    const orgId = auth!.orgId!;

    const [org] = await db
      .select({ deploymentModel: orgs.deploymentModel })
      .from(orgs)
      .where(eq(orgs.id, orgId))
      .limit(1);

    if (!org || (org.deploymentModel !== "team" && org.deploymentModel !== "custom")) {
      return NextResponse.json({ error: "Team activity log is only available for Team and Custom deployment models" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "100", 10) || 100, 500);
    const offset = Math.max(parseInt(searchParams.get("offset") ?? "0", 10) || 0, 0);
    const userIdFilter = searchParams.get("userId");
    const entityTypeFilter = searchParams.get("entityType");
    const actionFilter = searchParams.get("action");

    const conditions: any[] = [eq(teamActivityLog.orgId, orgId)];

    if (userIdFilter) {
      const uid = parseInt(userIdFilter, 10);
      if (!isNaN(uid)) conditions.push(eq(teamActivityLog.userId, uid));
    }

    if (entityTypeFilter) {
      conditions.push(eq(teamActivityLog.entityType, entityTypeFilter));
    }

    if (actionFilter) {
      conditions.push(eq(teamActivityLog.action, actionFilter));
    }

    const whereClause = and(...conditions);

    const entries = await db
      .select({
        id: teamActivityLog.id,
        orgId: teamActivityLog.orgId,
        userId: teamActivityLog.userId,
        action: teamActivityLog.action,
        entityType: teamActivityLog.entityType,
        entityId: teamActivityLog.entityId,
        details: teamActivityLog.details,
        ipAddress: teamActivityLog.ipAddress,
        createdAt: teamActivityLog.createdAt,
        userEmail: users.email,
        userName: users.businessName,
      })
      .from(teamActivityLog)
      .innerJoin(users, eq(teamActivityLog.userId, users.id))
      .where(whereClause)
      .orderBy(desc(teamActivityLog.createdAt))
      .limit(limit)
      .offset(offset);

    cleanupOldActivityLogs().catch(() => {});

    return NextResponse.json({ entries, limit, offset });
  } catch (err: any) {
    return handleRouteError(err, "TeamActivity");
  }
}
