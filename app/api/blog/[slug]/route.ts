import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { blogPosts, blogCategories } from "@/shared/schema";
import { eq, and, ne, desc } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const [post] = await db
      .select({
        id: blogPosts.id,
        title: blogPosts.title,
        slug: blogPosts.slug,
        excerpt: blogPosts.excerpt,
        content: blogPosts.content,
        coverImage: blogPosts.coverImage,
        author: blogPosts.author,
        readingTime: blogPosts.readingTime,
        featured: blogPosts.featured,
        metaTitle: blogPosts.metaTitle,
        metaDescription: blogPosts.metaDescription,
        faqs: blogPosts.faqs,
        tags: blogPosts.tags,
        publishedAt: blogPosts.publishedAt,
        updatedAt: blogPosts.updatedAt,
        categoryId: blogPosts.categoryId,
        categoryName: blogCategories.name,
        categorySlug: blogCategories.slug,
      })
      .from(blogPosts)
      .leftJoin(blogCategories, eq(blogPosts.categoryId, blogCategories.id))
      .where(and(eq(blogPosts.slug, slug), eq(blogPosts.published, true)))
      .limit(1);

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const related = await db
      .select({
        id: blogPosts.id,
        title: blogPosts.title,
        slug: blogPosts.slug,
        excerpt: blogPosts.excerpt,
        coverImage: blogPosts.coverImage,
        author: blogPosts.author,
        readingTime: blogPosts.readingTime,
        publishedAt: blogPosts.publishedAt,
        categoryName: blogCategories.name,
      })
      .from(blogPosts)
      .leftJoin(blogCategories, eq(blogPosts.categoryId, blogCategories.id))
      .where(and(
        eq(blogPosts.published, true),
        ne(blogPosts.id, post.id),
        ...(post.categoryId ? [eq(blogPosts.categoryId, post.categoryId)] : [])
      ))
      .orderBy(desc(blogPosts.publishedAt))
      .limit(3);

    return NextResponse.json({ post, related });
  } catch (error: any) {
    console.error("[Blog API] Error:", error.message);
    return NextResponse.json({ error: "Failed to load blog post" }, { status: 500 });
  }
}
