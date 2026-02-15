import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/get-user";
import { db } from "@/lib/db";
import { orgs } from "@/shared/schema";
import { eq } from "drizzle-orm";
import { authLimiter } from "@/lib/rate-limit";

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
    const { password: _, ...userWithoutPassword } = auth.user;

    let org = null;
    if (auth.orgId) {
      const [orgRow] = await db.select({ id: orgs.id, name: orgs.name, deploymentModel: orgs.deploymentModel, byokMode: orgs.byokMode }).from(orgs).where(eq(orgs.id, auth.orgId)).limit(1);
      if (orgRow) {
        org = orgRow;
      }
    }

    return NextResponse.json({ user: userWithoutPassword, orgId: auth.orgId, role: auth.role, org }, { status: 200 });
  } catch (error) {
    console.error("Auth me error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
