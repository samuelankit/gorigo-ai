export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { blogPosts, blogCategories } from "@/shared/schema";
import { eq, and, ne, desc } from "drizzle-orm";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { PublicLayout } from "@/components/public-layout";
import { BlogPostingJsonLd, FAQJsonLd, BreadcrumbJsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { ConversionCta } from "@/components/seo/conversion-cta";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, ArrowLeft, ArrowRight, User, Calendar, Tag, HelpCircle } from "lucide-react";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const [post] = await db.select().from(blogPosts).where(and(eq(blogPosts.slug, slug), eq(blogPosts.published, true))).limit(1);
  if (!post) return { title: "Post Not Found | GoRigo" };
  return {
    title: post.metaTitle || `${post.title} | GoRigo Blog`,
    description: post.metaDescription || post.excerpt,
    openGraph: {
      title: post.metaTitle || post.title,
      description: post.metaDescription || post.excerpt,
      type: "article",
      publishedTime: post.publishedAt?.toISOString(),
      modifiedTime: post.updatedAt?.toISOString(),
      authors: [post.author || "GoRigo Team"],
    },
    alternates: { canonical: `/blog/${slug}` },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
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
    notFound();
  }

  let related = await db
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

  if (related.length === 0) {
    related = await db
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
      .where(and(eq(blogPosts.published, true), ne(blogPosts.id, post.id)))
      .orderBy(desc(blogPosts.publishedAt))
      .limit(3);
  }

  const faqs = post.faqs ? JSON.parse(post.faqs) as { question: string; answer: string }[] : [];
  const tags = post.tags ? post.tags.split(",").map(t => t.trim()) : [];
  const headings = [...post.content.matchAll(/<h2[^>]*id="([^"]*)"[^>]*>(.*?)<\/h2>/g)].map(m => ({ id: m[1], text: m[2].replace(/<[^>]*>/g, '') }));

  const formatDate = (date: Date | null) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <PublicLayout>
      <div className="min-h-screen bg-background" data-testid="page-blog-post">
        <BlogPostingJsonLd
          title={post.title}
          description={post.metaDescription || post.excerpt}
          slug={post.slug}
          datePublished={post.publishedAt?.toISOString() || ""}
          dateModified={post.updatedAt?.toISOString() || ""}
          author={post.author || "GoRigo Team"}
        />
        <BreadcrumbJsonLd
          items={[
            { name: "Home", url: "/" },
            { name: "Blog", url: "/blog" },
            { name: post.title, url: `/blog/${post.slug}` },
          ]}
        />
        {faqs.length > 0 && <FAQJsonLd items={faqs} />}

        <Navbar />
        <Breadcrumbs items={[{ label: "Blog", href: "/blog" }, { label: post.title }]} />

        <section className="py-12">
          <div className="max-w-4xl mx-auto px-6">
            <Link
              href="/blog"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
              data-testid="link-back-to-blog"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Blog
            </Link>

            <div className="flex items-center gap-3 mb-4 flex-wrap">
              {post.categoryName && (
                <Badge variant="outline" className="no-default-hover-elevate no-default-active-elevate">
                  {post.categoryName}
                </Badge>
              )}
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                {post.readingTime || 5} min read
              </span>
            </div>

            <h1
              className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight mb-6"
              data-testid="text-post-title"
            >
              {post.title}
            </h1>

            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4 flex-wrap">
              <span className="flex items-center gap-1.5" data-testid="text-post-author">
                <User className="h-4 w-4" />
                {post.author || "GoRigo Team"}
              </span>
              <span className="flex items-center gap-1.5" data-testid="text-post-date">
                <Calendar className="h-4 w-4" />
                {formatDate(post.publishedAt)}
              </span>
            </div>

            {tags.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap mb-8">
                {tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="no-default-hover-elevate no-default-active-elevate">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="pb-16">
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex gap-8">
              {headings.length > 0 && (
                <aside className="hidden lg:block w-64 shrink-0" data-testid="section-toc">
                  <div className="sticky top-24">
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                      Table of Contents
                    </h2>
                    <nav>
                      <ul className="space-y-2">
                        {headings.map((heading) => (
                          <li key={heading.id}>
                            <a
                              href={`#${heading.id}`}
                              className="text-sm text-muted-foreground hover:text-foreground transition-colors leading-relaxed block"
                            >
                              {heading.text}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </nav>
                  </div>
                </aside>
              )}

              <article
                className="flex-1 min-w-0 prose prose-lg dark:prose-invert max-w-none"
                data-testid="section-post-content"
                dangerouslySetInnerHTML={{ __html: post.content }}
              />
            </div>
          </div>
        </section>

        {faqs.length > 0 && (
          <section className="py-16 border-t border-border/50" data-testid="section-faq">
            <div className="max-w-4xl mx-auto px-6">
              <div className="flex items-center gap-3 mb-8">
                <HelpCircle className="h-5 w-5 text-primary" />
                <h2 className="text-2xl font-semibold tracking-tight">People Also Ask</h2>
              </div>
              <div className="space-y-4">
                {faqs.map((faq, i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <h3 className="font-medium mb-2">{faq.question}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{faq.answer}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>
        )}

        {related.length > 0 && (
          <section className="py-16 border-t border-border/50" data-testid="section-related">
            <div className="max-w-6xl mx-auto px-6">
              <h2 className="text-2xl font-semibold tracking-tight mb-8">Related Articles</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {related.map((relPost) => (
                  <Link
                    key={relPost.slug}
                    href={`/blog/${relPost.slug}`}
                    data-testid={`card-related-${relPost.slug}`}
                  >
                    <Card className="hover-elevate h-full">
                      <CardContent className="p-6 flex flex-col h-full">
                        <h3 className="text-lg font-semibold tracking-tight mb-2">
                          {relPost.title}
                        </h3>
                        <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2 flex-1">
                          {relPost.excerpt}
                        </p>
                        <div className="flex items-center gap-3 mt-4 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {relPost.readingTime || 5} min
                          </span>
                          <span>{formatDate(relPost.publishedAt)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        <ConversionCta />
        <Footer />
      </div>
    </PublicLayout>
  );
}
