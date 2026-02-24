import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { socialPosts, orgs } from "@/shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";
import { getSocialTierLimits } from "@/lib/social-connector-config";
import { z } from "zod";
import { handleRouteError } from "@/lib/api-error";

const createPostSchema = z.object({
  content: z.string().min(1).max(5000),
  platforms: z.array(z.string()).min(1),
  mediaUrls: z.array(z.string().url()).optional(),
  mediaThumbnails: z.array(z.string().url()).optional(),
  scheduledAt: z.string().datetime().optional(),
  strategyId: z.number().int().positive().optional(),
  utmParams: z.object({
    source: z.string().optional(),
    medium: z.string().optional(),
    campaign: z.string().optional(),
  }).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const platform = searchParams.get("platform");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
    const offset = (page - 1) * limit;

    const conditions = [eq(socialPosts.orgId, auth.orgId)];
    if (status) {
      conditions.push(eq(socialPosts.status, status));
    }
    if (platform) {
      conditions.push(sql`${platform} = ANY(${socialPosts.platforms})`);
    }

    const [posts, countResult] = await Promise.all([
      db.select().from(socialPosts)
        .where(and(...conditions))
        .orderBy(desc(socialPosts.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(socialPosts)
        .where(and(...conditions)),
    ]);

    return NextResponse.json({
      posts,
      total: Number(countResult[0]?.count || 0),
      page,
      limit,
    });
  } catch (err) {
    return handleRouteError(err, "Failed to fetch posts");
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createPostSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const [org] = await db.select().from(orgs).where(eq(orgs.id, auth.orgId)).limit(1);
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const tierLimits = getSocialTierLimits(org.deploymentModel || "individual");
    if (tierLimits.maxScheduledPostsPerMonth !== -1) {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const [monthCount] = await db.select({ count: sql<number>`count(*)` })
        .from(socialPosts)
        .where(and(
          eq(socialPosts.orgId, auth.orgId),
          sql`${socialPosts.createdAt} >= ${startOfMonth}`
        ));
      if (Number(monthCount?.count || 0) >= tierLimits.maxScheduledPostsPerMonth) {
        return NextResponse.json({
          error: `Monthly post limit reached (${tierLimits.maxScheduledPostsPerMonth}). Upgrade your package for more.`,
        }, { status: 429 });
      }
    }

    const { content, platforms, mediaUrls, mediaThumbnails, scheduledAt, strategyId, utmParams } = parsed.data;

    const status = scheduledAt ? "scheduled" : "draft";

    const [post] = await db.insert(socialPosts).values({
      orgId: auth.orgId,
      userId: auth.user.id,
      strategyId: strategyId || null,
      content,
      platforms,
      mediaUrls: mediaUrls || null,
      mediaThumbnails: mediaThumbnails || null,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      status,
      utmParams: utmParams || null,
    }).returning();

    return NextResponse.json({ post }, { status: 201 });
  } catch (err) {
    return handleRouteError(err, "Failed to create post");
  }
}
