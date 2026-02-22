import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/get-user";
import { db } from "@/lib/db";
import { orgs, orgMembers } from "@/shared/schema";
import { eq } from "drizzle-orm";
import { authLimiter } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/api-error";

export async function GET(request: NextRequest) {
  try {
    const rl = await authLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    const auth = await getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const { password: _, emailVerificationToken: _evt, emailVerificationExpiresAt: _evea, failedLoginAttempts: _fla, lockedUntil: _lu, ...userWithoutPassword } = auth.user;

    let org = null;
    if (auth.orgId) {
      const [orgRow] = await db.select({ id: orgs.id, name: orgs.name, deploymentModel: orgs.deploymentModel }).from(orgs).where(eq(orgs.id, auth.orgId)).limit(1);
      if (orgRow) {
        org = orgRow;
      }
    }

    const memberships = await db
      .select({
        orgId: orgMembers.orgId,
        role: orgMembers.role,
        orgName: orgs.name,
        deploymentModel: orgs.deploymentModel,
      })
      .from(orgMembers)
      .innerJoin(orgs, eq(orgMembers.orgId, orgs.id))
      .where(eq(orgMembers.userId, auth.user.id));

    const businesses = memberships.map((m) => ({
      id: m.orgId,
      name: m.orgName,
      role: m.role,
      deploymentModel: m.deploymentModel,
      isActive: m.orgId === auth.orgId,
    }));

    return NextResponse.json({ user: userWithoutPassword, orgId: auth.orgId, role: auth.role, org, businesses }, { status: 200 });
  } catch (error) {
    return handleRouteError(error, "GetUser");
  }
}
