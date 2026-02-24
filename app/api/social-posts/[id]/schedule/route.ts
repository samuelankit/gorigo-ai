import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { socialPosts } from "@/shared/schema";
import { eq, and } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";
import { z } from "zod";
import { handleRouteError } from "@/lib/api-error";

const scheduleSchema = z.object({
  scheduledAt: z.string().datetime(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const postId = parseInt(id);
    if (isNaN(postId)) {
      return NextResponse.json({ error: "Invalid post ID" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = scheduleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const scheduledDate = new Date(parsed.data.scheduledAt);
    if (scheduledDate <= new Date()) {
      return NextResponse.json({ error: "Scheduled time must be in the future" }, { status: 400 });
    }

    const [post] = await db.select().from(socialPosts)
      .where(and(eq(socialPosts.id, postId), eq(socialPosts.orgId, auth.orgId)))
      .limit(1);

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (post.status === "published") {
      return NextResponse.json({ error: "Cannot reschedule a published post" }, { status: 400 });
    }

    const [updated] = await db.update(socialPosts)
      .set({
        scheduledAt: scheduledDate,
        status: "scheduled",
        updatedAt: new Date(),
      })
      .where(eq(socialPosts.id, postId))
      .returning();

    return NextResponse.json({ post: updated });
  } catch (err) {
    return handleRouteError(err, "Failed to schedule post");
  }
}
