import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { socialPosts } from "@/shared/schema";
import { eq, and } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";
import { handleRouteError } from "@/lib/api-error";

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

    const [post] = await db.select().from(socialPosts)
      .where(and(eq(socialPosts.id, postId), eq(socialPosts.orgId, auth.orgId)))
      .limit(1);

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (post.status === "published") {
      return NextResponse.json({ error: "Post is already published" }, { status: 400 });
    }

    if (post.status === "cancelled") {
      return NextResponse.json({ error: "Cannot publish a cancelled post" }, { status: 400 });
    }

    const [updated] = await db.update(socialPosts)
      .set({
        status: "published",
        publishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(socialPosts.id, postId))
      .returning();

    return NextResponse.json({
      post: updated,
      message: "Post marked as published. Connect social platform OAuth to enable auto-publishing.",
    });
  } catch (err) {
    return handleRouteError(err, "Failed to publish post");
  }
}
