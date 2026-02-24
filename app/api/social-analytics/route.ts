import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { socialAnalytics, socialPosts } from "@/shared/schema";
import { eq, and, sql, desc, gte, lte } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/get-user";
import { handleRouteError } from "@/lib/api-error";

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth || !auth.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const postId = searchParams.get("postId");
    const platform = searchParams.get("platform");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const conditions = [eq(socialAnalytics.orgId, auth.orgId)];
    if (postId) {
      conditions.push(eq(socialAnalytics.postId, parseInt(postId)));
    }
    if (platform) {
      conditions.push(eq(socialAnalytics.platform, platform));
    }
    if (startDate) {
      conditions.push(gte(socialAnalytics.fetchedAt, new Date(startDate)));
    }
    if (endDate) {
      conditions.push(lte(socialAnalytics.fetchedAt, new Date(endDate)));
    }

    const analytics = await db.select().from(socialAnalytics)
      .where(and(...conditions))
      .orderBy(desc(socialAnalytics.fetchedAt))
      .limit(100);

    const summary = await db.select({
      totalReach: sql<number>`coalesce(sum(${socialAnalytics.reach}), 0)`,
      totalImpressions: sql<number>`coalesce(sum(${socialAnalytics.impressions}), 0)`,
      totalEngagement: sql<number>`coalesce(sum(${socialAnalytics.engagement}), 0)`,
      totalClicks: sql<number>`coalesce(sum(${socialAnalytics.clicks}), 0)`,
      totalShares: sql<number>`coalesce(sum(${socialAnalytics.shares}), 0)`,
      totalLikes: sql<number>`coalesce(sum(${socialAnalytics.likes}), 0)`,
    }).from(socialAnalytics)
      .where(and(...conditions));

    const publishedPosts = await db.select({
      count: sql<number>`count(*)`,
    }).from(socialPosts)
      .where(and(
        eq(socialPosts.orgId, auth.orgId),
        eq(socialPosts.status, "published"),
      ));

    const platformBreakdown = await db.select({
      platform: socialAnalytics.platform,
      reach: sql<number>`coalesce(sum(${socialAnalytics.reach}), 0)`,
      engagement: sql<number>`coalesce(sum(${socialAnalytics.engagement}), 0)`,
      clicks: sql<number>`coalesce(sum(${socialAnalytics.clicks}), 0)`,
    }).from(socialAnalytics)
      .where(and(...conditions))
      .groupBy(socialAnalytics.platform);

    return NextResponse.json({
      analytics,
      summary: summary[0] || { totalReach: 0, totalImpressions: 0, totalEngagement: 0, totalClicks: 0, totalShares: 0, totalLikes: 0 },
      publishedPostsCount: Number(publishedPosts[0]?.count || 0),
      platformBreakdown,
    });
  } catch (err) {
    return handleRouteError(err, "Failed to fetch analytics");
  }
}
