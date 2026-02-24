import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { socialPosts } from "@/shared/schema";
import { eq, and } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";
import { z } from "zod";
import { handleRouteError } from "@/lib/api-error";

const updatePostSchema = z.object({
  content: z.string().min(1).max(5000).optional(),
  platforms: z.array(z.string()).min(1).optional(),
  mediaUrls: z.array(z.string().url()).optional(),
  mediaThumbnails: z.array(z.string().url()).optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
  status: z.enum(["draft", "cancelled"]).optional(),
  utmParams: z.object({
    source: z.string().optional(),
    medium: z.string().optional(),
    campaign: z.string().optional(),
  }).optional(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    return NextResponse.json({ post });
  } catch (err) {
    return handleRouteError(err, "Failed to fetch post");
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const [existing] = await db.select().from(socialPosts)
      .where(and(eq(socialPosts.id, postId), eq(socialPosts.orgId, auth.orgId)))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (existing.status === "published") {
      return NextResponse.json({ error: "Cannot edit a published post" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = updatePostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const updates: Record<string, any> = { updatedAt: new Date() };
    if (parsed.data.content !== undefined) updates.content = parsed.data.content;
    if (parsed.data.platforms !== undefined) updates.platforms = parsed.data.platforms;
    if (parsed.data.mediaUrls !== undefined) updates.mediaUrls = parsed.data.mediaUrls;
    if (parsed.data.mediaThumbnails !== undefined) updates.mediaThumbnails = parsed.data.mediaThumbnails;
    if (parsed.data.scheduledAt !== undefined) updates.scheduledAt = parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null;
    if (parsed.data.status !== undefined) updates.status = parsed.data.status;
    if (parsed.data.utmParams !== undefined) updates.utmParams = parsed.data.utmParams;

    const [updated] = await db.update(socialPosts)
      .set(updates)
      .where(and(eq(socialPosts.id, postId), eq(socialPosts.orgId, auth.orgId)))
      .returning();

    return NextResponse.json({ post: updated });
  } catch (err) {
    return handleRouteError(err, "Failed to update post");
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const [deleted] = await db.delete(socialPosts)
      .where(and(eq(socialPosts.id, postId), eq(socialPosts.orgId, auth.orgId)))
      .returning();

    if (!deleted) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return handleRouteError(err, "Failed to delete post");
  }
}
