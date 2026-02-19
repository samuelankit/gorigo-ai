import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { blogPosts, blogCategories } from "@/shared/schema";
import { eq, desc, and, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    let conditions = [eq(blogPosts.published, true)];
    if (category) {
      const [cat] = await db.select().from(blogCategories).where(eq(blogCategories.slug, category)).limit(1);
      if (cat) {
        conditions.push(eq(blogPosts.categoryId, cat.id));
      }
    }

    const posts = await db
      .select({
        id: blogPosts.id,
        title: blogPosts.title,
        slug: blogPosts.slug,
        excerpt: blogPosts.excerpt,
        coverImage: blogPosts.coverImage,
        author: blogPosts.author,
        readingTime: blogPosts.readingTime,
        featured: blogPosts.featured,
        tags: blogPosts.tags,
        publishedAt: blogPosts.publishedAt,
        categoryId: blogPosts.categoryId,
        categoryName: blogCategories.name,
        categorySlug: blogCategories.slug,
      })
      .from(blogPosts)
      .leftJoin(blogCategories, eq(blogPosts.categoryId, blogCategories.id))
      .where(and(...conditions))
      .orderBy(desc(blogPosts.publishedAt));

    const categories = await db.select().from(blogCategories).orderBy(blogCategories.name);

    return NextResponse.json({ posts, categories });
  } catch (error: any) {
    console.error("[Blog API] Error:", error.message);
    return NextResponse.json({ error: "Failed to load blog posts" }, { status: 500 });
  }
}
