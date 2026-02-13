import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orgs, orgMembers, users, wallets, callLogs, deploymentModelChanges } from "@/shared/schema";
import { eq, sql, desc } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";
import { safeParseNumeric } from "@/lib/money";

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth || auth.globalRole !== "SUPERADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgList = await db
      .select({
        id: orgs.id,
        name: orgs.name,
        deploymentModel: orgs.deploymentModel,
        byokMode: orgs.byokMode,
        createdAt: orgs.createdAt,
      })
      .from(orgs)
      .orderBy(desc(orgs.id));

    const enriched = await Promise.all(
      orgList.map(async (org) => {
        const [ownerMember] = await db
          .select({ email: users.email })
          .from(orgMembers)
          .innerJoin(users, eq(orgMembers.userId, users.id))
          .where(eq(orgMembers.orgId, org.id))
          .limit(1);

        const [walletRow] = await db
          .select({ balance: wallets.balance })
          .from(wallets)
          .where(eq(wallets.orgId, org.id))
          .limit(1);

        const [callCount] = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(callLogs)
          .where(eq(callLogs.orgId, org.id));

        const [activeCalls] = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(callLogs)
          .where(
            sql`${callLogs.orgId} = ${org.id} AND ${callLogs.status} IN ('ringing', 'in_progress', 'queued')`
          );

        const [lastChange] = await db
          .select()
          .from(deploymentModelChanges)
          .where(eq(deploymentModelChanges.orgId, org.id))
          .orderBy(desc(deploymentModelChanges.createdAt))
          .limit(1);

        return {
          ...org,
          ownerEmail: ownerMember?.email ?? "N/A",
          balance: safeParseNumeric(walletRow?.balance, 0),
          totalCalls: Number(callCount?.count ?? 0),
          activeCalls: Number(activeCalls?.count ?? 0),
          lastModelChange: lastChange ?? null,
        };
      })
    );

    return NextResponse.json({ orgs: enriched });
  } catch (error) {
    console.error("List orgs error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
