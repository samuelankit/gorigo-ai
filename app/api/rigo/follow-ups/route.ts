import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/get-user";
import { db } from "@/lib/db";
import { rigoFollowUps } from "@/shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { handleRouteError } from "@/lib/api-error";
import { z } from "zod";

export async function GET() {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const followUps = await db
      .select()
      .from(rigoFollowUps)
      .where(and(
        eq(rigoFollowUps.userId, auth.user.id),
        eq(rigoFollowUps.orgId, auth.orgId),
      ))
      .orderBy(desc(rigoFollowUps.createdAt))
      .limit(50);

    return NextResponse.json(followUps);
  } catch (error) {
    return handleRouteError(error, "RigoFollowUps");
  }
}

const patchSchema = z.object({
  id: z.number().int().positive(),
  status: z.enum(["completed", "cancelled"]),
});

export async function PATCH(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, status } = patchSchema.parse(body);

    const [existing] = await db
      .select({ id: rigoFollowUps.id })
      .from(rigoFollowUps)
      .where(and(
        eq(rigoFollowUps.id, id),
        eq(rigoFollowUps.userId, auth.user.id),
        eq(rigoFollowUps.orgId, auth.orgId),
      ))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Follow-up not found" }, { status: 404 });
    }

    await db.update(rigoFollowUps)
      .set({ status, completedAt: status === "completed" ? new Date() : null })
      .where(eq(rigoFollowUps.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError(error, "RigoFollowUps");
  }
}
