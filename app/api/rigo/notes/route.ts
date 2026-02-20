import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/get-user";
import { db } from "@/lib/db";
import { rigoNotes } from "@/shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { handleRouteError } from "@/lib/api-error";

export async function GET() {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const notes = await db
      .select()
      .from(rigoNotes)
      .where(and(
        eq(rigoNotes.userId, auth.user.id),
        eq(rigoNotes.orgId, auth.orgId),
      ))
      .orderBy(desc(rigoNotes.createdAt))
      .limit(50);

    return NextResponse.json(notes);
  } catch (error) {
    return handleRouteError(error, "RigoNotes");
  }
}
