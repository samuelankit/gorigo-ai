import { db } from "@/lib/db";
import { notifications, users, orgs, orgMembers } from "@/shared/schema";
import { eq, sql, inArray } from "drizzle-orm";
import { getAuthenticatedUser, requireSuperAdmin } from "@/lib/get-user";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adminLimiter } from "@/lib/rate-limit";
import { handleRouteError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

const broadcastSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  message: z.string().min(1, "Message is required").max(2000),
  type: z.enum(["system", "security", "low_balance", "spending_cap"]).default("system"),
  scope: z.enum(["all", "selected"]).default("all"),
  orgIds: z.array(z.number()).optional(),
  actionUrl: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const rl = await adminLimiter(request);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    const auth = await getAuthenticatedUser();
    const access = requireSuperAdmin(auth);
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const body = await request.json();
    const parsed = broadcastSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const { title, message, type, scope, orgIds, actionUrl } = parsed.data;

    let targetOrgIds: number[] = [];

    if (scope === "all") {
      const allOrgs = await db.select({ id: orgs.id }).from(orgs);
      targetOrgIds = allOrgs.map((o) => o.id);
    } else if (scope === "selected" && orgIds && orgIds.length > 0) {
      targetOrgIds = orgIds;
    } else {
      return NextResponse.json({ error: "No target organizations specified" }, { status: 400 });
    }

    if (targetOrgIds.length === 0) {
      return NextResponse.json({ error: "No organizations found" }, { status: 400 });
    }

    const orgUsers = await db
      .select({ userId: orgMembers.userId, orgId: orgMembers.orgId })
      .from(orgMembers)
      .where(
        sql`${orgMembers.orgId} = ANY(${targetOrgIds}::int[])`
      );

    if (orgUsers.length === 0) {
      return NextResponse.json({ error: "No users found in target organizations" }, { status: 400 });
    }

    const values = orgUsers.map((u) => ({
      userId: u.userId,
      orgId: u.orgId,
      type,
      title,
      message,
      actionUrl: actionUrl ?? null,
      metadata: { broadcastBy: auth!.user.email, broadcastScope: scope } as Record<string, unknown>,
    }));

    const batchSize = 500;
    let inserted = 0;
    for (let i = 0; i < values.length; i += batchSize) {
      const batch = values.slice(i, i + batchSize);
      await db.insert(notifications).values(batch);
      inserted += batch.length;
    }

    return NextResponse.json({
      success: true,
      notificationsSent: inserted,
      orgsReached: targetOrgIds.length,
      usersReached: orgUsers.length,
    });
  } catch (error) {
    return handleRouteError(error, "NotificationBroadcast");
  }
}
