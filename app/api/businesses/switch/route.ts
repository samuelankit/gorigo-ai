import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/get-user";
import { db } from "@/lib/db";
import { orgMembers, sessions, orgs } from "@/shared/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { settingsLimiter } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/api-error";

const switchBusinessSchema = z.object({
  businessId: z.number().int().positive(),
});

export async function POST(request: NextRequest) {
  try {
    const rl = await settingsLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const auth = await getAuthenticatedUser();
    if (!auth) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = switchBusinessSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { businessId } = parsed.data;

    const [membership] = await db
      .select()
      .from(orgMembers)
      .where(and(eq(orgMembers.userId, auth.user.id), eq(orgMembers.orgId, businessId)))
      .limit(1);

    if (!membership) {
      return NextResponse.json({ error: "Business not found or access denied" }, { status: 404 });
    }

    if (auth.sessionId) {
      await db.update(sessions)
        .set({ activeOrgId: businessId })
        .where(eq(sessions.id, auth.sessionId));
    }

    const [org] = await db
      .select({ id: orgs.id, name: orgs.name, deploymentModel: orgs.deploymentModel, byokMode: orgs.byokMode })
      .from(orgs)
      .where(eq(orgs.id, businessId))
      .limit(1);

    return NextResponse.json({
      orgId: businessId,
      org,
      role: membership.role,
    });
  } catch (error) {
    return handleRouteError(error, "BusinessSwitch");
  }
}
