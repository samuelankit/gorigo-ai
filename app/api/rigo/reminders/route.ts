import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/get-user";
import { db } from "@/lib/db";
import { rigoReminders } from "@/shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { handleRouteError } from "@/lib/api-error";
import { z } from "zod";

export async function GET() {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const reminders = await db
      .select()
      .from(rigoReminders)
      .where(and(
        eq(rigoReminders.userId, auth.user.id),
        eq(rigoReminders.orgId, auth.orgId),
      ))
      .orderBy(desc(rigoReminders.createdAt))
      .limit(50);

    return NextResponse.json(reminders);
  } catch (error) {
    return handleRouteError(error, "RigoReminders");
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
      .select({ id: rigoReminders.id })
      .from(rigoReminders)
      .where(and(
        eq(rigoReminders.id, id),
        eq(rigoReminders.userId, auth.user.id),
        eq(rigoReminders.orgId, auth.orgId),
      ))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Reminder not found" }, { status: 404 });
    }

    await db.update(rigoReminders)
      .set({ status, completedAt: status === "completed" ? new Date() : null })
      .where(eq(rigoReminders.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError(error, "RigoReminders");
  }
}
