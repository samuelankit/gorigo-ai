export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/lib/db";
import { blogPosts, blogCategories } from "@/shared/schema";
import { eq, desc, and } from "drizzle-orm";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { PublicLayout } from "@/components/public-layout";
import { WebPageJsonLd, BreadcrumbJsonLd, BlogListJsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { ConversionCta } from "@/components/seo/conversion-cta";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, ArrowRight, BookOpen, Search } from "lucide-react";

export const metadata: Metadata = {
  title: "Blog — AI Voice, Call Centre Automation & Industry Insights | GoRigo",
  description: "Expert insights on AI voice agents, call centre automation, RAG technology, and the future of customer communication. Practical guides and industry analysis from GoRigo.",
  openGraph: {
    title: "Blog — AI Voice & Call Centre Insights | GoRigo",
    description: "Expert insights on AI voice agents, call centre automation, RAG technology, and the future of customer communication.",
  },
  alternates: { canonical: "/blog" },
};

export default async function BlogPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const resolvedSearchParams = await searchParams;
  const categoryFilter = resolvedSearchParams?.category || "";

  const categories = await db.select().from(blogCategories).orderBy(blogCategories.name);

  let conditions = [eq(blogPosts.published, true)];
  if (categoryFilter) {
    const [cat] = await db.select().from(blogCategories).where(eq(blogCategories.slug, categoryFilter)).limit(1);
    if (cat) conditions.push(eq(blogPosts.categoryId, cat.id));
  }

  const posts = await db
    .select({
      id: blogPosts.id, title: blogPosts.title, slug: blogPosts.slug,
      excerpt: blogPosts.excerpt, coverImage: blogPosts.coverImage,
      author: blogPosts.author, readingTime: blogPosts.readingTime,
      featured: blogPosts.featured, tags: blogPosts.tags,
      publishedAt: blogPosts.publishedAt, categoryId: blogPosts.categoryId,
      categoryName: blogCategories.name, categorySlug: blogCategories.slug,
    })
    .from(blogPosts)
    .leftJoin(blogCategories, eq(blogPosts.categoryId, blogCategories.id))
    .where(and(...conditions))
    .orderBy(desc(blogPosts.publishedAt));

  const featuredPost = posts.find((p) => p.featured);
  const regularPosts = posts.filter((p) => p !== featuredPost);

  const formatDate = (date: Date | null) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <PublicLayout>
      <div className="min-h-screen bg-background" data-testid="page-blog">
        <WebPageJsonLd
          title="Blog — AI Voice, Call Centre Automation & Industry Insights | GoRigo"
          description="Expert insights on AI voice agents, call centre automation, RAG technology, and the future of customer communication."
          url="/blog"
        />
        <BreadcrumbJsonLd
          items={[
            { name: "Home", url: "/" },
            { name: "Blog", url: "/blog" },
          ]}
        />
        <BlogListJsonLd
          posts={posts.map((p) => ({
            title: p.title,
            slug: p.slug,
            datePublished: p.publishedAt ? new Date(p.publishedAt).toISOString() : "",
            author: p.author || "GoRigo Team",
          }))}
        />
        <Navbar />
        <Breadcrumbs items={[{ label: "Blog" }]} />

        <section className="relative" data-testid="section-blog-hero">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.06),transparent_60%)]" />
          <div className="relative max-w-4xl mx-auto px-6 pt-28 pb-20 text-center">
            <p className="text-sm font-medium tracking-widest uppercase text-muted-foreground mb-6">
              INSIGHTS &amp; GUIDES
            </p>
            <h1
              className="text-4xl sm:text-5xl font-light tracking-tight leading-[1.1]"
              data-testid="text-blog-hero-title"
            >
              The GoRigo
              <br />
              <span className="font-normal">Blog</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Expert insights on AI voice technology, call centre automation, and building the future of customer communication.
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Last updated: February 2026
            </p>
          </div>
        </section>

        <section className="py-8">
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href="/blog"
                data-testid="link-category-all"
              >
                <Badge
                  variant={!categoryFilter ? "default" : "outline"}
                  className="cursor-pointer"
                >
                  All
                </Badge>
              </Link>
              {categories.map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/blog?category=${cat.slug}`}
                  data-testid={`link-category-${cat.slug}`}
                >
                  <Badge
                    variant={categoryFilter === cat.slug ? "default" : "outline"}
                    className="cursor-pointer"
                  >
                    {cat.name}
                  </Badge>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="pb-16">
          <div className="max-w-6xl mx-auto px-6">
            {posts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <BookOpen className="h-12 w-12 text-muted-foreground/40 mb-4" />
                <h2 className="text-xl font-semibold mb-2">No articles yet</h2>
                <p className="text-muted-foreground max-w-md">
                  We are working on bringing you expert insights on AI voice technology and call centre automation. Check back soon.
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {featuredPost && (
                  <Link
                    href={`/blog/${featuredPost.slug}`}
                    data-testid={`card-blog-post-${featuredPost.slug}`}
                  >
                    <Card className="hover-elevate relative">
                      <CardContent className="p-6 sm:p-8">
                        <div className="flex items-center gap-2 mb-3 flex-wrap">
                          {featuredPost.categoryName && (
                            <Badge variant="outline" className="no-default-hover-elevate no-default-active-elevate">
                              {featuredPost.categoryName}
                            </Badge>
                          )}
                          <Badge className="no-default-hover-elevate no-default-active-elevate">Featured</Badge>
                        </div>
                        <h2
                          className="text-2xl sm:text-3xl font-semibold tracking-tight mb-3"
                          data-testid={`text-post-title-${featuredPost.slug}`}
                        >
                          {featuredPost.title}
                        </h2>
                        <p
                          className="text-muted-foreground leading-relaxed line-clamp-3 max-w-3xl"
                          data-testid={`text-post-excerpt-${featuredPost.slug}`}
                        >
                          {featuredPost.excerpt}
                        </p>
                        <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground flex-wrap">
                          <span>{featuredPost.author || "GoRigo Team"}</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {featuredPost.readingTime || 5} min read
                          </span>
                          <span>{formatDate(featuredPost.publishedAt)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                )}

                {regularPosts.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {regularPosts.map((post) => (
                      <Link
                        key={post.slug}
                        href={`/blog/${post.slug}`}
                        data-testid={`card-blog-post-${post.slug}`}
                      >
                        <Card className="hover-elevate h-full">
                          <CardContent className="p-6 flex flex-col h-full">
                            {post.categoryName && (
                              <div className="mb-3">
                                <Badge variant="outline" className="no-default-hover-elevate no-default-active-elevate">
                                  {post.categoryName}
                                </Badge>
                              </div>
                            )}
                            <h3
                              className="text-lg font-semibold tracking-tight mb-2"
                              data-testid={`text-post-title-${post.slug}`}
                            >
                              {post.title}
                            </h3>
                            <p
                              className="text-muted-foreground text-sm leading-relaxed line-clamp-3 flex-1"
                              data-testid={`text-post-excerpt-${post.slug}`}
                            >
                              {post.excerpt}
                            </p>
                            <div className="flex items-center gap-3 mt-4 text-xs text-muted-foreground flex-wrap">
                              <span>{post.author || "GoRigo Team"}</span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {post.readingTime || 5} min
                              </span>
                              <span>{formatDate(post.publishedAt)}</span>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        <ConversionCta />
        <Footer />
      </div>
    </PublicLayout>
  );
}
